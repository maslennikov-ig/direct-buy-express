import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const slaQueue = new Queue('sla-timers', { connection });

export const QueueJobs = {
    CLOSE_AUCTION: 'CLOSE_AUCTION',
    AWAITING_DEPOSIT: 'AWAITING_DEPOSIT',
    AWAITING_DOCS: 'AWAITING_DOCS',
    AWAITING_INVESTOR_DECISION: 'AWAITING_INVESTOR_DECISION'
};
