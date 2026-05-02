# Manual Agent Prompts - Phase 20 Deployment

Base branch: `master`
Base commit: use current pushed `master` after the orchestrator integration closeout.
Stage ID: `stage-2026-05-02-phase20-deployment`
Workspace root: `/home/me/code/Direct Buy`

Use these prompts in separate manual agent sessions. Create a dedicated worktree for each parallel stream before launch. Do not launch blocked streams until their dependencies return and the orchestrator reviews the completion artifact.

## Parallelization

Completed and accepted:
- `Direct Buy-1z7.1` - toolchain baseline.
- `Direct Buy-1z7.2` - ESLint warning cleanup.
- `Direct Buy-1z7.3` - deployment runbook/checklist.
- `Direct Buy-1z7.4` - unit test gate.
- `Direct Buy-1z7.6` - production infrastructure readiness for current PM2/Nginx smoke contract.

Can start now:
- `Direct Buy-1z7.5` - smoke/E2E deployment gate.

Must wait:
- No remaining Phase 20 child stream is blocked by Beads dependencies.

## Prompt: Direct Buy-1z7.1

```md
Normalize Node and package-manager verification baseline

Task ID: Direct Buy-1z7.1
Stage ID: stage-2026-05-02-phase20-deployment

## Role
Act as a TypeScript/Node toolchain owner for this repository.

## Goal
Make the repo's supported runtime and package-manager contract explicit enough that Next.js 16, Vite 7, and Vitest 4 can run consistently. Current evidence: local Node is 18.19.1; `npm run build` fails because Next.js requires >=20.9.0; `npm run test` and `pnpm test` fail before tests with `ERR_REQUIRE_ESM` while loading `vitest.config.ts`.

## Success Criteria
- The repo clearly declares the supported Node version and package manager.
- The npm/pnpm ambiguity is resolved or explicitly documented with a bounded follow-up.
- `npm run lint`, `npm run test`, and `npm run build` either pass under the chosen supported runtime or produce a documented external runtime blocker with evidence.
- Any Vitest config startup issue is fixed only after confirming it remains under the supported Node runtime.

## Available Context And Tools
- Workspace root: `/home/me/code/Direct Buy`
- Contract files: `AGENTS.md`, `.codex/orchestrator.toml`, `.codex/handoff.md`
- Artifact path: `/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.1.md`
- Relevant files: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `vitest.e2e.config.ts`, `next.config.ts`, `docs/ARCHITECTURE.md`, `README.md`
- Use Context7 for current Next.js 16 and Vitest/Vite guidance before implementation. If Context7 lacks Vitest/Vite detail, use first-party docs and record the source.

## Boundaries
- Base branch: `master`
- Base commit: `a35eed30c033`
- Dedicated worktree: create one before editing.
- Write zone: root package/tooling files and minimal docs needed to state the runtime contract.
- Do not rewrite app, bot, Prisma, or deployment behavior unless it is strictly required to make the toolchain gate run.

## Verification
- Run: `node --version`
- Run: `npm run lint`
- Run: `npm run test`
- Run: `npm run build`
- If using pnpm as canonical, also run the equivalent `pnpm` commands and explain why npm scripts remain or change.

## Stop / Ask Rules
Stop and return `blocked` if changing the machine Node version is required but not possible in-repo, if package-manager choice conflicts with existing lockfile history, or if fixing Vitest requires dependency upgrades with broad lockfile churn.

## Output Contract
- Write the artifact using `.codex/stage-artifact-template.md`.
- Include exact runtime versions, commands run, and whether downstream tasks can start.
- Do not leave new `TODO/FIXME/HACK/XXX` markers.

## Completion Event
Run:
`python3 scripts/orchestration/report_child_completion.py --task "Direct Buy-1z7.1" --stage stage-2026-05-02-phase20-deployment --artifact "/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.1.md" --status <returned|blocked> --commit <commit_hash_or_n/a> --verify <passed|failed|blocked> --clean <yes|no>`

## Final Chat Reply
`TASK Direct Buy-1z7.1 | STATUS <returned|blocked> | EVENT <recorded|failed> | ARTIFACT /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.1.md`
```

## Prompt: Direct Buy-1z7.2

