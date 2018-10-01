import { CallExpression } from 'estree';
import { ExpressionNode, wrapInPromiseAll, wrapInAwait, insertAwaitedValue } from './ast';

export function awaitCall(node: CallExpression, ancestors: Array<ExpressionNode>, variables: Array<string>) {
  const tempVariables: Array<string> = [];

  for (let i = ancestors.length; i--; ) {
    const ancestor = ancestors[i];
    const hasVariable = tempVariables.length > 0;

    if (hasVariable && ancestor.type === 'BlockStatement') {
      for (const variable of tempVariables) {
        insertAwaitedValue(ancestor.body, variable, node);
      }

      tempVariables.splice(0, tempVariables.length);
    } else if (!hasVariable && ancestor.type === 'ReturnStatement') {
      const arg = ancestors[i + 1];

      if (arg.type !== 'BinaryExpression' && arg.type !== 'AssignmentExpression') {
        ancestor.argument = wrapInAwait(arg);
      }
    } else if (!hasVariable && ancestor.type === 'Property') {
      const arg = ancestors[i + 1];
      ancestor.value = wrapInAwait(arg);
    } else if (ancestor.type === 'ArrowFunctionExpression') {
      ancestor.async = true;
    } else if (!hasVariable && ancestor.type === 'MemberExpression') {
      const variable = `_${variables.length}`;
      variables.push(variable);
      tempVariables.push(variable);
      ancestor.object = {
        type: 'Identifier',
        name: variable,
      };
    } else if (ancestor.type === 'CallExpression' && ancestor !== node) {
      const arg = ancestors[i + 1];

      if (arg.type !== 'ArrowFunctionExpression') {
        const argIndex = ancestor.arguments.findIndex(m => m === arg);
        ancestor.arguments[argIndex] = wrapInAwait(arg);
      }
    } else if (ancestor.type === 'AssignmentExpression' && ancestor.right === node) {
      ancestor.right = wrapInAwait(ancestor.right);
    } else if (ancestor.type === 'BinaryExpression') {
      if (ancestor.left === node) {
        ancestor.left = wrapInAwait(node);
      } else if (ancestor.right === node) {
        ancestor.right = wrapInAwait(node);
      }
    } else if (ancestor.type === 'ConditionalExpression') {
      if (ancestor.consequent === node) {
        ancestor.consequent = wrapInAwait(node);
      } else if (ancestor.alternate === node) {
        ancestor.alternate = wrapInAwait(node);
      }
    }
  }
}

export function awaitMap(node: CallExpression, ancestors: Array<ExpressionNode>) {
  const lambda = node.arguments && node.arguments[0];

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
        case 'ReturnStatement':
          if (ancestor.argument && ancestor.argument.type !== 'AwaitExpression') {
            ancestor.argument = {
              type: 'AwaitExpression',
              argument: ancestor.argument,
            };
          }
          break;
      }
    }
  }
}
