import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'dist-server/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': ['warn', {allow: ['warn', 'error']}],
    },
  },
  {
    files: ['tests/**/*.ts', 'playwright.config.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
