import { pushName } from './js';

describe('pushName', () => {
  it('simply gets the identifier', () => {
    const result: Array<string> = [];
    pushName(
      {
        type: 'Identifier',
        name: 'foo',
      },
      result,
    );
    expect(result).toEqual(['foo']);
  });

  it('gets the identifier on the LHS of an assignment', () => {
    const result: Array<string> = [];
    pushName(
      {
        type: 'AssignmentPattern',
        left: {
          type: 'Identifier',
          name: 'foo',
        },
        right: {
          type: 'Literal',
          raw: '"bar"',
          value: 'bar',
        },
      },
      result,
    );
    expect(result).toEqual(['foo']);
  });

  it('gets all identifiers in an array pattern', () => {
    const result: Array<string> = [];
    pushName(
      {
        type: 'ArrayPattern',
        elements: [
          {
            type: 'Identifier',
            name: 'foo',
          },
          {
            type: 'Identifier',
            name: 'bar',
          },
        ],
      },
      result,
    );
    expect(result).toEqual(['foo', 'bar']);
  });

  it('gets the identifier of a rest element', () => {
    const result: Array<string> = [];
    pushName(
      {
        type: 'RestElement',
        argument: {
          type: 'Identifier',
          name: 'rest',
        },
      },
      result,
    );
    expect(result).toEqual(['rest']);
  });

  it('gets all identifiers in an object pattern', () => {
    const result: Array<string> = [];
    pushName(
      {
        type: 'ObjectPattern',
        properties: [
          {
            type: 'Property',
            computed: false,
            shorthand: true,
            key: {
              type: 'Identifier',
              name: 'qux',
            },
            method: false,
            kind: 'init',
            value: {
              type: 'Identifier',
              name: 'qux',
            },
          },
          {
            type: 'Property',
            computed: false,
            shorthand: true,
            key: {
              type: 'Identifier',
              name: 'abc',
            },
            method: false,
            kind: 'init',
            value: {
              type: 'Identifier',
              name: 'abc',
            },
          },
        ],
      },
      result,
    );
    expect(result).toEqual(['qux', 'abc']);
  });

  it('gets identifier in an object pattern despite rename', () => {
    const result: Array<string> = [];
    pushName(
      {
        type: 'ObjectPattern',
        properties: [
          {
            type: 'Property',
            computed: false,
            shorthand: false,
            key: {
              type: 'Identifier',
              name: 'qux',
            },
            method: false,
            kind: 'init',
            value: {
              type: 'Identifier',
              name: 'foo',
            },
          },
        ],
      },
      result,
    );
    expect(result).toEqual(['foo']);
  });

  it('gets identifier in an object pattern despite nested', () => {
    const result: Array<string> = [];
    pushName(
      {
        type: 'ObjectPattern',
        properties: [
          {
            type: 'Property',
            computed: false,
            shorthand: false,
            key: {
              type: 'Identifier',
              name: 'qux',
            },
            method: false,
            kind: 'init',
            value: {
              type: 'ObjectPattern',
              properties: [
                {
                  type: 'Property',
                  computed: false,
                  shorthand: true,
                  key: {
                    type: 'Identifier',
                    name: 'bar',
                  },
                  method: false,
                  kind: 'init',
                  value: {
                    type: 'Identifier',
                    name: 'bar',
                  },
                },
              ],
            },
          },
        ],
      },
      result,
    );
    expect(result).toEqual(['bar']);
  });
});
