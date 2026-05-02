---
schema_version: orchestration-artifact/v1
artifact_type: delegated-stream
task_id: Direct Buy-1z7.3
stage_id: stage-2026-05-02-phase20-deployment
repo: /home/me/code/Direct Buy
branch: codex/direct-buy-1z7.3-deployment-runbook
base_branch: master
base_commit: "1354f3e9586c4451463aa3552ecded5bf9752557 (requested a35eed30c033 lacked the stage contract files and completion scripts)"
worktree: /home/me/code/Direct Buy/.worktrees/direct-buy-1z7.3-deployment-runbook
status: returned
risk_level: high
verification:
  - Context7 Next.js 16.2.2 docs query: passed
  - Context7 Docker Compose docs query: passed
  - Context7 Caddy/Caddyfile docs query: passed
  - pnpm install --frozen-lockfile: passed
  - npm run lint: passed
  - npm run build: blocked
  - npm run test: blocked
  - docker compose config: passed
  - docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile: passed
  - docker build --build-arg NEXT_PUBLIC_BOT_USERNAME=directbuy_bot -t directbuy-deploy-check:1z7.3 .: passed
  - scripts/orchestration/run_process_verification.sh: passed
changed_files:
  - .beads/issues.jsonl
  - .env.example
  - Caddyfile
  - Dockerfile
  - .codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.3.md
  - app/admin/investors/page.tsx
  - app/admin/lots/page.tsx
  - app/admin/page.tsx
  - docker-compose.yml
  - docs/DEPLOYMENT.md
  - lib/settings.ts
  - prisma/seed-settings.ts
explicit_defers:
  - Direct Buy-1z7.6: external production DNS/VPS/secrets/backup/monitoring actions required before smoke
  - Direct Buy-1z7.1: local shell runtime in this worktree is still Node 18.19.1 and blocks npm build/test; npm ci also shows package-lock drift
  - Direct Buy-1z7.2: this worktree still emits the existing ESLint 9 .eslintignore warning until the returned lint cleanup branch is integrated
  - Direct Buy-1z7.4: unit gate remains deferred until the toolchain baseline is fixed
  - Direct Buy-1z7.5: deployment smoke/E2E remains deferred until infra values and previous gates are ready
---

# Summary

Prepared a concrete production deployment runbook in `docs/DEPLOYMENT.md` covering env/secrets by name, VPS Docker Compose setup, Caddy/SSL/DNS, admin/bot/worker processes, persistence, backup/restore, rollback, monitoring, and smoke checks.

Checked the deployment contract across `docker-compose.yml`, `Dockerfile`, `Caddyfile`, `ecosystem.config.cjs`, `.env.example`, `docs/DEPLOYMENT.md`, `package.json`, `next.config.ts`, and Prisma/env usage. Compose is now documented and configured as the canonical production path; PM2 is explicitly documented as a non-canonical fallback.

Minimal deployment corrections made:

- `.env.example` now contains the actual production variable names and placeholders, without real values.
- `docker-compose.yml` now passes required values to the correct containers, including Caddy `DOMAIN`, admin `BOT_TOKEN`, `ADMIN_SESSION_TOKEN`, `ADMIN_API_KEY`, build-time `NEXT_PUBLIC_BOT_USERNAME`, initial settings, log level, and shared `uploads` volume for bot/admin media.
- `Dockerfile` now accepts `NEXT_PUBLIC_BOT_USERNAME` at build time and starts the Next.js standalone server path.
- `prisma/seed-settings.ts` now seeds initial settings from env on first deploy without overwriting existing DB rows.
- DB-backed admin server pages now call `connection()` so Next.js 16 renders them at request time instead of querying Prisma during Docker image build.
- `lib/settings.ts` no longer opens the Redis publisher connection at module import time.

Created Beads defer `Direct Buy-1z7.6` for external production infrastructure values and manual actions that cannot be completed from the repo.

# Verification

Docs research:

- Context7 `/vercel/next.js/v16.2.2`: confirmed standalone output, `node .next/standalone/server.js`, build-time public env handling, and `connection()` for runtime rendering.
- Context7 `/docker/compose`: confirmed Compose build/config/env interpolation behavior and validation commands.
- Context7 `/websites/caddyserver_caddyfile`: confirmed `reverse_proxy`, Caddyfile validation, and automatic HTTPS behavior.

Commands run:

- `pnpm install --frozen-lockfile`: passed.
- `npm run lint`: passed with the existing ESLintIgnoreWarning tracked by `Direct Buy-1z7.2`.
- `npm run build`: blocked because local Node is `18.19.1`; Next.js requires `>=20.9.0`.
- `npm run test`: blocked at Vitest/Vite startup with `ERR_REQUIRE_ESM`, consistent with the current toolchain blocker.
- `DOMAIN=directbuy.example.com POSTGRES_PASSWORD=example-postgres-password BOT_TOKEN=example-bot-token ADMIN_SESSION_TOKEN=example-session-token ADMIN_API_KEY=example-api-key NEXT_PUBLIC_BOT_USERNAME=directbuy_bot MANAGER_CHAT_ID=123456789 docker compose config`: passed.
- `DOMAIN=directbuy.example.com POSTGRES_PASSWORD=example-postgres-password BOT_TOKEN=example-bot-token ADMIN_SESSION_TOKEN=example-session-token ADMIN_API_KEY=example-api-key NEXT_PUBLIC_BOT_USERNAME=directbuy_bot MANAGER_CHAT_ID=123456789 docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`: passed.
- `docker build --build-arg NEXT_PUBLIC_BOT_USERNAME=directbuy_bot -t directbuy-deploy-check:1z7.3 .`: passed under Node 22 container runtime. The temporary image was removed afterward.
- `scripts/orchestration/run_process_verification.sh`: passed.

Non-gate setup note:

- `npm ci` was attempted first and failed because `package-lock.json` is not in sync with `package.json`; this is covered by `Direct Buy-1z7.1`.

# Risks / Follow-ups / Explicit Defers

- `Direct Buy-1z7.6`: Operator must provision DNS/VPS/firewall, production `.env` values, BotFather token, manager Telegram IDs, optional DaData key, off-host backup target, and alert ownership before `Direct Buy-1z7.5`.
- `Direct Buy-1z7.1`: Local shell runtime in this worktree is still Node 18.19.1, so local `npm run build` and `npm run test` remain blocked here even though the toolchain baseline stream has returned separately.
- `Direct Buy-1z7.2`: ESLint `.eslintignore` warning remains in this branch until the returned lint cleanup branch is integrated.
- `Direct Buy-1z7.4`: Unit test gate remains blocked until the runtime/toolchain baseline is fixed.
- `Direct Buy-1z7.5`: Smoke/E2E must run after infrastructure values and previous gates are ready.
