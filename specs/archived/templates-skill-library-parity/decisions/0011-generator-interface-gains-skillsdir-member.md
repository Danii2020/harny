# ADR 0011: Generator interface gains `skillsDir` member; no `renderSkill` method

- **Status**: Accepted
- **Date**: 2026-09-13
- **Feature**: templates-skill-library-parity
- **Capability**: tool-generators
- **Source**: contract.md § D3 (Resolved design decisions)
- **Trigger**: (a) explicit choice between two design options; (c) supersedes prior claim TG-1 (now narrowed in scope)

## Context

This feature introduces a third artifact class to `npx harny init` (after role and conductor artifacts): the skill library, written to each tool's native discovery root. The `Generator` interface already exposes per-tool constants `agentsDir` and `conductorPath` for role and conductor placement.

The question was whether skill-discovery knowledge (which directory a tool reads skills from) belongs in the same `Generator` interface or in a separate, tool-id-indexed table. Additionally, should skills go through a per-tool rendering step (like roles and conductors do), or should they be copied verbatim?

## Decision

The `Generator` interface gains exactly one member: `readonly skillsDir: string`. It gains no `renderSkill` method. Skill file construction lives in `src/engine.ts` (`buildSkillFiles`), alongside `buildSharedFiles`, operating on the loaded raw bytes.

## Alternatives considered

| Option | Why not |
|---|---|
| Separate `ToolId → string` lookup table outside the Generator interface | Splits per-tool facts across modules, violating the design principle that all per-tool knowledge lives in the tool's own generator. Also increases test coupling (tests would need to maintain two separate maps in sync). |
| Add `renderSkill` method to the interface | Skills have no frontmatter harny generates, no model mapping, no capability mapping, and no `harny:begin`/`harny:end` block. Five `renderSkill` implementations would be five byte-identical copies of "return the source contents verbatim" — precisely the hand-rolled duplication `tool-generators.md` TG-5 forbids. Only the path varies per tool, so only path selection belongs in the interface. |

## Consequences

**Positive**:
- All per-tool knowledge stays in the generator, maintaining cohesion.
- Skill emission is deterministic and guaranteed byte-identical to source (no rendering step to introduce drift).
- Interface change is minimal (one member added, no method signature changes).
- Directly verifiable: `Gu 9` (whole-file identity) is mechanically checkable in a single comparison.

**Accepted costs**:
- Future artifact classes that have tool-specific rendering would need a different integration point (not through the `Generator` interface, or the interface would need to support optional methods).
- The `skillsDir` member is new and needs its own documentation and tests.

## Follow-ups

**Amendment to `tool-generators.md` TG-1**: TG-1's claim that the interface is "deliberately sufficient for all five targets without amendment" is hereby narrowed to role and conductor artifacts. The interface gains one member for the new skill artifact class. No existing member changes type or meaning; TG-2 (five ids resolve) is unaffected.
