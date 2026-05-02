import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadE2ETestEnv } from './scripts/e2e/env';

const e2eEnv = loadE2ETestEnv();
Object.assign(process.env, e2eEnv);

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
    test: {
        env: e2eEnv,
        include: ['**/__tests__/e2e/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', '.worktrees/**'],
    },
});
