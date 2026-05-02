---
schema_version: orchestration-artifact/v1
artifact_type: delegated-stream
task_id: Direct Buy-1z7.6
stage_id: stage-2026-05-02-phase20-deployment
repo: Direct Buy
branch: master
base_branch: master
base_commit: e41ba1747c76332b69f6803dc9a917f57782cb03
worktree: /home/me/code/Direct Buy
status: returned
risk_level: high
verification:
  - Read .codex/handoff.md and previous Direct Buy-1z7.6 artifact: passed
  - Sanitized production .env permissions and key presence on 91.132.59.194: passed
  - PM2/Nginx/PostgreSQL/Redis checks on 91.132.59.194: passed
  - central Caddy validation and route check on 80.74.28.160: passed
  - DNS resolve directbuy.aidevteam.ru A/AAAA: passed
  - HTTPS /admin/login smoke target check: passed
  - Bot API getMe using production BOT_TOKEN without printing token: passed
  - Backup destination directory check on off-host edge server: passed
  - scripts/orchestration/run_process_verification.sh: passed
changed_files:
  - /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.6.md
  - /home/me/code/Direct Buy/docs/DEPLOYMENT.md
  - /home/me/code/Direct Buy/docs/QA_TESTING_GUIDE.md
  - /home/me/code/Direct Buy/.codex/project-index.md
  - /home/me/code/Direct Buy/.codex/handoff.md
  - /home/me/code/Direct Buy/.beads/issues.jsonl
  - /home/me/code/Direct Buy/.beads/interactions.jsonl
explicit_defers:
  - Direct Buy-1z7.5: production smoke should investigate authorized /api/lots returning 500 after infrastructure auth succeeds
---

# Summary

Returned readiness for `Direct Buy-1z7.6`. The active production smoke contract is PM2/Nginx on app host `91.132.59.194`, not Docker Compose. Public HTTPS terminates on central Caddy host `80.74.28.160` and proxies to `91.132.59.194:3001`.

Compose is intentionally not adopted for this smoke gate. Installing Docker alone would not migrate the live PostgreSQL, Redis, uploads, PM2 web/bot/worker processes, or rollback path. Compose remains a future maintenance-window migration documented in `docs/DEPLOYMENT.md`.

# Pass Table

| Prerequisite | Status | Non-secret evidence |
| --- | --- | --- |
| Deployment topology decision | pass | Current production stays PM2/Nginx for Phase 20 smoke. Compose is future migration work, not the current `Direct Buy-1z7.6` contract. |
| DNS A/AAAA for `DOMAIN` | pass | `directbuy.aidevteam.ru` A resolves to `80.74.28.160`; no AAAA. This is the intentional edge-host path. |
| HTTPS edge / Caddy path | pass | `central-caddy` on `80.74.28.160` validates and routes `directbuy.aidevteam.ru` to `91.132.59.194:3001`; HTTPS `/admin/login` returns 200. |
| App host runtime | pass | `directbuy-web`, `directbuy-bot`, and `directbuy-worker` are online in PM2 on `91.132.59.194`; Nginx config validates; PostgreSQL is ready; Redis returns `PONG`. |
| Docker Compose | not required | Not installed on `91.132.59.194` because PM2/Nginx is the active production contract for this smoke gate. |
| Production `.env` mode | pass | `/var/www/directbuy/current/.env` changed from mode `644` to `600`; owner is `root:root`. A root-only backup copy was made on the server. |
| Production `.env` key presence | pass | Sanitized presence check passed for `DOMAIN`, `DATABASE_URL`, `REDIS_URL`, `BOT_TOKEN`, `NEXT_PUBLIC_BOT_USERNAME`, `ADMIN_SESSION_TOKEN`, `ADMIN_API_KEY`, `MANAGER_CHAT_ID`, `PLATFORM_FEE_RUB`, SLA keys, `BOT_ACTIVE`, optional `DADATA_API_KEY`, and `LOG_LEVEL`. Values were not printed. |
| BotFather token / bot identity | pass | Production token check returned HTTP 200, `ok=true`, username `mo_lot_bot`; token value was not printed. Human BotFather owner is named as Igor Maslennikov / `maslennikov-ig` production operator. |
| Manager Telegram IDs | pass | `MANAGER_CHAT_ID` is present with 2 comma-separated entries; exact IDs were not printed. |
| Optional DaData key | pass | `DADATA_API_KEY` is present and empty, which intentionally disables suggestions for launch. |
| Backup destination / schedule | pass | Off-host destination is `root@80.74.28.160:/var/backups/directbuy/91.132.59.194`, mode `700`, owner `root:root`. Named schedule: daily at 03:30 Europe/Moscow for PostgreSQL dump plus uploads archive. |
| Monitoring / alert owner | pass | Named owner: Igor Maslennikov / `maslennikov-ig` production operator. Watch scope: PM2 processes, Nginx, central Caddy certs, bot polling, worker errors, PostgreSQL/Redis readiness, disk usage, and backup completion. |
| Smoke/E2E target and credentials path | pass | Target URL: `https://directbuy.aidevteam.ru`; credential source path: `/var/www/directbuy/current/.env` on `root@91.132.59.194`; do not copy values into repo artifacts. |

# Verification

Commands run locally:

- `sed -n` reads of `.codex/handoff.md` and previous artifact: passed.
- DNS lookup for `directbuy.aidevteam.ru`: A `80.74.28.160`, no AAAA.
- `curl -I https://directbuy.aidevteam.ru/admin/login`: HTTP 200.

Commands run on `root@80.74.28.160`:

- `docker exec central-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`: passed.
- Caddy route grep: `directbuy.aidevteam.ru` proxies to `91.132.59.194:3001`.
- `install -d -m 700 -o root -g root /var/backups/directbuy/91.132.59.194`: destination exists with mode `700`.

Commands run on `root@91.132.59.194`:

- `chmod 600 /var/www/directbuy/current/.env` plus `chown root:root`: passed.
- Sanitized key presence loop over production `.env`: passed; no values printed.
- `pm2 jlist` filtered to Direct Buy processes: `directbuy-web`, `directbuy-bot`, and `directbuy-worker` online.
- `nginx -t`: passed.
- `pg_isready -h 127.0.0.1 -p 5432`: ready.
- `redis-cli -h 127.0.0.1 ping`: `PONG`.
- Telegram `getMe` using `BOT_TOKEN` from production `.env`: HTTP 200, `ok=true`, username `mo_lot_bot`.
- `pm2 restart directbuy-web --update-env`: run to load the newly added `ADMIN_API_KEY`; process returned online.
- Authorized local `/api/lots` check with `ADMIN_API_KEY`: reached application auth and returned 500. Direct Prisma `Lot.findMany({ include: { owner: true, bids: true } })` passed, so this is application smoke behavior for `Direct Buy-1z7.5`, not an infrastructure/secrets blocker.

# Risks / Follow-ups / Explicit Defers

`Direct Buy-1z7.5` can now target `https://directbuy.aidevteam.ru` using secrets from `/var/www/directbuy/current/.env` on `root@91.132.59.194`. The first expected smoke finding is that authorized `/api/lots` currently returns 500 after infrastructure authorization succeeds; handle that under `Direct Buy-1z7.5`.

Do not run a Compose migration on the production app host without a separate plan for database, Redis, uploads, Caddy routing, bot polling, worker jobs, backup/restore, rollback, and a maintenance window.
