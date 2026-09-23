# ADR 0033: Detect the repository root by walking for a `.git` entry, not by shelling out to `git rev-parse`

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: ci-workflow-root
- **Capability**: cli-init
- **Source**: contract.md § Interfaces (CW-3), Constraints (C3), Behavior Guarantees (CW-2, CW-11)
- **Trigger**: (c) supersedes or diverges from a previously shipped decision (ADR 0030)

## Context

The feature must discover where the repository root is to write the CI workflow there. There are two mechanisms:

1. **Filesystem walk** — start at the install directory and walk upward looking for a `.git` entry, stopping at the filesystem root
2. **Shell out to `git`** — run `git rev-parse --show-toplevel` and parse its output

ADR 0030 rejected deriving the workflow's **branch name** (`main` vs other defaults) from `git symbolic-ref refs/remotes/origin/HEAD`, which varies with clone options and remote configuration (remote state, non-deterministic). That decision applies to *content* derived from **remote state**.

This feature derives artifact **placement** from **local filesystem state** — the presence of a `.git` entry at or above the install directory. The distinction is real and material:

- **Remote state** (refs/remotes/origin/HEAD) is not deterministic across repository states. Cloning with `--single-branch` or `--mirror` changes it. Different clones with the same config may have different remote tracking setup. This violates `AGENTS.md` S3 (identical inputs produce byte-identical output) and `cli-init.md` CLI-4.

- **Local filesystem state** (a `.git` entry on disk) is a pure function of the checkout, independent of remotes, locale, or PATH. It requires no subprocess, no environment setup, no git to be installed, no config parsing. It is stable across the same checkout's lifetime and identical on any two copies of the same tree.

The feature walks instead of shelling out because it does not introduce a new subprocess dependency, keeps the code pure and testable without git fixtures, and maintains determinism.

## Decision

`src/repo.ts` exports `findRepoRoot(startDir: string)`, which walks upward from `startDir` looking for a `.git` entry of any type (directory for normal clones, file for worktrees and submodules). Stops at the first `.git` found or at the filesystem root. Returns the found root or `undefined`. An entry that exists but cannot be stat'ed (permissions) is treated as absent and the walk continues upward.

## Alternatives considered

| Option | Why not |
|---|---|
| Shell out to `git rev-parse --show-toplevel` | Introduces a subprocess dependency; fails if git is not installed or not in PATH; non-deterministic if `GIT_DIR` or `GIT_WORK_TREE` are set differently across runs; not testable without a real git setup. Violates `cli-init.md` CLI-4 (determinism, no subprocess) and `AGENTS.md` S3. |
| Consult `GIT_DIR` or `GIT_WORK_TREE` environment variables | Non-deterministic; environment-dependent; unclear semantics when the user has not set them; easy to accidentally override. |
| Read `.git` as a file (worktrees, submodules) and follow `gitdir:` pointers to find the real root | Works for submodules and worktrees, but requires parsing `.git` file format and following symlinks. Extra complexity for a case already solved by the directory check (a `.git` file still marks a repository root, even if the actual data lives elsewhere). |
| Hard-code the workflow path assumption (always write at `targetDir/.github/workflows/`) | Would not fix the bug: the workflow would still be written where GitHub does not read it. |

## Consequences

**Positive**: 
- Pure function of local filesystem state; no subprocess, no environment dependency, no git installation required.
- Stable across runs and clones: the same checkout always finds the same root.
- Works in containers that carry the checkout but not the git tool.
- Testable with synthetic fixtures; no real git required.
- Handles worktrees and submodules natively (`.git` as a file is still detected).
- Keeps the codebase module-downward importable (`src/repo.ts` only imports `node:fs/promises` and `node:path`).

**Accepted costs**: 
- Does not find git repositories the user has configured to be outside `.git` (e.g., using `GIT_DIR`). But this is an advanced setup; the default case (`.git` at or above the install directory) is covered correctly.
- The walk stops at the filesystem root and returns `undefined` if no `.git` is found, treating that as "not in a repository" (rather than assuming a default like $HOME or current working directory).

## Follow-ups

None immediately. If a future feature must resolve the repository root differently (e.g., to consult `GIT_DIR`), it should do so as a new module or an enhancement to `findRepoRoot`, not by reverting this decision.
