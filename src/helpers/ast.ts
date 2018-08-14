import {
  AwaitExpression,
  CallExpression,
  Statement,
  Expression,
  BlockStatement,
  Super,
  ReturnStatement,
  ExpressionStatement,
  VariableDeclaration,
  Property,
  BinaryExpression,
} from 'estree';

export type ExpressionNode =
  | Expression
  | Super
  | BlockStatement
  | ReturnStatement
  | ExpressionStatement
  | VariableDeclaration
  | Property;

export function mayBeAsync(node: ExpressionNode) {
  return node.type === 'MemberExpression' || node.type === 'CallExpression';
}

export function wrapInAwait(argument: any): AwaitExpression {
  return {
    type: 'AwaitExpression',
    argument,
  };
}

export function wrapInLambda(argument: any): CallExpression {
  return {
    type: 'CallExpression',
    callee: {
      type: 'ArrowFunctionExpression',
      expression: true,
      params: [],
      body: {
        type: 'BlockStatement',
        body: [
          {
            type: 'ReturnStatement',
            argument,
          },
        ],
      },
    },
    arguments: [],
  };
}

export function isNotIdentifier(name: string): BinaryExpression {
  return {
    type: 'BinaryExpression',
    operator: '!==',
    left: {
      type: 'MemberExpression',
      object: {
        type: 'Identifier',
        name: 'obj',
      },
      property: {
        type: 'Identifier',
        name: 'm',
      },
      computed: true,
    },
    right: {
      type: 'Identifier',
      name,
    },
  };
}

export function wrapInPromiseAll(argument: any): CallExpression {
  return {
    type: 'CallExpression',
    callee: {
      computed: false,
      type: 'MemberExpression',
      object: {
        type: 'Identifier',
        name: 'Promise',
      },
      property: {
        type: 'Identifier',
        name: 'all',
      },
    },
    arguments: [argument],
  };
}

export function insertNewValue(statements: Array<Statement>, name: string, init: Expression, offset = 1) {
  statements.splice(statements.length - offset, 0, {
    type: 'VariableDeclaration',
    kind: 'const',
    declarations: [
      {
        id: {
          type: 'Identifier',
          name,
        },
        init,
        type: 'VariableDeclarator',
      },
    ],
  });
}

export function insertAwaitedValue(statements: Array<Statement>, name: string, argument: Expression, offset = 1) {
  insertNewValue(
    statements,
    name,
    {
      type: 'AwaitExpression',
      argument,
    },
    offset,
  );
}
