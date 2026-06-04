import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Flat config (ESLint 9+). Mirrors the previous .eslintrc.json: lint the
// TypeScript source with the core "recommended" rules plus typescript-eslint's
// "recommended". Build output and coverage are not source, so they are ignored.
export default tseslint.config(
  { ignores: ['dist/**', 'esm/**', 'coverage/**'] },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
);
