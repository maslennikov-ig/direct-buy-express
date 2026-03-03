import { Bot, Context, session, type SessionFlavor } from "grammy";
import { run } from "@grammyjs/runner";
import { type Conversation, type ConversationFlavor, conversations } from "@grammyjs/conversations";

export type MyContext = Context & SessionFlavor<any> & ConversationFlavor;
export type MyConversation = Conversation<MyContext>;

export const bot = new Bot<MyContext>(process.env.BOT_TOKEN || "mock_token_for_tests");

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

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
    }
});

// Avoid running in test environments globally
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    run(bot);
    console.log("Bot started!");
}
