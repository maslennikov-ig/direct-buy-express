# Direct Buy

Direct Buy is a TypeScript/Node monorepo containing a Next.js 16 admin/web app, a grammY Telegram bot, shared services, Prisma/PostgreSQL data access, and BullMQ/Redis workers.

## Runtime

- Node.js: 22 LTS. The local development baseline is `22.18.0` in `.node-version` and `.nvmrc`; `package.json` enforces `>=22.12.0 <23`.
- Package manager: `pnpm@10.7.0` via Corepack. `pnpm-lock.yaml` is the canonical lockfile; do not use `npm install` or recreate `package-lock.json`.

## Run Locally

```bash
corepack enable
corepack prepare pnpm@10.7.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

## Verification

```bash
pnpm lint
pnpm test
pnpm build
```

`pnpm build` requires `DATABASE_URL`, because the admin pages access Prisma while Next.js prerenders them.
