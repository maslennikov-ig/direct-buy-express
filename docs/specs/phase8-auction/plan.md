# Phase 8: Auction Engine (Implementation Plan)

## 1. Database Adjustments (Schema Check)
Existing schema supports `Bid` (`amount`, `investorId`, `lotId`) and `LotStatus.AUCTION`. No immediate DB migrations are required. 

## 2. Execution Tasks (Parallel Delegation via Beads)

### Task 1: Investor Mathching & Broadcaster
**Goal:** Implement the logic to find matching investors and broadcast.
**Implementation Steps:**
1. In `lib/matcher.ts`, implement `findMatchingInvestors(lot: Lot)`.
2. Configure `bot.api.config.use(autoRetry())` in `bot/index.ts`.
3. Create `bot/utils/broadcaster.ts` with function `broadcastLotToInvestors(lotId: string)`.

### Task 2: Bidding Conversation
**Goal:** Allow investors to submit or edit their bids.
**Implementation Steps:**
1. Create `bot/conversations/make-bid.ts`.
2. In `makeBidConversation`, correctly parse investor text input into numbers.
3. Call `prisma.bid.upsert` to allow investors to edit existing bids.
4. Hook up `bot.on("callback_query:data")` in `bot/index.ts` to listen for `bid_lot_<id>` and enter the conversation.

### Task 3: BullMQ 12h SLA & Closing Logic
**Goal:** Auto-close auctions and notify users.
**Implementation Steps:**
1. Update `lib/queue/worker.ts` -> `CLOSE_AUCTION` case.
2. Ensure status transitions to `WAITING_CHOICE`.
3. Fetch all `bids` for the lot. Send summary to `Owner`. Send "Auction closed" to all participating `Investors`.
4. In `bot/conversations/make-bid.ts`, after creating a bid, count the lot's bids. If >= 5, manually trigger the closure logic and cancel the BullMQ job using `slaQueue.remove()`.

## 3. Verification
Verify using Vitest (TDD). Write unit tests covering the matching logic, conversation flow, and auto-closing conditions. All tests must clear before merging.
