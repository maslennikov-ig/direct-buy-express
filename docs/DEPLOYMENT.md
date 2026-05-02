# Deployment Runbook: Direct Buy

This runbook is for the Docker Compose production path. The repository also has
`ecosystem.config.cjs` as a PM2 fallback, but Compose is the canonical deployment
topology because it keeps Next.js, the grammY bot, BullMQ worker, PostgreSQL,
Redis, Caddy, and persistent volumes in one checked configuration.

Documentation checked on 2026-05-02:

- Next.js self-hosting and `output: 'standalone'`: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Docker Compose environment interpolation and `docker compose config`: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Caddy reverse proxy and automatic HTTPS: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy and https://caddyserver.com/docs/automatic-https

## Production Topology

| Service | Compose service | Purpose | Internal port | Persistence |
| --- | --- | --- | --- | --- |
| Next.js admin/API | `admin-panel` | Admin UI, API routes, Prisma migrate/setting seed on start | `3000` | `uploads:/app/uploads` |
| Telegram bot | `bot` | grammY long-polling process and Telegram file downloads | none | `uploads:/app/uploads` |
| BullMQ worker | `worker` | Delayed SLA jobs and notifications | none | none |
| PostgreSQL 16 | `postgres` | Primary application database | `5432` | `pgdata` |
| Redis 7 | `redis` | BullMQ, bot/session/settings invalidation | `6379` | `redisdata` |
| Caddy 2 | `caddy` | HTTPS termination and reverse proxy to `admin-panel:3000` | `80`, `443`, `443/udp` | `caddy_data`, `caddy_config` |

Do not delete `pgdata`, `redisdata`, `uploads`, `caddy_data`, or `caddy_config`
during normal deploys or rollbacks. `uploads` stores documents downloaded by
the bot and served later by protected admin/API routes.

## Required External Values

Create `/var/www/directbuy/current/.env` from `.env.example` on the VPS. The
file must be mode `0600` and must not be committed.

| Name | Required | Used by | Notes |
| --- | --- | --- | --- |
| `DOMAIN` | yes | Caddy | Public FQDN. DNS A/AAAA must point to the VPS before Caddy can issue certificates. |
| `POSTGRES_USER` | yes | Postgres/app | Default can be `directbuy`; changing after initialization requires DB migration work. |
| `POSTGRES_PASSWORD` | yes, secret | Postgres/app | Generate a strong value before first `docker compose up`. |
| `POSTGRES_DB` | yes | Postgres/app | Default can be `directbuy`. |
| `BOT_TOKEN` | yes, secret | bot, worker, admin auth | BotFather token; admin Telegram login signature verification also needs it. |
| `NEXT_PUBLIC_BOT_USERNAME` | yes | Docker build, admin UI | Build-time public value used by client components and Telegram login widget. Rebuild after changing it. |
| `ADMIN_SESSION_TOKEN` | yes, secret | admin/API middleware | Generate a random token; changing it logs out admins. |
| `ADMIN_API_KEY` | yes, secret | `/api/lots` | Bearer token for external/admin API reads. |
| `MANAGER_CHAT_ID` | yes | initial DB settings | Comma-separated Telegram IDs allowed to log in and receive manager notifications. Seeded only if the DB row does not already exist. |
| `PLATFORM_FEE_RUB` | yes | initial DB settings | Seed default platform fee. Existing DB setting wins after first deploy. |
| `SLA_DOCS_UPLOAD_HOURS` | yes | initial DB settings | Seed default docs upload SLA. |
| `SLA_INVESTOR_REVIEW_HOURS` | yes | initial DB settings | Seed default investor review SLA. |
| `SLA_OFFER_RESPONSE_HOURS` | yes | initial DB settings | Seed default owner offer response SLA. |
| `BOT_ACTIVE` | yes | initial DB settings | Seed bot activity flag. |
| `DADATA_API_KEY` | optional secret | bot | Empty value disables address suggestions. |
| `LOG_LEVEL` | optional | app services | Defaults to `info`. |

Generate local secrets on an operator machine or the VPS:

```bash
openssl rand -base64 48
```

## Manual Infrastructure Checklist

Complete these actions before the first production smoke gate:

- Provision a Linux VPS with Docker Engine and the Docker Compose plugin.
- Open inbound TCP `80` and `443`; keep SSH limited to the operator allowlist.
- Create a DNS A record for `DOMAIN` pointing to the VPS IPv4 address. Add AAAA only if IPv6 is configured on the VPS.
- Obtain `BOT_TOKEN` from BotFather and set the bot username in `NEXT_PUBLIC_BOT_USERNAME` without `@`.
- Obtain the production manager Telegram IDs for `MANAGER_CHAT_ID`.
- Decide whether DaData suggestions are required for launch; if yes, provision `DADATA_API_KEY`.
- Confirm backup storage outside the Docker host for PostgreSQL dumps and upload archives.
- Confirm alert ownership: who watches `docker compose ps`, Caddy certificate failures, bot polling failures, worker errors, disk usage, and failed backups.

These actions are tracked as Beads defer `Direct Buy-1z7.6`. The Phase 20 smoke
gate remains `Direct Buy-1z7.5`.

## First Deploy

Run on the VPS as the deploy user. The target path used below is conventional;
keep it stable because rollback commands assume it.

