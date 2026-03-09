import { prisma } from '../../lib/db';
import { logger } from '../../lib/logger';
import type { MyConversation, MyContext } from '../types';

/**
 * Meeting scheduling conversation (ТЗ §6.2):
 * - Triggered after MANAGER_HANDOFF when investor clicks "Schedule meeting"
 * - Collects: date/time and address
 * - Sends notification to owner with confirm/reject buttons
 * - Alerts manager
 */
export async function scheduleMeetingConversation(
    conversation: MyConversation,
    ctx: MyContext
): Promise<void> {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    // Find the lot where this user is the winner and status is MANAGER_HANDOFF
    const lot = await conversation.external(async () => {
        const res = await prisma.lot.findFirst({
            where: {
                winner: { telegramId: BigInt(userId) },
                status: 'MANAGER_HANDOFF',
            },
            include: { owner: true, winner: true },
        });

        if (!res) return null;

        // Strip Prisma Decimal/Date objects to prevent Grammy DataCloneError in conversation state
        return {
            id: res.id,
            address: res.address,
            owner: res.owner ? {
                telegramId: res.owner.telegramId ? Number(res.owner.telegramId) : null,
                fullName: res.owner.fullName,
            } : null,
            winner: res.winner ? {
                fullName: res.winner.fullName,
            } : null,
        };
    });

    if (!lot) {
        await ctx.reply('❌ Нет лотов, ожидающих планирования встречи.');
        return;
    }

    // Ask for date/time
    await ctx.reply(
        `📅 Планирование встречи по лоту "${lot.address}"\n\n` +
        `Введите желаемую дату и время встречи (например: 15.03.2026 14:00):`
    );

    const dateTimeMsg = await conversation.waitFor('message:text');
    const dateTime = dateTimeMsg.message.text;

    // Ask for meeting location
    await ctx.reply('📍 Введите место встречи (адрес или описание):');

    const addressMsg = await conversation.waitFor('message:text');
    const meetingAddress = addressMsg.message.text;

    // Notify owner with confirm/reject buttons
    if (lot.owner?.telegramId) {
        try {
            await ctx.api.sendMessage(
                Number(lot.owner.telegramId),
                `📅 Инвестор предлагает встречу!\n\n` +
                `Лот: ${lot.address}\n` +
                `Дата/время: ${dateTime}\n` +
                `Место: ${meetingAddress}\n\n` +
                `Подтвердите или предложите другое время:`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{
                                text: '✅ Подтверждаю',
                                callback_data: `meeting_confirm_${lot.id}`,
                            }],
                            [{
                                text: '❌ Не могу, предложу другое время',
                                callback_data: `meeting_reject_${lot.id}`,
                            }],
                        ],
                    },
                }
            );
        } catch (err) {
            logger.error({ err, lotId: lot.id }, 'Failed to notify owner about meeting');
        }
    }

    // Notify manager
    const managerChatId = process.env.MANAGER_CHAT_ID;
    if (managerChatId) {
        try {
            await ctx.api.sendMessage(
                Number(managerChatId),
                `📅 Запланирована встреча\n\n` +
                `Лот: ${lot.address}\n` +
                `Дата/время: ${dateTime}\n` +
                `Место: ${meetingAddress}\n` +
                `Собственник: ${lot.owner?.fullName || 'Неизвестно'}\n` +
                `Инвестор: ${lot.winner?.fullName || 'Неизвестно'}`
            );
        } catch (err) {
            logger.error({ err, lotId: lot.id }, 'Failed to notify manager about meeting');
        }
    }

    await ctx.reply(
        `✅ Запрос на встречу отправлен!\n\n` +
        `Дата/время: ${dateTime}\n` +
        `Место: ${meetingAddress}\n\n` +
        `Ожидайте подтверждения от собственника.`
    );

    logger.info({ lotId: lot.id, dateTime, meetingAddress }, 'Meeting scheduled');
}
