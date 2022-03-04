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
  EmptyStatement,
  TryStatement,
  WhileStatement,
  ForStatement,
  IfStatement,
  DebuggerStatement,
  DoWhileStatement,
  SpreadElement,
} from 'estree';

export interface ParenthesizedNode {
  type: 'ParenthesizedExpression';
  expression: ExpressionNode;
}

export type ExpressionNode =
  | Expression
  | Super
  | BlockStatement
  | IfStatement
  | WhileStatement
  | DoWhileStatement
  | ForStatement
  | DebuggerStatement
  | ReturnStatement
  | EmptyStatement
  | TryStatement
  | ExpressionStatement
  | VariableDeclaration
  | SpreadElement
  | ParenthesizedNode
  | Property;

export function mayBeAsync(node: ExpressionNode) {
  return node.type === 'MemberExpression' || node.type === 'CallExpression';
}

export function wrapInAwait(argument: any): AwaitExpression {
  if (argument.type === 'AwaitExpression') {
    return argument;
  }

  return {
    type: 'AwaitExpression',
    argument,
  };
}

export function wrapInLambda(argument: any, statements: Array<Statement> = [], async = false): CallExpression {
  return {
    type: 'CallExpression',
    callee: {
      type: 'ArrowFunctionExpression',
      expression: true,
      async,
      params: [],
      body: {
        type: 'BlockStatement',
        body: [
          ...statements,
          {
            type: 'ReturnStatement',
            argument,
          },
        ],
      },
    },
    optional: false,
    arguments: [],
  };
}

export function callFunction(name: string, argument: Expression): CallExpression {
  return {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      name,
    },
    optional: false,
    arguments: [argument],
  };
}

export function isNotIdentifier(name: string): BinaryExpression {
  return {
    type: 'BinaryExpression',
    operator: '!==',
    left: {
      type: 'MemberExpression',
      computed: true,
      optional: true,
      object: {
        type: 'Identifier',
        name: 'obj',
      },
      property: {
        type: 'Identifier',
        name: 'm',
      },
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
      type: 'MemberExpression',
      computed: false,
      optional: false,
      object: {
        type: 'Identifier',
        name: 'Promise',
      },
      property: {
        type: 'Identifier',
        name: 'all',
      },
    },
    optional: false,
    arguments: [argument],
  };
}

export function createVariableDeclaration(name: string, init: Expression): VariableDeclaration {
  return {
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
  };
}

export function insertNewValue(statements: Array<Statement>, name: string, init: Expression, offset = 1) {
  statements.splice(statements.length - offset, 0, createVariableDeclaration(name, init));
}

export function insertAwaitedValue(statements: Array<Statement>, name: string, argument: Expression, offset = 1) {
  insertNewValue(statements, name, wrapInAwait(argument), offset);
}

export function wrapInFunctionBlock(child: ExpressionNode, name: string, argument: Expression) {
  return wrapInLambda(child, [createVariableDeclaration(name, wrapInAwait(argument))], true);
}
