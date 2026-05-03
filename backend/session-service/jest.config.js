/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: [
    '<rootDir>/test/unit/**/*.spec.ts',
    '<rootDir>/test/integration/**/*.spec.ts',
    '<rootDir>/test/e2e/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testEnvironment: 'node',
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/tracing.ts',
    '!src/**/*.module.ts',
    '!src/**/*.d.ts',
    '!src/**/*.orm-entity.ts',
    '!src/**/*.dto.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};

module.exports = config;