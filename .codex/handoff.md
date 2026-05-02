# Handoff

## Current truth

- Baseline mode: `reconcile` from partial initialization to `balanced-v2.7`.
- Repo topology: single repository at `/home/me/code/Direct Buy`.
- Delivery mode: direct to `master`; repo policy requires pushed work for closeout.
- Launch mode: manual user launch; prompts live in `.codex/stages/stage-2026-05-02-phase20-deployment/prompts.md`.
- Beads is the only task truth. Active setup task: `Direct Buy-bd6`.
- Phase 20 deployment epic now has child tasks `Direct Buy-1z7.1` through `Direct Buy-1z7.5`.
- Context7 docs checked for Next.js 16.1.6, Prisma 6.19.2, and grammY.
- Local verification evidence: `npm run lint` exits 0 with an ESLint 9 `.eslintignore` warning; `npm run test` and `pnpm test` fail before tests because Vitest/Vite require an ESM-compatible/supported runtime path; `npm run build` fails because local Node is `18.19.1` and Next.js requires `>=20.9.0`.

## Next recommended

Next stage id: `stage-2026-05-02-phase20-deployment`

Recommended action: Launch manual agents in the order documented in `.codex/stages/stage-2026-05-02-phase20-deployment/prompts.md`. Start with `Direct Buy-1z7.1`; `Direct Buy-1z7.2` and `Direct Buy-1z7.3` can run in parallel if worktrees are separate. Do not launch `Direct Buy-1z7.4` or `Direct Buy-1z7.5` before their dependencies return.

## Starter prompt for next orchestrator

Use $orchestrator-stage in `/home/me/code/Direct Buy`. Review `.codex/orchestrator.toml`, `.codex/project-index.md`, `.codex/handoff.md`, and Beads. First inspect the completion inbox with `python3 scripts/orchestration/review_completion_inbox.py`, then review artifacts for returned child tasks, update Beads, and decide whether the next Phase 20 stream is ready to launch.

## Explicit defers

- `Direct Buy-1z7.1`: local Node/package-manager baseline blocks `npm run test` and `npm run build`.
- `Direct Buy-1z7.2`: ESLint 9 `.eslintignore` warning remains after setup.
- `Direct Buy-1z7.4`: unit-test repair is deferred until the toolchain gate can launch Vitest.
- `Direct Buy-1z7.5`: smoke/E2E gate is deferred until toolchain, deployment runbook, and unit gate return.
