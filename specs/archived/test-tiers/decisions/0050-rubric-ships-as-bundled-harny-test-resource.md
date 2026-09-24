# ADR 0050: The test-value rubric ships as a bundled harny-test resource, not a skill

- **Status**: Accepted
- **Date**: 2026-09-24
- **Feature**: test-tiers
- **Capability**: skill-library
- **Source**: contract.md § Behavior Guarantees TT-1 to TT-5; intent.md G4
- **Trigger**: (a) a choice between two named viable options; (c) supersedes the
  shipped `harny-test`'s prior reference to a `high-value-tests` skill harny never
  shipped

## Context

`templates/skills/harny-test/SKILL.md` and `templates/roles/sdd-test-writer.md`
referenced a `high-value-tests` skill that existed only as this repository's own
dogfood file (`.claude/skills/high-value-tests/SKILL.md`), never in `SKILL_IDS` or
any generated install — a dangling reference in every downstream repository. The
rubric needed a real, shipped home. A tenth `harny-*` skill was one option; bundling
it as a resource file next to `harny-test/SKILL.md` — the same mechanism already
proven for `harny-sync`'s `capability-template.md` and `harny-adr`'s
`adr-template.md` — was the other.

## Decision

The rubric ships as `templates/skills/harny-test/high-value-tests.md`, a bundled
resource of the existing `harny-test` skill, loaded by the unchanged
`loadSkillTemplates` / `buildSkillFiles` path with no `src/` change. It lands beside
`harny-test/SKILL.md` under every distinct skill root a selected tool uses, and is
cited by bare file name and section (`` `high-value-tests.md` § "..." ``) from both
`harny-test/SKILL.md` and `sdd-test-writer.md`.

## Alternatives considered

| Option | Why not |
|---|---|
| A new eleventh `harny-*` skill (`harny-high-value-tests`) | A rubric is reference material the test-writer consults, not an action a role or the conductor invokes on its own — the bundled-resource shape already fits this exact case and is proven to reach every skill root with zero generator change |
| Inline the rubric's content directly into `harny-test/SKILL.md` | Would blow past the skill's own shape contract expectations for a lean, action-shaped body, and would force the same content to be duplicated verbatim into `sdd-test-writer.md` rather than cited once and shared |

## Consequences

**Positive**: closes the dangling reference with the least new surface area — no new
skill id, no generator change, no new `SKILL_IDS` entry, reusing a mechanism already
proven by two prior features. The rubric is neutral, generalized content (no dogfood
domain residue), verified by a dedicated `NEUTRALITY_CHECKS` entry.

**Accepted costs**: the dogfood copy (`.claude/skills/high-value-tests/SKILL.md`) is
deliberately left as a separate, unshipped skill and continues to diverge — this
repository's own pipeline does not consume the newly bundled rubric, tracked as
reservation TT-R3.

## Follow-ups

TT-R3 (LOW, carried): a future dogfood-sync feature may retire the dogfood-only
`high-value-tests` skill in favor of the now-shipped bundled resource.
