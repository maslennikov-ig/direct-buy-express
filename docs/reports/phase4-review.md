# Code Review Report: Phases 1-4 (Direct Buy MVP)

## Executive Summary
The MVP architecture has been successfully wired together (Next.js, Prisma, BullMQ, GrammY). However, multiple critical security and production-readiness issues were identified during this review representing "Tech Debt" that must be resolved prior to production deployment.

## Issues by Severity

### 🔴 Critical (Security & Authorization)
1. **Unprotected API Endpoints (`app/api/lots/route.ts`)**
   - **Vulnerability**: The endpoint fetches all lots and bids blindly with no authentication. Anyone can access `/api/lots` to scrape the database.
   - **Recommendation**: Implement `getServerSession` or Next.js middleware to ensure only authorized Admins can hit this endpoint.

2. **Bot Authentication is a Placeholder (`bot/middleware/auth.ts`)**
   - **Vulnerability**: The `authMiddleware` simply calls `await next()` without verifying or upserting the user in Prisma. 
   - **Recommendation**: Implement the DB lookup checking `ctx.from.id` before allowing the user to interact with the bot.

### 🟡 High (Reliability & Robustness)
3. **Fragile Input Validation (`bot/conversations/create-lot.ts`)**
   - **Issue**: Converting input via `parseInt` and checking `.includes("да")` is brittle. If a user types "Fifty" for area, it crashes or saves `NaN`.
   - **Recommendation**: Use grammY's conversational retry patterns or strict regex matching to re-prompt the user if validation fails.

4. **Missing Queue Logic (`lib/queue/worker.ts`)**
   - **Issue**: The `CLOSE_AUCTION` job just contains a `console.log`.
   - **Recommendation**: Implement a Prisma transaction to update the Lot status to `WAITING_CHOICE` and notify the owner via GrammY payload when SLA expires.

### 🟢 Medium (Performance & Scale)
5. **No Pagination on API (`app/api/lots/route.ts`)**
   - **Issue**: `findMany` fetches all records.
   - **Recommendation**: Add `take` and `skip` parameters to prevent long queries as the database grows.
