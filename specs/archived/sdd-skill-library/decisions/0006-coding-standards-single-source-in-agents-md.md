# ADR 0006: Coding standards — single source of truth in AGENTS.md

- **Status**: Accepted
- **Date**: 2026-09-09
- **Feature**: sdd-skill-library
- **Capability**: pipeline-roles
- **Source**: contract.md § "Coding standards are now in AGENTS.md, single-sourced" + intent.md problem statement item 6
- **Trigger**: (a) & (b) — chose single source over distributed copies; constrains future standards

## Context

Before this feature, coding standards (S1–S7) were inlined in multiple places:
- `templates/roles/sdd-executor.md` (the executor's system prompt)
- `templates/roles/sdd-auditor.md` (the auditor's system prompt)
- Various comments in test files and source code

Duplication creates drift. If a standard is updated, it must be updated in every place, or it silently diverges. The executor and auditor both need to know the standards; they currently have to read them from multiple files and hope the copies match.

The `harny-standards` skill was introduced as a minimal artifact: it is a pointer plus a per-role checklist, never a copy of the standards themselves. But where should the standards live as the single source of truth?

Two options:
1. **AGENTS.md** (chosen): the live pipeline's conventions document, natural home for repo-specific working practices
2. **A new `STANDARDS.md` file**: dedicated, but introduces a new top-level file that duplicates the naming pattern

## Decision

Coding standards S1–S7 are defined once in `AGENTS.md` § "Coding standards". Each standard is stated as a rule plus the artifact that establishes it (e.g., "S1 — TypeScript, ESM, `nodenext` resolution; established by `src/engine.ts:5–11`, `tsconfig.json`").

The `harny-standards` skill points to this section by name and title, never copies the rules. Instead, it provides a per-role checklist:

- **executor**: S1, S2, S3, S4, S5, S6 before marking a task done
- **auditor**: all seven (S1–S7), reported as findings

Both roles read the standards by following the pointer to `AGENTS.md`, not by reading an inline summary in the skill.

## Alternatives considered

| Option | Why not |
|---|---|
| Dedicated `STANDARDS.md` file | Creates a parallel conventions document; both it and `AGENTS.md` would need to be updated on changes; no better than inline duplication |
| Keep standards in `templates/roles/` | Portable templates are intentionally generic; repo-specific standards belong in the live repo, not the template layer |
| Distribute across multiple files (current state) | Creates the drift problem this decision exists to fix |

## Consequences

**Positive**:
- One source of truth; changes propagate everywhere the standards are referenced
- Standards are colocated with other repo conventions (working practices, template structure) in one file
- Clear ownership: AGENTS.md is the canonical reference for this repo's standards
- Pointer is portable: another repo can point to its own equivalent (`CLAUDE.md`, `KIRO.md`, etc.) with the same pattern

**Accepted costs**:
- AGENTS.md becomes longer (one new section); it is now the repository for more metadata
- The per-role checklist in `harny-standards` is still a partial restatement (S1–S6 are glossed inline as single-line reminders), which creates a small second surface that can drift; mitigated by keeping the glosses minimal and the AGENTS.md section as the authoritative source
- A reader exploring the checklist must follow a pointer to understand each standard fully

## Follow-ups

**Reduction**: AL-S5b — the inline S1–S6 glosses in `harny-standards/SKILL.md` step 3 are currently one-line summaries. Consider trimming to bare IDs ("executor — S1–S6 before marking a task done") and letting readers follow the pointer to AGENTS.md for detail.

**Related ADR**: ADR 0001 (skill design) explains why `harny-standards` exists as a reusable artifact; this ADR explains where the standards themselves live.
