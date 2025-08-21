import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      // Error prevention
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      
      // Best practices
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'error',
      'prefer-promise-reject-errors': 'error',
      'require-await': 'error',
      
      // Code style (let Prettier handle formatting)
      'linebreak-style': ['error', 'unix'],
      
      // ES6+
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-template': 'error',
      'template-curly-spacing': ['error', 'never'],
    },
  },
  {
    files: ['test/**/*.js'],
    rules: {
      'no-unused-expressions': 'off', // For chai assertions
    },
  },
];