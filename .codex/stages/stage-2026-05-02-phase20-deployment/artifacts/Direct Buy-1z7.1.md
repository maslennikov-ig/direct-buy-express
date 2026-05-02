---
schema_version: orchestration-artifact/v1
artifact_type: delegated-stream
task_id: Direct Buy-1z7.1
stage_id: stage-2026-05-02-phase20-deployment
repo: /home/me/code/Direct Buy
branch: codex/direct-buy-1z7-1-toolchain-baseline
base_branch: master
base_commit: 1354f3e9586c4451463aa3552ecded5bf9752557
worktree: /home/me/code/Direct Buy/.worktrees/direct-buy-1z7-1-toolchain-baseline
status: returned
risk_level: medium
verification:
  - Context7 Next.js 16.2.2, Vite 7.3.1, Vitest 4.0.7 docs: passed
  - npm view next/vite/vitest engines: passed
  - mise x node@22.18.0 -- pnpm install --frozen-lockfile: passed
  - node --version: passed (v22.18.0 in worktree)
  - mise x node@22.18.0 -- pnpm lint: passed with existing ESLintIgnoreWarning
  - mise x node@22.18.0 -- pnpm test: passed (23 files, 93 tests)
  - mise x node@22.18.0 -- pnpm build: failed (DATABASE_URL missing during /admin/investors prerender)
  - mise x node@22.18.0 -- npm run lint: passed with existing ESLintIgnoreWarning
  - mise x node@22.18.0 -- npm run test: passed (23 files, 93 tests)
  - mise x node@22.18.0 -- npm run build: failed (DATABASE_URL missing during /admin/investors prerender)
changed_files:
  - .beads/interactions.jsonl
  - .beads/issues.jsonl
  - .env.example
  - .node-version
  - .npmrc
  - .nvmrc
  - .codex/orchestrator.toml
  - .codex/project-index.md
  - .codex/stages/stage-2026-05-02-phase20-deployment/artifacts/Direct Buy-1z7.1.md
  - AGENTS.md
  - Dockerfile
  - README.md
  - docs/ARCHITECTURE.md
  - docs/DEPLOYMENT.md
  - next.config.ts
  - package.json
  - package-lock.json
explicit_defers:
  - Direct Buy-1z7.2 owns the remaining ESLintIgnoreWarning cleanup.
  - Direct Buy-1z7.5 remains blocked for build/smoke until DATABASE_URL and a reachable PostgreSQL runtime are provided, or admin prerender behavior is changed in a separate app task.
---

# Summary

Established the runtime/package-manager contract around Node.js 22 LTS and `pnpm@10.7.0`. The repo now declares the local Node baseline in `.node-version` and `.nvmrc`, enforces `engines.node` and `engine-strict`, pins `packageManager`, removes the stale `package-lock.json`, and updates docs/orchestration/Docker deployment commands to use the pnpm lockfile. Beads task `Direct Buy-1z7.1` was closed after recording this artifact and exporting `.beads/issues.jsonl`.

Docs-first checks used Context7 for Next.js 16, Vite 7, and Vitest 4. Relevant current requirements:
- Next.js 16 requires Node `>=20.9.0`; Node 18 is unsupported.
- Vite 7 requires Node `20.19+` or `22.12+`.
- Vitest 4 requires Node `20+` and Vite 6+.

The previous Vitest `ERR_REQUIRE_ESM` startup failure does not remain under Node `22.18.0`: both `pnpm test` and `npm run test` pass. I did not change `vitest.config.ts` or `vitest.e2e.config.ts`.

I also made `build` run `prisma generate` before `next build`, because a fresh pnpm 10 install does not generate Prisma client from dependency build scripts. `next.config.ts` now sets `turbopack.root` to the current project directory so project-local worktrees do not trigger Next.js multiple-lockfile root inference.

Downstream status: `Direct Buy-1z7.4` can start because the unit test gate now launches and passes under the supported runtime. Deployment smoke/build work must account for the remaining `DATABASE_URL`/PostgreSQL prerequisite.

# Verification

- `npm view next@16.1.6 engines --json`: `{"node": ">=20.9.0"}`
- `npm view vite@7.3.1 engines --json`: `{"node": "^20.19.0 || >=22.12.0"}`
- `npm view vitest@4.0.18 engines --json`: `{"node": "^20.0.0 || ^22.0.0 || >=24.0.0"}`
- `mise x node@22.18.0 -- pnpm install --frozen-lockfile`: passed; lockfile stayed current.
- `node --version`: `v22.18.0` in this worktree after adding `.node-version`.
- `mise x node@22.18.0 -- pnpm lint`: exit 0; existing ESLint 9 `.eslintignore` warning remains.
- `mise x node@22.18.0 -- pnpm test`: exit 0; 23 test files and 93 tests passed.
- `mise x node@22.18.0 -- pnpm build`: failed after successful Prisma generation, Next compile, and TypeScript check because `/admin/investors` prerender calls Prisma without `DATABASE_URL`.
- `mise x node@22.18.0 -- npm run lint`: exit 0; same existing ESLint warning.
- `mise x node@22.18.0 -- npm run test`: exit 0; 23 test files and 93 tests passed.
- `mise x node@22.18.0 -- npm run build`: failed with the same `DATABASE_URL` prerender blocker.

# Risks / Follow-ups / Explicit Defers

The package-manager ambiguity is resolved in favor of pnpm, matching `pnpm-lock.yaml`, existing architecture docs, and deployment/Docker usage. `npm run ...` remains a compatibility check for script execution only; dependency installation should be `pnpm install --frozen-lockfile`.

`pnpm build` and `npm run build` no longer fail on Node version, Vitest/Vite ESM startup, missing Prisma generated types, or Next worktree root inference. They now fail on an external runtime prerequisite: `DATABASE_URL` is absent while Next.js prerenders admin pages that query Prisma. This is outside the root package/tooling write zone because fixing it in code would require changing app/admin rendering behavior.

Existing defers remain bounded:
- `Direct Buy-1z7.2`: remove the ESLint 9 `.eslintignore` warning.
- `Direct Buy-1z7.5`: provide a build/smoke database runtime or change admin prerender behavior in a separate scoped task before treating deployment smoke as passable.
