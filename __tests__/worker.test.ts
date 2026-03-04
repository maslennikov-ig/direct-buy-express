import { describe, expect, it, vi, beforeEach } from 'vitest';
import { processJob } from '../lib/queue/worker';
import { prisma } from '../lib/db';
import { bot } from '../bot/index';
import { Prisma } from '@prisma/client';

vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(prisma)),
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

        expect(prisma.lot.update).not.toHaveBeenCalled();
    });

    it('should close auction, notify owner and investors', async () => {
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

        expect(prisma.lot.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'WAITING_CHOICE' } })
        );

        // Notify 1 owner and 2 investors = 3 messages total
        expect(bot.api.sendMessage).toHaveBeenCalledTimes(3);

        // Check owner message
        expect(bot.api.sendMessage).toHaveBeenNthCalledWith(
            1,
            111,
            expect.stringContaining('завершен')
        );

        // Check investor messages
        expect(bot.api.sendMessage).toHaveBeenNthCalledWith(
            2,
            222,
            expect.stringContaining('Сбор предложений завершен по лоту')
        );
        expect(bot.api.sendMessage).toHaveBeenNthCalledWith(
            3,
            333,
            expect.stringContaining('Сбор предложений завершен по лоту')
        );
    });
});
