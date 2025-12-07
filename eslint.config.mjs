import { defineConfig } from 'eslint/config';
import { createConfig } from '@homer0/eslint-plugin/create';

export default defineConfig([
  createConfig({
    importUrl: import.meta.url,
    ignores: ['tests/**', 'docs/**', '.prettierrc.mjs', 'src/5to6-codemod/**'],
    configs: ['node-with-prettier', 'jsdoc'],
    addTsParser: false,
    sourceType: 'commonjs',
  }),
  createConfig({
    importUrl: import.meta.url,
    files: 'all-inside:./tests',
    configs: ['node-with-prettier', 'tests', 'jsdoc'],
    addTsParser: false,
    languageOptions: {
      parserOptions: {
        sourceType: 'commonjs',
      },
      globals: {
        it: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      'no-use-before-define': 'off',
    },
  }),
]);
