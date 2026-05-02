# Stage Summary - Phase 20 Deployment

Stage id: `stage-2026-05-02-phase20-deployment`

## Goal

Close Phase 20 production deployment readiness by fixing the blocking local quality gates, preparing deployment runbook evidence, and running smoke/E2E verification when prerequisites are ready.

## Current Streams

- `Direct Buy-1z7.1`: toolchain baseline. Accepted, integrated, and closed.
- `Direct Buy-1z7.2`: ESLint warning cleanup. Accepted, integrated, and closed; orchestrator expanded ignores for `.next` and `.worktrees`.
- `Direct Buy-1z7.3`: production deployment runbook/checklist. Accepted, integrated, and closed.
- `Direct Buy-1z7.4`: unit test gate. Completed locally by orchestrator on the integrated tree and closed.
- `Direct Buy-1z7.6`: external production infrastructure values. Accepted, remediated, and closed.
- `Direct Buy-1z7.5`: smoke/E2E deployment gate. Ready to launch against the PM2/Nginx production target.

## Verification Evidence

- `pnpm lint` passed under Node `22.18.0`.
- `pnpm test` passed 25 files / 95 tests under Node `22.18.0`.
- `pnpm build` passed under Node `22.18.0`.
- `docker compose config` passed with placeholder env.
- `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` passed through Compose.
- `docker build --build-arg NEXT_PUBLIC_BOT_USERNAME=directbuy_bot -t directbuy-deploy-check:orchestrator .` passed after retrying a transient Docker snapshot export failure.
- `scripts/orchestration/run_process_verification.sh` passed.
- `Direct Buy-1z7.6` readiness check initially returned blocked, then returned remediated: PM2/Nginx is the active smoke contract, production `.env` mode/key presence is verified, backup destination/schedule and alert owner are named, and the target is `https://directbuy.aidevteam.ru`.

## Coordination Rules

- Use separate worktrees for parallel manual agents.
- Review completion events with `python3 scripts/orchestration/review_completion_inbox.py`.
- Returned artifacts belong under `.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/`.
- No child should leave silent technical debt; any real defer needs a Beads id.

## Explicit Defers

- `Direct Buy-1z7.5`: production smoke should investigate authorized `/api/lots` returning 500 after credentials are accepted.
- Compose migration is out of the Phase 20 smoke contract; do not run it without a separate maintenance-window plan.
