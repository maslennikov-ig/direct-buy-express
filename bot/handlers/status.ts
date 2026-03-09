import { Bot } from "grammy";
import { prisma } from "../../lib/db";

const LOT_STATUS_LABELS: Record<string, string> = {
    DRAFT: "📝 Черновик (ожидает верификации)",
    AUCTION: "🔥 Аукцион идёт",
    WAITING_CHOICE: "⏳ Ожидает вашего выбора",
    WAITING_DEPOSIT: "💳 Ожидает аванса инвестора",
    WAITING_DOCS: "📂 Загрузка документов",
    DOCS_AUDIT: "🔍 Аудит документов инвестором",
    INVESTOR_REVIEW: "👀 На проверке у инвестора",
    READY_TO_DEAL: "🤝 Готово к сделке",
    CANCELED: "❌ Отменён",
    SOLD: "✅ Продан",
};

export async function handleStatusCommand(ctx: any, botApi: Bot<any>["api"]): Promise<void> {
    if (!ctx.from) return;

    const user = await prisma.user.findUnique({
        where: { telegramId: ctx.from.id },
        include: {
            lots: {
                orderBy: { createdAt: "desc" },
                take: 5,
            },
            bids: {
                orderBy: { createdAt: "desc" },
                take: 5,
                include: { lot: true },
            },
        },
    });

    if (!user) {
        await ctx.reply("⚠️ Вы не зарегистрированы. Нажмите /start для начала.");
        return;
    }

    // OWNER / BROKER
    if ((user.role === "OWNER" || user.role === "BROKER") && user.lots.length > 0) {
        const lines: string[] = ["<b>📊 Ваши лоты:</b>\n"];
        for (const lot of user.lots) {
            const status = LOT_STATUS_LABELS[lot.status] ?? lot.status;
            lines.push(`🏠 <b>${lot.address}</b>\n   ${status}`);
        }
        await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
        return;
    }

    // INVESTOR
    if (user.role === "INVESTOR" && user.bids.length > 0) {
        const lines: string[] = ["<b>📊 Ваши ставки:</b>\n"];
        for (const bid of user.bids) {
            const status = LOT_STATUS_LABELS[bid.lot.status] ?? bid.lot.status;
            lines.push(`💰 <b>${bid.lot.address}</b>\n   ${status}`);
        }
        await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
        return;
    }

    await ctx.reply("У вас пока нет активных лотов или ставок. Нажмите /start для начала.");
}
