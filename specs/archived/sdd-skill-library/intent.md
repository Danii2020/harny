Shipped: 2026-09-09

# Intent: sdd-skill-library

## Problem Statement

This repo's live Claude Code pipeline is five **monolithic** agent files. Every role's
full instruction set is inlined in its own `.claude/agents/sdd-*.md`, and nothing is
shared between them:

| File | Lines | What is inlined |
|---|---|---|
| `.claude/agents/sdd-architect.md` | 255 | Exploration protocol + the whole 5-file spec schema, re-typed inline |
| `.claude/agents/sdd-auditor.md` | 144 | 7-step audit, severity ratings, verdict enum |
| `.claude/agents/sdd-test-writer.md` | 105 | Test-plan derivation, red-phase rules |
| `.claude/agents/sdd-executor.md` | 84 | Phase execution, contract-is-law, adherence rules |
| `.claude/agents/sdd-documentation.md` | 58 | Trigger check, doc-update duties, `Shipped:` stamp |

Five concrete consequences, all observable in the repo today:

1. **The pipeline's own instructions cannot be reused or composed.** A role's behavior
   is only reachable by spawning that exact subagent. There is no way for a human to
   run "just the propose step" in the main thread, and no way for a user-authored agent
   to borrow "how this project audits" without copy-pasting 144 lines. The repo already
   proves the alternative works: `.claude/skills/high-value-tests/SKILL.md` is a
   reusable rubric that `sdd-test-writer.md:27` points at instead of inlining — one
   skill, one owner, referenced by name. That pattern was applied exactly once and
   never generalized.

2. **Duplication has already produced measurable drift.** The architect inlines the
   five spec templates verbatim (`sdd-architect.md:47–243`) *and* `templates/spec-schema/`
   holds the same five templates as standalone files. `specs/canonical-role-templates/audit.md`
   AL-2/C9 documents that these two copies had already diverged (the `audit.md` template
   gained a Final Verdict section in one copy but not the other) and had to be reconciled
   by amending the contract. That is the predicted cost of duplication, already paid once.

3. **Every proposal starts from zero and can silently contradict a shipped decision.**
   The architect's Step 2 is "explore the codebase." There is no artifact that says
   *what is currently true* or *why*. The only durable record is four feature spec
   directories totalling **~5,000 lines** across 20 files, written for four different
   moments in time, each answering "what changed" rather than "what is". To learn that
   `SPEC_SCHEMA_DIR` must come from `src/engine.ts` and not be re-literalled, an
   architect today has to find `specs/cursor-kiro-copilot-generators/contract.md`
   guarantee 8 — by reading a 627-line document about three generators. This spec's own
   exploration is the proof: producing it required reading eleven files across four
   shipped features to reconstruct facts that no single document states.

4. **Design rationale is stranded inside audit logs.** The repo's most valuable
   decisions are recorded, but only as *findings*: AL-9 (no Claude-only tool name may be
   the sole mechanism named in portable content), AL-5 (a generator must make
   `spec-schema/` reachable in the target repo), AL-7 (scoped write access should be a
   structured field). Each is a durable architectural rule, and each lives in a table row
   inside one feature's `audit.md`, discoverable only by someone who already knows it
   exists. There is no ADR log.

5. **"Project conventions" has no single address.** `AGENTS.md` § "Working conventions"
   is five bullets, all about *process* (contract is law, TDD first, gates are not
   optional). It says nothing about the code: ESM with `.js` import specifiers, the
   `HarnessError` code→exit-code mapping, deterministic byte-identical output, path
   containment, the `Spec:`/`Covers:` header every test file carries, or the standing
   "add no new runtime dependency" default. Those rules are real and enforced — the
   auditor rejects violations of them — but they are only written down inside
   `specs/cli-skeleton/contract.md`. So `sdd-executor.md` and `sdd-auditor.md` each say
   "match the existing code style you observe in the codebase," i.e. *re-derive the
   conventions from scratch, separately, every run*, and they can reach different
   conclusions.

