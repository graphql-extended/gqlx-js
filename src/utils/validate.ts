import {
  CallExpression,
  Identifier,
  MemberExpression,
  Expression,
  BaseNode,
  ArrowFunctionExpression,
  VariableDeclaration,
  UnaryExpression,
} from 'estree';
import { DynamicGqlSchema, AvailableApi } from '../types';
import { getArguments, getNames, inbuiltFunctionNames } from '../helpers';
import { assertValidSchema, buildSchema } from 'graphql';

interface ExpressionState {
  stack: Array<Expression>;
  parameters: Array<string>;
}

interface Continuation {
  (node: BaseNode, state: ExpressionState): void;
}

const walk = require('acorn/dist/walk');

function check(exp: Expression, variables: Array<string>) {
  walk.recursive(
    exp,
    {
      stack: [],
      parameters: [...inbuiltFunctionNames, 'null', 'undefined', 'Array', 'Object'],
    },
    {
      CallExpression(node: CallExpression, state: ExpressionState, cont: Continuation) {
        cont(node.callee, { ...state, stack: [...state.stack, node] });

        for (const argument of node.arguments) {
          cont(argument, state);
        }
      },
      Identifier(node: Identifier, state: ExpressionState, cont: Continuation) {
        const last = state.stack[state.stack.length - 1];

        if (!last || last.type === 'CallExpression') {
          const all = [...variables, ...state.parameters];

          if (!all.includes(node.name)) {
            throw new Error(
              `The variable "${node.name}" is not available in the current context. Available: ${all.join(', ')}.`,
            );
          }
        }
      },
      VariableDeclaration(node: VariableDeclaration, state: ExpressionState, cont: Continuation) {
        for (const declaration of node.declarations) {
          cont(declaration, state);
          const names = getNames([declaration.id]);
          state.parameters.push(...names);
        }
      },
      MemberExpression(node: MemberExpression, state: ExpressionState, cont: Continuation) {
        cont(node.object, state);
        cont(node.property, { ...state, stack: [...state.stack, node] });
      },
      ArrowFunctionExpression(node: ArrowFunctionExpression, state: ExpressionState, cont: Continuation) {
        const names = getNames(node.params);
        cont(node.body, { ...state, parameters: [...state.parameters, ...names] });
      },
      FunctionExpression() {
        throw new Error('Using `function` is not allowed. Use arrow functions ("=>") instead.');
      },
      FunctionDeclaration() {
        throw new Error('Declaring a new `function` is not allowed. Only anonymous functions ("=>") can be used.');
      },
      ThisExpression() {
        throw new Error('Using `this` is not allowed. The context is only given explicitly.');
      },
      AwaitExpression() {
        throw new Error('Using `await` is not allowed. Asynchronous calls are automatically wrapped.');
      },
      UnaryExpression(node: UnaryExpression) {
        if (node.operator === 'delete') {
          throw new Error('Using `delete` is not allowed. Use the spread operator instead.');
        }
      },
    },
  );
}

export function validate(gql: DynamicGqlSchema, api: AvailableApi) {
  const keys = Object.keys(gql.resolvers);
  const fns = Object.keys(api);
  const schema = buildSchema(gql.schema.text);

  for (const key of keys) {
    const resolvers = gql.resolvers[key];
    const types = Object.keys(resolvers);

    for (const type of types) {
      const resolver = resolvers[type];
      const args = getArguments(gql.schema.ast, key, type);
      const variables = [...fns, ...args];
      check(resolver, variables);
    }
  }

  assertValidSchema(schema);
}
