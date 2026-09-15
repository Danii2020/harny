# ADR 0025: `guidancePath` as a declarative `Generator` member, continuing ADR 0011 not ADR 0014

- **Status**: Accepted
- **Date**: 2026-09-15
- **Feature**: ai-sdlc-readiness
- **Capability**: tool-generators
- **Source**: contract.md § Candidate ADRs, § AR-9, "Verified per-tool root instruction files"; TG-12
- **Trigger**: (a) explicit choice between two prior-established patterns; (b) constrains future features — a sixth generator must declare this member or fail to compile

## Context

The repo-readiness family needs to know, per tool, which root instruction file that
tool natively reads (so it can offer a redundant-but-harmless `AGENTS.md` fallback
alongside it). This is a per-tool fact, and `tool-generators.md`'s own governing rule
(TG-9's precedent, and this repo's stated design principle) is that per-tool facts live
on the `Generator` interface, never in a second table elsewhere. Two prior ADRs
established two different shapes for extending that interface: ADR 0011 added
`skillsDir` as a plain declarative member (a path fact, no rendering), while ADR 0014
added `renderHook` as a method (because it renders structure — a hook config file with
tool-specific wrapping). `guidancePath` needed to pick one of these two shapes.

## Decision

Add `readonly guidancePath: string | undefined` to the `Generator` interface, as a
declarative member — following `skillsDir`'s pattern (ADR 0011), not `renderHook`'s
(ADR 0014). The member is required on the type (not optional with `?`), but its value
may be `undefined` for a tool whose native root file already *is* `AGENTS.md` (Cursor,
Codex) — `undefined` is asserted explicitly by each such generator, not omitted, so a
sixth generator that forgets to declare it entirely is a TypeScript compile error, not
a silent gap.

## Alternatives considered

| Option | Why not |
|---|---|
| A method (e.g. `renderGuidance()`), following ADR 0014's `renderHook` pattern | `guidancePath` names a location; it renders nothing. Every one of the five generators would implement the exact same trivial "return this constant" body — precisely the kind of hand-rolled duplication `TG-5` already forbids for frontmatter/TOML serialization, now for a member that never needed a method in the first place. |
| A separate `ToolId → string \| undefined` lookup table outside the `Generator` interface | Rejected for the same reason ADR 0011 rejected it for `skillsDir`: splits per-tool facts across modules, when this repo's design principle is that all per-tool knowledge lives in that tool's own generator. |
| Optional member (`guidancePath?: string`) instead of required-but-possibly-`undefined` | An optional member lets a sixth generator omit it silently — `tsc` would not catch the omission, since an absent optional property and an explicit `undefined` value are indistinguishable to the type checker in the way this feature needed. Making it required (`string \| undefined`, no `?`) forces every generator to make an explicit choice, which is exactly what `intent.md`'s framing asks for: "`tsc` failing on an omitted member is the proof a sixth generator can't skip the question." |

## Consequences

**Positive**:
- Per-tool root-guidance-file facts live in exactly one place, consistent with
  `skillsDir` and every other per-tool constant.
- Compile-time enforcement: a sixth generator cannot ship without explicitly answering
  the `guidancePath` question, one way or the other.
- No new rendering logic, no new shared serialization module, nothing for `TG-5` to
  govern.

**Accepted costs**:
- The distinction between "optional, omitted" and "required, explicitly `undefined`"
  is a subtle TypeScript idiom that a future contributor might not immediately
  understand without reading this ADR or the inline doc comment explaining it.
- These facts (like `skillsDir`'s and `hooksPath`'s before them) are verified against
  vendor documentation only, not a live tool install — the same standing
  re-verification caveat already on record as `AL-30` and `CG-1`/`O4`. The blast radius
  is bounded: every `guidancePath`-derived entry is `recommended` and its `anyOf`
  always includes `AGENTS.md`, so a wrong path degrades to a redundant advisory line,
  never a false red.

## Follow-ups

None required by this decision alone.
