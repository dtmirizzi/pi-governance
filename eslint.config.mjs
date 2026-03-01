import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', '**/dist/', 'node_modules/', 'coverage/', 'docs/.vitepress/', '*.config.*', 'packages/lodash-isequal-shim/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
