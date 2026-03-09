import { Worker, Job } from 'bullmq';
import { connection } from './connection';
import { prisma } from '../db';
import { bot } from '../../bot/index';
import { logger } from '../logger';
import { sendOwnerChoiceOffer } from '../../bot/handlers/owner-choice';

export const processJob = async (job: Job) => {
    switch (job.name) {
        case 'CLOSE_AUCTION': {
            logger.info({ lotId: job.data.lotId }, 'Closing auction');

            const lot = await prisma.lot.findUnique({
                where: { id: job.data.lotId },
                include: {
                    owner: true,
                    bids: {
                        orderBy: { amount: 'desc' },
                        include: { investor: true }
                    }
                }
            });

            if (lot && lot.status === 'AUCTION') {
                // Atomic, idempotent status transition (CR-5)
                const result = await prisma.lot.updateMany({
                    where: { id: lot.id, status: 'AUCTION' },
                    data: { status: 'WAITING_CHOICE' }
                });

                if (result.count === 0) {
                    logger.info({ lotId: lot.id }, 'Lot already processed, skipping CLOSE_AUCTION');
                    break;
                }

                // Notify Investors
                for (const bid of lot.bids) {
                    if (bid.investor && bid.investor.telegramId) {
                        try {
                            await bot.api.sendMessage(
                                Number(bid.investor.telegramId),
                                `🔔 Сбор предложений завершен по лоту, на который вы делали ставку. Собственник делает выбор.`
                            );
                        } catch (err) {
                            logger.error({ err, investorId: bid.investor.telegramId }, 'Failed to notify investor about auction close');
                        }
                    }
                }

                // Send owner the choice offer with calculator
                await sendOwnerChoiceOffer(lot.id, bot.api);
            } else {
                logger.info({ lotId: job.data.lotId }, 'Lot not in AUCTION status, skipping CLOSE_AUCTION');
            }
            break;
        }

        case 'SLA_DOCS_UPLOAD': {
            logger.info({ lotId: job.data.lotId }, 'SLA_DOCS_UPLOAD expired');

            const docsLot = await prisma.lot.findUnique({
                where: { id: job.data.lotId },
                include: { owner: true },
            });

            if (docsLot && docsLot.status === 'WAITING_DOCS') {
                const managerChatId = process.env.MANAGER_CHAT_ID;
                if (managerChatId) {
                    try {
                        await bot.api.sendMessage(
                            Number(managerChatId),
                            `⚠️ SLA нарушен! Собственник не загрузил документы в течение 2 часов.\n\nЛот: ${docsLot.address}\nID: ${docsLot.id}\nСобственник: ${docsLot.owner?.fullName || 'Неизвестно'}`
                        );
                    } catch (err) {
                        logger.error({ err, lotId: docsLot.id }, 'Failed to notify manager about SLA_DOCS_UPLOAD');
                    }
                }

                if (docsLot.owner && docsLot.owner.telegramId) {
                    try {
                        await bot.api.sendMessage(
                            Number(docsLot.owner.telegramId),
                            `⏰ Время на загрузку документов истекло! С вами свяжется менеджер для решения вопроса.`
                        );
                    } catch (err) {
                        logger.error({ err, telegramId: Number(docsLot.owner.telegramId) }, 'Failed to notify owner about SLA_DOCS_UPLOAD');
                    }
                }
            } else {
                logger.info({ lotId: job.data.lotId }, 'Lot not in WAITING_DOCS status, skipping SLA_DOCS_UPLOAD');
            }
            break;
        }

        case 'SLA_INVESTOR_REVIEW': {
            logger.info({ lotId: job.data.lotId }, 'SLA_INVESTOR_REVIEW expired');

            const reviewLot = await prisma.lot.findUnique({
                where: { id: job.data.lotId },
                include: { owner: true, winner: true },
            });

            if (reviewLot && reviewLot.status === 'INVESTOR_REVIEW') {
                const mgrChatId = process.env.MANAGER_CHAT_ID;
                if (mgrChatId) {
                    try {
                        await bot.api.sendMessage(
                            Number(mgrChatId),
                            `⚠️ SLA нарушен! Инвестор не принял решение по документам в течение 24 часов.\n\nЛот: ${reviewLot.address}\nID: ${reviewLot.id}\nСобственник: ${reviewLot.owner?.fullName || 'Неизвестно'}\nИнвестор: ${reviewLot.winner?.fullName || 'Неизвестно'}`
                        );
                    } catch (err) {
                        logger.error({ err, lotId: reviewLot.id }, 'Failed to notify manager about SLA_INVESTOR_REVIEW');
                    }
                }

                if (reviewLot.winner?.telegramId) {
                    try {
                        await bot.api.sendMessage(
                            Number(reviewLot.winner.telegramId),
                            `⏰ Напоминаем: вы ещё не приняли решение по документам лота "${reviewLot.address}". Пожалуйста, рассмотрите их и нажмите одну из кнопок выше.`
                        );
                    } catch (err) {
                        logger.error({ err, investorId: reviewLot.winner.telegramId }, 'Failed to notify investor about SLA_INVESTOR_REVIEW');
                    }
                }
            } else {
                logger.info({ lotId: job.data.lotId }, 'Lot not in INVESTOR_REVIEW status, skipping SLA_INVESTOR_REVIEW');
            }
            break;
        }

        case 'SLA_OFFER_RESPONSE': {
            logger.info({ lotId: job.data.lotId }, 'SLA_OFFER_RESPONSE expired');

            const offerLot = await prisma.lot.findUnique({
                where: { id: job.data.lotId },
                include: { owner: true },
            });

            if (offerLot && offerLot.status === 'WAITING_CHOICE') {
                const mgrId = process.env.MANAGER_CHAT_ID;
                if (mgrId) {
                    try {
                        await bot.api.sendMessage(
                            Number(mgrId),
                            `⚠️ SLA нарушен! Собственник не принял решение по предложениям в течение 2 часов.\n\nЛот: ${offerLot.address}\nID: ${offerLot.id}\nСобственник: ${offerLot.owner?.fullName || 'Неизвестно'}\n\n👉 Требуется ручное вмешательство.`
                        );
                    } catch (err) {
                        logger.error({ err, lotId: offerLot.id }, 'Failed to notify manager about SLA_OFFER_RESPONSE');
                    }
                }

                if (offerLot.owner?.telegramId) {
                    try {
                        await bot.api.sendMessage(
                            Number(offerLot.owner.telegramId),
                            `⏰ Время на принятие решения по предложениям истекло! С вами свяжется менеджер.`
                        );
                    } catch (err) {
                        logger.error({ err, telegramId: Number(offerLot.owner.telegramId) }, 'Failed to remind owner about SLA_OFFER_RESPONSE');
                    }
                }
            } else {
                logger.info({ lotId: job.data.lotId }, 'Lot not in WAITING_CHOICE status, skipping SLA_OFFER_RESPONSE');
            }
            break;
        }

        default:
            logger.warn({ jobName: job.name }, 'Unknown job received');
    }
};

export const slaWorker = new Worker('sla-timers', processJob, { connection: connection as any });

