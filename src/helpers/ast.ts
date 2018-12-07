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

export function wrapInFunctionBlock(child: Expression, name: string, argument: Expression) {
  return wrapInAwait(wrapInLambda(child, [createVariableDeclaration(name, wrapInAwait(argument))], true));
}
