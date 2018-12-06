import { parse } from 'graphql';
import { createLexer, Source, Token } from 'graphql/language';
import { Position, DynamicGqlSchema } from '../types';
import { getMode, getName, getResolver, convertToPureGql } from '../helpers';
import { GqlxError } from '../GqlxError';

function parsePureGql(gql: string) {
  try {
    return parse(gql);
  } catch (e) {
    const {
      locations: [{ line, column }],
    } = e;
    throw new GqlxError(`Error in GraphQL schema: ${e.message}`, { column, line, range: [0, 0] });
  }
}

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
        throw new GqlxError(`Found invalid schema. Could not find a name for the ${mode}.`, {
          range: [token.start, token.end],
          column: token.column,
          line: token.line,
        });
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
        throw new GqlxError(`Found invalid token. Expected '}', but found '${token.kind}'.`, {
          range: [token.start, token.end],
          column: token.column,
          line: token.line,
        });
      }

      pos.end = token.end;
      positions.push(pos);
    } else {
      tokens.push(token);
    }
  }

  const text = convertToPureGql(input, positions);
  const ast = parsePureGql(text);

  return {
    schema: {
      text,
      ast,
    },
    resolvers,
  };
}
