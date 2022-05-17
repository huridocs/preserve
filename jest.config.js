/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/specs/**spec.ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  modulePaths: ['<rootDir>'],
  globals: { fetch, Response, Request },
};
