import { describe, expect, it, vi, beforeEach } from 'vitest';
import { processJob } from '../lib/queue/worker';
import { prisma } from '../lib/db';
import { bot } from '../bot/index';

vi.mock('../bot/handlers/owner-choice', () => ({
    sendOwnerChoiceOffer: vi.fn(),
}));

vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
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

vi.mock('../lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe('Worker SLA Tests: SLA_OFFER_RESPONSE', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.MANAGER_CHAT_ID = '999';
    });

    it('should notify manager and remind owner when offer SLA expires', async () => {
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-1',
            status: 'WAITING_CHOICE',
            address: 'ул. Тестовая, 1',
            owner: { telegramId: BigInt(111), fullName: 'Собственник' },
        });

        await processJob({ name: 'SLA_OFFER_RESPONSE', data: { lotId: 'lot-1' } } as any);

        // Manager notification
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('не принял решение по предложениям')
        );
        // Owner reminder
        expect(bot.api.sendMessage).toHaveBeenCalledWith(
            111,
            expect.stringContaining('Время на принятие решения')
        );
        expect(bot.api.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should skip if lot is not in WAITING_CHOICE status', async () => {
        (prisma.lot.findUnique as any).mockResolvedValue({
            id: 'lot-1',
            status: 'WAITING_DOCS', // Already chose
        });

        await processJob({ name: 'SLA_OFFER_RESPONSE', data: { lotId: 'lot-1' } } as any);

        expect(bot.api.sendMessage).not.toHaveBeenCalled();
    });
});
