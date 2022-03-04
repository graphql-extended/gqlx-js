module.exports = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
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
    'ts-jest': {
      diagnostics: false,
    },
    NODE_ENV: 'test',
  },
  testPathIgnorePatterns: [],
};
