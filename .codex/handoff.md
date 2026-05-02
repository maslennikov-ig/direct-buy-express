# Handoff

## Current truth

- Baseline mode: `balanced-v2.7`; repo topology is single repository at `/home/me/code/Direct Buy`.
- Delivery mode: direct to `master`; repo policy requires pushed work for closeout.
- Launch mode: manual user launch; prompts live in `.codex/stages/stage-2026-05-02-phase20-deployment/prompts.md`.
- Beads is the only task truth. Phase 20 deployment epic has child tasks `Direct Buy-1z7.1` through `Direct Buy-1z7.7`.
- Completion events for `Direct Buy-1z7.1`, `Direct Buy-1z7.2`, and `Direct Buy-1z7.3` were reviewed and accepted by the orchestrator.
- Completion event `b858da05` for `Direct Buy-1z7.6` was reviewed and accepted as a real blocked return; blockers were later remediated in the same stage.
- Completion event `db1cb3b4` for `Direct Buy-1z7.6` was reviewed and accepted as the remediation return.
- Completion event `37d0ed99` for `Direct Buy-1z7.5` was reviewed and accepted as a returned smoke gate.
- `Direct Buy-1z7.1`, `Direct Buy-1z7.2`, `Direct Buy-1z7.3`, `Direct Buy-1z7.4`, `Direct Buy-1z7.5`, and `Direct Buy-1z7.6` are closed in Beads.
- `Direct Buy-1z7.6` is closed in Beads after resolving external production infrastructure values for the current PM2/Nginx smoke contract.
- `Direct Buy-1z7.7` is closed after fixing the E2E runner isolation gate.
- `Direct Buy-1z7` / Phase 20 is closed in Beads.
- `Direct Buy-1z7.6` resolved topology decision: current production smoke stays PM2/Nginx on app host `91.132.59.194`; central Caddy on `80.74.28.160` terminates HTTPS for `directbuy.aidevteam.ru` and proxies to `91.132.59.194:3001`. Compose is a future migration, not the current smoke contract.
- `Direct Buy-1z7.6` evidence: production `.env` on `91.132.59.194` is mode `600` and has the required PM2 smoke key names by sanitized presence check; PM2 web/bot/worker are online; Nginx validates; PostgreSQL is ready; Redis returns `PONG`; Bot API `getMe` identifies `mo_lot_bot`; backup destination is `root@80.74.28.160:/var/backups/directbuy/91.132.59.194`; alert owner is Igor Maslennikov / `maslennikov-ig`.
- `Direct Buy-1z7.5` fixed and deployed the authorized `/api/lots` HTTP 500 by serializing Prisma `BigInt` fields before `NextResponse.json`; post-fix production smoke returned HTTP 200 JSON.
- `Direct Buy-1z7.7` resolved the remaining close blocker: `npm run test:e2e` no longer depends on the ambient `dotenv` CLI, validates `.env.test` / optional ignored `.env.test.local` before importing E2E specs, and guards destructive setup so it only runs against explicitly isolated test database names.
- Context7 docs checked during review for Next.js `connection()`, Docker Compose config rendering, and Caddy `reverse_proxy` validation.
- Verification evidence under Node `22.18.0` and `pnpm@10.7.0`: `pnpm lint` passed; `pnpm test` passed 25 files / 95 tests; `pnpm build` passed.
- Deployment validation evidence: `docker compose config` passed with placeholder env; `caddy validate` passed; `docker build --build-arg NEXT_PUBLIC_BOT_USERNAME=directbuy_bot -t directbuy-deploy-check:orchestrator .` passed on retry after a transient Docker snapshot export error.
- Orchestrator integration added guardrails for build-time imports: ESLint ignores `.next`/`.worktrees`, Redis queue connection uses `lazyConnect`, settings Redis subscriber initializes lazily, and admin lot API routes import Telegram bot only inside runtime notification branches.

## Next recommended

Next stage id: none for Phase 20.

Recommended action: review the `Direct Buy-1z7.7` completion event and artifact, then accept Phase 20 closeout if no external deployment follow-up is desired.

## Starter prompt for next orchestrator

Use $orchestrator-stage in `/home/me/code/Direct Buy`. Review `.codex/orchestrator.toml`, `.codex/project-index.md`, `.codex/handoff.md`, Beads, and `.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.7.md`. Confirm/review the completion inbox with `python3 scripts/orchestration/review_completion_inbox.py`, then decide whether Phase 20 needs any post-close deployment follow-up.

## Explicit defers

- None currently recorded for Phase 20.
