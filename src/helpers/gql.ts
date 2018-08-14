import { Token, DocumentNode } from 'graphql';
import { Position } from '../types';

export function getName(tokens: Array<Token>) {
  let hasColon = false;
  let foundRoundClose = false;
  let foundRoundOpen = false;

  for (let i = tokens.length; i--; ) {
    if (tokens[i].kind === ':') {
      if (hasColon && !foundRoundClose) break;
      hasColon = true;
    } else if (tokens[i].kind === ')') {
      foundRoundClose = true;
    } else if (tokens[i].kind === '(') {
      if (!foundRoundClose) break;
      foundRoundOpen = true;
    } else if (tokens[i].kind === 'Name') {
      if (hasColon && foundRoundClose === foundRoundOpen) {
        return tokens[i].value;
      }
    }
  }

  return undefined;
}

export function getMode(tokens: Array<Token>, modes: Array<string>, current: string | undefined) {
  const last = tokens.length - 1;

  if (last - 2 >= 0) {
    if (tokens[last].kind === '{') {
      const previous = tokens[last - 1];
      const initial = tokens[last - 2];

      if (
        initial.kind === 'Name' &&
        initial.value === 'type' &&
        previous.kind === 'Name' &&
        modes.includes(previous.value || '')
      ) {
        return previous.value;
      }
    } else if (tokens[last].kind === '}') {
      return undefined;
    }
  }

  return current;
}

export function getArguments(ast: DocumentNode, typeName: string, fieldName: string) {
  const fields = ast.definitions
    .filter(m => m.kind === 'ObjectTypeDefinition' && m.name.value === typeName)
    .map(m => (m.kind === 'ObjectTypeDefinition' && m.fields) || [])[0];
  const args = fields
    .filter(m => m.name.value === fieldName)
    .map(m => m.arguments || [])
    .map(m => m.map(n => n.name.value))[0];
  return args || [];
}

export function convertToPureGql(source: string, positions: Array<Position>) {
  const fragments: Array<string> = [];
  let previousIndex = 0;

  for (const position of positions) {
    fragments.push(source.substring(previousIndex, position.start));
    previousIndex = position.end;
  }

  fragments.push(source.substring(previousIndex));
  return fragments.join('');
}
