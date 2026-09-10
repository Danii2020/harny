# ADR 0008: Flat OpenSpec-derived capability format

- **Status**: Accepted
- **Date**: 2026-09-09
- **Feature**: sdd-skill-library
- **Capability**: spec-workflow
- **Source**: contract.md § Amendment A3 (post-archive exception, human-authorized 2026-09-09)
- **Trigger**: (a) & (c) — chose this file shape and content format over the as-shipped alternative; supersedes the per-capability-subfolder `capability.md` design this same feature originally shipped

## Context

`sdd-skill-library` shipped `specs/current/<capability>/capability.md` — a per-capability
subfolder holding one file, whose `## Current behavior` section was a flat
`| ID | Statement | Provenance |` table. After the feature archived, the human decided
this shape should change on two axes at once: the path (drop the subfolder, since each
capability owns exactly one entry-point file and a subfolder buys nothing) and the content
format (adopt a hybrid of OpenSpec's `## Requirements` → `### Requirement:` →
`#### Scenario:` structure, since a WHEN/THEN scenario is more precise and more directly
testable than a one-line prose statement, while keeping a `**Source:**` line to preserve
this repo's mandatory provenance citation and the sections OpenSpec has no equivalent for
— Purpose, Invariants, Open reservations, Contributing features, Related ADRs).

Because `sdd-skill-library` was already archived and its own Guarantee 9 forbids editing
an archived artifact afterwards, this change could not be made as an ordinary
`harny-sync` archive-mode update. The human explicitly authorized a one-time, labeled
exception to Guarantee 9 for this specific structural change, recorded as
`contract.md` § Amendment A3, rather than silently drifting `specs/current/` away from
what its own defining contract still describes.

## Decision

`specs/current/<capability>.md` (flat, no subfolder) replaces
`specs/current/<capability>/capability.md`. Inside each file, `## Requirements` replaces
`## Current behavior`: one `### Requirement: <OLD-ID> — <short descriptive name>` block
per old statement (the statement reworded as a `The system SHALL …` clause), a
`**Source:** <old provenance citation, verbatim>` line, and one or more
`#### Scenario: <name>` blocks phrased as `**WHEN** <trigger>` / `**THEN** <expected
behavior>`. Every old stable ID survives unchanged as the ID prefix of its
`### Requirement:` heading. `## Purpose`, `## Invariants`, `## Open reservations`,
`## Contributing features`, and `## Related ADRs` are kept, unchanged in substance.
`specs/current/_index.md`'s `## Capabilities` table becomes 3-column (`Capability |
Current-State Specification | Incorporated Changes`) and `## Shipped features` is
replaced by `## Synchronized Changes` (`Change | Archive | Current-State
Specification`), dropping the Shipped-date and Verdict columns since that detail already
lives in each feature's own archived `intent.md`/`audit.md`.

## Alternatives considered

| Option | Why not |
|---|---|
| Keep the per-capability subfolder, change only the content format | Leaves a pointless extra directory level for a capability that owns exactly one entry-point file; every existing internal cross-reference (`.agents/skills/harny-sync/SKILL.md`, `.agents/skills/README.md`) would still need updating for the content-format change alone, so flattening the path costs little extra and removes a level of indirection future skills would otherwise have to keep threading through |
| Keep the ID+Statement+Provenance table, change only the path | Loses the chance to make each requirement independently testable via an explicit WHEN/THEN scenario, and does not adopt the OpenSpec convention the human specifically wants this knowledge base to converge toward |
| Treat this as a normal `harny-sync` archive-mode update against a *new* feature, rather than editing the archived `sdd-skill-library` artifact directly | `harny-sync` archive mode updates `specs/current/` capability docs, but the schema *definition* itself — the `capability.md` template — lives in `sdd-skill-library/contract.md` § Data Models. Updating only the generated docs and leaving the defining contract's schema section unedited would create two contradictory schema descriptions in the same repo, with no artifact recording why; § Amendment A3 exists specifically to avoid that |
| Silently patch `sdd-skill-library/contract.md` without a labeled amendment | Violates this repo's own traceability standard — every other cross-feature correction (Amendment A1, Amendment A2) is recorded as a labeled, dated amendment rather than an invisible edit, and an edit to an *archived* artifact is a strictly larger departure from norm, so it needs strictly more disclosure, not less |

## Consequences

**Positive**:
- `specs/current/<capability>.md` is one file per capability with no subfolder indirection, matching how every other single-entry-point document in this repo (e.g. `AGENTS.md`, `.agents/skills/README.md`) is addressed
- Each requirement is independently scenario-testable (WHEN/THEN), which is more precise than a one-line prose statement and easier for a future `harny-test` or `harny-audit` pass to check against
- The knowledge base's format now has a named external precedent (OpenSpec) rather than a bespoke table shape invented for this repo alone
- `_index.md`'s `## Synchronized Changes` table removes a duplicated source of truth (Shipped date, Verdict) that already lives in each feature's own `intent.md`/`audit.md`
- The exception is fully disclosed: `contract.md` § Amendment A3, plus pointer notes in `roadmap.md`, `tasks.md`, and `audit.md`, mean no reader can stumble on the old schema description and believe it is still current without also finding the correction

**Accepted costs**:
- This is a genuine, human-authorized exception to Guarantee 9 ("no archived artifact is ever edited afterwards") — a precedent that must not be read as license to edit other archived artifacts without the same explicit authorization and disclosure
- `roadmap.md` and `tasks.md` still describe the original per-capability-subfolder shape in their body prose (only pointer notes were added, not a full text rewrite), so a reader of those files' raw task descriptions must follow the pointer to `contract.md` § Amendment A3 to get the current shape
- `specs/current/spec-workflow.md`'s own SW-9 requirement had to be updated in place to describe the new flat layout instead of the one it originally shipped with — a second, smaller case of "current truth changed after the fact," recorded in SW-9's own `**Source:**` line

## Follow-ups

**Named successor**: `templates-skill-library-parity` (already named in `contract.md` § SUPERSEDES) should adopt this same flat, OpenSpec-derived shape if and when it propagates the `specs/current`/`specs/archived` taxonomy into `templates/` and the five generators, so a scaffolded pipeline does not get a third, different shape.

**Standing pattern**: future `harny-sync` archive-mode runs write and update capability docs directly in this flat, Requirement/Scenario format — see the corresponding update to `.agents/skills/harny-sync/SKILL.md`. No further path or format migration is anticipated.
