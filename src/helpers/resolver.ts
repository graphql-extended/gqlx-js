import { parseExpressionAt } from 'acorn';
import { Position } from '../types';
import { GqlxError } from '../GqlxError';

export function getResolver(source: string, offset: number): Position {
  try {
    const exp = parseExpressionAt(source, offset, {
      ecmaVersion: 9 as any,
      preserveParens: true,
      locations: true,
      ranges: true,
    });
    return exp as any;
  } catch (e) {
    throw new GqlxError(`Error in resolver: ${e.message}`, {
      range: [e.pos, e.raisedAt],
      column: e.loc.column,
      line: e.loc.line,
    });
  }
}
