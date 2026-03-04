import { Prisma } from '@prisma/client';
import type { MyConversation, MyContext } from '../types';
import { prisma } from '../../lib/db';

export async function investorRegistrationConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    if (!ctx.from) return;

    await ctx.reply("Для завершения регистрации ознакомьтесь с Соглашением о конфиденциальности (NDA).", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ Принимаю", callback_data: "nda_accept" }],
                [{ text: "❌ Отказываюсь", callback_data: "nda_reject" }]
            ]
        }
    });

    const ndaResponse = await conversation.waitForCallbackQuery(["nda_accept", "nda_reject"]);
    await ndaResponse.answerCallbackQuery();

    if (ndaResponse.callbackQuery.data === "nda_reject") {
        await ctx.reply("Для продолжения работы в сервисе необходимо принять NDA.");
        return;
    }

    let minBudget = 0;
    while (true) {
        await ctx.reply("Укажите ваш минимальный бюджет (в рублях):");
        const ctxMin = await conversation.wait();
        const text = ctxMin.message?.text || "";
        const parsed = parseInt(text.replace(/\D/g, ""), 10);
        if (!isNaN(parsed) && parsed >= 100000) {
            minBudget = parsed;
            break;
        }
        await ctx.reply("Пожалуйста, введите полную сумму в рублях (минимум 100000), без сокращений вроде 'млн'.");
    }

    let maxBudget = 0;
    while (true) {
        await ctx.reply("Укажите ваш максимальный бюджет (в рублях):");
        const ctxMax = await conversation.wait();
        const text = ctxMax.message?.text || "";
        const parsed = parseInt(text.replace(/\D/g, ""), 10);
        if (!isNaN(parsed) && parsed >= 100000) {
            if (parsed >= minBudget) {
                maxBudget = parsed;
                break;
            } else {
                await ctx.reply(`Максимальный бюджет должен быть больше или равен минимальному (${minBudget}).`);
                continue;
            }
        }
        await ctx.reply("Пожалуйста, введите полную сумму в рублях (минимум 100000), без сокращений вроде 'млн'.");
    }

    await ctx.reply("Укажите интересующие районы (через запятую):");
    const ctxDistricts = await conversation.wait();
    const districtsText = ctxDistricts.message?.text || "";
    const districts = districtsText.split(",").map((d: string) => d.trim()).filter(Boolean);

    await conversation.external(async () => {
        try {
            const user = await prisma.user.upsert({
                where: { telegramId: ctx.from!.id },
                update: {},
                create: {
                    telegramId: ctx.from!.id,
                    role: 'INVESTOR',
                    fullName: ctx.from?.first_name || 'Anonymous',
                }
            });

            await prisma.investorProfile.upsert({
                where: { userId: user.id },
                update: {
                    minBudget: new Prisma.Decimal(minBudget),
                    maxBudget: new Prisma.Decimal(maxBudget),
                    districts
                },
                create: {
                    userId: user.id,
                    minBudget: new Prisma.Decimal(minBudget),
                    maxBudget: new Prisma.Decimal(maxBudget),
                    districts
                }
            });
        } catch (e) {
            console.error(e);
        }
    });

    await ctx.reply("Ваша анкета на модерации. Мы сообщим, когда администратор одобрит ваш профиль.");
}
