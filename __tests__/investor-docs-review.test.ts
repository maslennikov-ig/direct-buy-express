import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock prisma
vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
            updateMany: vi.fn(),
        },
        media: {
            findMany: vi.fn(),
        },
    },
}));

// Mock bot
vi.mock('../bot/index', () => ({
    bot: {
        api: {
            sendMessage: vi.fn().mockResolvedValue({}),
        },
    },
}));

import { prisma } from '../lib/db';
import { bot } from '../bot/index';

describe('Phase 10: Investor Document Review Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Investor Callback → Manager Handoff', () => {
        it('should handle investor approval → MANAGER_HANDOFF', async () => {
            const mockLot = {
                id: 'lot-1',
                status: 'MANAGER_HANDOFF',
                address: 'ул. Тверская, д. 15',
                owner: { telegramId: BigInt(111), fullName: 'Иванов А.' },
                winner: { telegramId: BigInt(222), fullName: 'Смирнов К.' },
            };

            // CR-1: updateMany returns count
            (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });
            (prisma.lot.findUnique as any).mockResolvedValue(mockLot);

            const { handleInvestorDocsDecision } = await import('../bot/handlers/investor-docs-decision');
            await handleInvestorDocsDecision('lot-1', 'approved', bot.api as any);

            expect(prisma.lot.updateMany).toHaveBeenCalledWith({
                where: { id: 'lot-1', status: 'INVESTOR_REVIEW' },
                data: {
                    status: 'MANAGER_HANDOFF',
                    investorDecision: 'approved',
                },
            });

            // Both parties notified
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                111,
                expect.stringContaining('менеджер')
            );
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                222,
                expect.stringContaining('менеджер')
            );
        });

        it('should handle investor rejection → MANAGER_HANDOFF', async () => {
            const mockLot = {
                id: 'lot-2',
                status: 'MANAGER_HANDOFF',
                address: 'Невский пр., д. 45',
                owner: { telegramId: BigInt(333), fullName: 'Петров И.' },
                winner: { telegramId: BigInt(444), fullName: 'Козлов Д.' },
            };

            (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });
            (prisma.lot.findUnique as any).mockResolvedValue(mockLot);

            const { handleInvestorDocsDecision } = await import('../bot/handlers/investor-docs-decision');
            await handleInvestorDocsDecision('lot-2', 'rejected', bot.api as any);

            expect(prisma.lot.updateMany).toHaveBeenCalledWith({
                where: { id: 'lot-2', status: 'INVESTOR_REVIEW' },
                data: {
                    status: 'MANAGER_HANDOFF',
                    investorDecision: 'rejected',
                },
            });

            // Owner gets warning, investor gets thank-you
            expect(bot.api.sendMessage).toHaveBeenCalledWith(333, expect.stringContaining('менеджер'));
            expect(bot.api.sendMessage).toHaveBeenCalledWith(444, expect.stringContaining('менеджер'));
        });

        it('should skip if lot is already processed (double-click protection)', async () => {
            // CR-1: updateMany returns count=0 if lot was already processed
            (prisma.lot.updateMany as any).mockResolvedValue({ count: 0 });

            const { handleInvestorDocsDecision } = await import('../bot/handlers/investor-docs-decision');
            await handleInvestorDocsDecision('lot-3', 'approved', bot.api as any);

            expect(prisma.lot.findUnique).not.toHaveBeenCalled();
            expect(bot.api.sendMessage).not.toHaveBeenCalled();
        });

        it('should notify manager via MANAGER_CHAT_ID (CR-2)', async () => {
            process.env.MANAGER_CHAT_ID = '999';

            const mockLot = {
                id: 'lot-4',
                address: 'ул. Арбат, д. 10',
                owner: { telegramId: BigInt(555), fullName: 'Сидоров Н.' },
                winner: { telegramId: BigInt(666), fullName: 'Волкова Е.' },
            };

            (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });
            (prisma.lot.findUnique as any).mockResolvedValue(mockLot);

            const { handleInvestorDocsDecision } = await import('../bot/handlers/investor-docs-decision');
            await handleInvestorDocsDecision('lot-4', 'approved', bot.api as any);

            // Manager should be notified
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                999,
                expect.stringContaining('Свяжитесь с обеими сторонами')
            );

            delete process.env.MANAGER_CHAT_ID;
        });
    });
});
