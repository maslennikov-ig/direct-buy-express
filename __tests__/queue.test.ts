import { describe, expect, it, vi, beforeEach } from 'vitest';
import { slaQueue, QueueJobs } from '../lib/queue/client';
import { slaWorker, processJob } from '../lib/queue/worker';
import { Job } from 'bullmq';

// Mock DB
vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
            update: vi.fn()
        },
        $transaction: vi.fn(async (cb) => cb({
            lot: {
                update: vi.fn().mockResolvedValue({})
            }
        }))
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
        it('should update lot status to WAITING_CHOICE and notify owner if it is in AUCTION', async () => {
            const { prisma } = await import('../lib/db');
            const { bot } = await import('../bot/index');

            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-123',
                status: 'AUCTION',
                owner: {
                    telegramId: BigInt(123456)
                }
            });

            const mockJob = {
                name: 'CLOSE_AUCTION',
                data: { lotId: 'lot-123' }
            } as Job;

            await processJob(mockJob);

            expect(prisma.lot.findUnique).toHaveBeenCalledWith({
                where: { id: 'lot-123' },
                include: { owner: true }
            });
            expect(prisma.$transaction).toHaveBeenCalled();
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                123456,
                expect.stringContaining('завершен')
            );
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

            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(bot.api.sendMessage).not.toHaveBeenCalled();
        });

        it('should log warning for unknown job', async () => {
            const mockJob = {
                name: 'UNKNOWN_TASK',
                data: {}
            } as Job;

            await processJob(mockJob);

            expect(console.warn).toHaveBeenCalledWith('Unknown job: UNKNOWN_TASK');
        });
    });
});
