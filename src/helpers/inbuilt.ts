import { parseExpressionAt } from 'acorn';
import { BlockStatement, CallExpression, Statement, Expression } from 'estree';
import { insertNewValue, callFunction } from './ast';

function produceFrom(input: string) {
  return parseExpressionAt(input, 0, { ecmaVersion: 9, preserveParens: true }) as Expression;
}

function insertNewValueAtTop(statements: Array<Statement>, name: string, init: Expression) {
  insertNewValue(statements, name, init, statements.length);
}

const inbuiltFunctions = {
  either(block: BlockStatement) {
    insertNewValueAtTop(block.body, 'either', produceFrom('(x, value) => x === undefined ? value : x'));
  },
  use(block: BlockStatement) {
    insertNewValueAtTop(block.body, 'use', produceFrom('(x, cb) => cb(x)'));
  },
  cq(block: BlockStatement) {
    const filterKeys = produceFrom(
      'Object.keys(obj).filter(m => obj[m] !== undefined && obj[m] !== null)',
    ) as CallExpression;
    insertNewValueAtTop(block.body, 'cq', {
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
            optional: false,
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
                  computed: false,
                  optional: false,
                  object: {
                    type: 'CallExpression',
                    callee: {
                      type: 'MemberExpression',
                      computed: false,
                      optional: false,
                      object: filterKeys,
                      property: {
                        type: 'Identifier',
                        name: 'map',
                      },
                    },
                    optional: false,
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
                            callFunction('encodeURIComponent', {
                              type: 'Identifier',
                              name: 'm',
                            }),
                            callFunction('encodeURIComponent', {
                              type: 'MemberExpression',
                              computed: true,
                              optional: false,
                              object: {
                                type: 'Identifier',
                                name: 'obj',
                              },
                              property: {
                                type: 'Identifier',
                                name: 'm',
                              },
                            }),
                          ],
                        },
                      },
                    ],
                  },
                  property: {
                    type: 'Identifier',
                    name: 'join',
                  },
                },
                optional: false,
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
  return inbuiltFunctionNames.reduce((prev, curr) => {
    prev[curr] = false;
    return prev;
  }, {} as GenerateHelpersOptions);
}

export function generateHelpers(generate: GenerateHelpersOptions, block: BlockStatement) {
  const names = inbuiltFunctionNames.filter(m => generate[m] === true);

  for (const name of names) {
    const generateHelper = inbuiltFunctions[name];
    generateHelper(block);
  }
}
