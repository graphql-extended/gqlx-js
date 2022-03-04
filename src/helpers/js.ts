import { Pattern } from 'estree';

export function pushName(param: Pattern, names: Array<string>) {
  switch (param.type) {
    case 'Identifier':
      names.push(param.name);
      break;
    case 'ArrayPattern':
      names.push(...getNames(param.elements));
      break;
    case 'AssignmentPattern':
      pushName(param.left, names);
      break;
    case 'ObjectPattern':
      for (const property of param.properties) {
        if (property.type === 'Property') {
          pushName(property.value, names);
        }
      }

      break;
    case 'RestElement':
      pushName(param.argument, names);
      break;
    case 'MemberExpression':
      break;
  }
}

export function getNames(params: Array<Pattern | null>) {
  const names: Array<string> = [];

  for (const param of params) {
    if (param) {
      pushName(param, names);
    }
  }

  return names;
}
