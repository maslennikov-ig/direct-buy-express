import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('Database client', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
        originalEnv = process.env.NODE_ENV;
        vi.resetModules();
    });

    afterEach(() => {
        (process.env as any).NODE_ENV = originalEnv;
    });

    it('should store prisma globally if not production', async () => {
        (process.env as any).NODE_ENV = 'development';
        const { prisma } = await import('../lib/db');
        expect(prisma).toBeDefined();
        expect((globalThis as any).prisma).toBe(prisma);
    });

    it('should NOT store prisma globally if production', async () => {
        (process.env as any).NODE_ENV = 'production';
        // clear the global first
        delete (globalThis as any).prisma;

        const { prisma } = await import('../lib/db');
        expect(prisma).toBeDefined();
        expect((globalThis as any).prisma).toBeUndefined();
    });
});