Who is affected: the maintainer (every future feature pays the re-derivation tax and
risks contradicting a shipped decision); the DevFest Quito workshop audience on
2026-09-26, for whom the live-cycle block (agenda minutes 20–45) is the centerpiece and
"thin agent + reusable skills" is a materially better teaching artifact than five
1-file monoliths; and any end user of harny who wants to extend the pipeline with their
own role and today has no documented shape to copy.

## Goals

1. **G1 — Extract every pipeline role's instructions into action-shaped skills; leave
   the agent files thin.** Each `.claude/agents/sdd-*.md` becomes frontmatter plus a
   short pointer to the skill(s) it invokes. Skills are named for the *action*
   (`harny-propose`, `harny-test`, `harny-implement`, `harny-audit`, `harny-document`),
   not the role, so a human can invoke one directly and a user-authored agent can
   compose them differently. Extraction is content-preserving: no instruction is
   dropped, weakened, or invented in the move.

2. **G2 — Publish a minimal, documented shape contract for a `harny-*` skill**, so a
   user can add a sixth skill after reading one page instead of reverse-engineering
   eight. The shape must use only frontmatter keys that are part of the portable Agent
   Skills spec, so the same file works unchanged in the non-Claude harnesses that read
   the same directory.

3. **G3 — Make `.agents/skills/harny-*/SKILL.md` the single canonical home for skill
   content, bridged into `.claude/skills/` by symlink** so Claude Code — which reads
   only `.claude/skills/` — loads it today. Every path, discovery rule, frontmatter key
   and vendor limit relied on is verified against first-party documentation and recorded
   with its source and verification date, per the precedent set by
   `specs/cursor-kiro-copilot-generators/` and `specs/codex-generator/`.

4. **G4 — Ship `harny-sync`, the current-state skill, with two modes and three
   triggers.** *Lookup* reads `specs/current/_index.md` plus the relevant capability
   doc(s) and returns what is already true, so a new proposal cannot silently contradict
   a shipped decision. *Archive* moves an approved feature's `specs/<feature>/` to
   `specs/archived/<feature>/` and regenerates the affected `specs/current/` content.
   Invocable (a) on demand by a human or any agent, (b) automatically by `harny-propose`
   before drafting, (c) automatically inside `sdd-documentation`'s existing post-audit
   hand-off — **additively**, without removing any of that role's README / CHANGELOG /
   AGENTS.md duties.

5. **G5 — Ship `harny-adr`,** which writes one Architecture Decision Record per
   significant decision found in an approved feature's `contract.md` / `roadmap.md`, at
   a single pinned location with a fixed template, and registers each ADR in the index so
   it is findable without knowing which feature produced it.

6. **G6 — Ship `harny-standards`, backed by exactly one conventions document.**
   `sdd-executor` and `sdd-auditor` both load it — the executor to follow, the auditor to
   check. It is a pointer plus a short checklist, never a second copy of the rules and
   never a linter reimplementation. The document it points at must cover, at minimum, the
   coding conventions listed in problem-statement item 5, which are currently unwritten
   outside a feature contract.

7. **G7 — Define and populate the `specs/current/` capability taxonomy and its
   fast-lookup index.** The taxonomy is derived from what has actually shipped in this
   repo, not invented; the derivation is written down and justified. `_index.md` must let
   an agent decide, from **one** file read, which capability doc(s) to open next.

8. **G8 — Migrate the four shipped features into `specs/archived/` without losing a
   byte.** `canonical-role-templates`, `cli-skeleton`, `cursor-kiro-copilot-generators`,
   `codex-generator` — all 20 files, including the multi-pass audit history in
   `cli-skeleton/audit.md` (pass 2 begins at line 265) and
   `cursor-kiro-copilot-generators/audit.md` (pass-2 verdict at line 160). Truncating to
   the first verdict is a failure, and so is "cleaning up" an archived artifact's prose.

9. **G9 — Change nothing a pipeline user can observe.** The three human gates, their
   order, `sdd-conductor`'s content, and the five agents' `name:` values are untouched;
   the conductor names its subagents by `name`, so a rename would silently break
   orchestration. Running the pipeline after this feature must look identical from the
   conductor's seat.

