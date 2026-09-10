import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig({
  files: ['**/*.ts'],
  extends: [js.configs.recommended, tseslint.configs.recommended, prettier],
  languageOptions: {
    globals: globals.node,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignores: ['node_modules', 'dist', 'coverage'],
});
