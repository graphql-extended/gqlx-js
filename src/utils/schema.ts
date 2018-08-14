import { parse } from 'graphql';
import { createLexer, Source, Token } from 'graphql/language';
import { Position, DynamicGqlSchema } from '../types';
import { getMode, getName, getResolver, convertToPureGql } from '../helpers';

export function parseDynamicSchema(input: string): DynamicGqlSchema {
  const source = new Source(input);
  const lex = createLexer(source, undefined);
  const tokens: Array<Token> = [];
  const resolvers = {
    Query: {},
    Mutation: {},
    Subscription: {},
  };
  const types = Object.keys(resolvers);
  const positions: Array<Position> = [];
  let mode: string | undefined = undefined;

  while (lex.token.kind !== '<EOF>') {
    let token = lex.advance();
    mode = getMode(tokens, types, mode);

    if (mode && token.kind === '{') {
      const pos = {
        start: token.start,
        end: token.end,
      };

      const name = getName(tokens);

      if (!name) {
        throw new Error(
          `Found invalid schema. Could not find a name for the ${mode} (Ln ${token.line}, Col ${token.column}).`,
        );
      }

      const exp = getResolver(input, token.end);

      resolvers[mode][name] = exp;

      lex.token = {
        kind: 'Comment',
        start: exp.start,
        end: exp.end,
        column: token.column,
        line: token.line,
        next: undefined as any,
        prev: undefined as any,
        value: '',
      };

      token = lex.advance();

      if (token.kind !== '}') {
        throw new Error(
          `Found invalid token. Expected '}', but found '${token.kind}' (Ln ${token.line}, Col ${token.column}).`,
        );
      }

      pos.end = token.end;
      token = lex.advance();
      positions.push(pos);
    }

    tokens.push(token);
  }

  const text = convertToPureGql(input, positions);
  const ast = parse(text);

  return {
    schema: {
      text,
      ast,
    },
    resolvers,
  };
}
