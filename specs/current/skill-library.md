# Skill Library Specification

> Last synced: 2026-09-09. Owned artifacts: `.agents/skills/harny-*/`,
> `.agents/skills/README.md`, `.claude/skills/harny-*` (bridge symlinks),
> `AGENTS.md` § "Coding standards", `specs/current/`, `specs/archived/`.

## Purpose

The `harny-*` action-shaped skill library that carries every pipeline role's
instructions, the portable shape contract that lets a user add a ninth skill,
the `.agents/skills/` ↔ `.claude/skills/` symlink bridge, and the knowledge-base
skills (`harny-sync`, `harny-adr`, `harny-standards`) that keep `specs/current/`
and `specs/archived/` accurate.

## Requirements

### Requirement: SL-1 — Eight harny-* skills satisfying the shape contract

The system SHALL provide eight `harny-*` skills: `harny-propose`,
`harny-test`, `harny-implement`, `harny-audit`, `harny-document`,
`harny-sync`, `harny-adr`, `harny-standards`, each satisfying a shape
contract of six portable Agent Skills frontmatter keys and five required
body sections.

**Source:** sdd-skill-library · contract.md § Interfaces "Public API — the file manifest"; § "The harny-* skill shape contract"

#### Scenario: A `harny-*` skill is authored
- **WHEN** any `harny-*` skill is authored
- **THEN** it is one of the eight named skills and its `SKILL.md` declares
  exactly the six portable frontmatter keys and the five required body
  sections

### Requirement: SL-2 — Canonical location plus symlink bridge

The system SHALL keep every `harny-*` skill's canonical content at
`.agents/skills/<name>/SKILL.md` (tool-neutral, git-tracked); `.claude/skills/<name>`
is a relative symlink to it, never a copy — because Claude Code reads skills
only from `.claude/skills/` but does support symlinked skill folders.

**Source:** sdd-skill-library · contract.md § "Verified facts" V1–V4; Behavior Guarantees 1–2

#### Scenario: Claude Code discovers a `harny-*` skill
- **WHEN** Claude Code discovers a `harny-*` skill
- **THEN** it does so via a relative symlink under `.claude/skills/<name>`
  that resolves to the canonical `.agents/skills/<name>/SKILL.md`, never a
  copied file

### Requirement: SL-3 — Six permitted frontmatter keys

The system SHALL permit only six frontmatter keys in a `harny-*/SKILL.md`:
`name`, `description`, `license`, `compatibility`, `metadata`,
`allowed-tools` — the portable Agent Skills spec fields; any Claude-Code-only
key (e.g. `disable-model-invocation`) is a shape violation.

**Source:** sdd-skill-library · contract.md § "Verified facts" V5–V6; § "The harny-* skill shape contract" rule 1

#### Scenario: A `harny-*/SKILL.md`'s frontmatter is validated
- **WHEN** a `harny-*/SKILL.md`'s frontmatter is validated
- **THEN** it fails if any key other than the six portable Agent Skills
  fields is present

### Requirement: SL-4 — Description character cap

The system SHALL cap a skill's `description` (plus `when_to_use`) at 1,536
characters — the field Claude uses to decide when to apply a skill.

**Source:** sdd-skill-library · contract.md § "Verified facts" V7

#### Scenario: A skill's description is authored
- **WHEN** a skill's `description` (plus `when_to_use`) is authored
- **THEN** its combined length does not exceed 1,536 characters

### Requirement: SL-5 — Missing-skill STOP guard in thinned agents

The system SHALL have a subagent's `skills:` frontmatter list preload full
skill content at startup; a missing or policy-disabled skill is skipped with
a warning, not an error — so every thinned agent body carries a mandatory
"if a skill is missing, STOP and report" guard as the sole defense against
silent degradation.

**Source:** sdd-skill-library · contract.md § "Verified facts" V9; § "Thin agent file shape"

#### Scenario: A preloaded skill is missing or policy-disabled at startup
- **WHEN** a subagent's declared `skills:` entry is missing or
  policy-disabled at startup
- **THEN** the subagent's thinned body detects the absence via its mandatory
  guard and stops and reports rather than improvising the role

### Requirement: SL-6 — harny-sync lookup and archive modes

The system SHALL give `harny-sync` two modes: `lookup` (read-only, reads at
most 4 files: `specs/current/_index.md` plus ≤3 capability docs, never globs
`specs/archived/**`) and `archive` (moves an approved feature's
`specs/<feature>/` to `specs/archived/<feature>/` after
verdict/sign-off/file-existence/`Shipped:`-header preconditions, re-verifies
SHA-256, then updates the affected capability docs and regenerates
`_index.md`).

**Source:** sdd-skill-library · contract.md § "harny-sync — modes, triggers, procedures"

#### Scenario: `harny-sync` is invoked
- **WHEN** `harny-sync` is invoked in `lookup` mode
- **THEN** it reads at most `_index.md` plus 3 capability docs and writes
  nothing