10. **G10 — Make the knowledge base durable.** A "current truth" index that vanishes on
    `git clone` is not current truth. `specs/` and `.claude/` are both in `.gitignore`
    today (`.gitignore:1–2`), so every spec artifact this pipeline has ever produced —
    including all four audits — is untracked. This feature must state and apply a
    decision about what becomes version-controlled, rather than inheriting the default
    silently.

11. **G11 — State the divergence from `templates/` explicitly instead of creating it
    silently.** `templates/roles/sdd-documentation.md:43` mandates "archive the spec **in
    place** … Do NOT move, rename, or delete the `/specs/<feature-name>/` directory," and
    `AGENTS.md:49–50` repeats it. `harny-sync`'s archive mode moves it. Since `templates/`
    is a fixed non-goal, the live pipeline and the portable layer will disagree on this
    rule after this feature. That must be recorded as a deliberate, scoped supersession
    with a named follow-up, not discovered later as drift.

12. **G12 — Be reflexively correct.** This feature's own spec set follows the schema it
    is restructuring: contract cites intent goals, tasks cite roadmap phases, audit cites
    intent or contract. On approval, this feature's specs must be archivable by the very
    `harny-sync` archive mode it ships — the first end-to-end exercise of the new
    lifecycle.

## Success Criteria

- [ ] **SC1 (G1)** Each of the five `.claude/agents/sdd-*.md` files is reduced to
      frontmatter plus a pointer body of **≤ 25 lines**, and their combined size drops
      from 646 lines to under 200.
- [ ] **SC2 (G1)** A line-level reconciliation table proves every instruction in each
      pre-change agent file is present in exactly one `harny-*` skill, or is listed as a
      deliberate, justified drop. Zero instructions are unaccounted for.
- [ ] **SC3 (G1, G2)** Eight skills exist and each satisfies the shape contract:
      `harny-propose`, `harny-test`, `harny-implement`, `harny-audit`, `harny-document`,
      `harny-sync`, `harny-adr`, `harny-standards`.
- [ ] **SC4 (G2)** Every `harny-*/SKILL.md` frontmatter uses only keys from the portable
      Agent Skills field set (`name`, `description`, `license`, `compatibility`,
      `metadata`, `allowed-tools`); no Claude-Code-only key appears in any of them. Each
      `description` is within the documented 1,536-character cap.
- [ ] **SC5 (G3)** Every skill's content file is at `.agents/skills/harny-*/SKILL.md`;
      every `.claude/skills/harny-*` is a symlink resolving to the matching
      `.agents/skills/harny-*` directory; no `harny-*` skill body exists as a regular
      file under `.claude/skills/`. `.claude/skills/sdd-conductor/` and
      `.claude/skills/high-value-tests/` are unchanged regular directories.
- [ ] **SC6 (G3)** `contract.md` carries a "Verified facts" table in which every pinned
      discovery path, frontmatter key, character limit and symlink-resolution claim
      carries a first-party source URL and the verification date `2026-09-08`.
- [ ] **SC7 (G4)** `harny-sync` documents both modes and all three triggers, and the
      trigger wiring is present in the artifacts that fire it: `harny-propose` invokes
      lookup before drafting; the `sdd-documentation` hand-off invokes archive; both are
      reachable by direct human invocation.
- [ ] **SC8 (G4)** After a `harny-sync` archive run, `specs/<feature>/` no longer exists,
      `specs/archived/<feature>/` holds all five files, and every `specs/current/`
      capability doc the feature touched names it under its contributing features with
      the ship date from its `intent.md` `Shipped:` header.
- [ ] **SC9 (G5)** Running `harny-adr` over an approved feature produces at least one ADR
      at the pinned location, conforming to the template, and the index gains a row for
      each ADR written.
- [ ] **SC10 (G6)** Exactly one document is the conventions source of truth;
      `grep` finds no second copy of its rules inside `.agents/skills/` or
      `.claude/agents/`. It covers all six conventions named in problem-statement item 5,
      and `harny-standards` is referenced by both `sdd-executor` and `sdd-auditor`.
