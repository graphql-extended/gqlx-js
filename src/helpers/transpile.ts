import { Pattern, MemberExpression } from 'estree';
import { ExpressionNode } from './ast';

export function getIdentifier(name: string, apis: Array<string>, args: Array<string>, locals: Array<string>) {
  if (locals.indexOf(name) === -1) {
    if (args.indexOf(name) >= 0) {
      return `$data.${name}`;
    } else if (apis.indexOf(name) >= 0) {
      return `$api.${name}`;
    }
  }

  return name;
}

export function transpileMember(
  obj: MemberExpression,
  apis: Array<string>,
  args: Array<string>,
  locals: Array<string>,
): string {
  const rhs =
    obj.property.type === 'Identifier'
      ? obj.computed
        ? getIdentifier(obj.property.name, apis, args, locals)
        : obj.property.name
      : transpileNode(obj.property, apis, args, locals);
  const prop = obj.computed ? `[${rhs}]` : `.${rhs}`;
  return `${transpileNode(obj.object, apis, args, locals)}${prop}`;
}

export function transpilePattern(
  pattern: Pattern,
  apis: Array<string>,
  args: Array<string>,
  locals: Array<string>,
): string {
  switch (pattern.type) {
    case 'RestElement':
      return '...';
    case 'ArrayPattern':
      return `[${pattern.elements.map(p => transpilePattern(p, apis, args, locals)).join(', ')}]`;
    case 'Identifier':
      return pattern.name;
    case 'AssignmentPattern': {
      const rhs = transpileNode(pattern.right as any, apis, args, locals);
      return `${transpilePattern(pattern.left, apis, args, locals)} = ${rhs}`;
    }
    case 'ObjectPattern':
      return `{ ${pattern.properties.map(p => transpilePattern(p.value, apis, args, locals)).join(', ')} }`;
    case 'MemberExpression': {
      return transpileMember(pattern, apis, args, locals);
    }
    default:
      return '';
  }
}