- **WHEN** `harny-sync` is invoked in `archive` mode
- **THEN** it verifies all archive preconditions first, refusing and moving
  nothing if any fails

### Requirement: SL-7 — harny-sync invocation triggers

The system SHALL invoke `harny-sync` lookup automatically before
`harny-propose` drafts a spec (so a new proposal cannot silently contradict
shipped truth) and invoke `harny-sync` archive automatically inside the
`sdd-documentation` hand-off (additively — never replacing that role's
README/CHANGELOG/AGENTS.md duties).

**Source:** sdd-skill-library · contract.md § "harny-sync" trigger matrix T2/T3

#### Scenario: `harny-propose` begins drafting a new feature
- **WHEN** `harny-propose` begins drafting a new feature's specs
- **THEN** it first invokes `harny-sync` lookup and treats the brief as
  binding context
- **WHEN** `sdd-documentation`'s post-audit hand-off runs
- **THEN** it invokes `harny-sync` archive in addition to, not instead of,
  its README/CHANGELOG/AGENTS.md duties

### Requirement: SL-8 — harny-adr ADR generation

The system SHALL have `harny-adr` write one Architecture Decision Record per
significant decision (meeting at least one of four named criteria) found in
an approved feature's `contract.md`/`roadmap.md`, at
`specs/archived/<feature>/decisions/NNNN-<slug>.md` with a globally monotonic
4-digit number, capped at 7 ADRs per feature, and register each in
`_index.md`; the four features migrated before this one get no backfilled
ADRs.

**Source:** sdd-skill-library · contract.md § "harny-adr — storage, numbering, template"

#### Scenario: `harny-adr` runs after a feature is archived
- **WHEN** `harny-adr` runs after a feature is archived
- **THEN** it writes a numbered ADR for each decision meeting a
  significance criterion, capped at 7, registers each in `_index.md`, and
  writes no ADR for the four features migrated before `harny-adr` existed

### Requirement: SL-9 — harny-standards points at AGENTS.md

The system SHALL make `harny-standards` a pointer plus a per-role checklist,
never a copy of the rules — it names `AGENTS.md` § "Coding standards"
(S1–S7) as this repo's concrete conventions document and is preloaded by
both `sdd-executor` and `sdd-auditor`.

**Source:** sdd-skill-library · contract.md § "harny-standards — source of truth and minimum coverage"

#### Scenario: `sdd-executor` or `sdd-auditor` checks coding conventions
- **WHEN** `sdd-executor` or `sdd-auditor` needs to check coding
  conventions
- **THEN** `harny-standards` points it at `AGENTS.md` § "Coding standards"
  rather than restating the rules itself

### Requirement: SL-10 — .gitignore tracks all of specs/ and the harny-* bridge

The system SHALL track all of `specs/` (including in-flight feature work
under `specs/<feature-name>/`) in `.gitignore`, and SHALL track
`.claude/skills/harny-*` (via `.claude/*` + `!.claude/skills/` +
`.claude/skills/*` + `!.claude/skills/harny-*`, in that order — ordering is
load-bearing). `.claude/agents/` and `.claude/settings.local.json` stay
ignored. Tracking in-flight specs ensures that feature work is versioned
alongside code and that the working tree's state matches what `harny-sync`
can see.

**Source:** sdd-skill-library · contract.md § "Verified facts" V10–V13; § "State Changes"; § Amendment A2

#### Scenario: A fresh clone of the repo is checked out
- **WHEN** a fresh clone of the repo is checked out
- **THEN** `git ls-files` includes all of `specs/**` (current, archived, and
  any in-flight feature directories) and the eight `.claude/skills/harny-*`
  symlinks, and excludes `.claude/agents/**` and
  `.claude/settings.local.json`

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

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| sdd-skill-library | 2026-09-09 | The entire `harny-*` skill library (eight skills), the shape contract, the symlink bridge, `harny-sync` (lookup/archive modes), `harny-adr` (global monotonic numbering, no backfill), `harny-standards` (pointer to AGENTS.md), and the `specs/current`/`specs/archived` knowledge base this file itself lives in; Amendment A2 (track all of specs/) |
| templates-skill-library-parity | 2026-09-13 | Scaffolded skill library parity: the same eight `harny-*` skills now write as real files to each tool's native skill-discovery root (`.claude/skills/`, `.kiro/skills/`, `.agents/skills/` shared by three tools), with six core skills always scaffolded and two optional (selectable via `--skills` flag); closed the `templates-parity` reservation that diverged the live pipeline from `templates/` |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| 0001 | Symlink bridge for skill discovery | Accepted |
| 0005 | Portable skill frontmatter — six keys | Accepted |
| 0009 | Keep `allowed-tools` key uniformly across all skill roots | Accepted |
| 0012 | Skills get stronger fidelity guarantees than roles (Gu 9/10 not TG-3/TG-4) | Accepted |
