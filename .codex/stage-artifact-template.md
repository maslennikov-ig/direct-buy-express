---
schema_version: orchestration-artifact/v1
artifact_type: delegated-stream
task_id: <task-id>
stage_id: <stage-id>
repo: <repo-or-n/a>
branch: <branch>
base_branch: <base-branch>
base_commit: <base-commit-or-unknown>
worktree: <absolute-path-or-unknown>
status: <returned|accepted|merged|blocked>
risk_level: <low|medium|high>
verification:
  - <command>: <passed|failed|blocked>
changed_files:
  - <path>
explicit_defers:
  - <none|bead-id-and-reason>
---

# Summary

Short outcome summary.

# Verification

List the commands that were actually run and the result.

# Risks / Follow-ups / Explicit Defers

List residual risks, blockers, explicit next steps, and any justified defer.
Do not leave silent technical debt behind this artifact.
