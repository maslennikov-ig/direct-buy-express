import { prisma } from '../../lib/db';
import { slaQueue, QueueJobs } from '../../lib/queue/client';
import { logger } from '../../lib/logger';
import { notifyManagers } from '../../lib/notify-managers';
import type { Api } from 'grammy';

const DEFAULT_PLATFORM_FEE = 100_000;

/**
 * Calculate net amount for the owner (what they receive "на руки").
 * Formula from ТЗ §5: bid_amount - 100_000 (platform fee)
 */
export function calculateNetAmount(bidAmount: number): number {
    const fee = Number(process.env.PLATFORM_FEE_RUB) || DEFAULT_PLATFORM_FEE;
    return bidAmount - fee;
}

/**
 * Send the owner a message with top bids and choice buttons.
 * Called when auction ends (CLOSE_AUCTION) or lot transitions to WAITING_CHOICE.
 */
export async function sendOwnerChoiceOffer(lotId: string, api: Api): Promise<void> {
    const lot = await prisma.lot.findUnique({
        where: { id: lotId },
        include: {
            owner: true,
            bids: {
                orderBy: { amount: 'desc' },
                take: 3,
                include: { investor: true },
            },
        },
    });

    if (!lot || !lot.owner?.telegramId) {
        logger.warn({ lotId }, 'Cannot send owner choice: lot or owner not found');
        return;
    }

    if (lot.bids.length === 0) {
        try {
            await api.sendMessage(
                Number(lot.owner.telegramId),
                `К сожалению, по лоту "${lot.address}" не поступило ни одного предложения.`
            );
        } catch (err) {
            logger.error({ err, lotId }, 'Failed to notify owner about no bids');
        }
        return;
    }

    let text = `<b>🏁 ИТОГИ АУКЦИОНА!</b>\n\nЛот: <code>${lot.address}</code>\n\n<b>Топ предложения:</b>\n`;

    const buttons: Array<{ text: string; callback_data: string }[]> = [];

    lot.bids.forEach((bid, i) => {
        const bidAmount = bid.amount.toNumber();
        const netAmount = calculateNetAmount(bidAmount);
        text += `${i + 1}. ${bidAmount.toLocaleString('ru-RU')} руб. → на руки: ${netAmount.toLocaleString('ru-RU')} руб.\n`;
        buttons.push([{
            text: `✅ Согласен (#${i + 1}: ${netAmount.toLocaleString('ru-RU')} руб.)`,
            callback_data: `owner_agree_bid_${bid.id}_lot_${lotId}`,
        }]);
    });

    const platformFee = Number(process.env.PLATFORM_FEE_RUB) || DEFAULT_PLATFORM_FEE;
    text += `\n<i>Комиссия платформы: ${platformFee.toLocaleString('ru-RU')} руб.</i>\n`;
    text += `\n<b>Выберите предложение или откажитесь:</b>`;

    buttons.push([{
        text: '❌ Не согласен',
        callback_data: `owner_reject_lot_${lotId}`,
    }]);

    try {
        await api.sendMessage(Number(lot.owner.telegramId), text, {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons },
        });

        // Schedule SLA_OFFER_RESPONSE (2 hours — ТЗ §7)
        const SLA_OFFER_RESPONSE_DELAY = 2 * 60 * 60 * 1000;
        try {
            await slaQueue.add(QueueJobs.SLA_OFFER_RESPONSE, { lotId }, {
                delay: SLA_OFFER_RESPONSE_DELAY,
                jobId: `sla-offer-response-${lotId}`,
            });
            logger.info({ lotId, delay: SLA_OFFER_RESPONSE_DELAY }, 'Scheduled SLA_OFFER_RESPONSE');
        } catch (slaErr) {
            logger.error({ err: slaErr, lotId }, 'Failed to schedule SLA_OFFER_RESPONSE');
        }
    } catch (err) {
        logger.error({ err, lotId }, 'Failed to send owner choice offer');
    }
}

/**
 * Handle owner's choice: agree to a bid or reject all.
 * - Agree: set winnerId, transition to WAITING_DOCS, schedule SLA_DOCS_UPLOAD
 * - Reject: alert manager for manual negotiation
 */
