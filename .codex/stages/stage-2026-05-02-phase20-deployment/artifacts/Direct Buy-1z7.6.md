---
schema_version: orchestration-artifact/v1
artifact_type: delegated-stream
task_id: Direct Buy-1z7.6
stage_id: stage-2026-05-02-phase20-deployment
repo: Direct Buy
branch: master
base_branch: master
base_commit: 2c45fce0d8950e9f63abbdc10f895ec7cae95563
worktree: /home/me/code/Direct Buy
status: blocked
risk_level: high
verification:
  - Context7 Docker Compose docs for docker compose config -q: passed
  - Context7 Caddy automatic HTTPS docs plus official Caddy CLI docs for caddy validate: passed
  - DNS resolve directbuy.aidevteam.ru A/AAAA: passed
  - curl HTTP/HTTPS directbuy.aidevteam.ru/admin/login: passed
  - public TCP checks for 80/443/3001: passed
  - ssh root@80.74.28.160 docker --version and docker compose version: passed
  - central Caddy route and validation on 80.74.28.160: passed
  - ssh root@91.132.59.194 Docker/Compose check: failed
  - sanitized production .env key presence on 91.132.59.194: failed
  - docker compose config -q on 91.132.59.194: blocked
  - sanitized BotFather getMe check from production env: passed
  - backup destination and alert owner discovery: blocked
changed_files:
  - /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.6.md
explicit_defers:
  - Direct Buy-1z7.6 remains blocked: app host lacks Docker/Compose, production .env is mode 644 and missing Phase 20 keys, backup destination and alert owner are unnamed
---

# Summary

Returned `blocked`. The live service is reachable, but the external production prerequisites do not satisfy the Phase 20 Docker Compose deployment contract required before `Direct Buy-1z7.5`.

Observed topology:

| Layer | Evidence | Status |
| --- | --- | --- |
| Public domain | `directbuy.aidevteam.ru` resolves A to `80.74.28.160`; no AAAA result was returned. | partial |
| Edge proxy | `80.74.28.160` runs Docker `29.2.1`, Docker Compose `v5.1.0`, and `central-caddy`; `/root/caddy/Caddyfile` routes `directbuy.aidevteam.ru` to `91.132.59.194:3001`. | pass |
| App host | `91.132.59.194` is reachable over SSH as root and serves the app from `/var/www/directbuy/current`, but Docker and Docker Compose are missing. | block |
| Runtime topology | App host uses PM2 processes `directbuy-web`, `directbuy-bot`, and `directbuy-worker`; Next listens on `3001`; local PostgreSQL and Redis listen on loopback. | block for Compose contract |

# Prerequisite Table

| Prerequisite | Status | Non-secret evidence |
| --- | --- | --- |
| DNS A/AAAA for `DOMAIN` | partial | `directbuy.aidevteam.ru` A resolves to `80.74.28.160`; AAAA empty. This points to the central Caddy edge, not directly to the app host `91.132.59.194`. |
| VPS / Compose host | block | App host `91.132.59.194` has no `docker` command and no Docker Compose plugin; `docker compose config -q` cannot run there. |
| Firewall ports | partial | Edge host allows 80/443; app host allows 80/443/3001 and denies 3000. Public TCP checks showed 80/443 open on the edge and 3001 open on the app host. |
| Production `.env` | block | `/var/www/directbuy/current/.env` exists on app host but is mode `644`, not `600`. Sanitized key presence showed missing required Phase 20 keys: `DOMAIN`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `ADMIN_API_KEY`, `SLA_DOCS_UPLOAD_HOURS`, `SLA_INVESTOR_REVIEW_HOURS`, `SLA_OFFER_RESPONSE_HOURS`, and `BOT_ACTIVE`. |
| Caddy certificate path | pass | HTTP redirects to HTTPS; HTTPS `/admin/login` returns 200; public cert subject is `directbuy.aidevteam.ru`, issuer `E8`, valid until `Jun 8 08:01:58 2026 GMT`; central `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` passed. |
| BotFather token | partial | Sanitized Telegram `getMe` using production env returned HTTP 200, `ok=true`, username `mo_lot_bot`. Human ownership of the BotFather account was not independently confirmed. |
| Manager Telegram IDs | partial | `MANAGER_CHAT_ID` is present in production `.env` with 2 comma-separated entries. Exact IDs were not copied into this artifact. |
| Optional DaData key | pass / optional disabled | `DADATA_API_KEY` is missing from production `.env`; docs allow empty or missing key to disable address suggestions. |
| Backup destination | block | No Direct Buy backup path, `pg_dump` cron, upload archive job, or system timer was found on the app host. |
| Monitoring / alert owner | block | No named alert owner was found in repo or on the production host. |
| Smoke/E2E target and credentials path for `Direct Buy-1z7.5` | block | Target URL can be `https://directbuy.aidevteam.ru`, and the current credential source is `/var/www/directbuy/current/.env` on `root@91.132.59.194`, but the file mode and missing keys block a safe smoke handoff. |

