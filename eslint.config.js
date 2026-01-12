import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.test.ts', '**/*.test.tsx', 'src/__tests__/**'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      // Prevent explicit 'any' types - set to 'warn' for existing code, change to 'error' after cleanup
      // TODO: Change to 'error' after remaining 7 any types are fixed
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Allow empty interfaces (common pattern for extending)
      '@typescript-eslint/no-empty-object-type': 'off',
      // Allow Function type for now (common in proxy/callback patterns)
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  }
)
