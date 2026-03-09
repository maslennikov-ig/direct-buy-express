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

describe('Worker SLA Tests: SLA_DOCS_UPLOAD', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    it('should notify manager when docs upload SLA expires', async () => {
        const mockLot = {
            id: 'lot-sla-1',
            status: 'WAITING_DOCS',
            owner: { telegramId: BigInt(111), fullName: 'Owner SLA' },
            address: 'г. Москва, ул. Тверская, д. 1',
        };

        (prisma.lot.findUnique as any).mockResolvedValue(mockLot);

        // Set manager chat ID in env
        const originalEnv = process.env.MANAGER_CHAT_ID;
        process.env.MANAGER_CHAT_ID = '999';

        await processJob({
            name: 'SLA_DOCS_UPLOAD',
            data: { lotId: 'lot-sla-1' },
        } as any);

        // Should notify the manager
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('SLA')
        );

        // Should notify the owner
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            111,
            expect.stringContaining('истекло')
        );

        process.env.MANAGER_CHAT_ID = originalEnv;
    });

    it('should skip if lot is not in WAITING_DOCS status', async () => {
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-sla-2',
            status: 'DOCS_AUDIT',
        });

        await processJob({
            name: 'SLA_DOCS_UPLOAD',
            data: { lotId: 'lot-sla-2' },
        } as any);

        expect(bot.api.sendMessage).not.toHaveBeenCalled();
    });
});
