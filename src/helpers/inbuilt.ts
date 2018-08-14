import { insertNewValue, isNotIdentifier } from './ast';
import { BlockStatement, CallExpression } from 'estree';

const inbuiltFunctions = {
  either(block: BlockStatement) {
    insertNewValue(block.body, 'either', {
      type: 'ArrowFunctionExpression',
      async: false,
      expression: true,
      params: [
        {
          type: 'Identifier',
          name: 'x',
        },
        {
          type: 'Identifier',
          name: 'value',
        },
      ],
      body: {
        type: 'ConditionalExpression',
        test: {
          type: 'BinaryExpression',
          left: {
            type: 'Identifier',
            name: 'x',
          },
          right: {
            type: 'Identifier',
            name: 'undefined',
          },
          operator: '===',
        },
        consequent: {
          type: 'Identifier',
          name: 'value',
        },
        alternate: {
          type: 'Identifier',
          name: 'x',
        },
      },
    });
  },
  use(block: BlockStatement) {
    insertNewValue(block.body, 'use', {
      type: 'ArrowFunctionExpression',
      async: false,
      expression: true,
      params: [
        {
          type: 'Identifier',
          name: 'x',
        },
        {
          type: 'Identifier',
          name: 'cb',
        },
      ],
      body: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'cb',
        },
        arguments: [
          {
            type: 'Identifier',
            name: 'x',
          },
        ],
      },
    });
  },
  cq(block: BlockStatement) {
    const filterKeys: CallExpression = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {
              type: 'Identifier',
              name: 'Object',
            },
            property: {
              type: 'Identifier',
              name: 'keys',
            },
            computed: false,
          },
          arguments: [
            {
              type: 'Identifier',
              name: 'obj',
            },
          ],
        },
        property: {
          type: 'Identifier',
          name: 'filter',
        },
        computed: false,
      },
      arguments: [
        {
          type: 'ArrowFunctionExpression',
          async: false,
          expression: true,
          params: [
            {
              type: 'Identifier',
              name: 'm',
            },
          ],
          body: {
            type: 'LogicalExpression',
            left: isNotIdentifier('undefined'),
            right: isNotIdentifier('null'),
            operator: '&&',
          },
        },
      ],
    };
    insertNewValue(block.body, 'cq', {
      type: 'ArrowFunctionExpression',
      async: false,
      expression: true,
      params: [
        {
          type: 'Identifier',
          name: 'url',
        },
        {
          type: 'Identifier',
          name: 'obj',
        },
      ],
      body: {
        type: 'BinaryExpression',
        operator: '+',
        left: {
          type: 'Identifier',
          name: 'url',
        },
        right: {
          type: 'ConditionalExpression',
          test: {
            type: 'MemberExpression',
            computed: false,
            object: filterKeys,
            property: {
              type: 'Identifier',
              name: 'length',
            },
          },
          consequent: {
            type: 'TemplateLiteral',
            quasis: [
              {
                type: 'TemplateElement',
                tail: false,
                value: {
                  cooked: '?',
                  raw: '?',
                },
              },
              {
                type: 'TemplateElement',
                tail: true,
                value: {
                  cooked: '',
                  raw: '',
                },
              },
            ],
            expressions: [
              {
                type: 'CallExpression',
                callee: {
                  type: 'MemberExpression',
                  object: {
                    type: 'CallExpression',
                    callee: {
                      type: 'MemberExpression',
                      object: filterKeys,
                      property: {
                        type: 'Identifier',
                        name: 'map',
                      },
                      computed: false,
                    },
                    arguments: [
                      {
                        type: 'ArrowFunctionExpression',
                        async: false,
                        expression: true,
                        params: [
                          {
                            type: 'Identifier',
                            name: 'm',
                          },
                        ],
                        body: {
                          type: 'TemplateLiteral',
                          quasis: [
                            {
                              type: 'TemplateElement',
                              tail: false,
                              value: {
                                cooked: '',
                                raw: '',
                              },
                            },
                            {
                              type: 'TemplateElement',
                              tail: false,
                              value: {
                                cooked: '=',
                                raw: '=',
                              },
                            },
                            {
                              type: 'TemplateElement',
                              tail: true,
                              value: {
                                cooked: '',
                                raw: '',
                              },
                            },
                          ],
                          expressions: [
                            {
                              type: 'Identifier',
                              name: 'm',
                            },
                            {
                              type: 'MemberExpression',
                              computed: true,
                              object: {
                                type: 'Identifier',
                                name: 'obj',
                              },
                              property: {
                                type: 'Identifier',
                                name: 'm',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                  property: {
                    type: 'Identifier',
                    name: 'join',
                  },
                  computed: false,
                },
                arguments: [
                  {
                    type: 'Literal',
                    value: '&',
                    raw: "'&'",
                  },
                ],
              },
            ],
          },
          alternate: {
            type: 'Literal',
            value: '',
            raw: "''",
          },
        },
      },
    });
  },
};

type Inbuilt = typeof inbuiltFunctions;

export type GenerateHelpersOptions = { [name in keyof Inbuilt]: boolean };

export const inbuiltFunctionNames = Object.keys(inbuiltFunctions) as Array<keyof Inbuilt>;

export function createGenerationMask() {
  return inbuiltFunctionNames.reduce(
    (prev, curr) => {
      prev[curr] = false;
      return prev;
    },
    {} as GenerateHelpersOptions,
  );
}

export function generateHelpers(generate: GenerateHelpersOptions, block: BlockStatement) {
  const names = inbuiltFunctionNames.filter(m => generate[m] === true);

  for (const name of names) {
    const generateHelper = inbuiltFunctions[name];
    generateHelper(block);
  }
}
