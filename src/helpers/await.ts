import {
  CallExpression,
  Expression,
  BlockStatement,
  ArrowFunctionExpression,
  ReturnStatement,
  AwaitExpression,
} from 'estree';
import { ExpressionNode, wrapInPromiseAll, wrapInAwait, insertAwaitedValue, wrapInFunctionBlock } from './ast';

function placeVariableClosestBlock(
  node: Expression,
  ancestors: Array<ExpressionNode>,
  variable: string,
  start: number,
) {
  for (let i = start; i--; ) {
    const ancestor = ancestors[i];
    const child = ancestors[i + 1];

    if (ancestor.type === 'BlockStatement') {
      const position = ancestor.body.indexOf(child as any);
      const offset = ancestor.body.length - position;
      insertAwaitedValue(ancestor.body, variable, node, offset);
      break;
    } else if (ancestor.type === 'ConditionalExpression') {
      const sub = child === ancestor.consequent ? 'consequent' : 'alternate';
      const ae = wrapInFunctionBlock(child, variable, node);
      const ce = ae.callee as ArrowFunctionExpression;
      const bs = ce.body;
      ancestor[sub] = ae;
      ancestors.splice(i + 1, 0, ae, ce, bs);
      break;
    }
  }
}

function placeAsyncLambda(ancestors: Array<ExpressionNode>, variables: Array<string>, start = ancestors.length) {
  for (let i = start; i--; ) {
    const ancestor = ancestors[i];

    if (ancestor.type === 'ArrowFunctionExpression') {
      ancestor.async = true;
      awaitCall(ancestor, ancestors, variables, i);
      break;
    }
  }
}

function placeInAsyncMap(node: CallExpression, previous: ExpressionNode) {
  switch (previous.type) {
    case 'ReturnStatement':
      previous.argument = wrapInAwait(wrapInPromiseAll(node));
      break;
    case 'MemberExpression':
      previous.object = wrapInAwait(wrapInPromiseAll(node));
      break;
  }
}

function isAll(callee: ExpressionNode) {
  return callee.type === 'MemberExpression' && callee.property.type === 'Identifier' && callee.property.name === 'map';
}

export function awaitCall(
  node: Expression,
  ancestors: Array<ExpressionNode>,
  variables: Array<string>,
  start = ancestors.length,
) {
  for (let i = start; i--; ) {
    const ancestor = ancestors[i];
    const child = ancestors[i + 1];

    if (node !== ancestor) {
      if (ancestor.type === 'ReturnStatement') {
        ancestor.argument = wrapInAwait(child);
      } else if (ancestor.type === 'Property') {
        ancestor.value = wrapInAwait(child);
      } else if (ancestor.type === 'MemberExpression') {
        const variable = `_${variables.length}`;
        variables.push(variable);
        placeVariableClosestBlock(node, ancestors, variable, i);

        ancestor.object = {
          type: 'Identifier',
          name: variable,
        };

        break;
      } else if (ancestor.type === 'CallExpression' && child.type !== 'ArrowFunctionExpression') {
        const argIndex = ancestor.arguments.findIndex(m => m === child);
        ancestor.arguments[argIndex] = wrapInAwait(child);
      } else if (ancestor.type === 'CallExpression' && isAll(ancestor.callee)) {
        if (child.type === 'ArrowFunctionExpression') {
          child.async = true;
        }

        placeInAsyncMap(ancestor, ancestors[i - 1]);
      } else if (ancestor.type === 'AssignmentExpression') {
        ancestor.right = wrapInAwait(ancestor.right);
      } else if (ancestor.type === 'BinaryExpression') {
        if (ancestor.left === child) {
          ancestor.left = wrapInAwait(child);
        } else {
          ancestor.right = wrapInAwait(child);
        }
      } else if (ancestor.type === 'LogicalExpression') {
        if (ancestor.left === child) {
          ancestor.left = wrapInAwait(child);
        } else {
          ancestor.right = wrapInAwait(child);
        }
      } else if (ancestor.type === 'ConditionalExpression') {
        if (ancestor.consequent === child) {
          ancestor.consequent = wrapInAwait(child);
        } else if (ancestor.alternate === child) {
          ancestor.alternate = wrapInAwait(child);
        }
      } else if (ancestor.type === 'SpreadElement') {
        ancestor.argument = wrapInAwait(ancestor.argument);
      } else {
        continue;
      }

      placeAsyncLambda(ancestors, variables, i);
      break;
    }
  }
}
