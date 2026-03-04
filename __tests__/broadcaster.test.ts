import { describe, expect, it, vi, beforeEach } from 'vitest';
import { broadcastLotToInvestors } from '../bot/utils/broadcaster';
import { bot } from '../bot/index';
import { prisma } from '../lib/db';
import { findMatchingInvestors } from '../lib/matcher';
import { Prisma } from '@prisma/client';

vi.mock('../bot/index', () => ({
    bot: {
        api: {
            sendMessage: vi.fn(),
        },
    },
}));

vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('../lib/matcher', () => ({
    findMatchingInvestors: vi.fn(),
}));

describe('Broadcaster Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should ignore lots that are not in AUCTION status', async () => {
        (prisma.lot.findUnique as any).mockResolvedValue({ status: 'DRAFT' });
        await broadcastLotToInvestors('lot-draft');
        expect(findMatchingInvestors).not.toHaveBeenCalled();
        expect(bot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should broadcast message to all matched investors', async () => {
        const mockLot = {
            id: 'lot1',
            status: 'AUCTION',
            address: 'Moscow',
            area: 50,
            floor: 5,
            rooms: 2,
            expectedPrice: new Prisma.Decimal(15000000),
        };

        const mockInvestors = [
            { user: { telegramId: BigInt(100) } },
            { user: { telegramId: BigInt(200) } },
        ];

        (prisma.lot.findUnique as any).mockResolvedValue(mockLot);
        (findMatchingInvestors as any).mockResolvedValue(mockInvestors);

        await broadcastLotToInvestors('lot1');

        expect(findMatchingInvestors).toHaveBeenCalledWith(mockLot);
        expect(bot.api.sendMessage).toHaveBeenCalledTimes(2);

        // Check argument for the first investor
        expect(bot.api.sendMessage).toHaveBeenNthCalledWith(
            1,
            100,
            expect.stringContaining('15000000'),
            expect.objectContaining({ parse_mode: 'HTML' })
        );
    });
});
