import { Pattern, MemberExpression } from 'estree';
import { ExpressionNode } from './ast';

export function transpileMember(obj: MemberExpression, apis: Array<string>, args: Array<string>): string {
  const rhs = obj.property.type === 'Identifier' ? obj.property.name : transpileNode(obj.property, apis, args);
  const prop = obj.computed ? `[${rhs}]` : `.${rhs}`;
  return `${transpileNode(obj.object, apis, args)}${prop}`;
}

export function transpilePattern(pattern: Pattern, apis: Array<string>, args: Array<string>): string {
  switch (pattern.type) {
    case 'RestElement':
      return '...';
    case 'ArrayPattern':
      return `[${pattern.elements.map(p => transpilePattern(p, apis, args)).join(', ')}]`;
    case 'Identifier':
      return pattern.name;
    case 'AssignmentPattern': {
      const rhs = transpileNode(pattern.right as any, apis, args);
      return `${transpilePattern(pattern.left, apis, args)} = ${rhs}`;
    }
    case 'ObjectPattern':
      return `{ ${pattern.properties.map(p => transpilePattern(p.value, apis, args)).join(', ')} }`;
    case 'MemberExpression': {
      return transpileMember(pattern, apis, args);
    }
    default:
      return '';
  }
}

export function transpileNode(node: ExpressionNode, apis: Array<string>, args: Array<string>): string {
  switch (node.type) {
    case 'ExpressionStatement': {
      const expr = transpileNode(node.expression, apis, args);
      return `${expr};`;
    }
    case 'VariableDeclaration': {
      const decls = node.declarations
        .map(m => {
          const variable = transpilePattern(m.id, apis, args);

          if (m.init) {
            const init = transpileNode(m.init, apis, args);
            return `${variable} = ${init}`;
          }

          return variable;
        })
        .join(', ');
      return `${node.kind} ${decls};`;
    }
    case 'CallExpression': {
      const fn = transpileNode(node.callee as any, apis, args);
      const params = node.arguments.map(a => transpileNode(a as any, apis, args)).join(', ');
      return `${fn}(${params})`;
    }
    case 'MemberExpression': {
      return transpileMember(node, apis, args);
    }
    case 'ObjectExpression': {
      const properties = node.properties
        .map(p => {
          const x = p as any;

          if (x.type === 'SpreadElement') {
            const arg = transpileNode(x.argument, apis, args);
            return `...(${arg})`;
          }

          const key = transpileNode(p.key, apis, []);

          if (!p.shorthand || args.includes(key)) {
            const value = transpileNode(p.value as any, apis, args);
            return p.computed ? `[${key}]: ${value}` : `${key}: ${value}`;
          }

          return key;
        })
        .join(', ');
      return `({ ${properties} })`;
    }
    case 'ArrayExpression': {
      const elements = node.elements.map(m => transpileNode(m as any, apis, args)).join(', ');
      return `[${elements}]`;
    }
    case 'TemplateLiteral': {
      const exprs = node.expressions.map(m => transpileNode(m, apis, args));
      const parts = node.quasis.map(m => m.value.raw);
      const snippets = ['`', parts[0], '`'];

      for (let i = 0; i < exprs.length; i++) {
        snippets.splice(2 + 4 * i, 0, '${', exprs[i], '}', parts[i + 1]);
      }

      return snippets.join('');
    }
    case 'AwaitExpression': {
      const expr = transpileNode(node.argument, apis, args);
      return `await ${expr}`;
    }
    case 'ConditionalExpression': {
      const condition = transpileNode(node.test, apis, args);
      const primary = transpileNode(node.consequent, apis, args);
      const secondary = transpileNode(node.alternate, apis, args);
      return `((${condition}) ? (${primary}) : (${secondary}))`;
    }
    case 'LogicalExpression': {
      const left = transpileNode(node.left, apis, args);
      const right = transpileNode(node.right, apis, args);
      return `(${left} ${node.operator} ${right})`;
    }
    case 'AssignmentExpression': {
      const variable =
        node.left.type === 'Identifier'
          ? transpileNode(node.left, apis, args)
          : transpilePattern(node.left, apis, args);
      const value = transpileNode(node.right, apis, args);
      return `(${variable} = ${value})`;
    }
    case 'BinaryExpression': {
      const left = transpileNode(node.left as any, apis, args);
      const right = transpileNode(node.right as any, apis, args);
      return `(${left} ${node.operator} ${right})`;
    }
    case 'UpdateExpression':
    case 'UnaryExpression': {
      const value = transpileNode(node.argument as any, apis, args);

      if (node.prefix) {
        return `(${node.operator}${value})`;
      }

      return `(${value}${node.operator})`;
    }
    case 'ReturnStatement': {
      const expr = node.argument ? transpileNode(node.argument, apis, args) : '';
      return `return ${expr};`;
    }
    case 'Literal': {
      return node.raw || '';
    }
    case 'BlockStatement': {
      const statements = node.body.map(stmt => transpileNode(stmt as any, apis, args)).join(' ');
      return `{ ${statements} }`;
    }
    case 'IfStatement': {
      const condition = transpileNode(node.test, apis, args);
      const primary = transpileNode(node.consequent as any, apis, args);
      const rest = node.alternate ? ` else ${transpileNode(node.alternate as any, apis, args)}` : '';
      return `if (${condition}) ${primary}${rest}`;
    }
    case 'WhileStatement': {
      const condition = transpileNode(node.test, apis, args);
      const body = transpileNode(node.body as any, apis, args);
      return `while (${condition}) ${body}`;
    }
    case 'DoWhileStatement': {
      const condition = transpileNode(node.test, apis, args);
      const body = transpileNode(node.body as any, apis, args);
      return `do ${body} while (${condition});`;
    }
    case 'ForStatement': {
      const init = node.init ? transpileNode(node.init, apis, args).replace(/;$/, '') : '';
      const test = node.test ? transpileNode(node.test, apis, args) : '';
      const update = node.update ? transpileNode(node.update, apis, args) : '';
      const body = transpileNode(node.body as any, apis, args);
      return `for (${init}; ${test}; ${update}) ${body}`;
    }
    case 'ArrowFunctionExpression': {
      const params = node.params.map(p => transpilePattern(p, apis, args)).join(', ');
      const body = transpileNode(node.body as any, apis, args);
      const async = node.async ? 'async ' : '';
      return `(${async}(${params}) => ${body})`;
    }
    case 'Identifier': {
      if (args.includes(node.name)) {
        return `$data.${node.name}`;
      } else if (apis.includes(node.name)) {
        return `$api.${node.name}`;
      }

      return node.name;
    }
    case 'DebuggerStatement': {
      return 'debugger;';
    }
    case 'ParenthesizedExpression': {
      return transpileNode(node.expression, apis, args);
    }
    default:
      return '';
  }
}