- [ ] **SC11 (G7)** `specs/current/_index.md` exists, is under 150 lines, lists every
      capability with its path and its contributing shipped features, and includes a
      keyword→capability lookup section. `contract.md` records why this taxonomy and not
      another.
- [ ] **SC12 (G7)** Every capability doc is populated with real, cited current-truth
      statements — each carrying provenance to an archived feature's contract or audit —
      and no capability doc is a placeholder.
- [ ] **SC13 (G8)** For all 20 migrated files, the SHA-256 recorded before the move
      equals the SHA-256 after it. `specs/archived/cli-skeleton/audit.md` still contains
      `AUDIT PASS 2` and `specs/archived/cursor-kiro-copilot-generators/audit.md` still
      contains `Final Verdict — pass 2`.
- [ ] **SC14 (G9)** `.claude/skills/sdd-conductor/SKILL.md` is byte-identical to its
      pre-change state, and each agent file's `name:` value is unchanged.
      `templates/`, `src/`, `bin/` and `package.json` show no modification.
- [ ] **SC15 (G10)** A decision on version control is stated in `contract.md` and applied;
      a fresh clone of the repo either contains the knowledge base or is accompanied by a
      documented one-command bootstrap, with the choice justified.
- [ ] **SC16 (G11)** `contract.md` carries a section explicitly headed **SUPERSEDES**
      naming `templates/roles/sdd-documentation.md:43`, `AGENTS.md:49–50` and
      `specs/canonical-role-templates/contract.md` "archive in place" item 4, scoping the
      supersession to the live Claude Code pipeline only, and naming the follow-up needed
      to reconverge the portable layer.
- [ ] **SC17 (G9)** `npm run typecheck` and `npm test` pass unchanged after the feature —
      including `tests/packaging.test.ts`, which asserts `npm pack` excludes `specs/`.
- [ ] **SC18 (G12)** This feature's own five spec files satisfy the traceability rules,
      and `specs/sdd-skill-library/` is archivable by `harny-sync` on approval.

## Non-Goals

- **Any change to `templates/`.** The portable role bodies, the conductor template and
  the spec-schema scaffolds stay byte-identical. The consequence — a deliberate
  divergence on "archive in place" — is G11's subject, not a reason to reopen this.
- **Any change to the five per-tool generators or their generated output shape.**
  `src/generators/**`, the `Generator` interface, and what `npx harny init` writes into a
  target repository are all untouched. Users who scaffold a pipeline get today's
  five-monolith shape; propagating the skill library to generated pipelines is a
  follow-on feature, deliberately deferred until this one has been used in anger.
- **Rewriting `sdd-conductor`.** Its 3-gate orchestration logic, hard rules and content
  are out of scope. It stays a Claude Code Skill at `.claude/skills/sdd-conductor/`, is
  *not* renamed to `harny-*`, and is *not* moved to `.agents/skills/`.
- **OpenSpec's `specs/`-is-current + `changes/`-is-proposal split.** Explicitly rejected.
  `specs/<feature>/` keeps exactly the in-flight role it has today, and the current /
  archived split nests underneath it.
- **A new top-level `specifications/` directory.** Superseded by the nested
  `specs/{current,archived}/` layout.
- **Publishing the skills to npm consumers.** `package.json` `files` is unchanged, so
  `.agents/` and `specs/` stay out of the tarball. Nothing about `npm i harny` changes.
- **A linter, validator, or CLI subcommand for any of this.** `harny-standards` is a
  reference and a checklist. No `harny sync` / `harny adr` command is added to
  `src/cli.ts`; no new prompt, flag or exit code.
- **New runtime or dev dependencies.** `package.json` `dependencies` and
  `devDependencies` stay byte-identical, per the standing precedent
  (`tests/packaging.test.ts`).
