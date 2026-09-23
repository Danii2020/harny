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
  off — invoked by the `sdd-documentation` role, or directly by a human. Also reachable
  in a bounded bootstrap mode — invoked by harny-doctor after a human go-ahead, or
  directly by a human — for a named repo-level document with no feature and no
  audit.md in play; drafts only the named document(s) from repository evidence, marks
  each as a draft for human review, and never touches source, specs/, CHANGELOG.md, or
  the harny-sync/harny-adr hand-off.
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
- **Bootstrap mode**: invoked by `harny-doctor` after a human go-ahead, or directly by
  a human, when a repository has no approved `audit.md` for a named feature at all —
  see § Bootstrap mode below. This is a separate, explicitly-bounded entry point from
  the post-audit path above; the two never reach each other.

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
4. **Verify before reporting completion.** Report this hand-off as complete only after
   confirming, via the spec-state family of the readiness runner shipped at
   `.sdd/doctor/run-doctor.mjs` — invoked, for example, as
   `node .sdd/doctor/run-doctor.mjs --only spec-state` — that this feature no longer
   appears as shipped-but-unarchived. A failing line for a different feature is
   reported as a finding, never silently ignored and never fixed in passing — that
   other feature's archive is not this invocation's business. Describing the archive
   step, or handing it back as a "next step", is not completing it.
5. **Present a change summary.** After making the updates, present a concise summary of
   exactly what changed (which files, which sections, which capability docs, which
   ADRs) for optional human review. This review is optional and does not block
   anything — the pipeline is complete once this skill finishes.

## Bootstrap mode

A second, explicitly-bounded entry point beside the post-audit path above, for a
repository with no harny spec history at all — no `specs/<feature-name>/`, no
`audit.md`, nothing for the post-audit precondition to check.

- **Trigger.** Invoked by `harny-doctor` after a human go-ahead — it names the
  specific document(s) missing or incoherent and asks before delegating — or directly
  by a human who wants a repo-level document drafted from scratch.
- **Inputs.** The named document(s) to draft (`README.md`, `AGENTS.md`, and/or
  `ARCHITECTURE.md`), the missing coherence element(s) (purpose / components /
  validation) if the caller is `harny-doctor`, and the repository itself as evidence —
  read the actual code, config, and existing docs; never invent what was not
  observed.
- **Output.** Drafts only the named document(s), and marks every draft it produces in
  this mode for human review — this is bootstrap output, not an audit-verified
  record, and must never be mistaken for one.
- **Refusals.** Bootstrap mode never touches source code, never writes or reads a
  `specs/` path, never touches `CHANGELOG.md` (there is no shipped change to log),
  and never invokes or is invoked by the `harny-sync`/`harny-adr` archive hand-off. A
  bootstrap-mode invocation naming a `specs/<feature>/` target refuses and reports why
  — bootstrap mode can never be used to bypass the post-audit gate.
- **Unreachable from, and unreached by, the post-audit path.** The post-audit path's
  `APPROVED`/`APPROVED WITH RESERVATIONS` precondition, its `REJECTED` refusal, its
  `Shipped:` stamp, and its `harny-sync` → `harny-adr` → `harny-sync` chain are
  entirely unchanged by bootstrap mode's existence, and bootstrap mode cannot reach
  any step of that chain.

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
- **Bootstrap mode is bounded and never a shortcut.** It drafts only the named
  repo-level document(s), marks them as drafts, and refuses source, any `specs/`
  path, `CHANGELOG.md`, and the `harny-sync`/`harny-adr` hand-off — it is not a way to
  ship or archive a feature without an audit.
- **Never commit or push.** Do not run `git commit`, `git push`, or any equivalent that
  records or publishes history — not for the documentation changes this skill just made,
  not for the `Shipped:` stamp, not for the `harny-sync` archive move, and never with a
  verification-skipping flag such as `--no-verify`. Leave every change in the working
  tree, staged or unstaged, exactly as this skill left it, and list the changed files in
  the step 4 change summary; deciding what gets committed, and when, is the human's
  call, including after the pipeline has finished. (`harny-sync`'s own `git mv` during
  the archive move is a move, not a commit, and stays allowed.)