```md
Remove ESLint 9 ignore-file warning

Task ID: Direct Buy-1z7.2
Stage ID: stage-2026-05-02-phase20-deployment

## Role
Act as an ESLint/Next.js tooling maintainer for a narrowly scoped cleanup.

## Goal
Remove the ESLint 9 warning about `.eslintignore` while preserving current ignore behavior. Current evidence: `npm run lint` exits 0 but prints `ESLintIgnoreWarning: The ".eslintignore" file is no longer supported`.

## Success Criteria
- `npm run lint` exits 0 without `ESLintIgnoreWarning`.
- Existing `coverage/` ignore behavior remains covered in `eslint.config.mjs` or another supported ESLint 9 config location.
- No unrelated lint rules or formatting changes are introduced.

## Available Context And Tools
- Workspace root: `/home/me/code/Direct Buy`
- Contract files: `AGENTS.md`, `.codex/orchestrator.toml`, `.codex/handoff.md`
- Artifact path: `/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.2.md`
- Relevant files: `.eslintignore`, `eslint.config.mjs`, `package.json`
- Use Context7 or first-party ESLint 9 flat-config docs before implementation.

## Boundaries
- Base branch: `master`
- Base commit: `a35eed30c033`
- Dedicated worktree: create one before editing.
- Write zone: ESLint config and obsolete ignore file only.
- Do not touch application code.

## Verification
- Run: `npm run lint`
- If the toolchain agent has already changed canonical package-manager commands, run the canonical lint command too.

## Stop / Ask Rules
Stop and return `blocked` if lint behavior changes beyond removing the warning or if ESLint config requires broad restructuring.

## Output Contract
- Write the artifact using `.codex/stage-artifact-template.md`.
- Include before/after warning evidence.
- Do not leave new `TODO/FIXME/HACK/XXX` markers.

## Completion Event
Run:
`python3 scripts/orchestration/report_child_completion.py --task "Direct Buy-1z7.2" --stage stage-2026-05-02-phase20-deployment --artifact "/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.2.md" --status <returned|blocked> --commit <commit_hash_or_n/a> --verify <passed|failed|blocked> --clean <yes|no>`

## Final Chat Reply
`TASK Direct Buy-1z7.2 | STATUS <returned|blocked> | EVENT <recorded|failed> | ARTIFACT /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.2.md`
```

## Prompt: Direct Buy-1z7.3

```md
Prepare production deployment runbook and env checklist

Task ID: Direct Buy-1z7.3
Stage ID: stage-2026-05-02-phase20-deployment

## Role
Act as a deployment readiness engineer for this Next.js, grammY, Prisma, Redis, BullMQ, Docker, and Caddy app.

## Goal
Turn Phase 20 into a concrete deployment runbook/checklist that an operator can execute without guessing. Cover env vars, VPS/docker-compose, Caddy/SSL/DNS, bot/worker/admin processes, persistence, rollback, monitoring, and smoke checks.

## Success Criteria
- Deployment docs identify required env vars and secrets by name without exposing values.
- `docker-compose.yml`, `Dockerfile`, `Caddyfile`, `ecosystem.config.cjs`, `.env.example`, and `docs/DEPLOYMENT.md` are checked for consistency.
- Smoke commands and manual infrastructure steps are explicit.
- Any missing external value or infrastructure action is filed or referenced as a Beads defer.

## Available Context And Tools
- Workspace root: `/home/me/code/Direct Buy`
- Contract files: `AGENTS.md`, `.codex/orchestrator.toml`, `.codex/handoff.md`
- Artifact path: `/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.3.md`
- Relevant files: `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`, `docker-compose.yml`, `Dockerfile`, `Caddyfile`, `ecosystem.config.cjs`, `.env.example`, `package.json`, `prisma/schema.prisma`
- Use Context7 for current Next.js deployment/runtime guidance and first-party docs for Docker/Caddy only where version-sensitive behavior matters.

## Boundaries
- Base branch: `master`
- Base commit: `a35eed30c033`
- Dedicated worktree: create one before editing.
- Write zone: deployment docs/checklists and minimal config corrections if clearly necessary.
- Do not edit secrets or real `.env` values.
- Do not change business logic.

## Verification
- Run: `npm run lint` if docs/config changes touch linted files.
- Run: `npm run build` only if the toolchain/runtime prerequisite is satisfied; otherwise record the Node blocker.
- Run: any config validation command you add or identify.

## Stop / Ask Rules
Stop and return `blocked` if a deployment decision requires real DNS, VPS credentials, production secrets, or a product/business decision that is not in the repo.

## Output Contract
- Write the artifact using `.codex/stage-artifact-template.md`.
- Include a checklist of external/manual deployment actions and exact defers.
- Do not leave new `TODO/FIXME/HACK/XXX` markers.

## Completion Event
Run:
`python3 scripts/orchestration/report_child_completion.py --task "Direct Buy-1z7.3" --stage stage-2026-05-02-phase20-deployment --artifact "/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.3.md" --status <returned|blocked> --commit <commit_hash_or_n/a> --verify <passed|failed|blocked> --clean <yes|no>`

## Final Chat Reply
`TASK Direct Buy-1z7.3 | STATUS <returned|blocked> | EVENT <recorded|failed> | ARTIFACT /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.3.md`
```

