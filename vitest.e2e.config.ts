import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
    test: {
        include: ['**/__tests__/e2e/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', '.worktrees/**'],
    },
});
