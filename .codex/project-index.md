# Project Index - Direct Buy

Stable navigation map for this repository. Keep history and current task state in `.codex/handoff.md` and `.codex/stages/`, not here.

## Runtime Shape

- Single TypeScript/Node repository for a real-estate direct-buy workflow.
- Next.js 16 App Router serves the public/admin web UI and API route handlers.
- grammY runs the Telegram bot with conversations, menus, middleware, and session storage.
- BullMQ plus Redis run delayed SLA/background jobs; Prisma targets PostgreSQL.
- Deployment assets are repo-local: Dockerfile, `docker-compose.yml`, Caddy, and PM2 ecosystem config. Current production smoke uses PM2/Nginx on the app host with central Caddy at the HTTPS edge; Compose is the planned future topology.

## Primary Entrypoints

- `AGENTS.md` - repo contract, Beads rules, verification, orchestration reminders.
- `.codex/orchestrator.toml` - machine-readable orchestration contract.
- `.codex/handoff.md` - current operational state only.
- `.codex/manual-agent-prompt-template.md` - skeleton for manually launched child agents.
- `package.json` - pnpm scripts, package-manager pin, Node engine, and dependency versions.
- `app/page.tsx` - public app page.
- `app/admin/page.tsx` - admin dashboard.
- `app/api/**/route.ts` - Next.js route handlers.
- `bot/start.ts` - bot process startup script.
- `bot/index.ts` and `bot/setup.ts` - bot composition and middleware setup.
- `lib/queue/worker.ts` - BullMQ worker process.
- `prisma/schema.prisma` - database schema.
- `docker-compose.yml` - planned Compose service topology.
- `ecosystem.config.cjs` - current production smoke PM2 process map.
- `docs/ARCHITECTURE.md` - durable architecture overview.
- `docs/DEPLOYMENT.md` - deployment notes.

## Core Subsystems

- `app/` owns Next.js UI, layouts, admin pages, and API routes.
- `app/admin/` owns manager-facing admin screens and server actions.
- `bot/` owns Telegram bot flows, conversations, handlers, menus, middleware, and bot utilities.
- `bot/conversations/` owns multi-step user journeys such as lot creation, bids, docs upload, registration, and meeting scheduling.
- `bot/handlers/` owns shorter command/callback handlers.
- `components/ui/` owns shared UI primitives used by the web app.
- `hooks/` owns client-side React hooks.
- `lib/` owns shared auth, settings, database access, Dadata, logging, rate limiting, notifications, and matching.
- `lib/queue/` owns BullMQ connection, client, and worker integration.
- `prisma/` owns schema and seed scripts.
- `__tests__/` owns unit/integration tests; `__tests__/e2e/` owns DB-backed end-to-end tests.
- `docs/specs/` owns feature specs, plans, and code-review notes.
- `scripts/orchestration/` owns repo-local orchestration guardrails and completion inbox utilities.
- `.beads/` owns Beads issue data; do not replace it with another task ledger.

## Integrations And Sources Of Truth

- PostgreSQL is the source of truth for users, investor profiles, lots, bids, media, settings, and deal state.
- Prisma schema is the source of truth for application database shape.
- Redis backs BullMQ jobs and bot/session infrastructure where configured.
- Telegram is the source of truth for incoming bot updates and Telegram user identity.
- Admin auth/session logic lives in `lib/admin-auth.ts`, `lib/telegram-auth.ts`, and related API routes.
- Dadata integration lives in `lib/dadata.ts`; never hard-code external lookup responses.
- Local disk uploads are represented by DB `Media` records and protected API access.
- Deployment truth is split across `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `ecosystem.config.cjs`, `.env.example`, and deployment docs. `docs/DEPLOYMENT.md` names whether the active production target is PM2/Nginx or Compose.
- Beads is the only task/status truth; `.codex/handoff.md` is only the current orchestration snapshot.
- Context7 or first-party docs should be used before changing version-sensitive Next.js, Prisma, grammY, Vitest, ESLint, Tailwind, BullMQ, or Redis behavior.

## Verification

- Process-only contract: `scripts/orchestration/run_process_verification.sh`.
- Standard code-change gate: `pnpm lint`.
- Standard unit test gate: `pnpm test`.
- Standard build gate: `pnpm build`.
- Risk-triggered E2E/smoke gate: `pnpm test:e2e`.
- Prisma schema changes should include client generation/migration validation appropriate to the change.
- Bot conversation changes should run the focused Vitest files that cover the touched flow before the full unit gate.
- Deployment changes should include smoke evidence or a tracked blocker when external infrastructure is required.

## Conventions And Boundaries

- Keep `AGENTS.md` compact; move operational state into `.codex/handoff.md`.
- Keep `.codex/project-index.md` stable and navigation-only.
- Keep detailed stage history, prompts, and returned artifacts under `.codex/stages/<stage-id>/`.
- Use separate worktrees for parallel manual agents.
- Do not touch unrelated files or revert another agent's changes.
- Do not expose real secrets from `.env`; tracked docs should use names/placeholders only.
- Avoid adding new `TODO/FIXME/HACK/XXX` markers; track real defers in Beads and artifacts.
- E2E is risk-triggered, not universal, but deployment phase closeout should treat it as expected unless infra blocks it.
- Prefer one cohesive delegated stream per outcome; do not split analysis, implementation, tests, and docs without a real boundary.