## Prompt: Direct Buy-1z7.4

```md
Run and repair unit test gate after toolchain baseline

Task ID: Direct Buy-1z7.4
Stage ID: stage-2026-05-02-phase20-deployment

## Role
Act as a systematic debugging engineer for the unit test gate.

## Goal
After `Direct Buy-1z7.1` returns and Vitest can start under the supported runtime, run the unit suite and fix real failures. Do not start this task until the toolchain artifact says tests can launch.

## Success Criteria
- `npm run test` or the updated canonical test command runs under the supported runtime.
- Real unit failures are fixed with focused changes, or split into new Beads tasks with evidence.
- The final artifact states whether Phase 20 can proceed to smoke/E2E.

## Available Context And Tools
- Workspace root: `/home/me/code/Direct Buy`
- Contract files: `AGENTS.md`, `.codex/orchestrator.toml`, `.codex/handoff.md`
- Artifact path: `/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.4.md`
- Relevant files: `vitest.config.ts`, `__tests__/`, `bot/`, `lib/`, `app/api/`, `prisma/schema.prisma`
- Use Context7 for version-sensitive Vitest/Vite, Next.js route-handler, Prisma, and grammY behavior as applicable to the failing tests.

## Boundaries
- Base branch: `master`
- Base commit: `a35eed30c033`
- Dedicated worktree: create one after the toolchain task returns.
- Write zone: only files directly needed for failing tests.
- Do not bundle unrelated refactors or deployment docs.

## Verification
- Run: canonical unit test command from `Direct Buy-1z7.1`.
- Run: `npm run lint` or updated canonical lint command.
- Run focused test files first when debugging, then the full unit gate.

## Stop / Ask Rules
Stop and return `blocked` if Vitest still cannot start, if failures require product decisions, or if fixes cross more than one subsystem and should be split.

## Output Contract
- Write the artifact using `.codex/stage-artifact-template.md`.
- Include root cause evidence for failures, not only changed files.
- Do not leave new `TODO/FIXME/HACK/XXX` markers.

## Completion Event
Run:
`python3 scripts/orchestration/report_child_completion.py --task "Direct Buy-1z7.4" --stage stage-2026-05-02-phase20-deployment --artifact "/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.4.md" --status <returned|blocked> --commit <commit_hash_or_n/a> --verify <passed|failed|blocked> --clean <yes|no>`

## Final Chat Reply
`TASK Direct Buy-1z7.4 | STATUS <returned|blocked> | EVENT <recorded|failed> | ARTIFACT /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.4.md`
```

## Prompt: Direct Buy-1z7.5

```md
Run Phase 20 smoke and E2E deployment gate

Task ID: Direct Buy-1z7.5
Stage ID: stage-2026-05-02-phase20-deployment

## Role
Act as a release verification engineer for the production deployment gate.

## Goal
Run the risk-triggered smoke/E2E deployment verification for admin, bot, worker, DB, Redis, media, and queue flows against the current production smoke contract.

Current target:
- URL: `https://directbuy.aidevteam.ru`
- Runtime: PM2/Nginx on app host `91.132.59.194`, behind central Caddy on `80.74.28.160`
- Credential source: `/var/www/directbuy/current/.env` on `root@91.132.59.194`; do not print or commit values.
- Known first finding: authorized `/api/lots` reaches app auth and returns 500. Treat this as the first application smoke issue to investigate, not an infrastructure blocker.

## Success Criteria
- `npm run test:e2e` or the updated canonical E2E command is run when required infrastructure is available.
- If infrastructure is unavailable, blockers are explicit and tied to Beads.
- Deployment-critical failures are fixed or filed as bounded tasks.
- The artifact gives a clear pass/fail recommendation for closing Phase 20.

## Available Context And Tools
- Workspace root: `/home/me/code/Direct Buy`
- Contract files: `AGENTS.md`, `.codex/orchestrator.toml`, `.codex/handoff.md`
- Artifact path: `/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.5.md`
- Relevant files: `.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.6.md`, `__tests__/e2e/p2p-flow.test.ts`, `vitest.e2e.config.ts`, `.env.example`, `.env.test`, `docs/DEPLOYMENT.md`, `docs/QA_TESTING_GUIDE.md`, `lib/queue/worker.ts`, `bot/start.ts`, `app/api/**/route.ts`
- Use Context7 for version-sensitive Next.js, Prisma, grammY, and Vitest behavior involved in failures.

## Boundaries
- Base branch: current pushed `master`
- Base commit: current pushed `master` after `d7c471d`
- Dedicated worktree: create one before editing.
- Write zone: deployment verification fixes only.
- Do not expose real secrets or commit environment values.
- Do not run a Compose migration or destructive production command; PM2/Nginx is the active smoke contract.

