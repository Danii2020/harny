# ADR 0056: This repo's .sdd/ is refreshed through a scratch copy, not by update in place

- **Status**: Accepted
- **Date**: 2026-10-02
- **Feature**: streamlined-spec-artifacts
- **Capability**: cli-init
- **Source**: contract.md § Behavior Guarantees SA-15; audit.md § Accepted deviations D1
- **Trigger**: (d) deliberately accepts a known cost

## Context

SA-15 expects this repo's `.sdd/` to equal fresh `harny update` output. `update` writes
through the `.claude/skills/harny-*` symlinks into the dogfood `.agents/skills/*`, which
the executor had modified, so running it on the repo would hit its own dirty-tree refusal
or overwrite work.

## Decision

The executor ran the built `update --force` on a scratch copy and copied `.sdd/` back.
The human accepted this. The auditor confirmed the outcome: the built
`update --dry-run` on the repo reports every `.sdd/**` path `unchanged`.

## Alternatives considered

| Option | Why not |
|---|---|
| `update --force` on the repo | Would overwrite the symlinked dogfood skills |
| Skip the refresh | Leaves the stale schema files SA-15 requires removed |

## Consequences

**Accepted costs**: the refresh method is not reproducible by running `update` in place.

## Follow-ups

Decide in a separate feature whether `update` should skip symlinked generated paths,
which would remove the need for this workaround.
