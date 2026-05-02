import { afterEach, describe, expect, it, vi } from 'vitest';
import IORedis from 'ioredis';

vi.mock('../lib/db', () => ({
    prisma: {
        setting: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            upsert: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

vi.mock('ioredis', () => ({
    default: vi.fn().mockImplementation(function () {
        return {
        subscribe: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        };
    }),
}));

describe('settings Redis subscriber', () => {
    const originalEnv = {
        NEXT_PHASE: process.env.NEXT_PHASE,
        NODE_ENV: process.env.NODE_ENV,
        REDIS_URL: process.env.REDIS_URL,
    };

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        delete (globalThis as any).redisSubscriberGlobal;
        restoreEnv('NEXT_PHASE', originalEnv.NEXT_PHASE);
        restoreEnv('NODE_ENV', originalEnv.NODE_ENV);
        restoreEnv('REDIS_URL', originalEnv.REDIS_URL);
    });

    it('does not open a Redis subscriber at module import time', async () => {
        process.env.NODE_ENV = 'production';
        process.env.REDIS_URL = 'redis://127.0.0.1:1';

        await import('../lib/settings');

        expect(IORedis).not.toHaveBeenCalled();
    });
});

function restoreEnv(name: string, value: string | undefined) {
    if (value === undefined) {
        delete process.env[name];
        return;
    }
    process.env[name] = value;
}
