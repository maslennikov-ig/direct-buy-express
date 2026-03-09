import { Menu } from "@grammyjs/menu";
import type { Api } from "grammy";
import { MyContext } from "../types";
import { handleInvestorDocsDecision } from "../handlers/investor-docs-decision";

/**
 * Меню инвестора для принятия/отклонения документов собственника.
 * api передаётся явно — нет circular import с bot/index.ts.
 */
export function buildInvestorDocsMenu(lotId: string, api: Api) {
    return new Menu<MyContext>(`investor-docs-${lotId}`)
        .text("✅ Одобрить документы", async (ctx) => {
            try { await ctx.editMessageText("✅ Вы одобрили документы. Ожидайте связи от менеджера."); } catch { }
            await handleInvestorDocsDecision(lotId, "approved", api);
        }).row()
        .text("❌ Отклонить документы", async (ctx) => {
            try { await ctx.editMessageText("❌ Вы отклонили документы. Менеджер свяжется с вами."); } catch { }
            await handleInvestorDocsDecision(lotId, "rejected", api);
        });
}