```bash
sudo mkdir -p /var/www/directbuy
sudo chown -R "$USER:$USER" /var/www/directbuy
cd /var/www/directbuy
git clone git@github.com:maslennikov-ig/direct-buy-express.git current
cd current
git switch master
git pull --ff-only
cp .env.example .env
chmod 600 .env
```

Edit `.env` and replace every placeholder before continuing.

Validate interpolation and Caddy syntax before starting long-running services:

```bash
docker compose config
docker compose config --environment
docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Build and start:

```bash
docker compose build --pull
docker compose up -d
docker compose ps
```

`admin-panel` runs `prisma migrate deploy` and `prisma/seed-settings.ts` before
starting `node .next/standalone/server.js`. The seed command creates missing
settings from env values but does not overwrite existing rows.

Watch first-start logs until all services are stable:

```bash
docker compose logs -f --tail=100 postgres redis admin-panel bot worker caddy
```

## Update Deploy

Use this for normal code updates after the first deploy.

```bash
cd /var/www/directbuy/current
git fetch origin
git switch master
git pull --ff-only
docker compose config
docker compose build --pull
docker compose up -d
docker compose ps
```

If `NEXT_PUBLIC_BOT_USERNAME` changed, the rebuild is mandatory because it is a
client-exposed build-time value in Next.js.

## Smoke Checks

Run these after first deploy, after each update, and before marking
`Direct Buy-1z7.5` complete.

```bash
set -a
. ./.env
set +a
docker compose ps
docker compose exec postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose exec redis redis-cli ping
docker compose exec admin-panel pnpm exec prisma migrate status
docker compose logs --tail=200 admin-panel bot worker caddy
curl -fsS "https://$DOMAIN/admin/login" >/tmp/directbuy-admin-login.html
curl -fsS -H "Authorization: Bearer $ADMIN_API_KEY" "https://$DOMAIN/api/lots" >/tmp/directbuy-lots.json
docker compose exec bot node -e "fetch('https://api.telegram.org/bot' + process.env.BOT_TOKEN + '/getMe').then(async r => { console.log(r.status, await r.text()); process.exit(r.ok ? 0 : 1) })"
```

Manual smoke:

- Open `https://$DOMAIN/admin/login` and log in with a Telegram account listed in `MANAGER_CHAT_ID`.
- In admin settings, confirm bot name, manager IDs, platform fee, SLA values, and bot active flag.
- Send `/start` to the bot, create a low-risk test lot, and confirm the bot process logs do not show polling or Redis errors.
- Upload a test document/photo through the bot and confirm the admin media endpoint can serve it after authentication.
- Confirm `worker` logs process or idle cleanly, and no BullMQ connection errors appear.

## Backup And Restore

Create backups before deploys that include migrations and on a daily schedule.
Store results outside the Docker host.

```bash
set -a
. ./.env
set +a
mkdir -p backups
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "backups/directbuy-db-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker compose exec -T admin-panel tar -C /app -czf - uploads > "backups/directbuy-uploads-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
```

Restore only during a planned maintenance window:

```bash
docker compose stop admin-panel bot worker
DB_BACKUP=backups/directbuy-db-20260502T120000Z.sql.gz
UPLOADS_BACKUP=backups/directbuy-uploads-20260502T120000Z.tar.gz
gunzip -c "$DB_BACKUP" | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T admin-panel tar -C /app -xzf - < "$UPLOADS_BACKUP"
docker compose up -d
```

## Rollback

Application rollback is git-based. Database migrations are forward-only unless a
validated DB restore point exists.

Before updating, record the current deployed commit:

```bash
git rev-parse HEAD > .deploy-last-good
```

Rollback app containers:

```bash
cd /var/www/directbuy/current
git checkout "$(cat .deploy-last-good)"
docker compose build --pull
docker compose up -d
docker compose ps
docker compose logs --tail=200 admin-panel bot worker caddy
```

If the failed deploy ran a migration that is incompatible with the previous
commit, restore the database from the pre-deploy backup instead of relying on
code rollback alone.

## Monitoring

Minimum operator checks:

```bash
docker compose ps
docker compose logs --tail=200 admin-panel bot worker caddy
docker system df
df -h
```

Alert on:

- `admin-panel` restart loops or failed `prisma migrate deploy`.
- Caddy ACME/certificate errors or inability to bind `80`/`443`.
- bot polling errors, `Unauthorized`, or Telegram `getMe` failures.
- worker Redis/BullMQ connection errors or repeated job failures.
- disk usage above the agreed threshold, especially Docker volumes and backups.
- missing daily PostgreSQL/upload backup artifacts.

## File Consistency Notes

- `docker-compose.yml` is the production process map and starts all six services.
- `Dockerfile` builds with Node 22 and passes `NEXT_PUBLIC_BOT_USERNAME` at build time for Next.js client code.
- `next.config.ts` uses `output: 'standalone'`; the container starts `node .next/standalone/server.js`.
- `Caddyfile` reads `DOMAIN` from the Caddy container environment and proxies to `admin-panel:3000`.
- `.env.example` lists production Compose variables and contains no real secret values.
- `ecosystem.config.cjs` is a PM2 fallback for non-Compose experiments only. It assumes `/var/www/directbuy/current`, external PostgreSQL/Redis env, and a process manager that injects env values. Do not mix PM2 and Compose on the same host for production.