- **Rewriting the ~92 existing `specs/<feature>/…` path citations** that will become
  stale — 44 in `tests/**`, `src/vocabulary.ts`, `src/templates.ts` and `CHANGELOG.md`,
  ~48 inside the archived artifacts themselves. Archived artifacts are a historical
  record and are not edited; the rest is handled by a documented redirect rule, not a
  92-line mechanical diff. Recorded as an accepted consequence with a named follow-up.
- **Moving or rewriting `high-value-tests`.** It stays a regular
  `.claude/skills/high-value-tests/` directory with unchanged content. Only the *way*
  `harny-test` refers to it changes (by skill name rather than by hardcoded path).
- **Backfilling ADRs for decisions older than the four shipped features**, or writing
  ADRs for anything not traceable to an approved `contract.md` / `roadmap.md`.
- **README.md and CHANGELOG.md updates.** Those are `sdd-documentation`'s automatic
  post-audit step, listed in `roadmap.md` as such, not this feature's implementation work.
- **MCP provisioning.** Unchanged standing non-goal from `plan.md` §4.

## Constraints

### Technical (verified 2026-09-08 — sources pinned in `contract.md`)

- **Claude Code reads skills only from `.claude/skills/`.** Project, personal, nested,
  enterprise, `--add-dir` and plugin locations are all `.claude/skills/`-shaped; there is
  no configurable skill path and `.agents/skills/` is not among them. This is the sole
  reason the symlink bridge exists.
- **Symlinked skill folders are officially supported.** Claude Code reads `SKILL.md` from
  the symlink target and loads the skill once even when several locations point at the
  same target — so the bridge is a documented mechanism, not a trick. This is the single
  load-bearing claim of G3 and is called out for the auditor to re-verify.
- **Only six frontmatter keys are portable.** `name`, `description`, `license`,
  `compatibility`, `metadata`, `allowed-tools` are Agent Skills spec fields;
  Claude-Code-only keys (`disable-model-invocation`, `context`, `agent`, `paths`, …)
  cause packaging/upload failures elsewhere. Since the canonical home is the tool-neutral
  `.agents/skills/`, the shape contract must forbid them.
- **`description` (plus `when_to_use`) is capped at 1,536 characters** and is what Claude
  uses to decide when to apply a skill. Skill descriptions are load-bearing, not decorative.
- **A subagent's `skills:` frontmatter preloads full skill content at startup**, which is
  the mechanism that makes a thin agent work. Two consequences bind the design: a skill
  with `disable-model-invocation: true` **cannot** be preloaded — so `harny-sync` must not
  set it, despite archive mode being destructive; and a missing or policy-disabled skill
  is **skipped with a warning**, not an error, so a broken symlink degrades a thin agent
  silently. That failure mode needs an explicit guard.
- **`synced` is a reserved skill folder name.** No `harny-*` name collides, but the shape
  contract should say so.
- **`.agents/skills/` is already this repo's own precedent for a tool-neutral skill
  directory**, and its caveat is already written down in shipped code:
  `src/generators/codex.ts:148–149` emits notes stating Codex discovers repo skills under
  `.agents/skills/` and that the directory "is not namespaced to one tool. Another agent
  tool that adopts the same convention will read this file too." The new `harny-*`
  namespace shares that directory with the `sdd-conductor` artifact a `--tools codex` run
  writes there; the names do not collide, but the coexistence must be stated.
- **`.gitignore` semantics limit how the knowledge base can be tracked.** Git cannot
  re-include a path whose *parent directory* is excluded, and `.gitignore:1–2` excludes
  `.claude/` and `specs/` as directories. Un-ignoring therefore requires converting to
  `specs/*` + explicit `!` re-inclusions (and likewise for `.claude/`), not a single
  negation line. Any proposal that assumes `!specs/current/` works on its own is wrong.
- **`specs/current` and `specs/archived` become reserved feature names.** No feature may
  be called `current` or `archived`, and anything globbing `specs/*/` for a 5-file spec
  set must now exclude them.
- **This feature's deliverable is content, not code** — Markdown, a directory layout and
  symlinks — exactly like `specs/canonical-role-templates/`, whose audit tracked
  structural verification checks rather than executable tests. Any test added must earn
  its place under `.claude/skills/high-value-tests/SKILL.md`'s rubric, and must tolerate
  running on a clone where gitignored paths are absent.
