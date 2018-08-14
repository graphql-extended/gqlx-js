import { Pattern } from 'estree';

export function getNames(params: Array<Pattern>) {
  const names: Array<string> = [];

  for (const param of params) {
    switch (param.type) {
      case 'Identifier':
        names.push(param.name);
        break;
      case 'ArrayPattern':
        names.push(...getNames(param.elements));
        break;
      case 'AssignmentPattern':
        names.push(...getNames([param.left]));
        break;
      case 'ObjectPattern':
        for (const property of param.properties) {
          names.push(...getNames([property.value]));
        }

        break;
      case 'MemberExpression':
      case 'RestElement':
        break;
    }
  }

  return names;
}
