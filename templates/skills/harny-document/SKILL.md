---
name: harny-document
description: >-
  Runs as the final step in the SDD workflow, automatically after a human approves
  harny-audit's final verdict (APPROVED or APPROVED WITH RESERVATIONS) — never on
  REJECTED. Updates README.md, CHANGELOG.md, and ARCHITECTURE.md/AGENTS.md to reflect
  exactly what the audit verified, stamps the feature's intent.md with a
  "Shipped: <date>" header in place, then hands off to harny-sync (archive mode) and
  harny-adr. Documents only auditor-verified behavior and never touches source code or
  code comments. Use this after a feature's audit is approved and the human has signed
  off — invoked by the `sdd-documentation` role, or directly by a human.
license: MIT
compatibility: >-
  Requires the feature's full `specs/<feature-name>/` directory with a Final Verdict in
  `audit.md`, and, for the hand-off, `harny-sync` and `harny-adr` skills in the same
  skill set.
allowed-tools: Read, Write, Edit, Glob, Bash
metadata:
  author: daniel
  version: "1.0"
  harny-role: sdd-documentation
  harny-writes: README.md, CHANGELOG.md, AGENTS.md, specs/<feature>/intent.md header
---

# harny-document

You are acting as a technical writer specializing in Specification-Driven Development
(SDD) documentation. Your job is to record, faithfully and only, what an approved
implementation actually did — not to design, verify, or embellish it.

## When to use this

- Runs automatically right after a human approves `harny-audit`'s final report — an
  automatic hand-off, like `harny-implement` → `harny-audit`, not a new blocking gate.
- Invocable directly by a human who wants to document an already-approved feature.

## Inputs

Read exactly these three inputs — nothing else counts as ground truth for this skill:
1. The feature's 5 spec files in `/specs/<feature-name>/` (`intent.md`, `contract.md`,
   `roadmap.md`, `tasks.md`, `audit.md`).
2. `audit.md`'s final verdict and its Requirements/Contract Compliance/Test Coverage
   tables.
3. The actual diff of files changed during implementation (from the roadmap's File
   Change Map and the real repository diff) — verify against the real diff, not just
   what the roadmap predicted.

## Steps

1. **Confirm the trigger condition.** Read `/specs/<feature-name>/audit.md`'s Final
   Verdict section. If the verdict is **APPROVED** or **APPROVED WITH RESERVATIONS**,
   proceed. If the verdict is **REJECTED**, stop — do not run, do not touch any files.
   Report that documentation was skipped because the feature was not approved.
2. **Update documentation:**
   1. **`README.md`** — update the relevant section(s) to describe the shipped feature
      as it actually behaves (per the audit-verified contract), in the style and
      structure this README already uses.
   2. **`CHANGELOG.md`** — add an entry in **Keep a Changelog** style (an
      `## [Unreleased]` or dated section, categorized under `Added` / `Changed` /
      `Fixed` / etc. as appropriate).
   3. **`ARCHITECTURE.md` or `AGENTS.md`** — update the relevant section to reflect the
      new/changed architecture. If neither exists yet, bootstrap minimal starting
      versions (a standard Keep a Changelog header and an `[Unreleased]` section for
      the changelog; a short top-level structure overview for the architecture doc)
      and then add this feature's entry/section to the new file.
   4. **Stamp the spec, in place, first.** Add a `Shipped: <date>` header to the top of
      that feature's `intent.md`. This stamp always happens **in place**, before
      anything moves.
3. **Hand off to the knowledge-base skills, in this order** (the `Shipped:` stamp must
   already exist on disk before step 3.2, because it moves the directory the stamp was
   just written into):
   1. Run **`harny-sync` in archive mode** on this feature. It moves
      `specs/<feature-name>/` to `specs/archived/<feature-name>/` and re-verifies
      checksums.
   2. Run **`harny-adr`** to write any ADRs the approved feature's `contract.md` /
      `roadmap.md` earns, into `specs/archived/<feature-name>/decisions/`.
   3. Run **`harny-sync`** again to update the affected `specs/current/` capability
      docs and regenerate `_index.md` — creating them from `harny-sync`'s bundled
      template if this is the first feature ever archived in this project, rather
      than assuming any prior history exists.
4. **Present a change summary.** After making the updates, present a concise summary of
   exactly what changed (which files, which sections, which capability docs, which
   ADRs) for optional human review. This review is optional and does not block
   anything — the pipeline is complete once this skill finishes.

## Guardrails

- **Document only what the auditor actually verified.** Never invent, embellish, or
  "improve" the description of the implementation. If the audit found partial or
  reserved compliance, say so — do not round up to a clean success story.
- **Never touch inline code comments or docstrings.** That is `harny-implement`'s job,
  not this skill's. This skill only writes to project-level docs (README, CHANGELOG,
  ARCHITECTURE/AGENTS), the spec's own `intent.md` header, and hands off the archive
  move to `harny-sync`.
- **No scope creep.** Do not document features, behaviors, or plans that are not in the
  approved spec and verified audit.
- **The `Shipped:` stamp always precedes the move.** Never invoke `harny-sync` archive
  mode before the stamp is written — the archive step operates on the stamped
  directory.
