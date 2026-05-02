# Deployment: Direct Buy

## Production Server

- **Host:** `symancy-prod` (SSH alias) → `91.132.59.194`
- **Path:** `/var/www/directbuy/current/`
- **User:** `root`

## Architecture (no Docker)

| Service | How | Port |
|---------|-----|------|
| Next.js (admin panel) | `next start` via systemd | `3001` |
| Telegram Bot | `tsx bot/start.ts` via systemd | — |
| Worker (BullMQ) | `tsx lib/queue/worker.ts` via systemd | — |
| PostgreSQL 16 | System service | `5432` (localhost) |
| Redis 7 | System service | `6379` (localhost) |

## Reverse Proxy (Caddy)

Located on **aidevteam server** (`80.74.28.160`):
```
directbuy.aidevteam.ru {
    reverse_proxy 91.132.59.194:3001
}
```

## Database Access

```bash
ssh symancy-prod
sudo -u postgres psql -d directbuy
```

## Deploy / Update

```bash
ssh symancy-prod
cd /var/www/directbuy/current
git pull --rebase
corepack enable
corepack prepare pnpm@10.7.0 --activate
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
# restart services (systemd)
```