export function transpileNode(
  node: ExpressionNode,
  apis: Array<string>,
  args: Array<string>,
  locals: Array<string>,
): string {
  switch (node.type) {
    case 'ExpressionStatement': {
      const expr = transpileNode(node.expression, apis, args, locals);
      return `${expr};`;
    }
    case 'VariableDeclaration': {
      const decls = node.declarations
        .map(m => {
          const variable = transpilePattern(m.id, apis, args, locals);

          if (m.init) {
            const init = transpileNode(m.init, apis, args, locals);
            locals.push(variable);
            return `${variable} = ${init}`;
          } else {
            locals.push(variable);
            return variable;
          }
        })
        .join(', ');
      return `${node.kind} ${decls};`;
    }
    case 'CallExpression': {
      const fn = transpileNode(node.callee as any, apis, args, locals);
      const params = node.arguments.map(a => transpileNode(a as any, apis, args, locals)).join(', ');
      return `${fn}(${params})`;
    }
    case 'MemberExpression': {
      return transpileMember(node, apis, args, locals);
    }
    case 'ObjectExpression': {
      const properties = node.properties
        .map(p => {
          const x = p as any;

          if (x.type === 'SpreadElement') {
            const arg = transpileNode(x.argument, apis, args, locals);
            return `...(${arg})`;
          }

          const key = transpileNode(p.key, [], [], locals);

          if (!p.shorthand || [...args, ...apis].indexOf(key) >= 0) {
            const value = transpileNode(p.value as any, apis, args, locals);
            return p.computed ? `[${key}]: ${value}` : `${key}: ${value}`;
          }

          return key;
        })
        .join(', ');
      return `({ ${properties} })`;
    }
    case 'ArrayExpression': {
      const elements = node.elements.map(m => transpileNode(m as any, apis, args, locals)).join(', ');
      return `[${elements}]`;
    }
    case 'TemplateLiteral': {
      const exprs = node.expressions.map(m => transpileNode(m, apis, args, locals));
      const parts = node.quasis.map(m => m.value.raw);
      const snippets = ['`', parts[0], '`'];

      for (let i = 0; i < exprs.length; i++) {
        snippets.splice(2 + 4 * i, 0, '${', exprs[i], '}', parts[i + 1]);
      }

      return snippets.join('');
    }
    case 'AwaitExpression': {
      const expr = transpileNode(node.argument, apis, args, locals);
      return `await ${expr}`;
    }
    case 'ConditionalExpression': {
      const condition = transpileNode(node.test, apis, args, locals);
      const primary = transpileNode(node.consequent, apis, args, locals);
      const secondary = transpileNode(node.alternate, apis, args, locals);
      return `((${condition}) ? (${primary}) : (${secondary}))`;
    }
    case 'LogicalExpression': {
      const left = transpileNode(node.left, apis, args, locals);
      const right = transpileNode(node.right, apis, args, locals);
      return `(${left} ${node.operator} ${right})`;
    }
    case 'AssignmentExpression': {
      const variable =
        node.left.type === 'Identifier'
          ? transpileNode(node.left, apis, args, locals)
          : transpilePattern(node.left, apis, args, locals);
      const value = transpileNode(node.right, apis, args, locals);
      return `(${variable} = ${value})`;
    }
    case 'BinaryExpression': {
      const left = transpileNode(node.left as any, apis, args, locals);
      const right = transpileNode(node.right as any, apis, args, locals);
      return `(${left} ${node.operator} ${right})`;
    }
    case 'UpdateExpression':
    case 'UnaryExpression': {
      const value = transpileNode(node.argument as any, apis, args, locals);

      if (node.prefix) {
        return `(${node.operator}${value})`;
      }

      return `(${value}${node.operator})`;
    }
    case 'ReturnStatement': {
      const expr = node.argument ? transpileNode(node.argument, apis, args, locals) : '';
      return `return ${expr};`;
    }
    case 'Literal': {
      return node.raw || '';
    }
    case 'BlockStatement': {
      const localLocals = [...locals];
      const statements = node.body.map(stmt => transpileNode(stmt as any, apis, args, localLocals)).join(' ');
      return `{ ${statements} }`;
    }
    case 'IfStatement': {
      const condition = transpileNode(node.test, apis, args, locals);
      const primary = transpileNode(node.consequent as any, apis, args, locals);
      const rest = node.alternate ? ` else ${transpileNode(node.alternate as any, apis, args, locals)}` : '';
      return `if (${condition}) ${primary}${rest}`;
    }
    case 'WhileStatement': {
      const condition = transpileNode(node.test, apis, args, locals);
      const body = transpileNode(node.body as any, apis, args, locals);
      return `while (${condition}) ${body}`;
    }
    case 'DoWhileStatement': {
      const condition = transpileNode(node.test, apis, args, locals);
      const body = transpileNode(node.body as any, apis, args, locals);
      return `do ${body} while (${condition});`;
    }
    case 'ForStatement': {
      const init = node.init ? transpileNode(node.init, apis, args, locals).replace(/;$/, '') : '';
      const test = node.test ? transpileNode(node.test, apis, args, locals) : '';
      const update = node.update ? transpileNode(node.update, apis, args, locals) : '';
      const body = transpileNode(node.body as any, apis, args, locals);
      return `for (${init}; ${test}; ${update}) ${body}`;
    }
    case 'ArrowFunctionExpression': {
      const params = node.params.map(p => transpilePattern(p, apis, args, locals));
      const body = transpileNode(node.body as any, apis, args, [...locals, ...params]);
      const async = node.async ? 'async ' : '';
      return `(${async}(${params.join(', ')}) => ${body})`;
    }
    case 'Identifier': {
      return getIdentifier(node.name, apis, args, locals);
    }
    case 'DebuggerStatement': {
      return 'debugger;';
    }
    case 'ParenthesizedExpression': {
      return transpileNode(node.expression, apis, args, locals);
    }
    default:
      return '';
  }
}
