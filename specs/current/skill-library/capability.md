# Capability: skill-library

> Last synced: 2026-09-08. Owned artifacts: `.agents/skills/harny-*/`,
> `.agents/skills/README.md`, `.claude/skills/harny-*` (bridge symlinks),
> `AGENTS.md` § "Coding standards", `specs/current/`, `specs/archived/`.

## Purpose

The `harny-*` action-shaped skill library that carries every pipeline role's
instructions, the portable shape contract that lets a user add a ninth skill,
the `.agents/skills/` ↔ `.claude/skills/` symlink bridge, and the knowledge-base
skills (`harny-sync`, `harny-adr`, `harny-standards`) that keep `specs/current/`
and `specs/archived/` accurate.

## Current behavior

| ID | Statement | Provenance |
|---|---|---|
| SL-1 | Eight `harny-*` skills exist: `harny-propose`, `harny-test`, `harny-implement`, `harny-audit`, `harny-document`, `harny-sync`, `harny-adr`, `harny-standards`, each satisfying a shape contract of six portable Agent Skills frontmatter keys and five required body sections | sdd-skill-library · contract.md § Interfaces "Public API — the file manifest"; § "The harny-* skill shape contract" |
| SL-2 | Every `harny-*` skill's canonical content lives at `.agents/skills/<name>/SKILL.md` (tool-neutral, git-tracked); `.claude/skills/<name>` is a relative symlink to it, never a copy — because Claude Code reads skills only from `.claude/skills/` but does support symlinked skill folders | sdd-skill-library · contract.md § "Verified facts" V1–V4; Behavior Guarantees 1–2 |
| SL-3 | Only six frontmatter keys are permitted in a `harny-*/SKILL.md`: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` — the portable Agent Skills spec fields; any Claude-Code-only key (e.g. `disable-model-invocation`) is a shape violation | sdd-skill-library · contract.md § "Verified facts" V5–V6; § "The harny-* skill shape contract" rule 1 |
| SL-4 | A skill's `description` (plus `when_to_use`) is capped at 1,536 characters — the field Claude uses to decide when to apply a skill | sdd-skill-library · contract.md § "Verified facts" V7 |
| SL-5 | A subagent's `skills:` frontmatter list preloads full skill content at startup; a missing or policy-disabled skill is skipped with a warning, not an error — so every thinned agent body carries a mandatory "if a skill is missing, STOP and report" guard as the sole defense against silent degradation | sdd-skill-library · contract.md § "Verified facts" V9; § "Thin agent file shape" |
| SL-6 | `harny-sync` has two modes: `lookup` (read-only, reads at most 4 files: `specs/current/_index.md` plus ≤3 capability docs, never globs `specs/archived/**`) and `archive` (moves an approved feature's `specs/<feature>/` to `specs/archived/<feature>/` after verdict/sign-off/file-existence/`Shipped:`-header preconditions, re-verifies SHA-256, then updates the affected capability docs and regenerates `_index.md`) | sdd-skill-library · contract.md § "harny-sync — modes, triggers, procedures" |
| SL-7 | `harny-sync` lookup is invoked automatically before `harny-propose` drafts a spec (so a new proposal cannot silently contradict shipped truth) and automatically inside the `sdd-documentation` hand-off in archive mode (additively — never replacing that role's README/CHANGELOG/AGENTS.md duties) | sdd-skill-library · contract.md § "harny-sync" trigger matrix T2/T3 |
| SL-8 | `harny-adr` writes one Architecture Decision Record per significant decision (meeting at least one of four named criteria) found in an approved feature's `contract.md`/`roadmap.md`, at `specs/archived/<feature>/decisions/NNNN-<slug>.md` with a globally monotonic 4-digit number, capped at 7 ADRs per feature, and registers each in `_index.md`; the four features migrated before this one get no backfilled ADRs | sdd-skill-library · contract.md § "harny-adr — storage, numbering, template" |
| SL-9 | `harny-standards` is a pointer plus a per-role checklist, never a copy of the rules — it names `AGENTS.md` § "Coding standards" (S1–S7) as this repo's concrete conventions document and is preloaded by both `sdd-executor` and `sdd-auditor` | sdd-skill-library · contract.md § "harny-standards — source of truth and minimum coverage" |
| SL-10 | **As of Amendment A2:** `.gitignore` tracks all of `specs/` (including in-flight feature work under `specs/<feature-name>/`), and tracks `.claude/skills/harny-*` (via `.claude/*` + `!.claude/skills/` + `.claude/skills/*` + `!.claude/skills/harny-*`, in that order — ordering is load-bearing). `.claude/agents/` and `.claude/settings.local.json` stay ignored. Tracking in-flight specs ensures that feature work is versioned alongside code and that the working tree's state matches what `harny-sync` can see. | sdd-skill-library · contract.md § "Verified facts" V10–V13; § "State Changes"; § Amendment A2 |

## Invariants

1. No `harny-*` skill body may exist as a regular file or directory under `.claude/skills/` — the canonical copy lives only under `.agents/skills/`.
2. A `harny-*` skill must never set `disable-model-invocation` — doing so would block subagent preloading, the mechanism thin agents depend on; destructive behavior (archive mode) is gated by guardrail preconditions instead.
3. `synced` is a reserved skill folder name; no `harny-*` skill may be named it, and none currently is.
4. `_index.md` is derived, never hand-edited; if it disagrees with a capability doc, the capability doc wins and `harny-sync` regenerates the index from it.

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| CR-1 | Live discovery of a symlinked project skill (V4) and warning-free `skills:` preloading (V9) are unverified in-session — observing them requires a Claude Code session restart, which cannot happen in the session that creates the symlinks | MEDIUM | sdd-skill-library · audit.md "Carried reservations" |
| CR-2 | The canonical `.agents/skills/` location is not read by Claude Code at all (V3); the entire live pipeline depends on the symlink bridge surviving, mitigated by tracked symlinks, the missing-skill STOP guard, and the guard test | LOW | sdd-skill-library · audit.md "Carried reservations" |
| AL-S15 | `contract.md` § Amendment A1 still prescribes a before/after differential mechanism that was not shipped (the delivered form is a filtered absolute assertion). Contract, `roadmap.md`, and `tasks.md` all state the superseded mechanism. Must be corrected in place before being archived (or will become a permanent historical error). | MEDIUM | sdd-skill-library · audit.md AL-S15 |
| AL-S16 | The T41 filter is status-blind and hardcodes the eight skill names. A modification of a tracked bridge symlink may escape detection (M3), and a ninth `harny-*` skill causes a false positive (M4) against the advertised extension point. Filter must use `?? ` prefix and `harny-` discovery pattern rather than hardcoded names. | MEDIUM | sdd-skill-library · audit.md AL-S16 |
| templates-parity | The live pipeline and `templates/` now disagree on "archive in place" until a named follow-up feature (`templates-skill-library-parity`) reconverges them; a pipeline scaffolded by `npx harny init` still gets today's five-monolith shape with no `harny-*` skills | MEDIUM | sdd-skill-library · contract.md § SUPERSEDES |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| sdd-skill-library | 2026-09-09 | The entire `harny-*` skill library (eight skills), the shape contract, the symlink bridge, `harny-sync` (lookup/archive modes), `harny-adr` (global monotonic numbering, no backfill), `harny-standards` (pointer to AGENTS.md), and the `specs/current`/`specs/archived` knowledge base this file itself lives in; Amendment A2 (track all of specs/) |

## Related ADRs

| ADR | Title | Status | Capability |
|---|---|---|---|
| 0001 | Symlink bridge for skill discovery | Accepted | skill-library |
| 0002 | Knowledge base taxonomy — specs/current/ and specs/archived/ | Accepted | spec-workflow |
| 0003 | Amendment A2 — track all of specs/ | Accepted | spec-workflow |
| 0004 | Non-mutation check — filtered absolute form | Accepted | spec-workflow |
| 0005 | Portable skill frontmatter — six keys | Accepted | skill-library |
| 0006 | Coding standards — single source of truth in AGENTS.md | Accepted | pipeline-roles |
| 0007 | ADR storage and global monotonic numbering | Accepted | spec-workflow |
