# Intent: Commit Checks

> **Gate waiver (recorded, not implied).** The requester waived all three human gates
> for this run on 2026-09-24 ("full auto approve based on best practices … then open a
> pr when this is done and approved by audit"). Every gate below was approved by that
> delegation, not by a human reading the artifact. The pull request is the first human
> checkpoint.

## Problem Statement

harny's two existing feedback sensors are both advisory or late. The per-turn hook
reports findings, but it cannot stop a commit. The CI workflow stops a merge, but only
after the commit, and any secret in it, has been pushed. `permissions-baseline` blocks
an *agent* from committing to a protected branch or reading a secret, but only through
each tool's pre-tool hook. It does nothing for a human, for an agent whose hook is not
wired, or for a secret that reaches a file some other way.

Git itself has the one checkpoint every committer passes through, whichever agent or
person is typing: the `pre-commit` and `pre-push` hooks. harny ships nothing there, and
its CI never scans for secrets.

## Goals

1. **G1 — A blocking, tool-neutral commit gate.** One set of git hooks, installed once
   per harness, that every agent (all five tools) and every human passes through.
   `pre-commit` blocks on:
   - a commit to a protected branch;
   - a secret in the staged changes (gitleaks, when installed);
   - a lint finding on the staged files.
2. **G2 — One protected-branch list.** `pre-commit` and `pre-push` read the same
   `git.protectedBranches` that `permissions-baseline`'s guard reads. `pre-push` blocks
   any push to a protected branch, by any refspec.
3. **G3 — Reuse the feedback runner.** Staged-file linting is a new `run --staged` mode
   of `run-feedback.mjs`, so the `extensions` gate, existence filter, component dispatch
   and probe-skip apply unchanged. No second lint engine.
4. **G4 — Compose, never clobber.** Activation (`core.hooksPath`) needs consent. It
   never overrides an existing hooks path or a hook manager (husky, lefthook,
   pre-commit), and it chains any pre-existing `.git/hooks/<name>`.
5. **G5 — Secrets are also caught where hooks cannot run.** The generated CI workflow
   scans each change's commits with gitleaks. That is the backstop for cloud agents and
   fresh clones, where no local hook is active.
6. **G6 — harny dogfoods it.** This repository carries the hooks, the regenerated
   runner and workflow, and activates them in its own checkout.

## Success Criteria

- [ ] SC1 — `harny init` writes `.sdd/git-hooks/{pre-commit,pre-push,run-git-hook.mjs,commands.json}`,
      and the two shims are executable.
- [ ] SC2 — In a real repository with the hooks active, `git commit` on a protected
      branch fails; on a feature branch it succeeds; a failing lint on a staged file fails
      it; a commit on an unborn branch (the repository's first) succeeds.
- [ ] SC3 — `git push` of a protected branch, by any refspec, fails from `pre-push`.
- [ ] SC4 — With a `gitleaks` binary on `PATH` that reports a leak, the commit fails;
      with none, the commit proceeds and one notice says the scan was skipped.
- [ ] SC5 — `run --staged` lints exactly the staged Added/Copied/Modified/Renamed files,
      honors `extensions`, never runs whole-project commands, and exits 2 on a finding.
- [ ] SC6 — Activation sets `core.hooksPath` only with consent, only inside a git
      repository, never when another hooks path or hook manager is present, and not under
      `--dry-run` or `--no-git-hooks`. A pre-existing `.git/hooks/pre-commit` still runs.
- [ ] SC7 — The generated CI workflow gains a pinned, checksum-verified gitleaks step
      that scans only the change's commit range.
- [ ] SC8 — This repository's `.sdd/git-hooks/*`, runner and workflow are byte-identical
      to a fresh render.

## Non-Goals

- **Whole-project type-checking at commit time.** It stays in CI. A `tsc` or `mypy` run
  on every commit makes commits slow enough that people bypass them. `run --staged`
  runs per-file commands only (ADR candidate).
- **Stashing unstaged changes before linting.** Linters read the working-tree version of
  a staged file (lint-staged's stash dance is out of scope; documented limit).
- **An agent-usable skip switch.** No `HARNY_SKIP_HOOKS`: an agent could set it. The only
  bypass is git's own `--no-verify`, which `permissions-baseline` denies to agents on all
  five tools.
- **A "never `--no-verify`" line in role bodies.** Sub-agent roles never commit
  (`dogfood-quick-fixes`), and the deny rule already exists (`permissions-baseline`).
  A cross-role rule belongs to `rules-layer` (plan #6).
- **Doctor checks for hooks or gitleaks.** That is `doctor-security-checks` (plan #7).
- **`gitleaks-action`.** It requires a license key for organization accounts (its own
  README, 2026-09-24), which would break CI for every org that scaffolds harny. The
  workflow downloads the pinned open-source binary instead.
- **Server-side enforcement.** Still the only non-bypassable layer; documented, not
  automated.

## Constraints

- `harny-sync` current truth: `feedback-controls` FC-1–FC-28 and `cli-init` CLI-1 (a
  fixed step list; "never a fourteenth step"). This feature **amends**:
  - FC-7: the workflow gains exactly one static, canonical secret-scan step, and the
    checkout fetches full history;
  - FC-20's neighbour: `run` gains a third boolean mode flag, `--staged`, beside
    `--whole-project` and `--keep-turn` (the A1 "flag, never a third mode" precedent);
  - CLI-1: activation happens inside the existing final write step, never as a new step.
- `permissions-baseline`: this feature reads `.sdd/permissions/policy.json` and never
  writes it. It depends on that PR (stacked branch).
- `AGENTS.md` S1–S7. S3 is extended in one deliberate place: activation runs
  `git config core.hooksPath` on the enclosing repository. That is a consented side
  effect, not a generated file, and it is reported (ADR candidate). S4: no new dependency.
- Git hooks are tool-neutral. There is no per-tool artifact, so no generator changes.
  The same deliverable ships for all five tools (TG-1 unchanged).

## Prior Art

- gitleaks README and `cmd/git.go` (v8.30.1, 2026-09-24): `detect`/`protect` are
  deprecated since v8.19. The staged scan is `gitleaks git --pre-commit --staged`. The
  exit code is 1 on a leak. Releases are published as
  `gitleaks_<v>_linux_x64.tar.gz`, with `gitleaks_<v>_checksums.txt`.
- githooks(5): `core.hooksPath` replaces `.git/hooks`; hooks run from the top of the
  working tree; `pre-push` receives `<local ref> <local sha> <remote ref> <remote sha>`
  lines on stdin.
- `run --whole-project`, `run --keep-turn`: boolean flags on `run`, never a new mode.
