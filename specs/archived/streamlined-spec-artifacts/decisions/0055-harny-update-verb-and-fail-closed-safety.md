# ADR 0055: `harny update` renders through init, deletes only a constant list, and fails closed

- **Status**: Accepted
- **Date**: 2026-10-02
- **Feature**: streamlined-spec-artifacts
- **Capability**: cli-init
- **Source**: contract.md § Interfaces SA-18, SA-19, SA-20; § Behavior Guarantees SA-21 to SA-25
- **Trigger**: (a) a choice between named options; (b) constrains future features (delete list, refusal rules)

## Context

Repos initialised under the five-file schema carry stale `.sdd/spec-schema/contract.md`
and `roadmap.md`, and older generated files. There was no verb to bring an install up to
the current harny version.

## Decision

`harny update [target]` (options `--dry-run`, `--force`; no prompts) reads only
`<target>/.sdd/harness.json` and renders through `runInit` (non-interactive, no git-hooks
activation), so output is byte-identical to a fresh `init`. Each path is reported
`created`, `updated`, `unchanged` or `removed`, with a summary line; dry-run prefixes
`would be`. Deletions come only from `LEGACY_HARNESS_PATHS` (the two stale schema files):
regular files only, contained to the install root, after all writes; directories and
symlinks are skipped with a warning. It never touches `specs/` or `core.hooksPath`.
Before any change it refuses (CONFLICT, exit 3) if a path it would change is tracked with
staged or unstaged changes, or the target is not in a git repo. The check resolves
symlinks to the file actually written and fails closed when git itself fails.
`--force` skips the refusals, `--dry-run` never refuses and names the triggering paths,
untracked paths never block. `init --force` removes the same legacy files with no dirty
check (accepted).

## Alternatives considered

| Option | Why not |
|---|---|
| A second render pipeline for update | Drifts from `init`; one pipeline plus a byte-compare test is cheaper |
| Glob or directory deletes of stale files | A bug could delete user files; a constant list bounds the blast radius |
| Fail open when git errors | Round 1 audit F2: silently overwrites tracked edits |

## Consequences

**Positive**: idempotent, auditable upgrades. **Accepted costs**: untracked edits to
generated files are overwritten; `init --force` has no dirty check; a new legacy path
needs a code change.

## Follow-ups

Audit F3 (deferred, LOW): under `update`, the MCP merge warning still advises `--force`,
which `update` does not pass to the MCP merge.
