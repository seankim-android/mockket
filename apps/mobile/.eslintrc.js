module.exports = {
  root: true,
  extends: [
    'expo',
    'prettier',
  ],
  plugins: ['import'],
  rules: {
    // No explicit any — use unknown for untyped external data
    '@typescript-eslint/no-explicit-any': 'error',
    // No unused vars (allow underscore-prefixed)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Import order — enforces CONTRIBUTING.md conventions
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          { pattern: 'react', group: 'builtin', position: 'before' },
          { pattern: 'react-native', group: 'builtin', position: 'before' },
          { pattern: 'expo*', group: 'external', position: 'before' },
          { pattern: '@mockket/**', group: 'internal', position: 'before' },
          { pattern: '@/**', group: 'internal', position: 'after' },
        ],
        pathGroupsExcludedImportTypes: ['react', 'react-native'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
  ignorePatterns: ['dist/', '.expo/', 'node_modules/'],
}
