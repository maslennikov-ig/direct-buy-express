import { describe, expect, it, vi, beforeEach } from 'vitest';
import { processJob } from '../lib/queue/worker';
import { prisma } from '../lib/db';
import { bot } from '../bot/index';

vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        $transaction: vi.fn().mockImplementation((cb: any) => cb(prisma)),
    },
}));

vi.mock('../bot/index', () => ({
    bot: {
        api: {
            sendMessage: vi.fn(),
        },
    },
}));

describe('Worker SLA Tests: SLA_INVESTOR_REVIEW', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    it('should notify manager and remind investor when SLA expires', async () => {
        const mockLot = {
            id: 'lot-inv-1',
            status: 'INVESTOR_REVIEW',
            address: 'ул. Тверская, д. 15',
            owner: { telegramId: BigInt(111), fullName: 'Иванов А.' },
            winner: { telegramId: BigInt(222), fullName: 'Смирнов К.' },
        };

        (prisma.lot.findUnique as any).mockResolvedValue(mockLot);

        const originalEnv = process.env.MANAGER_CHAT_ID;
        process.env.MANAGER_CHAT_ID = '999';

        await processJob({
            name: 'SLA_INVESTOR_REVIEW',
            data: { lotId: 'lot-inv-1' },
        } as any);

        // Should notify manager
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('SLA')
        );

        // Should remind investor
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            222,
            expect.stringContaining('решение')
        );

        process.env.MANAGER_CHAT_ID = originalEnv;
    });

    it('should skip if lot is not in INVESTOR_REVIEW status', async () => {
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-inv-2',
            status: 'MANAGER_HANDOFF',
        });

        await processJob({
            name: 'SLA_INVESTOR_REVIEW',
            data: { lotId: 'lot-inv-2' },
        } as any);

        expect(bot.api.sendMessage).not.toHaveBeenCalled();
    });
});
