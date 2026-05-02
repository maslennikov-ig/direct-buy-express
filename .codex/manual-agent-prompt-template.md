# Manual Agent Prompt Template

Use this when the orchestrator prepares a prompt and the user launches the agent manually.
Keep it outcome-first: guide the child with result, context, tools, boundaries, verification, and stop rules. Do not script internal reasoning unless it is a hard boundary.

## Structure

```md
<one-line outcome title>

Task ID: <beads child task id>
Stage ID: <current stage id>

## Role
Act as <role/specialist perspective> for this bounded stream. Choose the implementation approach inside the boundaries below.

## Goal
<1 short paragraph describing the finished outcome>

## Success Criteria
- <observable acceptance criterion>
- <observable acceptance criterion>

## Available Context And Tools
- Workspace root: <absolute path>
- Repo: <repo-or-n/a>
- Contract files: `AGENTS.md`, `.codex/orchestrator.toml`, `.codex/handoff.md`
- Artifact path: <absolute path>
- Relevant files/docs/artifacts: <short list or links>
- Use Context7 or first-party docs for version-sensitive dependencies; if none apply, record that in the artifact.
- Use this named skill/persona only if provided here: <skill/persona-or-none>

## Boundaries
- Base branch: <name>
- Base commit: <sha>
- Dedicated worktree: <absolute path>
- Write zone: <module/directory/file set>
- Do not touch unrelated files or revert others' work.
- Keep this as one cohesive stream unless you hit a real isolation/conflict boundary.
- For follow-up corrections, continue in this same task/branch/worktree unless told otherwise.

## Verification
- Run: `<exact command>`
- Run: `<exact command>`
- If a command is blocked, state the blocker and impact in the artifact.

## Stop / Ask Rules
Stop and ask or return `blocked` if scope expands materially, a protected boundary is unclear, required docs are unavailable, verification cannot run, or the requested change would create untracked technical debt.

## Output Contract
- Write the artifact using `.codex/stage-artifact-template.md`.
- Keep narrative short; details belong in the artifact, not chat.
- Include `explicit_defers`; use `none` only when no defer exists.
- Do not leave new `TODO/FIXME/HACK/XXX` markers unless they are explicitly tracked as a defer.

## Completion Event
After the artifact is ready, run:

`python3 scripts/orchestration/report_child_completion.py --task <task_id> --stage <stage_id> --artifact <artifact_path> --status <returned|blocked> --commit <commit_hash_or_n/a> --verify <passed|failed|blocked> --clean <yes|no>`

If event reporting is blocked, say so in the artifact and final chat line.

## Final Chat Reply
Line 1:
`TASK <task_id> | STATUS <returned|blocked> | EVENT <recorded|failed> | ARTIFACT <artifact_path>`

Line 2 is optional:
`NOTE: <one short blocker / defer / review warning sentence>`
```

## Notes

- Add repo-specific PR, changelog, deploy, or protected-branch rules only when the repo contract requires them.
- The completion event is the return signal; chat is only a short visibility hint.
