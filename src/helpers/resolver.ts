import { parseExpressionAt } from 'acorn';
import { Position } from '../types';

export function getResolver(source: string, offset: number): Position {
  const exp = parseExpressionAt(source, offset, {
    ecmaVersion: 9 as any,
  });

  return exp as any;
}
