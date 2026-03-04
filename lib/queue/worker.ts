import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../db';
import { bot } from '../../bot/index';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const processJob = async (job: Job) => {
    switch (job.name) {
        case 'CLOSE_AUCTION':
            console.log(`Closing auction for lot ${job.data.lotId}`);

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
                await prisma.$transaction(async (tx) => {
                    await tx.lot.update({
                        where: { id: lot.id },
                        data: { status: 'WAITING_CHOICE' }
                    });
                });

                // Notify Owner
                if (lot.owner && lot.owner.telegramId) {
                    try {
                        let text = `🔔 Аукцион по вашему лоту (ID: ${lot.id}) завершен!\n\nСтатус изменен на ОЖИДАНИЕ ВЫБОРА.\n\n`;

                        if (lot.bids.length > 0) {
                            text += `Поступили предложения:\n`;
                            lot.bids.forEach((b, i) => {
                                text += `${i + 1}. ${b.amount.toNumber().toLocaleString("ru-RU")} руб.\n`;
                            });
                        } else {
                            text += `К сожалению, предложений не поступило.`;
                        }

                        await bot.api.sendMessage(Number(lot.owner.telegramId), text);
                    } catch (err) {
                        console.error(`Failed to send Telegram message to owner of lot ${lot.id}:`, err);
                    }
                }

                // Notify Investors
                for (const bid of lot.bids) {
                    if (bid.investor && bid.investor.telegramId) {
                        try {
                            await bot.api.sendMessage(
                                Number(bid.investor.telegramId),
                                `🔔 Сбор предложений завершен по лоту, на который вы делали ставку. Собственник делает выбор.`
                            );
                        } catch (e) {
                            console.error(`Failed to notify investor ${bid.investor.telegramId}`, e);
                        }
                    }
                }
            } else {
                console.log(`Lot ${job.data.lotId} is not in AUCTION status. Skipping.`);
            }
            break;
        default:
            console.warn(`Unknown job: ${job.name}`);
    }
};

export const slaWorker = new Worker('sla-timers', processJob, { connection: connection as any });
