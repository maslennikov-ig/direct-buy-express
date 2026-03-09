import { Menu } from "@grammyjs/menu";
import type { Api } from "grammy";
import { MyContext } from "../types";
import { handleOwnerChoice } from "../handlers/owner-choice";

/**
 * Меню для выбора владельца: согласиться со ставкой или отменить лот.
 * api передаётся явно — нет circular import с bot/index.ts.
 */
export function buildOwnerChoiceMenu(lotId: string, bidId: string, api: Api) {
    return new Menu<MyContext>(`owner-choice-${lotId}`)
        .text("✅ Принять предложение", async (ctx) => {
            try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
            await handleOwnerChoice(lotId, bidId, "agreed", api);
        }).row()
        .text("❌ Отказаться от всех предложений", async (ctx) => {
            try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
            await handleOwnerChoice(lotId, null, "rejected", api);
        });
}
