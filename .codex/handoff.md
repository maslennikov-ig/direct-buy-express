# Handoff

## Current truth

- Baseline mode: `balanced-v2.7`; repo topology is single repository at `/home/me/code/Direct Buy`.
- Delivery mode: direct to `master`; repo policy requires pushed work for closeout.
- Launch mode: manual user launch; prompts live in `.codex/stages/stage-2026-05-02-phase20-deployment/prompts.md`.
- Beads is the only task truth. Phase 20 deployment epic has child tasks `Direct Buy-1z7.1` through `Direct Buy-1z7.5`.
- `Direct Buy-1z7.1` returned and was closed in Beads on branch `codex/direct-buy-1z7-1-toolchain-baseline` with Node.js 22 LTS and `pnpm@10.7.0` declared as the repo toolchain contract.
- Context7 docs checked for Next.js 16.2.2, Vite 7.3.1, and Vitest 4.0.7; npm package engines were cross-checked for installed Next/Vite/Vitest versions.
- Verification evidence under Node `22.18.0`: `pnpm lint` and `npm run lint` exit 0 with the existing ESLint 9 `.eslintignore` warning; `pnpm test` and `npm run test` pass 23 files / 93 tests.
- Build evidence under Node `22.18.0`: `pnpm build` and `npm run build` pass Prisma generation, Next compile, and TypeScript, then fail during `/admin/investors` prerender because `DATABASE_URL` is not set in the isolated worktree.

## Next recommended

Next stage id: `stage-2026-05-02-phase20-deployment`

Recommended action: Review the `Direct Buy-1z7.1` artifact and completion event, then launch `Direct Buy-1z7.4` for unit-gate work. `Direct Buy-1z7.2` and `Direct Buy-1z7.3` can continue in separate worktrees. Do not treat `Direct Buy-1z7.5` as passable until the build/smoke database prerequisite is satisfied or an app-scoped prerender fix is accepted.

## Starter prompt for next orchestrator

Use $orchestrator-stage in `/home/me/code/Direct Buy`. Review `.codex/orchestrator.toml`, `.codex/project-index.md`, `.codex/handoff.md`, and Beads. First inspect the completion inbox with `python3 scripts/orchestration/review_completion_inbox.py`, then review the `Direct Buy-1z7.1` artifact, update Beads, and launch the next eligible Phase 20 stream.

## Explicit defers

- `Direct Buy-1z7.2`: ESLint 9 `.eslintignore` warning remains.
- `Direct Buy-1z7.5`: `pnpm build`/`npm run build` require `DATABASE_URL` and reachable PostgreSQL during admin-page prerender, or a separate app-scoped change to avoid build-time DB reads.