# Verification

Commands run locally:

- `node -e` DNS lookup for `directbuy.aidevteam.ru`: A `80.74.28.160`, no AAAA.
- `curl -I http://directbuy.aidevteam.ru/admin/login`: HTTP 308 redirect to HTTPS from Caddy.
- `curl -I https://directbuy.aidevteam.ru/admin/login`: HTTP 200 from Next.js via Caddy.
- TCP probes for `directbuy.aidevteam.ru:80`, `directbuy.aidevteam.ru:443`, `91.132.59.194:3001`: open.

Commands run on `root@80.74.28.160`:

- `docker --version`: Docker version `29.2.1`.
- `docker compose version`: Docker Compose version `v5.1.0`.
- `grep` for `directbuy.aidevteam.ru` in `/root/caddy/Caddyfile`: routes to `91.132.59.194:3001`.
- `docker exec central-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`: valid configuration.
- `ufw status verbose`: 80/443 allowed.

Commands run on `root@91.132.59.194`:

- `command -v docker`: missing.
- `command -v docker-compose`: missing.
- `ss -tlnp`: local PostgreSQL on `127.0.0.1:5432`, Redis on loopback, Next on `*:3001`, Nginx on 80/443.
- `stat -c %a /var/www/directbuy/current/.env`: `644`.
- Sanitized `.env` key presence check: several Phase 20 keys missing; no values printed.
- `pm2 jlist` filtered to Direct Buy cwd: `directbuy-web`, `directbuy-bot`, and `directbuy-worker` online.
- Telegram `getMe` using `BOT_TOKEN` from the production environment: HTTP 200, `ok=true`, username `mo_lot_bot`; token value not printed.
- Backup discovery via `find`, root crontab, and system timers: no Direct Buy backup destination or schedule found.
- `ufw status verbose`: 80/443/3001 allowed, 3000 denied.

# Exact Remaining Operator Actions

1. Decide whether Phase 20 should deploy to the current app host `91.132.59.194` or a new Compose VPS. If using the current host, install Docker Engine and the Docker Compose plugin there, or explicitly change the deployment contract away from Compose.
2. Move the production deployment to the documented path `/var/www/directbuy/current` only if it remains the canonical path; otherwise update `docs/DEPLOYMENT.md` and the smoke instructions to the real path.
3. Fix production `.env` permissions on the app host: `chmod 600 /var/www/directbuy/current/.env`.
4. Add or migrate the required Phase 20 env keys by name: `DOMAIN`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `ADMIN_API_KEY`, `SLA_DOCS_UPLOAD_HOURS`, `SLA_INVESTOR_REVIEW_HOURS`, `SLA_OFFER_RESPONSE_HOURS`, and `BOT_ACTIVE`. Do not paste values into repo artifacts.
5. Confirm whether `directbuy.aidevteam.ru -> 80.74.28.160 -> 91.132.59.194:3001` is the intended production topology. If yes, document the central Caddy host as the certificate edge and app host `91.132.59.194` as the runtime target.
6. If Compose is adopted, run `docker compose config -q` on the app host from `/var/www/directbuy/current` after `.env` is complete. Use `-q` to avoid printing interpolated secrets.
7. Provision and name the off-host backup destination for PostgreSQL dumps and upload archives. Add the schedule owner and restore location to the deployment runbook.
8. Name the monitoring/alert owner for service health, Caddy certificate failures, bot polling errors, worker failures, disk usage, and backup failures.
9. Confirm BotFather human ownership for `mo_lot_bot`; the token is valid, but account ownership was not independently verified.
10. Remove or rotate any committed legacy admin credential text in QA documentation before sharing the smoke package broadly; the exact value is intentionally omitted here.

# Risks / Follow-ups / Explicit Defers

`Direct Buy-1z7.5` should remain blocked. It has a reachable target URL, but lacks a safe credentials path and a Compose-ready production host. The most important blockers are missing Docker/Compose on the app host, `.env` mode `644`, missing required Phase 20 keys, no backup destination, no named alert owner, and an unresolved topology mismatch between the new Compose runbook and the current PM2/Nginx deployment.
