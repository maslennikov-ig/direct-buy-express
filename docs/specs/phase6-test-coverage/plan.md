# Phase 6: Code Coverage Improvement Plan

## Goal
Achieve near 100% test coverage for all critical business logic, specifically targeting uncovered branches and statements identified in the recent coverage report.

## Uncovered Areas
1. `bot/index.ts` (Lines 16, 26-41, 47-48) - Telegram Bot entrypoint, command handling (`/start`), and inline keyboard callbacks (`role_owner`, `role_broker`, `role_investor`).
2. `bot/conversations/create-lot.ts` (Lines 15-16, 29, 107-108) - Error conditions during lot creation (missing address text, DaData fallback without suggestions, DB save exceptions).
3. `lib/dadata.ts` (Lines 11-12) - DaData API error handling.
4. `lib/db.ts` (Line 9) - Prisma client instantiation edge case.
5. `lib/queue/worker.ts` (Line 35) - Skipping lot status update when not in `AUCTION` status.

## Tasks

### Task 1: Coverage for Bot Entrypoint
- **Target:** `bot/index.ts`
- **Test File:** `__tests__/bot.test.ts`
- **Action:** Add tests to simulate the `/start` command, asserting the welcome message and inline keyboard are sent. Add tests to simulate the `callback_query:data` events for `accept_terms`, `role_owner`, `role_broker`, and `role_investor`.

### Task 2: Coverage for Conversation Edge Cases
- **Target:** `bot/conversations/create-lot.ts`
- **Test File:** `__tests__/bot-create-lot.test.ts`
- **Action:** Add test for missing text in the address step (returns early). Add test where DaData returns no suggestions (falls back to regular prompt). Add test for DB throw exception during `lot.create` (asserts the catch block error message).

### Task 3: Coverage for Core Libs
- **Target:** `lib/dadata.ts`, `lib/queue/worker.ts`, `lib/db.ts`
- **Test Files:** `__tests__/dadata.test.ts`, `__tests__/queue.test.ts`, `__tests__/db.test.ts`
- **Action:** Add test for DaData response missing expected fields. Add test for `lib/queue/worker.ts` where lot is in `DRAFT` status and gets skipped.
