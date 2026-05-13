# Subagent Spawn Template

Use this shape when the orchestrator launches a Codex subagent. Fill every block; use `none - <reason>` instead of omitting routing fields.

```md
Task ID: <beads-task-id>
Stage ID: <stage-id-or-n/a>
Agent Type: <worker|explorer|docs_researcher|skill_scout|custom-agent-name>

## Goal
<finished outcome in one short paragraph>

## Success Criteria
- <observable acceptance check>
- <observable acceptance check>

## Documentation
- <Context7 / first-party docs source, or: No dependency documentation lookup needed.>

## Asset Routing
- Selected docs: <docs/source or none - reason>
- Selected skills: <skill name/path or none - reason>
- Selected agents/personas: <agent/persona or none - reason>
- Catalog candidates: <candidate/status or none - reason>
- Do not run fresh asset discovery unless these assets are unavailable or a specialist blocker appears.

## Context And Ownership
- Workspace root: <absolute path>
- Base branch: <branch-or-n/a>
- Base commit: <sha-or-n/a>
- Branch/worktree: <dedicated branch/worktree, or explicit shared-workspace exception>
- Write zone: <files/modules owned by this stream>
- Read context: <files/docs/artifacts to inspect>
- You are not alone in the codebase; do not revert unrelated edits and adapt to concurrent changes.

## Verification
- Run: <exact command>
- If blocked, report the blocker and impact.

## Output Contract
- Changed files:
- Verification evidence:
- Explicit defers:
- Artifact path: <path-or-n/a>
- Completion event: <command-or-n/a>

## Stop Rules
Return blocked or ask if scope expands, ownership conflicts, docs/assets are unavailable, verification cannot run, or the change would create untracked debt.
```
