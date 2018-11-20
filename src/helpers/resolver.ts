import { parseExpressionAt } from 'acorn';
import { Position } from '../types';

const whitespace = /\s/;

function isSkipable(chr: string, paren: string) {
  return whitespace.test(chr) || chr === paren;
}

export function getResolver(source: string, offset: number): Position {
  const start = offset;
  let parens = 0;

  while (isSkipable(source[offset], '(')) {
    parens += +(source[offset++] === '(');
  }

  const exp = parseExpressionAt(source, offset, {
    ecmaVersion: 9 as any,
  });

  while (isSkipable(source[exp.end], ')')) {
    parens -= +(source[exp.end++] === ')');
  }

  if (parens !== 0) {
    throw new Error(
      `Found invalid schema. Inbalanced parentheses (counted ${parens}) detected starting at position ${start}.`,
    );
  }

  return exp as any;
}
