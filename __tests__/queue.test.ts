import { describe, expect, it, vi, beforeEach } from 'vitest';
import { slaQueue, QueueJobs } from '../lib/queue/client';
import { slaWorker, processJob } from '../lib/queue/worker';
import { Job } from 'bullmq';

// Mock DB
vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
    }
}));

// Mock Bot
vi.mock('../bot/index', () => ({
    bot: {
        api: {
            sendMessage: vi.fn().mockResolvedValue(true)
        }
    }
}));

// Mock owner-choice
vi.mock('../bot/handlers/owner-choice', () => ({
    sendOwnerChoiceOffer: vi.fn(),
}));

// Mock Redis connection
vi.mock('ioredis', () => {
    return {
        default: vi.fn().mockImplementation(function () {
            return {
                on: vi.fn(),
            };
        })
    }
});

// Mock Logger
vi.mock('../lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe('Background Jobs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('should export a configured BullMQ Queue and Worker', () => {
        expect(slaQueue).toBeDefined();
        expect(slaQueue.name).toBe('sla-timers');
        expect(QueueJobs.CLOSE_AUCTION).toBe('CLOSE_AUCTION');
        expect(slaWorker).toBeDefined();
    });

    describe('processJob', () => {
        it('should update lot status to WAITING_CHOICE and call sendOwnerChoiceOffer', async () => {
            const { prisma } = await import('../lib/db');
            const { sendOwnerChoiceOffer } = await import('../bot/handlers/owner-choice');

            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-123',
                status: 'AUCTION',
                owner: {
                    telegramId: BigInt(123456)
                },
                bids: []
            });

            const mockJob = {
                name: 'CLOSE_AUCTION',
                data: { lotId: 'lot-123' }
            } as Job;

            await processJob(mockJob);

            expect(prisma.lot.findUnique).toHaveBeenCalledWith({
                where: { id: 'lot-123' },
                include: {
                    owner: true,
                    bids: {
                        orderBy: { amount: 'desc' },
                        include: { investor: true }
                    }
                }
            });
            expect(prisma.lot.updateMany).toHaveBeenCalledWith({
                where: { id: 'lot-123', status: 'AUCTION' },
                data: { status: 'WAITING_CHOICE' }
            });
            expect(sendOwnerChoiceOffer).toHaveBeenCalledWith('lot-123', expect.anything());
        });

        it('should ignore if lot is not in AUCTION status', async () => {
            const { prisma } = await import('../lib/db');
            const { bot } = await import('../bot/index');

            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-123',
                status: 'DRAFT',
            });

            const mockJob = {
                name: 'CLOSE_AUCTION',
                data: { lotId: 'lot-123' }
            } as Job;

            await processJob(mockJob);

            expect(prisma.lot.updateMany).not.toHaveBeenCalled();
            expect(bot.api.sendMessage).not.toHaveBeenCalled();
        });

        it('should skip notifications if updateMany returns count 0', async () => {
            const { prisma } = await import('../lib/db');
            const { bot } = await import('../bot/index');
            const { sendOwnerChoiceOffer } = await import('../bot/handlers/owner-choice');

            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-123',
                status: 'AUCTION',
                owner: { telegramId: BigInt(123456) },
                bids: []
            });
            (prisma.lot.updateMany as any).mockResolvedValue({ count: 0 });

            const mockJob = {
                name: 'CLOSE_AUCTION',
                data: { lotId: 'lot-123' }
            } as Job;

            await processJob(mockJob);

            expect(bot.api.sendMessage).not.toHaveBeenCalled();
            expect(sendOwnerChoiceOffer).not.toHaveBeenCalled();
        });

        it('should log warning for unknown job', async () => {
            const mockJob = {
                name: 'UNKNOWN_TASK',
                data: {}
            } as Job;

            await processJob(mockJob);

            const { logger } = await import('../lib/logger');
            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({ jobName: 'UNKNOWN_TASK' }),
                expect.stringContaining('Unknown job')
            );
        });
    });
});