## Verification
- Run: canonical lint command.
- Run: canonical unit test command if the prior artifact says it should remain green.
- Run: `npm run test:e2e` or updated canonical E2E command.
- Run production smoke checks from the deployment/QA docs against `https://directbuy.aidevteam.ru`, using sanitized evidence only.
- For `/api/lots`, verify unauthorized behavior, authorized behavior using `ADMIN_API_KEY`, and root cause of the current 500 without printing the key.

## Stop / Ask Rules
Stop and return `blocked` if needed secrets/access are unavailable, if a smoke action would mutate production data unsafely, if a production fix needs a maintenance window, or if failures should be split by subsystem.

## Output Contract
- Write the artifact using `.codex/stage-artifact-template.md`.
- Include external blockers, smoke evidence, and a close/not-close recommendation.
- Do not leave new `TODO/FIXME/HACK/XXX` markers.

## Completion Event
Run:
`python3 scripts/orchestration/report_child_completion.py --task "Direct Buy-1z7.5" --stage stage-2026-05-02-phase20-deployment --artifact "/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.5.md" --status <returned|blocked> --commit <commit_hash_or_n/a> --verify <passed|failed|blocked> --clean <yes|no>`

## Final Chat Reply
`TASK Direct Buy-1z7.5 | STATUS <returned|blocked> | EVENT <recorded|failed> | ARTIFACT /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.5.md`
```

## Prompt: Direct Buy-1z7.6

```md
Provision production infrastructure values for deployment smoke

Task ID: Direct Buy-1z7.6
Stage ID: stage-2026-05-02-phase20-deployment

## Role
Act as an infrastructure readiness auditor for the Direct Buy production deployment. You may collect evidence and prepare exact operator steps, but do not expose or commit secret values.

## Goal
Confirm the external/manual prerequisites that are outside the repository and unblock `Direct Buy-1z7.5`: DNS, VPS/Compose host, firewall, production `.env`, BotFather token ownership, manager Telegram IDs, optional DaData key, backup destination, and alert owner.

## Success Criteria
- DNS A/AAAA for `DOMAIN` points to the production VPS or the missing record is documented.
- VPS has Docker and Docker Compose available, and ports 80/443 are open.
- Production `.env` exists on the VPS with mode `600`; values are verified by name/presence only, not copied into repo artifacts.
- Caddy can reach the domain path needed to issue HTTPS certificates, or the blocker is explicit.
- PostgreSQL/upload backup destination and monitoring/alert owner are named.
- `Direct Buy-1z7.5` has a concrete target and credentials path for smoke/E2E without exposing secrets.

## Available Context And Tools
- Workspace root: `/home/me/code/Direct Buy`
- Contract files: `AGENTS.md`, `.codex/orchestrator.toml`, `.codex/handoff.md`
- Artifact path: `/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.6.md`
- Relevant files: `.env.example`, `docker-compose.yml`, `Caddyfile`, `docs/DEPLOYMENT.md`
- Use Context7 or first-party docs for version-sensitive Docker Compose/Caddy behavior only if you need to validate command semantics.

## Boundaries
- Base branch: current pushed `master`.
- This is primarily external/manual readiness work; do not edit repo files unless the evidence exposes a real docs/config mismatch.
- Do not print, store, or commit real secrets.
- Do not run destructive VPS, DNS, database, or volume commands.

## Verification
- Run repo-local checks only if you change files.
- Record non-secret command evidence such as `docker --version`, `docker compose version`, DNS lookup output, and sanitized `.env` key presence.
- If you can access the VPS, verify Compose can render with production env using `docker compose config` without showing secret values.

## Stop / Ask Rules
Stop and return `blocked` if VPS/DNS/secrets access is unavailable, if production ownership is unknown, or if running a command could mutate production state.

## Output Contract
- Write the artifact using `.codex/stage-artifact-template.md`.
- Include a pass/block table for each prerequisite.
- Include the exact remaining operator actions, if any.
- Do not leave new `TODO/FIXME/HACK/XXX` markers.

## Completion Event
Run:
`python3 scripts/orchestration/report_child_completion.py --task "Direct Buy-1z7.6" --stage stage-2026-05-02-phase20-deployment --artifact "/home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.6.md" --status <returned|blocked> --commit <commit_hash_or_n/a> --verify <passed|failed|blocked> --clean <yes|no>`

## Final Chat Reply
`TASK Direct Buy-1z7.6 | STATUS <returned|blocked> | EVENT <recorded|failed> | ARTIFACT /home/me/code/Direct Buy/.codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.6.md`
```
