import {
  CallExpression,
  Identifier,
  MemberExpression,
  Expression,
  BaseNode,
  ArrowFunctionExpression,
  VariableDeclaration,
  UnaryExpression,
  BaseNodeWithoutComments,
} from 'estree';
import { assertValidSchema, buildSchema } from 'graphql';
import { DynamicGqlSchema, AvailableApi, GqlTransformOptions } from '../types';
import { getArguments, getNames, inbuiltFunctionNames } from '../helpers';
import { GqlxError, getErrorLocation } from '../GqlxError';

interface ExpressionState {
  stack: Array<Expression>;
  parameters: Array<string>;
}

interface Continuation {
  (node: BaseNode, state: ExpressionState): void;
}

const debugNames = ['console', 'assert'];
const standardNames = ['null', 'undefined', 'Array', 'Object', 'Math'];
const walk = require('acorn-walk');

function check(exp: Expression, variables: Array<string>, debug = false) {
  walk.recursive(
    exp,
    {
      stack: [],
      parameters: [...inbuiltFunctionNames, ...standardNames, ...(debug ? debugNames : [])],
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
            throw new GqlxError(
              `The variable "${node.name}" is not available in the current context. Available: ${all.join(', ')}.`,
              getErrorLocation(node),
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
      FunctionExpression(node: BaseNodeWithoutComments) {
        throw new GqlxError(
          'Using `function` is not allowed. Use arrow functions ("=>") instead.',
          getErrorLocation(node),
        );
      },
      FunctionDeclaration(node: BaseNodeWithoutComments) {
        throw new GqlxError(
          'Declaring a new `function` is not allowed. Only anonymous functions ("=>") can be used.',
          getErrorLocation(node),
        );
      },
      ThisExpression(node: BaseNodeWithoutComments) {
        throw new GqlxError(
          'Using `this` is not allowed. The context is only given explicitly.',
          getErrorLocation(node),
        );
      },
      AwaitExpression(node: BaseNodeWithoutComments) {
        throw new GqlxError(
          'Using `await` is not allowed. Asynchronous calls are automatically wrapped.',
          getErrorLocation(node),
        );
      },
      UnaryExpression(node: UnaryExpression) {
        if (node.operator === 'delete') {
          throw new GqlxError(
            'Using `delete` is not allowed. Use the spread operator instead.',
            getErrorLocation(node),
          );
        }
      },
      DebuggerStatement(node: BaseNodeWithoutComments) {
        if (!debug) {
          throw new GqlxError(
            'The debugger statement can only be used with enabled debug option.',
            getErrorLocation(node),
          );
        }
      },
    },
  );
}

export function validate(gql: DynamicGqlSchema, api: AvailableApi, options?: GqlTransformOptions) {
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
      check(resolver, variables, options && options.debug);
    }
  }

  assertValidSchema(schema);
}
