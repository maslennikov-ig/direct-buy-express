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
                include: { owner: true }
            });

            if (lot && lot.status === 'AUCTION') {
                await prisma.$transaction(async (tx) => {
                    await tx.lot.update({
                        where: { id: lot.id },
                        data: { status: 'WAITING_CHOICE' }
                    });
                });

                if (lot.owner && lot.owner.telegramId) {
                    try {
                        await bot.api.sendMessage(
                            Number(lot.owner.telegramId),
                            `🔔 Аукцион по вашему лоту (ID: ${lot.id}) завершен!\n\nСтатус изменен на ОЖИДАНИЕ ВЫБОРА.`
                        );
                    } catch (err) {
                        console.error(`Failed to send Telegram message to owner of lot ${lot.id}:`, err);
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
