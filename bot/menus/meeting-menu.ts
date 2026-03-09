import { Menu } from "@grammyjs/menu";
import type { Api } from "grammy";
import { MyContext } from "../types";
import { handleMeetingResponse } from "../handlers/meeting";

/**
 * Меню для подтверждения/отклонения встречи.
 * api передаётся явно — нет circular import с bot/index.ts.
 */
export function buildMeetingMenu(lotId: string, api: Api) {
    return new Menu<MyContext>(`meeting-${lotId}`)
        .text("✅ Подтверждаю встречу", async (ctx) => {
            try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
            await handleMeetingResponse(lotId, "confirmed", api);
        }).row()
        .text("❌ Отказаться от встречи", async (ctx) => {
            try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { }
            await handleMeetingResponse(lotId, "rejected", api);
        });
}
