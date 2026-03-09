import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleScheduleMeeting, handleMeetingResponse } from '../bot/handlers/meeting';
import { prisma } from '../lib/db';
import { bot } from '../bot/index';

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

describe('Meeting Scheduling Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.MANAGER_CHAT_ID = '999';
    });

    describe('handleScheduleMeeting', () => {
        it('should notify owner with confirm/reject buttons and alert manager', async () => {
            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-1',
                address: 'ул. Ленина, 1',
                owner: { telegramId: BigInt(111), fullName: 'Собственник' },
                winner: { telegramId: BigInt(222), fullName: 'Инвестор' },
            });

            await handleScheduleMeeting('lot-1', '222', '15.03.2026 14:00', 'ул. Ленина, 1', bot.api);

            // Owner notification with buttons
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                111,
                expect.stringContaining('предлагает встречу'),
                expect.objectContaining({
                    reply_markup: expect.objectContaining({
                        inline_keyboard: expect.arrayContaining([
                            expect.arrayContaining([
                                expect.objectContaining({ text: '✅ Подтверждаю' })
                            ])
                        ])
                    })
                })
            );

            // Manager alert
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                999,
                expect.stringContaining('Запланирована встреча')
            );

            expect(bot.api.sendMessage).toHaveBeenCalledTimes(2);
        });

        it('should handle lot not found', async () => {
            (prisma.lot.findUnique as any).mockResolvedValue(null);

            await handleScheduleMeeting('lot-missing', '222', '15.03.2026', 'addr', bot.api);

            expect(bot.api.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('handleMeetingResponse', () => {
        it('should notify investor and manager when owner confirms', async () => {
            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-1',
                address: 'ул. Ленина, 1',
                owner: { telegramId: BigInt(111), fullName: 'Собственник' },
                winner: { telegramId: BigInt(222), fullName: 'Инвестор' },
            });

            await handleMeetingResponse('lot-1', 'confirmed', bot.api);

            // Investor gets confirmation
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                222,
                expect.stringContaining('подтвердил встречу')
            );

            // Manager gets alert
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                999,
                expect.stringContaining('Встреча подтверждена')
            );

            expect(bot.api.sendMessage).toHaveBeenCalledTimes(2);
        });

        it('should notify investor and manager when owner rejects', async () => {
            (prisma.lot.findUnique as any).mockResolvedValue({
                id: 'lot-1',
                address: 'ул. Ленина, 1',
                owner: { telegramId: BigInt(111), fullName: 'Собственник' },
                winner: { telegramId: BigInt(222), fullName: 'Инвестор' },
            });

            await handleMeetingResponse('lot-1', 'rejected', bot.api);

            // Investor gets rejection notice
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                222,
                expect.stringContaining('не может встретиться')
            );

            // Manager gets alert
            expect(bot.api.sendMessage).toHaveBeenCalledWith(
                999,
                expect.stringContaining('Встреча отклонена')
            );

            expect(bot.api.sendMessage).toHaveBeenCalledTimes(2);
        });
    });
});
