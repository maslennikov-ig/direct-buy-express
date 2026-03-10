import { Bot, Context, session, type SessionFlavor } from "grammy";
import { run } from "@grammyjs/runner";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { createLotConversation } from "./conversations/create-lot";
import { investorRegistrationConversation } from "./conversations/investor-registration";
import { makeBidConversation } from "./conversations/make-bid";
import { uploadDocsConversation } from "./conversations/upload-docs";
import { scheduleMeetingConversation } from "./conversations/schedule-meeting";
import { handleInvestorDocsDecision } from "./handlers/investor-docs-decision";
import { handleOwnerChoice } from "./handlers/owner-choice";
import { handleMeetingResponse } from "./handlers/meeting";
import { handleStatusCommand } from "./handlers/status";
import { authMiddleware } from "./middleware/auth";
import { autoRetry } from "@grammyjs/auto-retry";
import { startMenu, roleMenu } from "./menus/start-menu";
import { MyContext } from "./types";
import { logger } from "../lib/logger";
import { sessionStorage } from "../lib/session-storage";
import { getSetting, SettingKeys } from "../lib/settings";
import { setupBot } from "./setup";

const testConfig = process.env.NODE_ENV === 'test' ? {
    client: {
        fetch: async (url: any, init: any) => {
            return new Response(JSON.stringify({ ok: true, result: { message_id: 1, date: 1, chat: { id: 1, type: 'private' } } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
} : undefined;

export const bot = new Bot<MyContext>(process.env.BOT_TOKEN || "mock_token_for_tests", testConfig);

// API-level plugins (order matters)
bot.api.config.use(autoRetry());
bot.api.config.use(apiThrottler());

// Session: persisted to Redis in prod, in-memory for tests
const useRedis = process.env.NODE_ENV !== 'test' && process.env.REDIS_URL !== undefined;
bot.use(session({
    initial: () => ({}),
    ...(useRedis ? { storage: sessionStorage } : {}),
}));

// Bot active check
bot.use(async (ctx, next) => {
    const isActive = await getSetting(SettingKeys.BOT_ACTIVE);
    if (isActive === 'false') {
        if (ctx.chat?.type === 'private') {
            await ctx.reply("🤖 Бот временно отключен на техническое обслуживание.");
        }
        return; // drop update
    }
    await next();
});

// Auth middleware: upsert user to DB on every update
bot.use(authMiddleware);

// Conversations
bot.use(conversations());
bot.use(createConversation(createLotConversation));
bot.use(createConversation(investorRegistrationConversation));
bot.use(createConversation(makeBidConversation));
bot.use(createConversation(uploadDocsConversation));
bot.use(createConversation(scheduleMeetingConversation));

// Menu plugins (must be registered before command/callback handlers)
bot.use(startMenu);
bot.use(roleMenu);

// ─── Commands ───────────────────────────────────────────────────────────────

bot.command("start", (ctx) => {
    ctx.reply(
        "<b>Добро пожаловать в Direct Buy</b> — первую P2P-платформу скоростного выкупа недвижимости в Москве и МО. 🏎\n\n" +
        "Мы исключили из цепочки посредников и лишние комиссии. Здесь вы соединяетесь с капиталом напрямую.\n\n" +
        "Чтобы начать, примите условия сервиса:\n" +
        "• <a href=\"https://directbuy.ru/privacy\">Политика обработки персональных данных</a>\n" +
        "• <a href=\"https://directbuy.ru/nda\">Соглашение о конфиденциальности (NDA)</a>",
        {
            parse_mode: "HTML",
            reply_markup: startMenu,
            link_preview_options: { is_disabled: true },
        }
    );
});

bot.command("menu", async (ctx) => {
    await ctx.reply(
        "👇 <b>Главное меню</b>\n\nВыберите действие:",
        { parse_mode: "HTML", reply_markup: roleMenu }
    );
});

bot.command("status", async (ctx) => {
    await handleStatusCommand(ctx, bot.api);
});

bot.command("help", async (ctx) => {
    await ctx.reply(
        "<b>❓ Помощь и поддержка</b>\n\n" +
        "По всем вопросам обращайтесь к нашему менеджеру: @directbuy_manager\n\n" +
        "<b>Команды бота:</b>\n" +
        "/start — Главное меню\n" +
        "/status — Статус ваших лотов и ставок\n" +
        "/help — Это сообщение",
        { parse_mode: "HTML" }
    );
});

// ─── Callback queries (for dynamic IDs that can't be static Menu buttons) ───

bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith("bid_lot_")) {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("makeBidConversation");
    } else if (data.startsWith("upload_docs_")) {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("uploadDocsConversation");
    } else if (data.startsWith("schedule_meeting_")) {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("scheduleMeetingConversation");
    } else if (data.startsWith("investor_docs_approve_")) {
        await ctx.answerCallbackQuery();
        const lotId = data.replace("investor_docs_approve_", "");
        try { await ctx.editMessageText("✅ Вы одобрили документы. Ожидайте связи от менеджера."); } catch { }
        await handleInvestorDocsDecision(lotId, "approved", bot.api);
    } else if (data.startsWith("investor_docs_reject_")) {
        await ctx.answerCallbackQuery();
        const lotId = data.replace("investor_docs_reject_", "");
        try { await ctx.editMessageText("❌ Вы отклонили документы. Менеджер свяжется с вами."); } catch { }
        await handleInvestorDocsDecision(lotId, "rejected", bot.api);
    } else if (data.startsWith("owner_agree_bid_")) {
        await ctx.answerCallbackQuery();
        const parts = data.replace("owner_agree_bid_", "").split("_lot_");
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            await ctx.reply("⚠️ Ошибка обработки. Попробуйте снова.");
            return;
        }
        try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
        await handleOwnerChoice(parts[1], parts[0], "agreed", bot.api);
    } else if (data.startsWith("owner_reject_lot_")) {
        await ctx.answerCallbackQuery();
        const lotId = data.replace("owner_reject_lot_", "");
        try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
        await handleOwnerChoice(lotId, null, "rejected", bot.api);
    } else if (data.startsWith("meeting_confirm_")) {
        await ctx.answerCallbackQuery();
        const lotId = data.replace("meeting_confirm_", "");
        try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
        await handleMeetingResponse(lotId, "confirmed", bot.api);
    } else if (data.startsWith("meeting_reject_")) {
        await ctx.answerCallbackQuery();
        const lotId = data.replace("meeting_reject_", "");
        try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
        await handleMeetingResponse(lotId, "rejected", bot.api);
    }
});

// Global error handler
bot.catch((err) => {
    const ctx = err.ctx;
    logger.error(
        { updateId: ctx.update.update_id, error: err.error },
        `Error while handling update ${ctx.update.update_id}`
    );
});

// Avoid running in test environments globally
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    // Setup: register commands in BotFather (non-blocking)
    setupBot(bot).then(() => {
        logger.info('Bot commands registered in BotFather');
    }).catch((err) => {
        logger.warn({ err }, 'Failed to register bot commands (non-fatal)');
    });

    const runner = run(bot);
    logger.info('Bot started!');

    // Graceful shutdown
    const stopRunner = () => {
        logger.info('Received shutdown signal, stopping bot...');
        if (runner.isRunning()) runner.stop();
    };
    process.once('SIGINT', stopRunner);
    process.once('SIGTERM', stopRunner);
}