export async function handleOwnerChoice(
    lotId: string,
    bidId: string | null,
    decision: 'agreed' | 'rejected',
    api: Api
): Promise<void> {
    // Cancel the SLA_OFFER_RESPONSE timer since owner has responded
    try {
        const slaJob = await slaQueue.getJob(`sla-offer-response-${lotId}`);
        if (slaJob) {
            await slaJob.remove();
            logger.info({ lotId }, 'Cancelled SLA_OFFER_RESPONSE timer');
        }
    } catch (err) {
        logger.error({ err, lotId }, 'Failed to cancel SLA_OFFER_RESPONSE');
    }

    if (decision === 'agreed' && bidId) {
        // Find the bid and its investor
        const bid = await prisma.bid.findUnique({
            where: { id: bidId },
            include: { investor: true },
        });

        if (!bid || bid.lotId !== lotId) {
            logger.warn({ bidId, lotId, actualLotId: bid?.lotId }, 'Bid not found or does not belong to this lot');
            return;
        }

        // Atomic update: only update if still in WAITING_CHOICE (idempotency)
        const result = await prisma.lot.updateMany({
            where: { id: lotId, status: 'WAITING_CHOICE' },
            data: {
                winnerId: bid.investorId,
                status: 'WAITING_DOCS',
            },
        });

        if (result.count === 0) {
            logger.info({ lotId }, 'Lot already processed or not in WAITING_CHOICE. Skipping.');
            return;
        }

        // Schedule SLA_DOCS_UPLOAD (2 hours)
        const SLA_DOCS_UPLOAD_DELAY = 2 * 60 * 60 * 1000; // 2 hours in ms
        try {
            await slaQueue.add(QueueJobs.SLA_DOCS_UPLOAD, { lotId }, {
                delay: SLA_DOCS_UPLOAD_DELAY,
                jobId: `sla-docs-upload-${lotId}`,
            });
            logger.info({ lotId, delay: SLA_DOCS_UPLOAD_DELAY }, 'Scheduled SLA_DOCS_UPLOAD');
        } catch (err) {
            logger.error({ err, lotId }, 'Failed to schedule SLA_DOCS_UPLOAD');
        }

        // Fetch lot for notifications
        const lot = await prisma.lot.findUnique({
            where: { id: lotId },
            include: { owner: true },
        });

        // Notify owner
        if (lot?.owner?.telegramId) {
            try {
                const netAmount = calculateNetAmount(bid.amount.toNumber());
                await api.sendMessage(
                    Number(lot.owner.telegramId),
                    `<b>✅ Вы приняли предложение!</b>\n\n` +
                    `Сумма на руки: <b>${netAmount.toLocaleString('ru-RU')} руб.</b>\n\n` +
                    `Загрузите документы в течение <b>2 часов</b>:\n` +
                    `• Паспорт собственника\n• Выписка ЕГРН\n• Правоустанавливающий документ\n• Справка о прописанных`,
                    {
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [[{
                                text: '📄 Загрузить документы',
                                callback_data: `upload_docs_${lotId}`,
                            }]],
                        },
                    }
                );
            } catch (err) {
                logger.error({ err, lotId }, 'Failed to notify owner after choice');
            }
        }

        // Notify investor (winner)
        if (bid.investor?.telegramId) {
            try {
                await api.sendMessage(
                    Number(bid.investor.telegramId),
                    `🏆 Собственник принял ваше предложение по лоту "${lot?.address}"!\n\n` +
                    `Ожидайте загрузку документов собственником. Менеджер свяжется с вами.`
                );
            } catch (err) {
                logger.error({ err, lotId }, 'Failed to notify winning investor');
            }
        }

        // Notify managers
        await notifyManagers(
            api,
            `✅ Собственник принял предложение!\n\n` +
            `Лот: ${lot?.address}\n` +
            `Ставка: ${bid.amount.toNumber().toLocaleString('ru-RU')} руб.\n` +
            `Собственник: ${lot?.owner?.fullName || 'Неизвестно'}\n` +
            `Инвестор: ${bid.investor?.fullName || 'Неизвестно'}\n\n` +
            `Статус: WAITING_DOCS. SLA 2 часа.`,
            'owner-choice-agreed'
        );
    } else {
        // Rejected — alert manager
        const lot = await prisma.lot.findUnique({
            where: { id: lotId },
            include: { owner: true },
        });

        await notifyManagers(
            api,
            `❌ Собственник НЕ согласен с предложениями!\n\n` +
            `Лот: ${lot?.address || lotId}\n` +
            `Собственник: ${lot?.owner?.fullName || 'Неизвестно'}\n\n` +
            `👉 Требуется ручное вмешательство для дожима.`,
            'owner-choice-rejected'
        );

        // Notify owner
        if (lot?.owner?.telegramId) {
            try {
                await api.sendMessage(
                    Number(lot.owner.telegramId),
                    `Мы передали ваш отказ менеджеру. Он свяжется с вами для обсуждения дальнейших шагов.`
                );
            } catch (err) {
                logger.error({ err, lotId }, 'Failed to notify owner about rejection confirmation');
            }
        }
    }
}
