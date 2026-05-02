---
schema_version: orchestration-artifact/v1
artifact_type: delegated-stream
task_id: Direct Buy-1z7.7
stage_id: stage-2026-05-02-phase20-deployment
repo: Direct Buy
branch: master
base_branch: master
status: returned
risk_level: high
verification:
  - Read AGENTS.md, .codex/handoff.md, Direct Buy-1z7.5 artifact, package.json, vitest.e2e.config.ts, and __tests__/e2e/p2p-flow.test.ts: passed
  - Context7 Vitest/Vite docs for setup/config env loading behavior: passed
  - Reproduced old npm run test:e2e dotenv CLI failure before fix: passed
  - TDD red-green for E2E env safety helper: passed
  - Missing .env.test startup guard check: passed; Vitest config failed before test import/destructive setup
  - npm run test:e2e against local isolated PostgreSQL/Redis test services: passed, 1 file / 1 test
  - scripts/orchestration/run_process_verification.sh: passed
  - pnpm lint: passed
  - pnpm test: passed, 26 files / 100 tests
  - pnpm build: passed
changed_files:
  - /home/me/code/Direct Buy/package.json
  - /home/me/code/Direct Buy/pnpm-lock.yaml
  - /home/me/code/Direct Buy/vitest.e2e.config.ts
  - /home/me/code/Direct Buy/scripts/e2e/env.ts
  - /home/me/code/Direct Buy/__tests__/e2e-env.test.ts
  - /home/me/code/Direct Buy/__tests__/e2e/p2p-flow.test.ts
  - /home/me/code/Direct Buy/docs/QA_TESTING_GUIDE.md
explicit_defers: []
---

# Summary

Fixed the Phase 20 E2E runner isolation blocker.

Root cause was the `test:e2e` script invoking `dotenv -e .env.test ...` without a repo-pinned Node CLI. `npm run` resolved `/home/me/.local/bin/dotenv`, where `-e` means `--export`, so the command failed before Vitest with `Invalid value for '-e' / '--export': '.env.test' is not a valid boolean`.

The E2E test also performs destructive `deleteMany` setup. I added a repo-local env loader and startup guard so destructive setup only runs after `.env.test` exists and `DATABASE_URL` names an explicitly isolated PostgreSQL database.

# Changes

- Changed `package.json` `test:e2e` to run `vitest run --config vitest.e2e.config.ts` directly.
- Added direct dev dependency `dotenv@16.6.1` and used `dotenv.parse` from repo dependencies instead of any global CLI.
- Added `scripts/e2e/env.ts`:
  - requires `.env.test`;
  - optionally overlays ignored `.env.test.local` for local ports/credentials;
  - validates PostgreSQL URL shape;
  - rejects production-looking database names and requires `test`, `e2e`, or `ci` in the DB name;
  - returns env with `.env.test`/`.env.test.local` taking precedence over unsafe shell values.
- Updated `vitest.e2e.config.ts` to load and validate env before test files are imported, then pass the sanitized env into Vitest.
- Added a direct guard in `__tests__/e2e/p2p-flow.test.ts` before destructive DB setup.
- Added unit coverage in `__tests__/e2e-env.test.ts`.
- Documented the E2E gate contract in `docs/QA_TESTING_GUIDE.md`.

# Verification Notes

Context7 docs checked:

- Vitest `/vitest-dev/vitest`: `setupFiles`, `globalSetup`, and `test.env` are config-level mechanisms for setup/env behavior.
- Vite `/vitejs/vite`: `loadEnv(mode, cwd, '')` exists, but existing shell env has highest priority over `.env` files. Because this gate must not allow a shell `DATABASE_URL` to override `.env.test`, the final implementation uses repo-pinned `dotenv.parse` for deterministic file precedence.

Local isolated services used for final E2E verification:

- PostgreSQL container: `directbuy-e2e-postgres`, bound to `127.0.0.1:55433`, database name contains `e2e_test`.
- Redis container: `directbuy-e2e-redis`, bound to `127.0.0.1:6380`.
- Ignored local override: `.env.test.local`, mode `600`, generated only for local verification. Secret values were not printed or committed.
- Schema was applied to the isolated DB with Prisma `db push --skip-generate`.

Command evidence:

| Command | Result |
| --- | --- |
| `npm run test:e2e` before fix | failed before Vitest on wrong global `dotenv` CLI |
| `pnpm test __tests__/e2e-env.test.ts` before helper implementation | failed as expected; helper import missing |
| `pnpm test __tests__/e2e-env.test.ts` after implementation | passed, 4 tests |
| Missing `.env.test` guard run | failed during Vitest config load with `[e2e safety] Missing .env.test...`; test file was not imported |
| `npm run test:e2e` | passed, 1 file / 1 test |
| `scripts/orchestration/run_process_verification.sh` | passed |
| `pnpm lint` | passed |
| `pnpm test` | passed, 26 files / 100 tests |
| `pnpm build` | passed |

# Close Recommendation

Close `Direct Buy-1z7.7`.

The E2E runner no longer depends on the ambient `dotenv` CLI, the destructive setup is guarded before execution, missing or unsafe env fails closed, and `npm run test:e2e` passes against an explicitly isolated local test database.
