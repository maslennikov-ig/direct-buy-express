import { prisma } from '../../lib/db';
import { logger } from '../../lib/logger';
import type { Api } from 'grammy';

/**
 * Handle meeting scheduling flow (ТЗ §6.2):
 * - Investor submits date/time/location
 * - Owner gets notification with accept/reject buttons
 * - Manager gets alerted
 */
export async function handleScheduleMeeting(
    lotId: string,
    investorTelegramId: string,
    dateTime: string,
    address: string,
    api: Api
): Promise<void> {
    const lot = await prisma.lot.findUnique({
        where: { id: lotId },
        include: { owner: true, winner: true },
    });

    if (!lot) {
        logger.warn({ lotId }, 'Lot not found for meeting scheduling');
        return;
    }

    // Notify owner with accept/reject buttons
    if (lot.owner?.telegramId) {
        try {
            await api.sendMessage(
                Number(lot.owner.telegramId),
                `📅 Инвестор предлагает встречу!\n\n` +
                `Лот: ${lot.address}\n` +
                `Дата/время: ${dateTime}\n` +
                `Место: ${address}\n\n` +
                `Подтвердите или предложите другое время:`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{
                                text: '✅ Подтверждаю',
                                callback_data: `meeting_confirm_${lotId}`,
                            }],
                            [{
                                text: '❌ Не могу, предложу другое время',
                                callback_data: `meeting_reject_${lotId}`,
                            }],
                        ],
                    },
                }
            );
        } catch (err) {
            logger.error({ err, lotId }, 'Failed to notify owner about meeting');
        }
    }

    // Alert manager
    const managerChatId = process.env.MANAGER_CHAT_ID;
    if (managerChatId) {
        try {
            await api.sendMessage(
                Number(managerChatId),
                `📅 Запланирована встреча\n\n` +
                `Лот: ${lot.address}\n` +
                `Дата/время: ${dateTime}\n` +
                `Место: ${address}\n` +
                `Собственник: ${lot.owner?.fullName || 'Неизвестно'}\n` +
                `Инвестор: ${lot.winner?.fullName || 'Неизвестно'}`
            );
        } catch (err) {
            logger.error({ err, lotId }, 'Failed to notify manager about meeting');
        }
    }
}

/**
 * Handle meeting confirmation/rejection callbacks from owner
 */
export async function handleMeetingResponse(
    lotId: string,
    response: 'confirmed' | 'rejected',
    api: Api
): Promise<void> {
    const lot = await prisma.lot.findUnique({
        where: { id: lotId },
        include: { owner: true, winner: true },
    });

    if (!lot) {
        logger.warn({ lotId }, 'Lot not found for meeting response');
        return;
    }

    const managerChatId = process.env.MANAGER_CHAT_ID;

    if (response === 'confirmed') {
        // Notify investor
        if (lot.winner?.telegramId) {
            try {
                await api.sendMessage(
                    Number(lot.winner.telegramId),
                    `✅ Собственник подтвердил встречу по лоту "${lot.address}"!\n\nМенеджер свяжется с вами для уточнения деталей.`
                );
            } catch (err) {
                logger.error({ err, lotId }, 'Failed to notify investor about meeting confirmation');
            }
        }

        // Notify manager
        if (managerChatId) {
            try {
                await api.sendMessage(
                    Number(managerChatId),
                    `✅ Встреча подтверждена!\n\nЛот: ${lot.address}\nСобственник: ${lot.owner?.fullName || 'Неизвестно'}\nИнвестор: ${lot.winner?.fullName || 'Неизвестно'}`
                );
            } catch (err) {
                logger.error({ err, lotId }, 'Failed to notify manager about meeting confirmation');
            }
        }
    } else {
        // Notify investor about rejection
        if (lot.winner?.telegramId) {
            try {
                await api.sendMessage(
                    Number(lot.winner.telegramId),
                    `❌ Собственник не может встретиться в предложенное время по лоту "${lot.address}". Менеджер свяжется с вами для подбора нового времени.`
                );
            } catch (err) {
                logger.error({ err, lotId }, 'Failed to notify investor about meeting rejection');
            }
        }

        // Notify manager
        if (managerChatId) {
            try {
                await api.sendMessage(
                    Number(managerChatId),
                    `❌ Встреча отклонена собственником!\n\nЛот: ${lot.address}\nСобственник: ${lot.owner?.fullName || 'Неизвестно'}\nИнвестор: ${lot.winner?.fullName || 'Неизвестно'}\n\n👉 Требуется подобрать другое время.`
                );
            } catch (err) {
                logger.error({ err, lotId }, 'Failed to notify manager about meeting rejection');
            }
        }
    }
}
