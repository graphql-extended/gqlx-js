import { transpileNode } from './transpile';

describe('transpileNode', () => {
  it('serializes a simple addition correctly', () => {
    const result = transpileNode(
      {
        type: 'BinaryExpression',
        left: {
          type: 'Identifier',
          name: 'a',
        },
        right: {
          type: 'Identifier',
          name: 'b',
        },
        operator: '+',
      },
      [],
      ['a'],
      [],
    );
    expect(result).toBe('($data.a + b)');
  });

  it('serializes a function call correctly', () => {
    const result = transpileNode(
      {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'f',
        },
        optional: false,
        arguments: [
          {
            type: 'Identifier',
            name: 'a',
          },
          {
            type: 'Literal',
            raw: '10',
            value: 10,
          },
        ],
      },
      [],
      ['a'],
      [],
    );
    expect(result).toBe('f($data.a, 10)');
  });
});
