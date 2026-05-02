# Handoff

## Current truth

- Baseline mode: `balanced-v2.7`; repo topology is single repository at `/home/me/code/Direct Buy`.
- Delivery mode: direct to `master`; repo policy requires pushed work for closeout.
- Launch mode: manual user launch; prompts live in `.codex/stages/stage-2026-05-02-phase20-deployment/prompts.md`.
- Beads is the only task truth. Phase 20 deployment epic has child tasks `Direct Buy-1z7.1` through `Direct Buy-1z7.6`.
- Completion events for `Direct Buy-1z7.1`, `Direct Buy-1z7.2`, and `Direct Buy-1z7.3` were reviewed and accepted by the orchestrator.
- Completion event `b858da05` for `Direct Buy-1z7.6` was reviewed and accepted as a real blocked return.
- `Direct Buy-1z7.1`, `Direct Buy-1z7.2`, `Direct Buy-1z7.3`, and `Direct Buy-1z7.4` are closed in Beads.
- `Direct Buy-1z7.6` tracks external production infrastructure values and is blocked.
- `Direct Buy-1z7.5` remains blocked until `Direct Buy-1z7.6` is satisfied.
- `Direct Buy-1z7.6` evidence: public `https://directbuy.aidevteam.ru/admin/login` is reachable through central Caddy on `80.74.28.160`, which proxies to app host `91.132.59.194:3001`.
- `Direct Buy-1z7.6` blockers: app host `91.132.59.194` has no Docker/Compose, production `.env` is mode `644` and missing Phase 20 keys, backup destination is unnamed, alert owner is unnamed, and PM2/Nginx vs Compose topology needs an explicit decision.
- Context7 docs checked during review for Next.js `connection()`, Docker Compose config rendering, and Caddy `reverse_proxy` validation.
- Verification evidence under Node `22.18.0` and `pnpm@10.7.0`: `pnpm lint` passed; `pnpm test` passed 25 files / 95 tests; `pnpm build` passed.
- Deployment validation evidence: `docker compose config` passed with placeholder env; `caddy validate` passed; `docker build --build-arg NEXT_PUBLIC_BOT_USERNAME=directbuy_bot -t directbuy-deploy-check:orchestrator .` passed on retry after a transient Docker snapshot export error.
- Orchestrator integration added guardrails for build-time imports: ESLint ignores `.next`/`.worktrees`, Redis queue connection uses `lazyConnect`, settings Redis subscriber initializes lazily, and admin lot API routes import Telegram bot only inside runtime notification branches.

## Next recommended

Next stage id: `stage-2026-05-02-phase20-deployment`

Recommended action: resolve the external `Direct Buy-1z7.6` blockers on the production hosts, then rerun the `Direct Buy-1z7.6` readiness check. Launch `Direct Buy-1z7.5` only after `Direct Buy-1z7.6` is closed.

## Starter prompt for next orchestrator

Use $orchestrator-stage in `/home/me/code/Direct Buy`. Review `.codex/orchestrator.toml`, `.codex/project-index.md`, `.codex/handoff.md`, Beads, and `.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.6.md`. Confirm the completion inbox is empty with `python3 scripts/orchestration/review_completion_inbox.py`, then coordinate external remediation for `Direct Buy-1z7.6`; only after it closes, launch `Direct Buy-1z7.5`.

## Explicit defers

- `Direct Buy-1z7.6`: production host Docker/Compose, `.env` permissions/keys, backup destination, alert owner, and deployment topology must be resolved outside the repo.
- `Direct Buy-1z7.5`: smoke/E2E deployment gate waits on `Direct Buy-1z7.6`.
