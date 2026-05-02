# Stage Summary - Phase 20 Deployment

Stage id: `stage-2026-05-02-phase20-deployment`

## Goal

Close Phase 20 production deployment readiness by fixing the blocking local quality gates, preparing deployment runbook evidence, and running smoke/E2E verification when prerequisites are ready.

## Current Streams

- `Direct Buy-1z7.1`: toolchain baseline. Accepted, integrated, and closed.
- `Direct Buy-1z7.2`: ESLint warning cleanup. Accepted, integrated, and closed; orchestrator expanded ignores for `.next` and `.worktrees`.
- `Direct Buy-1z7.3`: production deployment runbook/checklist. Accepted, integrated, and closed.
- `Direct Buy-1z7.4`: unit test gate. Completed locally by orchestrator on the integrated tree and closed.
- `Direct Buy-1z7.6`: external production infrastructure values. Blocked; must be completed before smoke/E2E.
- `Direct Buy-1z7.5`: smoke/E2E deployment gate. Must wait for `Direct Buy-1z7.6`.

## Verification Evidence

- `pnpm lint` passed under Node `22.18.0`.
- `pnpm test` passed 25 files / 95 tests under Node `22.18.0`.
- `pnpm build` passed under Node `22.18.0`.
- `docker compose config` passed with placeholder env.
- `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` passed through Compose.
- `docker build --build-arg NEXT_PUBLIC_BOT_USERNAME=directbuy_bot -t directbuy-deploy-check:orchestrator .` passed after retrying a transient Docker snapshot export failure.
- `scripts/orchestration/run_process_verification.sh` passed.
- `Direct Buy-1z7.6` readiness check returned blocked: public service is reachable, but app host Docker/Compose, production `.env`, backups, alert ownership, and topology decision are not ready.

## Coordination Rules

- Use separate worktrees for parallel manual agents.
- Review completion events with `python3 scripts/orchestration/review_completion_inbox.py`.
- Returned artifacts belong under `.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/`.
- No child should leave silent technical debt; any real defer needs a Beads id.

## Explicit Defers

- `Direct Buy-1z7.6`: app host Docker/Compose, production `.env` mode/keys, backup destination, alert owner, and PM2/Nginx vs Compose topology are external/manual blockers.
- `Direct Buy-1z7.5`: waits for `Direct Buy-1z7.6`; do not launch until production or smoke-equivalent infrastructure is available.
