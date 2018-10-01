import { DynamicGqlSchema, AvailableApi, Connectors, GqlTransformOptions } from '../types';
import { Expression, BlockStatement, CallExpression, ArrowFunctionExpression, ConditionalExpression } from 'estree';
import {
  getArguments,
  ExpressionNode,
  mayBeAsync,
  generateHelpers,
  transpileNode,
  createGenerationMask,
  awaitCall,
  awaitMap,
} from '../helpers';

const walk = require('acorn/dist/walk');

function transformAwait(expr: Expression, apis: Array<string>) {
  const generate = createGenerationMask();
  const block: BlockStatement = {
    body: [
      {
        type: 'ReturnStatement',
        argument: expr,
      },
    ],
    type: 'BlockStatement',
  };
  const variables: Array<string> = [];

  walk.ancestor(block, {
    ArrowFunctionExpression(node: ArrowFunctionExpression) {
      const body = node.body;

      if (mayBeAsync(body)) {
        node.body = {
          type: 'BlockStatement',
          body: [
            {
              type: 'ReturnStatement',
              argument: body as any,
            },
          ],
        };
      }
    },
    CallExpression(node: CallExpression, ancestors: Array<ExpressionNode>) {
      const { callee } = node;

      if (callee.type === 'Identifier') {
        const name = callee.name;

        if (ancestors.length > 1 && apis.includes(name)) {
          awaitCall(node, ancestors, variables);
        } else if (typeof generate[name] === 'boolean') {
          generate[name] = true;
        }
      }

      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'map'
      ) {
        awaitMap(node, ancestors);
      }
    },
  });

  generateHelpers(generate, block);

  return block;
}

function transpileSource(node: Expression, api: AvailableApi, args: Array<string>) {
  const apiNames = Object.keys(api);
  const asyncApiNames = apiNames.filter(m => api[m]);
  const block = transformAwait(node, asyncApiNames);
  return transpileNode(block, apiNames, args);
}

function defaultWrapper(block: string) {
  return `try ${block} catch (err) { throw new Error(JSON.stringify(err)); }`;
}

export function transform(gql: DynamicGqlSchema, api: AvailableApi, options: GqlTransformOptions = {}): Connectors {
  const keys = Object.keys(gql.resolvers);
  const connectors: Connectors = {};
  const wrapper = options.wrapStatements || defaultWrapper;

  for (const key of keys) {
    const resolvers = gql.resolvers[key];
    const types = Object.keys(resolvers);

    for (const type of types) {
      const resolver = resolvers[type];
      const connector = connectors[key] || (connectors[key] = {});
      const args = getArguments(gql.schema.ast, key, type);
      const block = transpileSource(resolver, api, args);
      connector[type] = wrapper(block);
    }
  }

  return connectors;
}
