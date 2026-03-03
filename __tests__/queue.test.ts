import { describe, expect, it } from 'vitest';
import { slaQueue, QueueJobs } from '../lib/queue/client';
import { slaWorker } from '../lib/queue/worker';

describe('Background Jobs', () => {
    it('should export a configured BullMQ Queue and Worker', () => {
        expect(slaQueue).toBeDefined();
        expect(slaQueue.name).toBe('sla-timers');
        expect(QueueJobs.CLOSE_AUCTION).toBe('CLOSE_AUCTION');
        expect(slaWorker).toBeDefined();
    });
});
