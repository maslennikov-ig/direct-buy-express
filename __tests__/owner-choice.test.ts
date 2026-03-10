import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { calculateNetAmount, sendOwnerChoiceOffer, handleOwnerChoice } from '../bot/handlers/owner-choice';
import { prisma } from '../lib/db';
import { bot } from '../bot/index';
import { slaQueue } from '../lib/queue/client';

vi.mock('../lib/db', () => ({
    prisma: {
        lot: {
            findUnique: vi.fn(),
            updateMany: vi.fn(),
        },
        bid: {
            findUnique: vi.fn(),
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

vi.mock('../lib/queue/client', () => ({
    slaQueue: {
        add: vi.fn(),
        getJob: vi.fn().mockResolvedValue(null),
    },
    QueueJobs: {
        CLOSE_AUCTION: 'CLOSE_AUCTION',
        SLA_DOCS_UPLOAD: 'SLA_DOCS_UPLOAD',
        SLA_INVESTOR_REVIEW: 'SLA_INVESTOR_REVIEW',
        SLA_OFFER_RESPONSE: 'SLA_OFFER_RESPONSE',
    },
}));

vi.mock('../lib/settings', () => ({
    getNumericSetting: vi.fn().mockImplementation((_key: string, fallback: number) => Promise.resolve(fallback)),
    SettingKeys: {
        MANAGER_CHAT_ID: 'MANAGER_CHAT_ID',
        PLATFORM_FEE_RUB: 'PLATFORM_FEE_RUB',
        SLA_DOCS_UPLOAD_HOURS: 'SLA_DOCS_UPLOAD_HOURS',
        SLA_INVESTOR_REVIEW_HOURS: 'SLA_INVESTOR_REVIEW_HOURS',
        SLA_OFFER_RESPONSE_HOURS: 'SLA_OFFER_RESPONSE_HOURS',
        BOT_ACTIVE: 'BOT_ACTIVE',
    },
}));

describe('Owner Choice Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.MANAGER_CHAT_ID = '999';
    });

    describe('calculateNetAmount', () => {
        it('should subtract 100,000 platform fee from bid amount', async () => {
            expect(await calculateNetAmount(5_000_000)).toBe(4_900_000);
            expect(await calculateNetAmount(10_000_000)).toBe(9_900_000);
            expect(await calculateNetAmount(100_000)).toBe(0);
            expect(await calculateNetAmount(50_000)).toBe(-50_000);
        });
    });

    describe('sendOwnerChoiceOffer', () => {
        it('should send top bids with calculator to owner', async () => {
            const mockLot = {
                id: 'lot-1',
                address: 'ул. Ленина, 1',
                owner: { telegramId: BigInt(111), fullName: 'Иван' },
                bids: [
                    { id: 'bid-1', amount: new Prisma.Decimal('5000000'), investor: { fullName: 'Инвестор 1' } },
                    { id: 'bid-2', amount: new Prisma.Decimal('4500000'), investor: { fullName: 'Инвестор 2' } },
                ],
            };
            (prisma.lot.findUnique as any).mockResolvedValue(mockLot);

            await sendOwnerChoiceOffer('lot-1', bot.api);

            expect(bot.api.sendMessage).toHaveBeenCalledTimes(1);
            const call = (bot.api.sendMessage as any).mock.calls[0];
            expect(call[0]).toBe(111);
            expect(call[1]).toContain('ИТОГИ АУКЦИОНА');
            expect(call[1]).toContain('4');
            expect(call[1]).toContain('900');
            expect(call[1]).toContain('000');
            expect(call[1]).toContain('на руки');
            expect(call[2].reply_markup.inline_keyboard).toHaveLength(3); // 2 agree + 1 reject
        });

        it('should handle lot with no bids', async () => {
            const mockLot = {
                id: 'lot-2',
                address: 'ул. Мира, 5',
                owner: { telegramId: BigInt(222) },
                bids: [],
            };
            (prisma.lot.findUnique as any).mockResolvedValue(mockLot);

            await sendOwnerChoiceOffer('lot-2', bot.api);

            expect(bot.api.sendMessage).toHaveBeenCalledTimes(1);
            const call = (bot.api.sendMessage as any).mock.calls[0];
            expect(call[1]).toContain('не поступило ни одного предложения');
        });

        it('should handle lot not found', async () => {
            (prisma.lot.findUnique as any).mockResolvedValue(null);

            await sendOwnerChoiceOffer('lot-missing', bot.api);

            expect(bot.api.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('handleOwnerChoice — agreed', () => {
        it('should set winnerId, transition to WAITING_DOCS, and schedule SLA', async () => {
            const mockBid = {
                id: 'bid-1',
                lotId: 'lot-1',
                investorId: 'investor-1',
                amount: new Prisma.Decimal('5000000'),
                investor: { telegramId: BigInt(333), fullName: 'Инвестор' },
            };
            (prisma.bid.findUnique as any).mockResolvedValue(mockBid);
            (prisma.lot.updateMany as any).mockResolvedValue({ count: 1 });
            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-1',
                address: 'ул. Ленина, 1',
                owner: { telegramId: BigInt(111), fullName: 'Собственник' },
            });

            await handleOwnerChoice('lot-1', 'bid-1', 'agreed', bot.api);

            // Verify lot update
            expect(prisma.lot.updateMany).toHaveBeenCalledWith({
                where: { id: 'lot-1', status: 'WAITING_CHOICE' },
                data: { winnerId: 'investor-1', status: 'WAITING_DOCS' },
            });

            // Verify SLA job scheduled
            expect(slaQueue.add).toHaveBeenCalledWith(
                'SLA_DOCS_UPLOAD',
                { lotId: 'lot-1' },
                expect.objectContaining({
                    delay: 2 * 60 * 60 * 1000,
                    jobId: 'sla-docs-upload-lot-1',
                })
            );

            // Notify owner, investor, manager = 3 messages
            expect(bot.api.sendMessage).toHaveBeenCalledTimes(3);
        });

        it('should be idempotent — skip if lot already processed', async () => {
            const mockBid = {
                id: 'bid-1',
                lotId: 'lot-1',
                investorId: 'investor-1',
                amount: new Prisma.Decimal('5000000'),
                investor: { telegramId: BigInt(333) },
            };
            (prisma.bid.findUnique as any).mockResolvedValue(mockBid);
            (prisma.lot.updateMany as any).mockResolvedValue({ count: 0 }); // Already processed

            await handleOwnerChoice('lot-1', 'bid-1', 'agreed', bot.api);

            expect(slaQueue.add).not.toHaveBeenCalled();
            expect(bot.api.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('handleOwnerChoice — rejected', () => {
        it('should alert manager and notify owner', async () => {
            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-1',
                address: 'ул. Ленина, 1',
                owner: { telegramId: BigInt(111), fullName: 'Собственник' },
            });

            await handleOwnerChoice('lot-1', null, 'rejected', bot.api);

            // Notify manager + owner = 2 messages
            expect(bot.api.sendMessage).toHaveBeenCalledTimes(2);

            // Manager message
            expect(bot.api.sendMessage).toHaveBeenNthCalledWith(
                1,
                999,
                expect.stringContaining('НЕ согласен')
            );

            // Owner gets confirmation
            expect(bot.api.sendMessage).toHaveBeenNthCalledWith(
                2,
                111,
                expect.stringContaining('менеджеру')
            );
        });
    });
});
