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

    await ctx.reply(
        `<b>💰 Ваша ставка по лоту</b>\n\n` +
        `Введите сумму предложения в рублях (цифрами).\n` +
        `<i>Например: 15500000</i>\n\n` +
        `Отправьте /cancel чтобы отменить.`,
        { parse_mode: "HTML" }
    );

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

            // Using atomic upsert to prevent Race Conditions (since we added @@unique([lotId, investorId]))
            await prisma.bid.upsert({
                where: {
                    lotId_investorId: {
                        lotId: lotId,
                        investorId: user.id
                    }
                },
                update: {
                    amount: amountAsDecimal
                },
                create: {
                    lotId: lotId,
                    investorId: user.id,
                    amount: amountAsDecimal
                }
            });

            // Count total bids
            const bidCount = await prisma.bid.count({
                where: { lotId: lotId }
            });

            if (bidCount >= 5) {
                // Task 3: Trigger manual closure
                console.log(`[AUCTION] Lot ${lotId} has reached 5 bids. Manual closure logic triggered.`);

                try {
                    // Try to import dynamicaly or assume globally available if in same monorepo setup
                    // Since it's standard BullMQ, let's just trigger the worker logic
                    const { slaQueue } = await import("../../lib/queue/client");

                    // Cancel the delayed job to prevent double firing
                    await slaQueue.remove(`close-auction-${lotId}`);

                    // Fire immediately
                    await slaQueue.add('CLOSE_AUCTION', { lotId: lotId }, {
                        removeOnComplete: true,
                        jobId: `close-auction-${lotId}`
                    });
                } catch (err) {
                    console.error("Failed to execute manual closure on 5th bid:", err);
                }
            }
        });

        await ctx.reply(
            `<b>✅ Ставка принята!</b>\n\n` +
            `Сумма: <b>${amountAsDecimal.toNumber().toLocaleString("ru-RU")} руб.</b>\n\n` +
            `Вы можете изменить ставку до конца аукциона, нажав кнопку снова.`,
            { parse_mode: "HTML" }
        );
    } catch (e: any) {
        console.error(e);
        await ctx.reply(`Произошла ошибка при сохранении ставки. ${e.message}`);
    }
}
