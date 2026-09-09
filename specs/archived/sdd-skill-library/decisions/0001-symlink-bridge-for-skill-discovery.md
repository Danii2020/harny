# ADR 0001: Symlink bridge for skill discovery

- **Status**: Accepted
- **Date**: 2026-09-09
- **Feature**: sdd-skill-library
- **Capability**: skill-library
- **Source**: contract.md § SUPERSEDES + § Discrepancies and coexistence notes (D1)
- **Trigger**: (a) & (b) — explicitly chose symlink bridge over bootstrap directory; constrains future tools

## Context

Harny's eight new reusable skills live in `.agents/skills/`, a shared tool-neutral location already established by the Codex generator. Claude Code cannot read `.agents/` directly (V3) but does support symlinks (V4). Two viable paths existed:

1. **Symlink bridge** (chosen): canonical content at `.agents/skills/`, discovered via git-tracked symlinks under `.claude/skills/harny-*/`
2. **Bootstrap in .claude/**: copy skill content into `.claude/skills/harny-*/SKILL.md` directly, no bridge needed

## Decision

Canonical skill bodies live at `.agents/skills/<name>/SKILL.md`. Eight git-tracked symlinks under `.claude/skills/harny-*/` resolve to them, stored at git mode `120000` (symlink blob). Claude Code discovers and preloads the skills via the symlink paths. This makes the skills portable (no tool-specific copy) and reusable by any agent tool that reads the `.agents/` layer.

## Alternatives considered

| Option | Why not |
|---|---|
| Copy skill content into `.claude/skills/harny-*/SKILL.md` | Creates duplication; harder to keep multiple agent tools' copies in sync; ties each skill to one tool's path structure |
| Store canonical at `.claude/skills/` | Ties the canonical to Claude Code; `.agents/` is already this repo's tool-neutral namespace per V14; other tools (Cursor, Kiro, GitHub Copilot, Codex) need the content too |
| No bridge, just `.agents/` only | Claude Code cannot read `.agents/` (V3), so the pipeline would not run without bootstrap; every fresh clone or tool-switching action would require manual setup |

## Consequences

**Positive**:
- One canonical copy, shareable across all agent tools
- Survives clone with git's symlink support (mode `120000`)
- Skills are discoverable and preloadable without bootstrapping
- Makes the repo's skill library portable to other agent tools

**Accepted costs**:
- Relies on documented Claude Code symlink support (V4), verified but not observed in a fresh session (CR-1, residual)
- Introduces a structural dependency: if the bridge is lost, the pipeline silently appears complete but does not work (CR-2, mitigated by guards in all five agent bodies and two test suites)
- Requires `.gitignore` discipline to keep the bridge tracked and the `.agents/` source tracked while leaving `.claude/agents/` local

## Follow-ups

**Named successor**: `templates-skill-library-parity` — propagate this bridge design into `templates/` and all five per-tool generators, so future projects scaffolded by `npx harny init` also use the shared `.agents/skills/` canonical location.

**Unresolved residual** (CR-1): confirm warning-free preload and discovery on all five agent roles, and on a fresh clone. Currently observed on two roles, one role, and zero fresh clones. Not blocking; discovery mechanism is proven.
