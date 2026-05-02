# Agent Instructions

## Project Shape

Direct Buy is a single TypeScript/Node repository:
- Next.js 16 App Router admin/web app in `app/`.
- grammY Telegram bot in `bot/`.
- Shared services, auth, queue, settings, and integrations in `lib/`.
- Prisma/PostgreSQL schema and seeds in `prisma/`.
- Vitest tests in `__tests__/`; deployment uses Docker, Caddy, Redis, and BullMQ.

## Issue Tracking

Use Beads (`bd`) as the only task ledger. Do not create `tasks.json`.

Quick commands:
- `bd onboard` - show local workflow help.
- `bd ready` - find unblocked work.
- `bd show <id>` - inspect an issue.
- `bd update <id> --status in_progress` - claim work.
- `bd close <id>` - close finished work.
- `bd export -o .beads/issues.jsonl` - refresh the tracked Beads snapshot when needed.

## Verification

Canonical process check:
- `scripts/orchestration/run_process_verification.sh`

Canonical code-change checks:
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Risk-triggered E2E/smoke:
- `pnpm test:e2e`

Use Node.js 22 LTS for local and deployment verification. The repo pins the development baseline in `.node-version`/`.nvmrc` and declares `engines.node` plus `packageManager` in `package.json`; use Corepack-managed `pnpm` and do not regenerate `package-lock.json`. If runtime/tooling blocks verification, record the blocker explicitly in Beads and the stage artifact.

## Orchestration

The repo follows the `balanced-v2.7` orchestration baseline. Stable navigation lives in `.codex/project-index.md`; current operational state lives in `.codex/handoff.md`; detailed stage work belongs under `.codex/stages/`.

Simple orchestration work stays local by default: handoff updates, Beads maintenance, stage planning, analysis-only summaries, and prompt drafting should not be delegated unless complexity, isolation, or parallelism clearly justifies it.

When delegation is warranted, prefer one cohesive stream per outcome. Do not split analysis, implementation, tests, and docs into separate child tasks without a real boundary or parallelism win.

Delegated agents must fetch current Context7 documentation for relevant version-sensitive dependencies before implementation, and must state when no such dependency applies.

Child prompts must be outcome-first and boundary-driven: define role, goal, success criteria, context/tools, boundaries, verification, output contract, stop rules, and completion event. Use `.codex/manual-agent-prompt-template.md` for manual launches.

## Safety And Closeout

Do not revert unrelated local changes. Do not expose secrets, edit `.env` values into tracked files, or run destructive git commands unless explicitly requested.

Never create silent technical debt. New `TODO/FIXME/HACK/XXX` markers must be fixed before handoff or explicitly tracked as bounded defers in Beads and the stage artifact.

When ending code-changing work, run the applicable gates, update Beads, refresh `.beads/issues.jsonl` if this repo tracks it, commit intentionally, pull with rebase, and push. Work is not landed until the push succeeds unless the user explicitly asks for a no-commit/no-push handoff.
