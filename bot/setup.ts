import { Bot } from "grammy";

/**
 * One-time bot setup: register commands and descriptions in BotFather.
 * Call this once at startup.
 */
export async function setupBot(bot: Bot<any>): Promise<void> {
    await bot.api.setMyCommands([
        { command: "start", description: "🏠 Начать / Главное меню" },
        { command: "menu", description: "📋 Открыть меню действий" },
        { command: "status", description: "📊 Статус моих лотов и ставок" },
        { command: "help", description: "❓ Помощь и поддержка" },
    ]);

    await bot.api.setMyDescription(
        "Direct Buy — высокотехнологичная P2P-платформа срочного выкупа недвижимости в Москве и МО.\n\n" +
        "Соединяем продавцов напрямую с верифицированными инвесторами.\n" +
        "Сделка за 24 часа. Фиксированная комиссия. Без лишних звеньев."
    );

    await bot.api.setMyShortDescription("Скоростной выкуп недвижимости за 24 часа 🏎");
}
