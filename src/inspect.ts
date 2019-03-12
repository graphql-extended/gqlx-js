import { createEmptyResolvers, extractResolvers } from './utils';
import { convertToPureGql } from './helpers';
import { GqlResolvers } from './types';

function positionAt(offset: number, lines: Array<number>) {
  let sum = 0;

  for (let i = 0; i < lines.length; i++) {
    const len = lines[i];

    if (offset - len <= sum) {
      return {
        col: offset - sum,
        ln: i + 1,
      };
    }

    sum += len + 1;
  }

  return {
    col: lines[lines.length - 1],
    ln: lines.length,
  };
}

export interface InspectionPosition {
  ln: number;
  col: number;
}

export interface InspectionRange {
  start: InspectionPosition;
  end: InspectionPosition;
}

export interface InspectionRegion extends InspectionRange {
  type: 'gql' | 'js';
}

export interface InspectionError extends InspectionRange {
  message: string;
}

export interface InspectionSummary {
  update(content: string): void;
  position(offset: number): InspectionPosition;
  completeAt(position: InspectionPosition): Array<string>;
  errors: Array<InspectionError>;
  regions: Array<InspectionRegion>;
  lineLengths: Array<number>;
  resolvers: GqlResolvers;
  gql: string;
}

export function inspect(content: string) {
  const run = () => {
    const lineLengths = content.split('\n').map(ln => ln.length);
    const resolvers = createEmptyResolvers();
    const positions = extractResolvers(content, resolvers);
    const gql = convertToPureGql(content, positions);
    const end = {
      col: lineLengths[lineLengths.length - 1],
      ln: lineLengths.length,
    };
    const regions: Array<InspectionRegion> = [
      {
        type: 'gql',
        start: {
          col: 1,
          ln: 1,
        },
        end,
      },
    ];

    for (const position of positions) {
      const sp = positionAt(position.start, lineLengths);
      const ep = positionAt(position.end, lineLengths);
      regions[regions.length - 1].end = sp;
      regions.push(
        {
          type: 'js',
          start: sp,
          end: ep,
        },
        {
          type: 'gql',
          start: ep,
          end,
        },
      );
    }

    summary.lineLengths = lineLengths;
    summary.regions = regions;
    summary.resolvers = resolvers;
    summary.gql = gql;
  };
  const summary: InspectionSummary = {
    update(newContent) {
      content = newContent;
      run();
    },
    position(offset) {
      return positionAt(offset, summary.lineLengths);
    },
    completeAt(pos) {
      return [];
    },
    errors: [],
    regions: [],
    lineLengths: [],
    gql: '',
    resolvers: createEmptyResolvers(),
  };

  run();
  return summary;
}
