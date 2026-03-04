import { bot } from '../index';
import { prisma } from '../../lib/db';
import { findMatchingInvestors } from '../../lib/matcher';
import { Lot } from '@prisma/client';

export async function broadcastLotToInvestors(lotId: string) {
    const lot = await prisma.lot.findUnique({
        where: { id: lotId }
    });

    if (!lot || lot.status !== 'AUCTION') {
        console.log(`Lot ${lotId} not found or not in AUCTION status. Cannot broadcast.`);
        return;
    }

    const matchingInvestors = await findMatchingInvestors(lot);

    if (matchingInvestors.length === 0) {
        console.log(`No matching investors found for lot ${lotId}.`);
        return;
    }

    const messageText = `🔥 <b>Новый лот для выкупа!</b>\n\n` +
        `📍 Адрес: ${lot.address}\n` +
        `📏 Площадь: ${lot.area} м²\n` +
        `🏢 Этаж: ${lot.floor}\n` +
        `🚪 Комнат: ${lot.rooms}\n` +
        `💰 Предварительная цена: ${lot.expectedPrice} руб.\n\n` +
        `Нажмите на кнопку ниже, чтобы сделать ставку.`;

    function chunkArray<T>(arr: T[], size: number): T[][] {
        return arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
    }

    const BATCH_SIZE = 30;
    const batches = chunkArray(matchingInvestors, BATCH_SIZE);

    for (const batch of batches) {
        const promises = batch.map(async (investor) => {
            if (!investor.user.telegramId) return;

            try {
                await bot.api.sendMessage(
                    Number(investor.user.telegramId),
                    messageText,
                    {
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "💰 Предложить цену", callback_data: `bid_lot_${lot.id}` }]
                            ]
                        }
                    }
                );
            } catch (error) {
                console.error(`Failed to send lot ${lot.id} to investor ${investor.user.telegramId}`, error);
            }
        });

        await Promise.allSettled(promises);

        // Minor delay to prevent aggressive bursts, optional but safe for large distributions
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}
