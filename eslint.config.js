import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'realtime']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      {
        rules: {
          'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true, allowExportNames: ['Route'] },
          ],
        },
      },
      {
        files: ['src/routes/**/*.{ts,tsx}'],
        rules: { 'react-refresh/only-export-components': 'off' },
      },
      {
        // shadcn/ui の生成部品はコンポーネントに加えて cva の *Variants も
        // export する規約のため（button の buttonVariants 等）、Fast Refresh の
        // 単一 export 制約から除外する。routes と同じ扱い。
        files: ['src/components/ui/**/*.{ts,tsx}'],
        rules: { 'react-refresh/only-export-components': 'off' },
      },
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
