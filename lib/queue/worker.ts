import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const slaWorker = new Worker('sla-timers', async job => {
    switch (job.name) {
        case 'CLOSE_AUCTION':
            console.log(`Closing auction for lot ${job.data.lotId}`);
            // Logic to transition lot from AUCTION to WAITING_CHOICE
            break;
        default:
            console.warn(`Unknown job: ${job.name}`);
    }
}, { connection });
