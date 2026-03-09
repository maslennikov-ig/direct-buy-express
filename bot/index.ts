import { Bot, Context, session, type SessionFlavor } from "grammy";
import { run } from "@grammyjs/runner";
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { createLotConversation } from "./conversations/create-lot";
import { investorRegistrationConversation } from "./conversations/investor-registration";
import { makeBidConversation } from "./conversations/make-bid";
import { uploadDocsConversation } from "./conversations/upload-docs";
import { scheduleMeetingConversation } from "./conversations/schedule-meeting";
import { handleInvestorDocsDecision } from "./handlers/investor-docs-decision";
import { handleOwnerChoice } from "./handlers/owner-choice";
import { handleMeetingResponse } from "./handlers/meeting";
import { authMiddleware } from "./middleware/auth";
import { autoRetry } from "@grammyjs/auto-retry";
import { MyContext } from "./types";
import { logger } from "../lib/logger";

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

bot.api.config.use(autoRetry());

bot.use(session({ initial: () => ({}) }));

bot.use(authMiddleware);
bot.use(conversations());
bot.use(createConversation(createLotConversation));
bot.use(createConversation(investorRegistrationConversation));
bot.use(createConversation(makeBidConversation));
bot.use(createConversation(uploadDocsConversation));
bot.use(createConversation(scheduleMeetingConversation));

bot.command("start", (ctx) => {
    ctx.reply("Добро пожаловать в Direct Buy — первую P2P-платформу скоростного выкупа недвижимости в Москве и МО. 🏎\n\nМы исключили из цепочки посредников и лишние комиссии. Здесь вы соединяетесь с капиталом напрямую.\n\nЧтобы начать, примите условия сервиса:\n• [Политика обработки персональных данных]\n• [Соглашение о конфиденциальности (NDA)]", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ Принимаю условия и начинаю", callback_data: "accept_terms" }]
            ]
        }
    });
});

bot.on("callback_query:data", async (ctx) => {
    if (ctx.callbackQuery.data === "accept_terms") {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText("Кто вы? Выберите роль для настройки интерфейса:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "👤 Я Собственник", callback_data: "role_owner" }],
                    [{ text: "🤝 Я Брокер", callback_data: "role_broker" }],
                    [{ text: "💰 Я Инвестор", callback_data: "role_investor" }]
                ]
            }
        });
    } else if (ctx.callbackQuery.data === "role_owner" || ctx.callbackQuery.data === "role_broker") {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("createLotConversation");
    } else if (ctx.callbackQuery.data === "role_investor") {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("investorRegistrationConversation");
    } else if (ctx.callbackQuery.data.startsWith("bid_lot_")) {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("makeBidConversation");
    } else if (ctx.callbackQuery.data.startsWith("upload_docs_")) {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("uploadDocsConversation");
    } else if (ctx.callbackQuery.data.startsWith("schedule_meeting_")) {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("scheduleMeetingConversation");
    } else if (ctx.callbackQuery.data.startsWith("investor_docs_approve_")) {
        await ctx.answerCallbackQuery();
        const lotId = ctx.callbackQuery.data.replace("investor_docs_approve_", "");
        // CR-6: Remove buttons and show visual confirmation
        try { await ctx.editMessageText("✅ Вы одобрили документы. Ожидайте связи от менеджера."); } catch { }
        await handleInvestorDocsDecision(lotId, "approved", bot.api);
    } else if (ctx.callbackQuery.data.startsWith("investor_docs_reject_")) {
        await ctx.answerCallbackQuery();
        const lotId = ctx.callbackQuery.data.replace("investor_docs_reject_", "");
        // CR-6: Remove buttons and show visual confirmation
        try { await ctx.editMessageText("❌ Вы отклонили документы. Менеджер свяжется с вами."); } catch { }
        await handleInvestorDocsDecision(lotId, "rejected", bot.api);
    } else if (ctx.callbackQuery.data.startsWith("owner_agree_bid_")) {
        await ctx.answerCallbackQuery();
        // Format: owner_agree_bid_<bidId>_lot_<lotId>
        const parts = ctx.callbackQuery.data.replace("owner_agree_bid_", "").split("_lot_");
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            await ctx.reply("⚠️ Ошибка обработки. Попробуйте снова.");
            return;
        }
        const bidId = parts[0];
        const lotId = parts[1];
        try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
        await handleOwnerChoice(lotId, bidId, "agreed", bot.api);
    } else if (ctx.callbackQuery.data.startsWith("owner_reject_lot_")) {
        await ctx.answerCallbackQuery();
        const lotId = ctx.callbackQuery.data.replace("owner_reject_lot_", "");
        try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
        await handleOwnerChoice(lotId, null, "rejected", bot.api);
    } else if (ctx.callbackQuery.data.startsWith("meeting_confirm_")) {
        await ctx.answerCallbackQuery();
        const lotId = ctx.callbackQuery.data.replace("meeting_confirm_", "");
        try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
        await handleMeetingResponse(lotId, "confirmed", bot.api);
    } else if (ctx.callbackQuery.data.startsWith("meeting_reject_")) {
        await ctx.answerCallbackQuery();
        const lotId = ctx.callbackQuery.data.replace("meeting_reject_", "");
        try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
        await handleMeetingResponse(lotId, "rejected", bot.api);
    }
});

// Global error handler (grammY best practice — Context7 docs)
bot.catch((err) => {
    const ctx = err.ctx;
    logger.error(
        { updateId: ctx.update.update_id, error: err.error },
        `Error while handling update ${ctx.update.update_id}`
    );
});

// Avoid running in test environments globally
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    const runner = run(bot);
    logger.info('Bot started!');

    // Graceful shutdown (Context7: grammY runner docs)
    const stopRunner = () => {
        logger.info('Received shutdown signal, stopping bot...');
        if (runner.isRunning()) runner.stop();
    };
    process.once('SIGINT', stopRunner);
    process.once('SIGTERM', stopRunner);
}
