# Phase 8: Auction Engine (Specifications)

## 1. Description
This specification outlines the exact requirements for the P2P real estate auction matching engine and bidding system within the Telegram bot.

## 2. Requirements

### 2.1 Investor Matching (Broadcaster)
- **Trigger:** A Lot's status changes to `AUCTION`.
- **Target Audience:** All `InvestorProfile` where:
  - `isVerified` === true
  - `minBudget` <= `lot.expectedPrice` <= `maxBudget`
  - `districts` overlap with the Lot's address (or if the investor's `districts` array is empty, they match all).
- **Delivery:** Must use `@grammyjs/auto-retry` plugin to avoid `429 Too Many Requests` limits.
- **Message Content:** A visually appealing Telegram message containing key lot details (address, area, floor, rooms, expected price) and an inline keyboard button "💰 Предложить цену" (payload: `bid_lot_<lotId>`).

### 2.2 Bidding Process
- **Trigger:** Investor clicks "💰 Предложить цену".
- **Flow:**
  - Launch `makeBidConversation`.
  - Check if auction is still active (`status === AUCTION`).
  - Ask for the bid amount (Total in rubles).
  - Validation: Ensure input is a valid positive number and formatted gracefully. 
  - Save/Update: If a `Bid` already exists from this investor for this `lotId`, *update* it. Otherwise, *create* it.
  - Finalization: Reply with a solid confirmation message.

### 2.3 Auction Closing Logic
- **Trigger 1 (Automatic Limits):** After any successful bid, check the total count of bids for the `lotId`. If `bids.length >= 5`, trigger manual closing logic.
- **Trigger 2 (BullMQ SLA Timer):** The 12-hour SLA job (`CLOSE_AUCTION`) fires in `worker.ts`.
- **Action:**
  - Update `lot.status` to `WAITING_CHOICE`.
  - Alert the Owner containing the list of all matching bids.
  - Alert all participating Investors: "Сбор предложений завершен".
  - If triggered by 5 bids, correctly remove/cancel the pending BullMQ `CLOSE_AUCTION` job to prevent double-firing.

## 3. Out of Scope
- Actually processing the payment/deposit. This phase only records the *digital intent* to buy (the Bid).
