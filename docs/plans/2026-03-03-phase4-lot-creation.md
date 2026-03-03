# Direct Buy: Phase 4 Implementation Plan (Lot Creation Flow)

> **For Orchestrator:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or dispatching-parallel-agents to implement this plan task-by-task concurrently where possible.

**Goal:** Implement the interactive Telegram Bot conversation allowing Owners/Brokers to submit a new Lot for urgent buyout. Integrates DaData for address suggestions and `grammY` conversations for stateful Q&A.

## User Review Resolved
> [!NOTE]
> - Decided to use **DaData Free Tier**. A `DADATA_API_KEY` environment variable will be used.
> - Defaulting to memory sessions for grammY conversations.

## Proposed Changes

### [Task 1: DaData Integration Utility]
Create a utility to fetch address suggestions to ensure high-quality address data.
#### [NEW] `lib/dadata.ts`
- Implement `suggestAddress(query: string)` making a POST request to `https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address`.
#### [NEW] `__tests__/dadata.test.ts`
- Write unit tests mocking the `fetch` call to verify the DaData utility returns properly typed suggestions.

---

### [Task 2: grammY Conversations Setup]
Install target plugins and connect the session and conversational middleware to the bot.
#### [MODIFY] `bot/index.ts`
- `pnpm add @grammyjs/conversations`
- Import and `bot.use(session({ initial: () => ({}) }))`
- `bot.use(conversations())`

---

### [Task 3: Interactive Lot Creation Conversation]
Implement the core sequential Q&A flow.
#### [NEW] `bot/conversations/create-lot.ts`
- Define `createLotConversation(conversation, ctx)`:
  1. Address: Wait for text input.
  2. Metrics: Ask for Area, Floor, Rooms (can be multiple messages or one combined).
  3. Legal: Ask "Has Debts?", "Has Mortgage?", "Are people registered?" (Yes/No buttons).
  4. Financials: Ask Expected Price (Decimal).
  5. Context: Urgency reason (Text).
  6. Final: Save to Prisma `prisma.lot.create({ ... })` with DRAFT status.
#### [NEW] `__tests__/bot-create-lot.test.ts`
- Unit tests to verify the conversation registers correctly and handles the database commit.

---

### [Task 4: Conversation Routing]
Connect the conversation to the main bot flow.
#### [MODIFY] `bot/index.ts`
- `bot.use(createConversation(createLotConversation))`
- When a user clicks `role_owner` or `role_broker` in the start menu, trigger `ctx.conversation.enter('createLotConversation')`.

## Verification Plan

### Automated Tests
```bash
# Run all vitest tests in the worktree
export BEADS_NO_DAEMON=1
pnpm run test
```

### Manual Verification
1. Start the bot locally (`pnpm run dev` or equivalent Node runner).
2. Go to Telegram, send `/start`.
3. Click "✅ Принимаю" and choose "👤 Я Собственник".
4. The bot should reply "Введите адрес продаваемого объекта:".
5. Verify the answers are collected and successfully stored in the Database as a DRAFT Lot.
