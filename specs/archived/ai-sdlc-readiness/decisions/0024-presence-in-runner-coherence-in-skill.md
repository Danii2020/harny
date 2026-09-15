# ADR 0024: Presence checked in the deterministic runner; coherence judged one layer up, in the skill

- **Status**: Accepted
- **Date**: 2026-09-15
- **Feature**: ai-sdlc-readiness
- **Capability**: readiness-checks
- **Source**: contract.md § Candidate ADRs, § AR-17; intent.md § G3, § Non-Goals "No content matching in the runner"
- **Trigger**: (a) explicit choice between two design options; (b) constrains future features — no future check entry may grep or keyword-match a document's contents in the runner

## Context

A document existing is a weak signal: a `README.md` that is empty, or an `AGENTS.md`
that never states the project's purpose, its components, or the commands that validate
a change, gives an AI coding agent nothing more useful than no file at all. This
feature's own problem statement names exactly that gap. The question was where to
perform that stronger, "does this document actually say something useful" judgment:
inside the deterministic `run-doctor.mjs` runner (via keyword or heading matching), or
somewhere else.

## Decision

The runner checks presence only — `anyPathExists`, `fs.existsSync`, no content read of
any repo-readiness or conventions document. Judging *coherence* (purpose, components,
validation commands) is `harny-doctor`'s own reading procedure, performed by the model
invoking the skill, not by the deterministic pre-check layer.

## Alternatives considered

| Option | Why not |
|---|---|
| Keyword or heading grep in the runner (e.g. require the string "Purpose" or a matching Markdown heading) | Easy to satisfy and hard to trust: a document could contain the literal word "Purpose" as a heading with no useful content beneath it and pass, while a document that clearly states its purpose in different words would fail. A deterministic pre-check should not pretend to assess judgment it cannot actually perform. |
| A more sophisticated heuristic (e.g. minimum word count, required section list) | Still a proxy for judgment, not judgment — the same class of problem as keyword matching, only harder to reason about and more brittle to legitimate variation in how projects write their own documentation. |

## Consequences

**Positive**:
- The deterministic layer stays genuinely deterministic and fast — no risk of a
  judgment call silently baked into a shell script that nobody reviews as carefully as
  prose.
- Coherence assessment can use real judgment (does this paragraph actually explain what
  the project does?) instead of a keyword proxy for it.
- Verified behaviorally: an empty `README.md` still satisfies `repo-readiness:readme`
  in the runner — proving no content inspection happens there — while `harny-doctor`'s
  separate reading step is where an empty file would actually be caught.

**Accepted costs**:
- Coherence assessment only happens when a human or agent actually invokes
  `harny-doctor` and reads the documents — it is not part of the fast, scriptable
  `npx harny doctor` CI-friendly path. A repo with a technically-present but vacuous
  `README.md` still reports `OK` from the runner alone.

## Follow-ups

None required by this decision alone.
