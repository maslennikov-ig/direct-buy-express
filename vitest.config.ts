import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
    test: {
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '.worktrees/**',
            // E2E tests require a live DB — run separately with pnpm test:e2e
            '**/__tests__/e2e/**',
        ],
    },
});
