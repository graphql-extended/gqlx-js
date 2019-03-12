import { BaseNodeWithoutComments } from 'estree';

export interface GqlxErrorLocation {
  line: number;
  column: number;
  range: [number, number];
}

const emptyLoc: GqlxErrorLocation = {
  column: 0,
  line: 0,
  range: [0, 0],
};

export function getErrorLocation(node: BaseNodeWithoutComments): GqlxErrorLocation {
  const { loc, range } = node;
  return {
    column: (loc && loc.start.column) || emptyLoc.column,
    line: (loc && loc.start.line) || emptyLoc.line,
    range: range || emptyLoc.range,
  };
}

export class GqlxError extends Error {
  public line: number;
  public column: number;
  public range: [number, number];

  constructor(message: string, loc = emptyLoc) {
    super(message);
    this.line = loc.line;
    this.column = loc.column;
    this.range = loc.range;
    Error.captureStackTrace(this, GqlxError);
  }
}
