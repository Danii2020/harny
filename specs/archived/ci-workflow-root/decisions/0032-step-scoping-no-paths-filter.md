# ADR 0032: Scope a subdirectory install with step-level `working-directory`, no `paths:` filter

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: ci-workflow-root
- **Capability**: feedback-controls
- **Source**: contract.md § Behavior Guarantees (CR-2, CR-4, CR-5)
- **Trigger**: (a) choice between two named viable options

## Context

A subdirectory install's workflow file lives at the repository root (where GitHub reads it), but the install's own commands run in its component's directory — `apps/web`. There are two mechanisms to express that scoping in a GitHub Actions workflow:

1. **Step-level `working-directory`** — each step declares its own working directory
2. **Workflow-level `defaults.run.working-directory`** — applies to every `run` step in the job or workflow

A hand-fix that motivated this feature adopted both: `on.pull_request.paths: [apps/web/**]` to limit triggering, `defaults.run.working-directory: apps/web` for the commands, and the workflow name in the path. But the filters have a downside: GitHub's own documentation states that a workflow skipped by path filtering leaves its checks in a `Pending` state, which blocks pull requests that require those checks. That is a silent-blocking failure of the same family as the silent-never-running failure this feature exists to remove.

The alternative is to use step-level scoping only, without the filter, and accept that the workflow always runs.

## Decision

Each generated step carries a `working-directory:` line (step-level scoping), placed immediately after the `run:` line. The runner path, install-gate files, probe-gate files, and the `.` sentinel all remain unprefixed, moving together because the step's working directory moved. No `on.pull_request.paths` filter is ever generated. No `defaults.run.working-directory` is ever generated (which live in the canonical region and would have to be *removed* by `monorepo-mode`, whose single root-level job runs from the repository root).

## Alternatives considered

| Option | Why not |
|---|---|
| Add `on.pull_request.paths: [<prefix>/**]` filtering | GitHub's own docs: filtered workflows leave checks `Pending`, blocking merges. Silently replaces one failure mode (never runs) with another (runs but blocked). Also violates intent goal G3's "never let a second install clobber a first" — a collision-avoiding slug rule is useless if a second install's workflow never runs due to the filter. |
| Add `defaults.run.working-directory` at workflow or job level | Would have to be *removed* by `monorepo-mode` (whose single root job runs from the repo root), turning a narrowing into a reversal. Violates intent goal G7 ("Leave `monorepo-mode` room to extend, not to undo"). Also lives in the canonical region; step-level scoping lives inside the generated block and is re-renderable. |
| Make working directory configurable per command | Couples the renderer to `StackProfile.commands` structure; adds complexity. Step-level application is simpler and covers all steps uniformly. |

## Consequences

**Positive**: 
- Every generated step has the same working directory, so the runner, install gate, probe gates, and `.` sentinel all move together — if one is right, all are right.
- No filtering means no `Pending` checks; the workflow always runs, always reports.
- Step-level scoping lives inside the generated block, which future features can re-render; `monorepo-mode`'s root job naturally narrows this (empty prefix = empty working directory = no step-level line emitted).

**Accepted costs**: 
- A subdirectory install's workflow runs on every PR, even those that don't touch that component. This is a deliberate tradeoff for clarity and reliability: the workflow is present, committed, named, and running — not silently skipped.
- Slightly more workflow runs in a busy monorepo, though each run is fast (install + lint/type-check only).

## Follow-ups

None immediately, but this opens the path for `monorepo-mode`, which will teach the runner to resolve each path to its component so one job at the root can make one runner call covering multiple installs.
