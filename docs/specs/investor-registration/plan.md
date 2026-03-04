# Phase 7: Интерфейс Инвестора Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Реализовать регистрацию Инвестора в боте, запросить NDA, бюджет, районы и сохранить в БД.

**Architecture:** Диалог регистрации через `grammY conversations`, расширение БД (модель `InvestorProfile` в `Prisma`), 100% покрытие кода unit-тестами.

**Tech Stack:** TypeScript, bot (grammY), PostgreSQL (Prisma), Vitest.

---

### Task 1: Обновление схемы БД
**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Write implementation**
```prisma
model InvestorProfile {
  id         String   @id @default(cuid())
  userId     String   @unique
  user       User     @relation(fields: [userId], references: [id])
  minBudget  Decimal?
  maxBudget  Decimal?
  districts  String[]
  isVerified Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```
Добавь `investorProfile InvestorProfile?` в `model User`.

**Step 2: Prisma Generate & Push**
Run: `npx prisma db push`
Run: `npx prisma generate`

**Step 3: Commit**
```bash
git add prisma/schema.prisma
git commit -m "feat(db): add InvestorProfile schema"
```

---

### Task 2: Создать TDD тесты на Conversation
**Files:**
- Create: `__tests__/bot-investor.test.ts`

**Step 1: Write the failing tests**
Напиши 4-5 тестов для мокирования флоу: отказ от NDA, успешное заполнение формы, проверка вызова `prisma.investorProfile.upsert`.

**Step 2: Run test to verify it fails**
Run: `npx vitest run __tests__/bot-investor.test.ts`
Expected: FAIL (функций и диалога еще нет).

**Step 3: Commit**
```bash
git add __tests__/bot-investor.test.ts
git commit -m "test(bot): fail test for investor registration"
```

---

### Task 3: Реализовать Investor Conversation
**Files:**
- Create: `bot/conversations/investor-registration.ts`
- Modify: `bot/index.ts`

**Step 1: Write implementation**
Создай функцию `investorRegistrationConversation`. Запроси NDA, min бюджет, max бюджет и районы. Обнови БД.
Подключи диалог в `bot/index.ts` и в `bot.on("callback_query:data")` для `role_investor` запускай `ctx.conversation.enter("investorRegistrationConversation")`.

**Step 2: Run test to verify it passes**
Run: `npx vitest run __tests__/bot-investor.test.ts`
Expected: PASS и 100% покрытие.

**Step 3: Commit**
```bash
git add bot/conversations/investor-registration.ts bot/index.ts
git commit -m "feat(bot): implement investor registration conversation"
```

---

### Task 4: Завершение фазы и отправка в удаленный репозиторий
**Step 1: Status checks**
Run: `npm run test`
Run: `npm run lint`

**Step 2: Beads tracking**
Run: `bd update bmz --status=in_progress`
Run: `bd sync`

**Step 3: Push changes**
```bash
git push
```
