import { DynamicGqlSchema, AvailableApi, Connectors, GqlTransformOptions } from '../types';
import {
  Expression,
  Pattern,
  BlockStatement,
  CallExpression,
  ArrowFunctionExpression,
  ConditionalExpression,
} from 'estree';
import {
  getArguments,
  ExpressionNode,
  mayBeAsync,
  wrapInAwait,
  wrapInLambda,
  generateHelpers,
  insertAwaitedValue,
  wrapInPromiseAll,
  transpileNode,
  createGenerationMask,
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
  let numValue = 0;

  walk.simple(block, {
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
    CallExpression(node: CallExpression) {
      if (node.callee.type === 'Identifier') {
        const name = node.callee.name;

        if (typeof generate[name] === 'boolean') {
          generate[name] = true;
        }
      }
    },
    ConditionalExpression(node: ConditionalExpression) {
      if (mayBeAsync(node.alternate)) {
        node.alternate = wrapInAwait(wrapInLambda(node.alternate));
      }

      if (mayBeAsync(node.consequent)) {
        node.consequent = wrapInAwait(wrapInLambda(node.consequent));
      }
    },
  });

  generateHelpers(generate, block);

  walk.ancestor(block, {
    CallExpression(node: CallExpression, ancestors: Array<ExpressionNode>) {
      const { callee } = node;

      if (ancestors.length > 1 && callee.type === 'Identifier' && apis.includes(callee.name)) {
        let tempVar = '';

        for (let i = ancestors.length; i--; ) {
          const ancestor = ancestors[i];

          if (tempVar && ancestor.type === 'BlockStatement') {
            insertAwaitedValue(ancestor.body, tempVar, node);
          } else if (!tempVar && ancestor.type === 'ReturnStatement') {
            const arg = ancestors[i + 1];

            if (arg.type !== 'BinaryExpression' && arg.type !== 'AssignmentExpression') {
              ancestor.argument = wrapInAwait(arg);
            }
          } else if (!tempVar && ancestor.type === 'Property') {
            const arg = ancestors[i + 1];
            ancestor.value = wrapInAwait(arg);
          } else if (ancestor.type === 'ArrowFunctionExpression') {
            ancestor.async = true;
            break;
          } else if (!tempVar && ancestor.type === 'MemberExpression') {
            tempVar = `_${numValue++}`;
            ancestor.object = {
              type: 'Identifier',
              name: tempVar,
            };
          } else if (ancestor.type === 'CallExpression' && ancestor !== node) {
            const arg = ancestors[i + 1];
            const argIndex = ancestor.arguments.findIndex(m => m === arg);
            ancestor.arguments[argIndex] = wrapInAwait(arg);
          } else if (ancestor.type === 'AssignmentExpression') {
            ancestor.right = wrapInAwait(ancestor.right);
          } else if (ancestor.type === 'BinaryExpression') {
            if (ancestor.left === node) {
              ancestor.left = wrapInAwait(node);
            } else if (ancestor.right === node) {
              ancestor.right = wrapInAwait(node);
            }
          }
        }
      }

      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'map'
      ) {
        const lambda = node.arguments && node.arguments[0];
        // let b = block;
        // let offset = 1;

        if (lambda && lambda.type === 'ArrowFunctionExpression' && lambda.async === true) {
          const previous = ancestors[ancestors.length - 2];

          switch (previous.type) {
            case 'ReturnStatement':
              previous.argument = wrapInPromiseAll(node);
              break;
            case 'MemberExpression':
              previous.object = wrapInPromiseAll(node);
              break;
          }

          for (const ancestor of ancestors) {
            switch (ancestor.type) {
              case 'ArrowFunctionExpression':
                if (!ancestor.async) {
                  ancestor.async = true;
                }
                break;
              // case 'BlockStatement':
              //   b = ancestor;
              //   offset = 1;
              //   break;
              case 'ReturnStatement':
                if (ancestor.argument && ancestor.argument.type !== 'AwaitExpression') {
                  ancestor.argument = {
                    type: 'AwaitExpression',
                    argument: ancestor.argument,
                  };
                }
                break;
              // case 'MemberExpression':
              //   const name = `_${numValue++}`;
              //   insertAwaitedValue(b.body, name, ancestor.object as Expression, offset++);
              //   ancestor.object = {
              //     type: 'Identifier',
              //     name,
              //   };
              //   break;
            }
          }
        }
      }
    },
  });
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
