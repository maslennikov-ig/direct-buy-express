import { describe, expect, it, vi, beforeEach } from 'vitest';
import { processJob } from '../lib/queue/worker';
import { prisma } from '../lib/db';
import { bot } from '../bot/index';
import { Prisma } from '@prisma/client';

vi.mock('../bot/handlers/owner-choice', () => ({
    sendOwnerChoiceOffer: vi.fn(),
}));

vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
    },
}));

vi.mock('../bot/index', () => ({
    bot: {
        api: {
            sendMessage: vi.fn(),
        },
    },
}));

describe('Worker SLA Tests: CLOSE_AUCTION', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should ignore if lot is not in AUCTION status', async () => {
        (prisma.lot.findUnique as any).mockResolvedValue({ id: '1', status: 'DRAFT' });

        await processJob({ name: 'CLOSE_AUCTION', data: { lotId: '1' } } as any);

        expect(prisma.lot.updateMany).not.toHaveBeenCalled();
    });

    it('should close auction and notify investors', async () => {
        const mockLot = {
            id: '123',
            status: 'AUCTION',
            owner: { telegramId: BigInt(111) },
            bids: [
                { amount: new Prisma.Decimal('1000'), investor: { telegramId: BigInt(222) } },
                { amount: new Prisma.Decimal('2000'), investor: { telegramId: BigInt(333) } }
            ]
        };

        (prisma.lot.findUnique as any).mockResolvedValue(mockLot);

        await processJob({ name: 'CLOSE_AUCTION', data: { lotId: '123' } } as any);

        // Verify idempotent status transition using updateMany
        expect(prisma.lot.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: '123', status: 'AUCTION' },
                data: { status: 'WAITING_CHOICE' },
            })
        );

        // Only 2 investor notifications (owner notification is now in sendOwnerChoiceOffer, which is mocked)
        expect(bot.api.sendMessage).toHaveBeenCalledTimes(2);

        expect(bot.api.sendMessage).toHaveBeenNthCalledWith(
            1,
            222,
            expect.stringContaining('Сбор предложений завершен по лоту')
        );
        expect(bot.api.sendMessage).toHaveBeenNthCalledWith(
            2,
            333,
            expect.stringContaining('Сбор предложений завершен по лоту')
        );

        // Verify sendOwnerChoiceOffer was called
        const { sendOwnerChoiceOffer } = await import('../bot/handlers/owner-choice');
        expect(sendOwnerChoiceOffer).toHaveBeenCalledWith('123', bot.api);
    });

    it('should skip if updateMany returns count 0 (already processed)', async () => {
        const mockLot = {
            id: '123',
            status: 'AUCTION',
            owner: { telegramId: BigInt(111) },
            bids: []
        };

        (prisma.lot.findUnique as any).mockResolvedValue(mockLot);
        (prisma.lot.updateMany as any).mockResolvedValue({ count: 0 });

        await processJob({ name: 'CLOSE_AUCTION', data: { lotId: '123' } } as any);

        // No notifications should be sent
        expect(bot.api.sendMessage).not.toHaveBeenCalled();
    });
});
