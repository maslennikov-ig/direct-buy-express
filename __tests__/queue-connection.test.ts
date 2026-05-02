import { afterEach, describe, expect, it, vi } from 'vitest';
import IORedis from 'ioredis';

vi.mock('ioredis', () => ({
    default: vi.fn().mockImplementation(function () {
        return {};
    }),
}));

describe('queue Redis connection', () => {
    const originalRedisUrl = process.env.REDIS_URL;

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        if (originalRedisUrl === undefined) {
            delete process.env.REDIS_URL;
        } else {
            process.env.REDIS_URL = originalRedisUrl;
        }
    });

    it('does not eagerly connect while modules are imported during a build', async () => {
        process.env.REDIS_URL = 'redis://127.0.0.1:1';

        await import('../lib/queue/connection');

        expect(IORedis).toHaveBeenCalledWith('redis://127.0.0.1:1', {
            lazyConnect: true,
            maxRetriesPerRequest: null,
        });
    });
});
