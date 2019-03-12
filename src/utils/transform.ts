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
} from '../helpers';
import { regenerate } from './regenerate';

const walk = require('acorn-walk');
const legacy = (global as any).regeneratorRuntime;

function transformAwait(expr: Expression, apis: Array<string>) {
  const generate = createGenerationMask();
  const variables: Array<string> = [];
  const block: BlockStatement = {
    body: [
      {
        type: 'ReturnStatement',
        argument: expr,
      },
    ],
    type: 'BlockStatement',
  };

  walk.fullAncestor(block, (node: Expression, _: any, ancestors: Array<ExpressionNode>) => {
    if (node.type === 'ArrowFunctionExpression' && mayBeAsync(node.body)) {
      node.body = {
        type: 'BlockStatement',
        body: [
          {
            type: 'ReturnStatement',
            argument: node.body as any,
          },
        ],
      };
    } else if (node.type === 'CallExpression') {
      const { callee } = node;

      if (callee.type === 'Identifier') {
        const name = callee.name;

        if (ancestors.length > 1 && apis.includes(name)) {
          awaitCall(node, ancestors, variables);
        } else if (typeof generate[name] === 'boolean') {
          generate[name] = true;
        }
      }
    }
  });

  walk.ancestor(block, {
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
    },
  });

  generateHelpers(generate, block);
  return block;
}

function transpileSource(node: Expression, api: AvailableApi, args: Array<string>) {
  const apiNames = Object.keys(api);
  const asyncApiNames = apiNames.filter(m => api[m]);
  const block = transformAwait(node, asyncApiNames);
  return transpileNode(block, apiNames, args, []);
}

function defaultWrapper(block: string) {
  return `try ${block} catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }`;
}

function defaultRegenerate(source: string) {
  if (legacy) {
    return regenerate(source);
  }

  return source;
}

export function transform(gql: DynamicGqlSchema, api: AvailableApi, options: GqlTransformOptions = {}): Connectors {
  const keys = Object.keys(gql.resolvers);
  const connectors: Connectors = {};
  const wrapper = options.wrapStatements || defaultWrapper;
  const regenerate = typeof options.regenerate === 'function' ? options.regenerate : defaultRegenerate;

  for (const key of keys) {
    const resolvers = gql.resolvers[key];
    const types = Object.keys(resolvers);

    for (const type of types) {
      const resolver = resolvers[type];
      const connector = connectors[key] || (connectors[key] = {});
      const args = getArguments(gql.schema.ast, key, type);
      const block = transpileSource(resolver, api, args);
      const source = wrapper(block);
      const target = regenerate(source);
      connector[type] = target;
    }
  }

  return connectors;
}
