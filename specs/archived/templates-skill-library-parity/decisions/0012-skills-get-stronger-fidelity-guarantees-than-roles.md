# ADR 0012: Skills get stronger fidelity guarantees than roles (Gu 9/10 not TG-3/TG-4)

- **Status**: Accepted
- **Date**: 2026-09-13
- **Feature**: templates-skill-library-parity
- **Capability**: tool-generators
- **Source**: contract.md § D4 (Resolved design decisions)
- **Trigger**: (c) diverges from prior statement; establishes load-bearing constraint for future skills

## Context

`tool-generators.md` TG-3 and TG-4 guarantee that role and conductor artifacts preserve the canonical body as a contiguous substring and permit five named per-tool differences (path, file extension, wrapper format, model id, capability tokens). These guarantees fit role artifacts because they wrap a canonical body in frontmatter and append a generated configuration block.

Skills have neither wrapper nor generated region, so the relationship between source and output is equality, not substring containment. The five permitted differences in TG-4 also don't apply uniformly: only path differs between skill copies across roots; model ids, capability tokens, and wrappers don't exist for skills.

Extending TG-3's substring wording to skills would state something weaker than the truth and would license a future implementation to append or prepend content to a skill file while still claiming compliance.

## Decision

`tool-generators.md` TG-3 and TG-4 keep their current wording and scope (role and conductor artifacts only). Skills are governed by two new, parallel guarantees:
- **Gu 9**: Whole-file identity to source (not substring containment)
- **Gu 10**: Only the path differs between copies across roots

## Alternatives considered

| Option | Why not |
|---|---|
| Extend TG-3/TG-4 wording to include skills | States something weaker than the truth for skills (substring containment vs. equality). Creates future license to append a comment or provenance marker to a skill file and still pass the guarantee. |
| Drop the guarantee entirely for skills | Loses the critical load-bearing property that makes the fidelity test meaningful. Without this guarantee, drift in skills could occur silently and undetected. |
| One unified guarantee covering all three artifact classes | Requires either staying at the weaker level (substring, then apply to skills incorrectly) or inventing a new shared language that covers both wrappers and non-wrappers correctly (more complex and less discoverable than two clear statements). |

## Consequences

**Positive**:
- Whole-file equality is stronger and more obviously correct for skills than substring containment.
- Simpler to verify: `cmp` of two files, rather than scanning for a canonical body substring.
- More discoverable: a reader knows exactly what to expect (equality, not containment).
- Establishes a clear baseline for future artifact classes (define whether they have wrappers, then choose the appropriate guarantee).

**Accepted costs**:
- Three artifact-type-specific guarantees instead of one unified rule (TG-3, TG-4, Gu 9, Gu 10).
- Readers must understand that TG-3/TG-4 apply to roles/conductors and Gu 9/10 apply to skills (discoverable in the text, but requires careful reading).

## Follow-ups

When new artifact classes are introduced, establish whether they have wrappers and generated regions, then apply TG-3/TG-4 (if they do) or Gu 9/10 (if they don't), or define a new parallel guarantee.
