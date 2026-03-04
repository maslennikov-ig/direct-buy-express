import { MyContext, MyConversation } from "../types";
import { prisma } from "../../lib/db";
import { Prisma } from "@prisma/client";

export async function makeBidConversation(conversation: MyConversation, ctx: MyContext) {
    if (!ctx.match || !ctx.match[0]) {
        await ctx.reply("Не удалось определить лот.");
        return;
    }

    // Extract lot_id from regex 'bid_lot_<lotId>'
    const matchData = ctx.match[0].replace('bid_lot_', '');
    const lotId = matchData;

    const investorId = ctx.from?.id.toString();
    if (!investorId) {
        await ctx.reply("Не удалось идентифицировать ваш профиль.");
        return;
    }

    const lot = await conversation.external(() => prisma.lot.findUnique({
        where: { id: lotId }
    }));

    if (!lot || lot.status !== 'AUCTION') {
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
        await ctx.reply("Лот не найден или сбор предложений уже закрыт.");
        return;
    }

    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    await ctx.reply(`Какую цену вы готовы предложить за этот лот?\n\n` +
        `Введите сумму в рублях цифрами (например, 15500000) оправив мне ответным сообщением.\n` +
        `Отправьте /cancel чтобы отменить.`);

    const response = await conversation.wait();

    if (response.message?.text === "/cancel") {
        await ctx.reply("Действие отменено.");
        return;
    }

    const amountText = response.message?.text?.replace(/\D/g, "");
    if (!amountText) {
        await ctx.reply("Пожалуйста, введите корректную сумму цифрами. Возврат в главное меню.");
        return;
    }

    const amountAsDecimal = new Prisma.Decimal(amountText);

    // Validate bid amount against min and max
    if (amountAsDecimal.lte(0)) {
        await ctx.reply("Некорректная сумма. Возврат в меню.");
        return;
    }

    try {
        await conversation.external(async () => {
            // Check investor exists
            // Check user exists and is an investor
            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(investorId) },
                include: { investorProfile: true }
            });

            if (!user || user.role !== 'INVESTOR' || !user.investorProfile || !user.investorProfile.isVerified) {
                throw new Error("Investor profile not found or not verified");
            }

            // Using pure create/update logic. Bid doesn't have a compound unique constraint in schema.
            // Let's find first, then create or update
            const existingBid = await prisma.bid.findFirst({
                where: {
                    lotId: lotId,
                    investorId: user.id
                }
            });

            if (existingBid) {
                await prisma.bid.update({
                    where: { id: existingBid.id },
                    data: { amount: amountAsDecimal }
                });
            } else {
                await prisma.bid.create({
                    data: {
                        lotId: lotId,
                        investorId: user.id,
                        amount: amountAsDecimal
                    }
                });
            }

            // Count total bids
            const bidCount = await prisma.bid.count({
                where: { lotId: lotId }
            });

            if (bidCount >= 5) {
                // To be implemented in Task 3. We will remove the bullMQ job if it exists and manually trigger CLOSE_AUCTION.
                console.log(`[AUCTION] Lot ${lotId} has reached 5 bids. Manual closure logic triggered.`);
            }
        });

        await ctx.reply(`✅ Ваше предложение принято: ${amountAsDecimal.toNumber().toLocaleString("ru-RU")} руб.\n\n Вы можете изменить ставку до конца аукциона, нажав на кнопку в сообщении снова.`);
    } catch (e: any) {
        console.error(e);
        await ctx.reply(`Произошла ошибка при сохранении ставки. ${e.message}`);
    }
}
