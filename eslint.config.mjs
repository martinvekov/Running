import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const nodeIoModules = [
  'fs',
  'fs/promises',
  'net',
  'http',
  'https',
  'child_process',
  'dgram',
  'dns',
  'tls',
  'worker_threads',
];

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/next-env.d.ts'] },
  ...tseslint.configs.recommended,
  ...compat
    .extends('next/core-web-vitals', 'next/typescript')
    .map((config) => ({ ...config, files: ['apps/web/**/*.{ts,tsx}'] })),
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    settings: { next: { rootDir: 'apps/web' } },
  },
  // CLAUDE.md rule 2: the engine is pure and deterministic.
  {
    files: ['packages/engine/src/**/*.ts'],
    ignores: ['packages/engine/src/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'The engine is pure: pass time in instead of calling Date.now().',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'The engine is pure: pass time in instead of calling new Date().',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'The engine is deterministic: no Math.random().',
        },
        {
          selector: "MemberExpression[object.name='crypto']",
          message: 'The engine is deterministic: no crypto randomness or ids.',
        },
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'The engine has no I/O.',
        },
        {
          selector: "MemberExpression[object.name='process']",
          message: 'The engine has no I/O or environment access.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: nodeIoModules.flatMap((m) => [m, `node:${m}`]),
          patterns: ['@supabase/*'],
        },
      ],
    },
  },
);