- **Toolchain unchanged:** Node ≥ 20.19.0, TypeScript 7.0.2, vitest 4.1.10, ESM.

### Compatibility

- `sdd-conductor` addresses subagents by `name` (`sdd-architect`, `sdd-test-writer`,
  `sdd-executor`, `sdd-auditor`, `sdd-documentation`). Renaming any agent breaks
  orchestration silently; skills get new names, agents do not.
- `tests/packaging.test.ts` asserts `npm pack --dry-run` excludes `specs/` entirely and
  that `dependencies`/`devDependencies` are byte-identical and git-clean. The migration
  moves files *within* `specs/`, and `.agents/` is absent from `package.json` `files`, so
  both assertions must continue to hold untouched.
- All four migration candidates are genuinely shipped and carry `Shipped:` headers
  (`canonical-role-templates` 2026-07-26, `cli-skeleton` 2026-07-30,
  `cursor-kiro-copilot-generators` 2026-08-30, `codex-generator` 2026-09-02). Header
  format is inconsistent between them (`Shipped: …` vs `**Shipped: …**`); migration
  preserves each as-is and does not normalize.
- Behavior guarantees from `specs/cli-skeleton/contract.md` (1–23),
  `specs/cursor-kiro-copilot-generators/contract.md` (1–14) and
  `specs/codex-generator/contract.md` remain in force. This spec is additive except where
  a section is explicitly headed **SUPERSEDES**.

### Business

- The DevFest Quito workshop is **2026-09-26**, eighteen days out; `plan.md` §6 gives the
  live pipeline cycle minutes 20–45 and the portability demo minutes 45–52. The
  restructure must not destabilize either, and the whole inventory must be explainable in
  the time available — which is why the shape contract (G2) matters more than the count
  of skills.
- The foundation must be genuinely extensible by an end user, not merely by its author:
  someone should be able to add a ninth `harny-*` skill from the shape contract alone.

### Contradictions found during exploration (each needs a human decision)

1. **"Archive in place" vs. archive-by-moving.** Three shipped artifacts mandate that a
   spec directory is never moved — `templates/roles/sdd-documentation.md:43`,
   `.claude/agents/sdd-documentation.md:44`, `AGENTS.md:49–50` — and a fourth,
   `specs/canonical-role-templates/contract.md` fixed-design item 4, contracts it. Two of
   the four are in scope to change; `templates/` is not. **Recommendation:** supersede for
   the live pipeline only, record it under G11/SC16, and open a follow-up to reconverge
   `templates/`.
2. **The knowledge base would be born untracked.** `.gitignore` excludes `specs/`, so
   `specs/current/_index.md` — the artifact whose entire job is to be the shared,
   durable picture of current truth — is invisible to `git`, to a fresh clone, and to
   any reviewer. `specs/canonical-role-templates/audit.md` already flagged this as an
   open recommendation and it was never resolved. **Recommendation:** un-ignore
   `specs/current/` and `specs/archived/` (and keep `.agents/` tracked, which it is by
   default), leaving in-flight `specs/<feature>/` ignored as today.
   **[Superseded 2026-09-09 — see `contract.md` § Amendment A2.** The human ultimately
   chose the other option: track **all** of `specs/`, in-flight work included. This
   recommendation is retained as the record of what was proposed at the time.]
3. **The symlink bridge is fragile precisely where it is untracked.** `.claude/` is
   gitignored, so the symlinks that make Claude Code see the skills would not survive a
   clone, while the canonical content under `.agents/` would. The result is a repo that
   looks complete and silently has no working pipeline — made worse by the verified
   "missing skill is skipped with a warning" behavior. **Recommendation:** decide
   explicitly between tracking `.claude/skills/harny-*` via nested `!` re-inclusions and
   shipping a documented one-command bootstrap; do not leave it implicit.
