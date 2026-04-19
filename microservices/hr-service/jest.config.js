/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  verbose: true,
  // Docker copies `microservices/shared` to `/app/shared`; locally Jest maps the same layout.
  moduleNameMapper: {
    '^\\.\\./\\.\\./shared/(.*)$': '<rootDir>/../shared/$1',
    '^\\.\\./\\.\\./\\.\\./shared/(.*)$': '<rootDir>/../shared/$1'
  }
};
