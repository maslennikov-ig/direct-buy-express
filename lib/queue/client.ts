import { Queue } from 'bullmq';
import { connection } from './connection';

export const slaQueue = new Queue('sla-timers', { connection: connection as any });

export const QueueJobs = {
    CLOSE_AUCTION: 'CLOSE_AUCTION',
    SLA_DOCS_UPLOAD: 'SLA_DOCS_UPLOAD',
    SLA_INVESTOR_REVIEW: 'SLA_INVESTOR_REVIEW',
    SLA_OFFER_RESPONSE: 'SLA_OFFER_RESPONSE',
};
