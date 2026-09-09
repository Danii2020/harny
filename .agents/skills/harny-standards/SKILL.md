---
name: harny-standards
description: >-
  Points the caller at this project's coding-conventions document and hands back a
  short per-role checklist. Use before marking an implementation task done (as the
  executor) or before signing off on one (as the auditor), so both roles check the same
  seven standards against the same single source of truth instead of re-deriving
  conventions from the codebase separately and risking disagreement. Also usable
  directly by a human who wants a quick reminder of what this repo's code-level
  conventions are and where they are written down.
license: MIT
compatibility: >-
  Requires this project's conventions document to exist and be readable — in this repo,
  `AGENTS.md` § "Coding standards".
metadata:
  author: daniel
  version: "1.0"
  harny-role: shared
  harny-writes: none
---

# harny-standards

This skill is a pointer plus a checklist, never a second copy of the rules. It exists so
`sdd-executor` and `sdd-auditor` check the same seven coding standards against the same
single document, instead of each re-deriving "match the existing code style" from
scratch and reaching different conclusions.

## When to use this

- Invoked by `harny-implement` (the executor) before marking any task done.
- Invoked by `harny-audit` (the auditor) as a compliance step under its existing
  severity ratings.
- Invocable directly by a human, or any other role, that wants the checklist without
  reading the full conventions document.

## Inputs

- **Required**: this project's conventions document — `AGENTS.md`, `CLAUDE.md`, or the
  project's equivalent. In this repo, the concrete answer is `AGENTS.md`
  § "Coding standards" (S1–S7).

## Steps

1. Locate this project's conventions document. In this repo that is `AGENTS.md`; on a
   different project it may be `CLAUDE.md` or an equivalent the project names as its
   source of truth for conventions. Read its coding-standards section in full.
2. Do **not** restate, summarize, or duplicate its rules here — naming the document and
   reading it live is the whole mechanism. Duplication is the drift failure this skill
   exists to prevent.
3. Apply the per-role checklist below, matching the caller's role:
   - **Executor** (`harny-implement`): before marking a task done, confirm the change
     satisfies S1 (TypeScript/ESM/`.js` specifiers/`node:` prefix), S2
     (`HarnessError`-only deliberate errors, exit-code mapping owned by one module), S3
     (determinism, path containment, single trailing newline), S4 (no new dependency
     without an explicit contract line), S5 (shared constants imported from their owning
     module, never re-literalled), and S6 (tests mirror `src/`, carry a `Spec:`/`Covers:`
     header, never put a contract id in a test name, default offline).
   - **Auditor** (`harny-audit`): check all seven (S1–S7, including S7 — no tool-specific
     mechanic named as the only possibility in tool-neutral content) and report violations
     as findings under the existing severity ratings.
4. Report back which standards were checked and any violation found, by standard id
   (`S1`–`S7`), so the caller's own audit trail can cite it.

## Guardrails

- **Never restate the rules.** If the conventions document is missing or unreadable,
  report that as a finding and fall back to observed codebase conventions, stating
  explicitly that the fallback was used — never invent or assume a rule.
- **Never fix a violation in place.** This skill (via the auditor) reports; it does not
  edit code.
- **Portability.** Always name the target as "this project's conventions document
  (`AGENTS.md`, `CLAUDE.md`, or the project's equivalent)" so a user pointing this skill
  at their own repo's conventions doc needs no edit to this file.
