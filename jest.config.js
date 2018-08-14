module.exports = {
  transform: {
    '^.+\\.ts$': './node_modules/ts-jest/preprocessor.js',
  },
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(js|ts)$',
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
  ],
  moduleDirectories: ['<rootDir>/node_modules', '<rootDir>/src'],
  modulePaths: ['src', 'node_modules'],
  globals: {
    NODE_ENV: 'test',
  },
  testPathIgnorePatterns: [],
};
