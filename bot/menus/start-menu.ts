import { Menu } from "@grammyjs/menu";
import { MyContext } from "../types";

/**
 * Главное welcome-меню: принятие условий + выбор роли.
 * Заменяет raw inline_keyboard в /start хэндлере.
 */
export const startMenu = new Menu<MyContext>("start-menu")
    .text("✅ Принимаю условия и начинаю", async (ctx) => {
        await ctx.editMessageText("Кто вы? Выберите роль для настройки интерфейса:", {
            reply_markup: roleMenu,
        });
    });

export const roleMenu = new Menu<MyContext>("role-menu")
    .text("👤 Я Собственник", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("createLotConversation");
    }).row()
    .text("🤝 Я Брокер", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("createLotConversation");
    }).row()
    .text("💰 Я Инвестор", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("investorRegistrationConversation");
    });

// Nest role under start
startMenu.register(roleMenu);
