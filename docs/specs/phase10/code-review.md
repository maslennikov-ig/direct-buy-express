# Phase 10: Code Review Report

**Reviewer:** Code Review Agent  
**Date:** 2026-03-08  
**Scope:** Phase 10 (Investor Review + Manager Handoff) changes  
**Docs Source:** context7 (grammY inline keyboards, Next.js 16)

---

## Findings

| # | Проблема | Уровень | Статус |
|---|----------|---------|--------|
| CR-1 | Double-click уязвимость на кнопках | 🔴 | ✅ Atomic `updateMany` |
| CR-2 | Менеджер не уведомляется | 🔴 | ✅ `MANAGER_CHAT_ID` |
| CR-3 | `bot.callbackQuery()` pattern | 🟡 | ⏭ Deferred (dynamic prefixes) |
| CR-4 | Тест approve route — тавтология | 🟡 | ✅ Заменён на тест CR-2 |
| CR-5 | Неиспользуемый import | 🟢 | ✅ Удалён |
| CR-6 | Кнопки остаются после нажатия | 🟡 | ✅ `editMessageText` |

---

### CR-1: 🔴 Double-click vulnerability

**Проблема:** Если инвестор быстро нажмёт на кнопку дважды, `handleInvestorDocsDecision` сработает 2 раза подряд (оба раза лот будет в `INVESTOR_REVIEW` до завершения первого `prisma.lot.update`). Два уведомления уйдут к обоим.

**Решение:** Использовать `prisma.lot.updateMany` с `where: { id, status: 'INVESTOR_REVIEW' }` и проверять `count > 0`. Это гарантирует идемпотентность через атомарный WHERE-clause.

```typescript
const result = await prisma.lot.updateMany({
    where: { id: lotId, status: 'INVESTOR_REVIEW' },
    data: { status: 'MANAGER_HANDOFF', investorDecision: decision },
});
if (result.count === 0) return; // уже обработано
```

---

### CR-2: 🔴 Менеджер не получает уведомление

**Проблема:** При переходе в `MANAGER_HANDOFF` менеджер видит информацию только в админке. Но менеджер может не смотреть в админку постоянно. По логике Лилии, менеджер должен *звонить* клиентам — он должен получить push-уведомление в Telegram.

**Решение:** Добавить отправку уведомления в `MANAGER_CHAT_ID` (env переменная, уже используется в `worker.ts` для SLA):

```typescript
const managerChatId = process.env.MANAGER_CHAT_ID;
if (managerChatId) {
    const emoji = decision === 'approved' ? '✅' : '❌';
    await api.sendMessage(Number(managerChatId),
        `${emoji} Инвестор ${decision === 'approved' ? 'одобрил' : 'отклонил'} документы.\n\nЛот: ${lot.address}\nСобственник: ${lot.owner?.fullName}\nИнвестор: ${lot.winner?.fullName}\n\n👉 Свяжитесь с обеими сторонами.`
    );
}
```

---

### CR-3: 🟡 `bot.callbackQuery()` вместо `if/else` chain

**Проблема:** Согласно [grammY docs](https://grammy.dev/plugins/keyboard#responding-to-inline-keyboard-clicks), рекомендуется использовать `bot.callbackQuery("payload")` для конкретных callback data, а `bot.on("callback_query:data")` — последним, как catch-all. Текущий код — один большой `if/else` в `bot.on("callback_query:data")`.

**Решение:** Не критично для работы, но улучшит читаемость. Выделить investor-specific callbacks в отдельные `bot.callbackQuery()` регистрации. Однако для dynamic prefixes (`investor_docs_approve_{lotId}`) `bot.callbackQuery()` не подходит напрямую — нужен `bot.on("callback_query:data")` с filter. Текущий подход допустим, но стоит добавить catch-all handler в конце для неизвестных callback.

---

### CR-4: 🟡 Тест approve route — тестирует сам себя

**Проблема:** Тест `should send inline keyboard with correct callback_data format` вызывает `bot.api.sendMessage` напрямую, а затем проверяет, что этот вызов был сделан. Это тавтология — тест не вызывает реальный код approve/route.ts.

**Решение:** Либо удалить этот тест (формат кнопок уже покрыт тестами handler'а), либо переписать как интеграционный тест, если настроить vitest path aliases (`@/`).

---

### CR-5: 🟢 Неиспользуемый import

**Проблема:** `import type { MyContext } from '../types'` в `investor-docs-decision.ts` не используется нигде.

**Решение:** Удалить строку.

---

### CR-6: 🟡 Кнопки остаются после нажатия

**Проблема:** После того как инвестор нажал "Одобрить" или "Отклонить", inline keyboard остаётся на месте. Он может нажать повторно, а визуально не понимает, что действие уже выполнено.

**Решение:** В callback handler'е вызвать `ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } })` или `ctx.editMessageText("Ваше решение принято ✅")` чтобы убрать кнопки и дать визуальный feedback.

---

## Summary

| Уровень | Количество |
|---------|-----------|
| 🔴 Critical | 2 |
| 🟡 Medium | 3 |
| 🟢 Low | 1 |