4. **A tool-neutral file would hardcode a Claude-only path.**
   `.claude/agents/sdd-test-writer.md:27` refers to
   `.claude/skills/high-value-tests/SKILL.md` by literal path. Moved verbatim into
   `.agents/skills/harny-test/SKILL.md`, that is the same class of portability regression
   `specs/canonical-role-templates/audit.md` AL-4 and AL-9 identified and fixed.
   **Recommendation:** refer to it by skill *name*, not path, and preload it via the
   agent's `skills:` field.
5. **`AGENTS.md` § "Working conventions" is insufficient as `harny-standards`' target
   as it stands.** It contains no coding conventions at all. Either it is extended, or a
   second document is introduced — and introducing a second one contradicts `AGENTS.md:3–4`,
   which declares itself "the source of truth for how this repo works." **Recommendation:**
   extend `AGENTS.md` rather than add a rival; it is also the only candidate that is both
   git-tracked and shipped in the npm tarball, whereas anything under `specs/` is neither.

## Prior Art

**In this codebase**

- `.claude/skills/high-value-tests/SKILL.md` — the existing proof that a reusable,
  named skill beats an inlined rubric, and the model for a skill that is *referenced* by
  a role rather than owned by it. Its frontmatter (`name`, `description`,
  `metadata.author`, `metadata.version`) is the starting point for the shape contract.
- `.claude/skills/sdd-conductor/SKILL.md` — the repo's other live skill, and the
  deliberate exception: orchestration must run in the main thread to pause at gates, so
  it stays where it is and keeps its name.
- `specs/canonical-role-templates/` — the closest structural analog: a content-only
  feature whose audit tracked structural verification checks instead of executable tests,
  and whose findings AL-2 (duplicate copies drift), AL-4 and AL-9 (a tool-specific name
  must never be the only mechanism named in portable content) and AL-5 (a reference must
  still resolve after deployment) are directly load-bearing here.
- `specs/codex-generator/` and `specs/cursor-kiro-copilot-generators/` — the precedent
  for a "Verified facts" table with per-row first-party sources and a verification date,
  plus a discrepancy table where verification contradicts a planning document. G3/SC6
  adopt both.
- `specs/cli-skeleton/` — origin of the coding conventions that `harny-standards` must
  surface (determinism, containment, `HarnessError` exit-code mapping, single trailing
  newline, no-new-dependency).
- `src/generators/codex.ts:148–149` — this repo's own shipped statement that
  `.agents/skills/` is a shared, tool-neutral skill directory, with its caveats already
  written for users. G3 generalizes a position the repo has already taken.
- `templates/roles/*.md` § "Role Metadata" — the existing precedent for a minimal,
  declarative, tool-agnostic header schema that different consumers can parse. The
  `harny-*` shape contract (G2) is the same idea applied to skills.
- `plan.md` §2 and §6 — the workshop framing and the 60-minute agenda that constrain how
  large the inventory may grow.

**External** (all consulted 2026-09-08; full citations in `contract.md`)

- Claude Code Agent Skills documentation — skill discovery locations, symlinked skill
  folders, the frontmatter field table, the 1,536-character `description` cap, the
  `synced` reserved name, and which fields are portable Agent Skills spec fields versus
  Claude-Code-only.
- Claude Code subagents documentation — the `skills:` preload field, its interaction
  with `disable-model-invocation`, and the skip-with-warning behavior for a missing skill.
- Fission-AI/OpenSpec — the inspiration for thin agents invoking action-shaped skills
  (`openspec-propose`, `openspec-sync-specs`, …) and for a sync skill that maintains a
  picture of current state. Adopted: action-shaped naming, one skill per action, a sync
  step that merges rather than overwrites, and explicit guardrails per skill. **Rejected:
  its `specs/`-is-current + `changes/`-is-proposal directory model** — this repo keeps
  `specs/<feature>/` as in-flight work and nests `current/` and `archived/` beneath it.
- Codex CLI skills documentation and GitHub Copilot agent-skills documentation — the
  evidence that `.agents/skills/` is an emerging cross-harness convention rather than a
  harny invention, and therefore worth adopting as canonical even though today's only
  consumer needs a symlink to reach it.
