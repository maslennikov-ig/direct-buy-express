---
schema_version: orchestration-artifact/v1
artifact_type: delegated-stream
task_id: Direct Buy-1z7.5
stage_id: stage-2026-05-02-phase20-deployment
repo: Direct Buy
branch: codex/direct-buy-1z7.5-phase20-smoke
base_branch: master
base_commit: eaa5bfe
worktree: /home/me/code/Direct Buy/.worktrees/direct-buy-1z7.5-phase20-smoke
status: returned
risk_level: high
verification:
  - Read AGENTS.md, .codex/handoff.md, Direct Buy-1z7.6 artifact, docs/DEPLOYMENT.md, docs/QA_TESTING_GUIDE.md: passed
  - Context7 Next.js 16.1.6 route handler docs and Prisma BigInt JSON serialization docs: passed
  - Production Caddy/Nginx/PM2/PostgreSQL/Redis/Prisma smoke checks: passed
  - Pre-fix authorized /api/lots production smoke: failed with HTTP 500
  - Root-cause reproduction on production without printing row data or secrets: passed
  - Regression test red-green for Prisma BigInt serialization in /api/lots: passed
  - pnpm lint: passed
  - pnpm test: passed, 25 files / 96 tests
  - pnpm build: passed
  - npm run test:e2e: blocked before Vitest by broken dotenv CLI resolution; bounded Beads Direct Buy-1z7.7 filed
  - Production deploy of code commit 76db9ea by git pull --ff-only, pnpm build, pm2 restart directbuy-web: passed
  - Post-fix authorized /api/lots production smoke: passed, HTTP 200 JSON array
changed_files:
  - /home/me/code/Direct Buy/app/api/lots/route.ts
  - /home/me/code/Direct Buy/__tests__/api-lots.test.ts
  - /home/me/code/Direct Buy/.beads/issues.jsonl
  - /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.5.md
explicit_defers:
  - Direct Buy-1z7.7: fix npm run test:e2e runner isolation before Phase 20 close
---

# Summary

Returned Phase 20 production smoke findings for `Direct Buy-1z7.5`.

The known application smoke failure was real: authorized `GET /api/lots` reached application authorization and returned HTTP 500. Root cause was JSON serialization of Prisma `BigInt` fields, specifically `User.telegramId` included through `include: { owner: true, bids: true }`. `NextResponse.json(lots)` attempted to serialize a JavaScript `bigint`, which throws `TypeError: Do not know how to serialize a BigInt`.

I fixed the route by converting `bigint` values to strings before returning JSON, added a regression test that fails on the old behavior, pushed commit `76db9ea` to `master`, deployed it to the PM2/Nginx production host, rebuilt, restarted only `directbuy-web`, and re-ran the production smoke. Authorized `/api/lots` now returns HTTP 200 with a JSON array; the sampled `owner.telegramId` type in the JSON response is `string`.

# Close Recommendation

Do not close Phase 20 yet.

Production app smoke for the known `/api/lots` blocker is now fixed and passing, but the requested `npm run test:e2e` gate is blocked by the repository's E2E runner setup before Vitest starts. I filed bounded follow-up `Direct Buy-1z7.7` because the E2E spec contains destructive `deleteMany` setup and must only run against an explicitly isolated test database, never production.

# Verification

## Production Smoke Evidence

Target: `https://directbuy.aidevteam.ru`

Credential source used only on host: `/var/www/directbuy/current/.env` on `root@91.132.59.194`. Secret values were not printed, copied, or committed.

Infrastructure and runtime:

| Check | Result | Non-secret evidence |
| --- | --- | --- |
| Edge Caddy validate on `80.74.28.160` | pass | `Valid configuration`; only formatting/header warnings |
| Production `.env` mode | pass | `env_mode=600` |
| PM2 processes | pass | `directbuy-web`, `directbuy-bot`, `directbuy-worker` online |
| Nginx config | pass | `nginx -t` successful |
| PostgreSQL | pass | `127.0.0.1:5432 - accepting connections` |
| Redis | pass | `PONG` |
| Prisma status | pass | schema is up to date; no migrations directory |
| Telegram Bot API `getMe` | pass | HTTP 200, `ok=true`, username `mo_lot_bot` |
| `/admin/login` before fix | pass | HTTP 200 |
| Unauthorized `/api/lots` before fix | pass | HTTP 401 |
| Authorized `/api/lots` before fix | fail | HTTP 500, generic body `{"error":"Failed to fetch lots"}` |
| Production root-cause sample | pass | sample query returned `owner_telegramId_type=bigint`; JSON stringify threw `TypeError:Do not know how to serialize a BigInt` |
| Deployed production code | pass | app host `git rev-parse --short HEAD` returned `76db9ea` |
| `/admin/login` after fix | pass | HTTP 200 |
| Unauthorized `/api/lots` after fix | pass | HTTP 401 |
| Authorized `/api/lots` after fix | pass | HTTP 200, `application/json`, JSON array count 11 |
| Authorized `/api/lots` serialization after fix | pass | sampled `owner_telegramId_json_type=string` |

## Code Fix

Changed `app/api/lots/route.ts`:

- Added a JSON-safe conversion helper using a `JSON.stringify` replacer.
- Converts JavaScript `bigint` values to strings before passing Prisma results to `NextResponse.json`.
- Keeps existing authorization behavior and generic database error response.

Changed `__tests__/api-lots.test.ts`:

- Made the `NextResponse.json` mock assert JSON serializability.
- Added regression coverage for a Prisma-like `BigInt` `owner.telegramId` response.

Context7 documentation checked:

- Next.js `/vercel/next.js/v16.1.6`: App Router route handlers return JSON via `Response.json`/`NextResponse.json`; route handler errors should be caught and returned intentionally.
- Prisma `/websites/prisma_io`: Prisma `BigInt` fields map to native JavaScript `bigint`; JSON serialization needs a custom replacer such as converting `bigint` to string.

## Local Verification

Commands run in `/home/me/code/Direct Buy/.worktrees/direct-buy-1z7.5-phase20-smoke`:

| Command | Result |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | pass |
| `corepack pnpm exec prisma generate` | pass |
| `corepack pnpm test __tests__/api-lots.test.ts` before fix | failed as expected; new BigInt test received 500 |
| `corepack pnpm test __tests__/api-lots.test.ts` after fix | pass, 5 tests |
| `corepack pnpm lint` | pass |
| `corepack pnpm test` | pass, 25 files / 96 tests |
| `corepack pnpm build` | pass |
| `npm run test:e2e` | blocked before Vitest; `dotenv -e .env.test` resolved an incompatible CLI and failed with `Invalid value for '-e' / '--export': '.env.test' is not a valid boolean` |

# Risks / Follow-ups

## E2E Blocker

`npm run test:e2e` is not currently a usable deployment gate:

- The script is `dotenv -e .env.test vitest run --config vitest.e2e.config.ts`.
- `.env.test` is absent in the worktree.
- The resolved `dotenv` executable is not the expected Node dotenv CLI, so the command fails before Vitest starts.
- The E2E test file performs destructive setup with `deleteMany` on media, bids, lots, and users; running it against production would be unsafe.

Filed `Direct Buy-1z7.7`:

> Fix test:e2e runner isolation for Phase 20 gates.

Acceptance: pin or otherwise resolve the intended dotenv CLI, fail safely when isolated test DB config is absent, and run successfully against an isolated test database.

## Additional Observations

The production PM2 web process still starts with `next start -p 3001` while `next.config.ts` has `output: 'standalone'`. Next.js logs a warning that standalone output should be started with `node .next/standalone/server.js`. This did not block the current smoke after rebuild/restart, but it should be treated as deployment-hardening work before switching deployment topology or tightening runtime gates.
