Shipped: 2026-09-15

# Intent: AI/SDLC Readiness Check

## Problem Statement

`harny-doctor` today answers exactly one question: *"is the harny harness installed
and coherent in this repo?"* Its four check families — environment, harness-file
manifest, spec state, test suite (`specs/current/readiness-checks.md` RD-1, shipped by
the `readiness-doctor` feature on 2026-09-14, commit `93599a6`) — all measure **harny's
own artifacts**: `.sdd/harness.json`, the spec-schema templates, the feedback runner,
the CI workflow, each generator's conductor artifact, the core skills, and `specs/`
internal coherence.

That leaves a second, unasked question, and it is the one that actually predicts
whether an agent will do good work: *"does this repository carry the baseline
documentation an AI coding agent needs to work here safely?"* A repo can be perfectly
scaffolded by `npx harny init` — every existing check green — and still be a place
where an agent has no idea what the project is for, what its components are, or how to
verify its own work. The agent then does what agents do with no ground truth: it
infers, and its inferences silently become the spec.

The people affected are (a) the human who is about to point harny's pipeline at a
repository for the first time and has no cheap way to know whether that repo is ready
for it, and (b) every downstream role — `sdd-architect` most of all, whose
`harny-propose` Step 2 exploration is explicitly instructed to derive conventions from
`CLAUDE.md`/`AGENTS.md` and to *"never assume a stack, package manager, or architecture
that hasn't been observed"*. When those documents are absent or thin, that instruction
degrades into guesswork, and no existing control notices.

One partial exception already exists and is the seed of this feature: the
`conventions-doc` entry in `buildDoctorChecks` (`src/doctor.ts:89–94`) already asserts
— **as a blocking check** — that `AGENTS.md` or `CLAUDE.md` exists. It is the only
repo-level, non-`.sdd/` check in the whole manifest, and it checks presence only: never
whether the document actually says anything an agent can use, and never the other
documents an agent depends on.

Source of the request, verbatim from `plan.md:151` ("Ideas I just had for next steps
in harny"):

> expand harny-doctor skill to check for relevant documentation and delegate the
> documenter if this is not ready for AI/sdd, a sdd/ai sdlc readiness check.

### This feature extends readiness-doctor; it does not parallel it

Confirmed by reading `specs/archived/readiness-doctor/{intent,contract,roadmap,audit}.md`,
`specs/current/readiness-checks.md`, `templates/doctor/run-doctor.mjs` and
`templates/shared/probes.mjs`: the readiness machinery already exists and is the right
host for this work. Everything below is an extension of it —
`DoctorCheck`/`DoctorChecksFile`, `buildDoctorChecks`, the check-family model, the
`ToolProbe` gate, the single shared `probeSatisfied` evaluator, the `ok`/`skip`
reporting vocabulary, and the `--checks`-as-data rule. **No second runner, no second
reporting model, no second probe implementation, and no new CLI verb is introduced.**

The related `plan.md:150` idea — *"add a kind of init.sh or sh script that will help us
verify the readiness of the project by running the tests, the documentation files
(agents.md) and the specs"* — **is already implemented**, via a different mechanism
than a literal `init.sh`. `readiness-doctor` shipped `npx harny doctor` and
`.sdd/doctor/run-doctor.mjs`, which run the tests (family 4), check the documentation
(`conventions-doc`), and check the specs (family 3). Confirmed by search: no
`init.sh`-like script exists at the repo root, in `bin/`, or in `templates/` — the only
`.sh` file in the repo is `scratch-smoke-test.sh`, a scratch artifact. This feature
therefore treats that idea as **done, not as a prerequisite**, and adds no shell script;
it deepens the documentation dimension of the runner that already replaced it.

## Goals

1. **G1 — Add a fifth check family, `repo-readiness`, to the existing runner.** A
   family that asks whether the *target repository* is legible to an AI agent —
   distinct from the harness-manifest family, which asks whether *harny's own
   artifacts* are installed. Two different questions deserve two labelled sections of
   one report, not one blurred list. The family is data-driven from `--checks` exactly
   like the four before it.
2. **G2 — Introduce two priority tiers: must-have and recommended.** A **must-have**
   item that is absent **fails** the check and makes the repo report as not ready for
   SDD work. A **recommended** item that is absent **warns**: named in the report with
   its remediation, but never turning a green run red. This requires one new outcome,
   `warn`, so the report can say *"evaluated, and found lacking"* without abusing
   `skip`, whose shipped meaning is *"could not be evaluated"* and which is explicitly
   never a pass (`templates/doctor/README.md` behavior 4).
3. **G3 — Give `harny-doctor` a coherence-assessment step the runner cannot have.**
   Presence is computational and belongs in the runner. *Coherence* — does this
   document actually state the project's **purpose**, its **components**, and the
   **commands that validate a change** — is judgement and belongs in the skill's
   reading procedure, where a model reads the file. Fix the division of labour
   explicitly so neither layer drifts into the other's job, and so no keyword-grep
   masquerades as a deterministic check.
4. **G4 — Close the loop by handing gaps to `harny-document`, after asking the
   human.** When the check finds a document missing or incoherent, `harny-doctor`
   reports the specific file and the specific gap, then **asks** whether to delegate
   drafting to `harny-document`. It never invokes it unprompted — the same
   never-self-approve discipline the three pipeline gates already enforce, and the
   only reading under which `harny-doctor`'s existing guardrail *"Never fix what it
   finds"* survives intact.
5. **G5 — Teach `harny-document` a bounded bootstrap entry point.** `harny-document`
   today refuses to run without an approved `audit.md` for a named feature. A repo with
   no harny spec history has neither. Give it one additional, explicitly-scoped
   invocation path — draft a named repo-level guidance document from observed repo
   evidence — without weakening its "document only what was verified" discipline.
6. **G6 — Keep every per-tool fact derived, never re-literalled.** Which root
   instruction file each of the five target tools reads is a per-tool fact, and this
   repo has exactly one place per-tool facts live: the `Generator` adapter
   (`specs/current/tool-generators.md` TG-6). The family reads that, and never carries
   its own copy of a tool list.
7. **G7 — Do not repeat RD-R1's mistake.** RD-R1 is an open reservation recording that
   `run-doctor.mjs` hard-codes the schema file names `intent.md` and `audit.md` instead
   of receiving them from `--checks`. Every value the new family needs — accepted
   paths, tier, remediation string, family label — arrives as data in `--checks`, and
   the `DoctorChecksFile` model gains the fields to carry it. No document name, tool
   id, or path literal is added to the runner.

## Success Criteria

- [ ] **SC1** — The readiness report groups repo-readiness findings under their own
      family, printed after the harness-manifest family and before the spec-state
      family, with the same fixed order on every run.
- [ ] **SC2** — `npx harny doctor` on a repository with no `README.md` reports that
      finding by name with its remediation and exits `6` (`NOT_READY`) — a must-have
      gap makes the repo not ready.
- [ ] **SC3** — `npx harny doctor` on a repository that has `README.md` and `AGENTS.md`
      but no architecture document reports a `WARN` line naming its remediation and
      still exits `0`.
- [ ] **SC4** — The summary line reports four counts (ok / skipped / warned / failed),
      and a `WARN` line is textually distinct from both a `SKIP` and a `FAIL`.
- [ ] **SC5** — A missing conventions document (`AGENTS.md`/`CLAUDE.md`) still fails
      the run and still exits `6`, with its existing check id and behavior unchanged.
- [ ] **SC6** — For a repo whose `.sdd/harness.json` selects `claude-code`, the checks
      data contains a recommended entry satisfied by either `CLAUDE.md` or `AGENTS.md`;
      for one selecting `github-copilot`, by either `.github/copilot-instructions.md`
      or `AGENTS.md`; for one selecting `kiro`, by either `.kiro/steering` or
      `AGENTS.md`; for `cursor` or `codex`, by `AGENTS.md`, which both read natively.
- [ ] **SC7** — No tool id, instruction-file path, or tool count appears as a literal
      in `src/doctor.ts`; every one is read off the resolved `Generator` instances.
- [ ] **SC8** — No document name, accepted path, tier value, or family label appears as
      a literal in `templates/doctor/run-doctor.mjs`; every one arrives via `--checks`.
- [ ] **SC9** — A `checks.json` generated before this feature still produces its exact
      pre-feature outcomes under the new runner (an entry with no tier is must-have).
- [ ] **SC10** — Running the readiness check on harny's own repository, in its current
      state, produces zero new failures and zero new warnings — the repo is its own
      worked example of "ready".
- [ ] **SC11** — `.claude/skills/harny-doctor/SKILL.md` documents the coherence
      assessment (purpose / components / validation commands), which gaps are
      must-have and which are recommended, and the human-asked `harny-document`
      hand-off; its existing guardrail "Never fix what it finds" survives verbatim.
- [ ] **SC12** — `.claude/skills/harny-document/SKILL.md` documents the bootstrap entry
      point, its precondition, its refusals, and that its output is marked as a draft
      for human review.
- [ ] **SC13** — Both edited skill files are byte-identical to their
      `templates/skills/` counterparts (`FC-11`), and `templates/doctor/run-doctor.mjs`
      is byte-identical to the scaffolded `.sdd/doctor/run-doctor.mjs` (`BG-11`).
- [ ] **SC14** — `templates/doctor/README.md`'s numbered behavior list states the five
      families, the two tiers, and the `warn` outcome as behavior, tool-neutrally
      (`S7`), before any implementation detail.
- [ ] **SC15** — The readiness check still writes nothing, on any outcome — including a
      failed repo-readiness outcome (`RD-6`, `SC19` lineage).

## Non-Goals

- **No scoring.** No 0–100 score, no Level 0–3 maturity model, no weighted category
  totals, no percentage. An item is `ok`, `skip`, `warn`, or `fail`; a tier is
  must-have or recommended; nothing is aggregated into a number beyond the four counts
  on the summary line.
- **No third tier and no per-item weighting.** Exactly two tiers.
- **No large enumerated checklist.** The reference material that inspired this feature
  carries 28 enumerated items across four categories plus an 8-item asset taxonomy.
  This feature ships three repo-readiness entries and three coherence elements. Growing
  the list is a future feature's decision, made against evidence.
- **No Present/Partial/Absent/N-A status vocabulary.** The runner already has an outcome
  vocabulary; this feature adds exactly one member to it.
- **No connectors, no delivery, no tenancy, no branding.** No Azure DevOps or GitHub API
  integration, no email or report delivery, no multi-repository or multi-tenant concept.
  The check runs locally against `cwd` and prints to stdout.
- **No content matching in the runner.** The runner never greps a document for keywords
  or headings to judge its quality. Presence is computational; coherence is judgement
  and lives one layer up (G3). A keyword matcher would be easy to satisfy and hard to
  trust.
- **No new CLI verb and no new CLI flag.** `npx harny doctor` gains behavior, not
  surface area.
- **No auto-fix and no unprompted delegation.** Neither the runner nor `harny-doctor`
  writes a file; drafting is reached only through a hand-off the human approves (G4).
- **No second runner, probe evaluator, or reporting model.** `RD-3` holds: exactly one
  `probeSatisfied`, at `templates/shared/probes.mjs`. No probe kind is added.
- **Not closing RD-R2.** `DoctorResult.skipped`/`.failed` are structurally never
  populated because `stdio: 'inherit'` gives the parent no channel to observe per-check
  outcomes. This feature adds no `warned` field that would inherit the same defect, and
  does not attempt the output-capture rework that would fix it. RD-R2 stays open and is
  explicitly out of scope.
- **Not closing RD-R1.** G7 forbids *widening* that deviation; actually removing the two
  existing hard-coded schema file names from the runner is a separate concern this
  feature does not take on.
- **Not an `init.sh`.** See § Problem Statement: already satisfied by the shipped
  `doctor` verb.
- **No new conventions document concept.** A target repo does not need a conventions doc
  separate from the one `harny-standards` already points at; see § Constraints.

## Constraints

- **Amends two shipped current-truth statements — declared, not silent.** `harny-sync`
  lookup returned `specs/current/readiness-checks.md`. Two of its statements change, and
  `contract.md` restates both as first-class guarantees so archive mode carries the
  amendment into the capability doc rather than leaving contradictions on disk:
  - **RD-1 and invariant I3** fix *four* check families in a fixed order. The amended
    form is **five** families, in the fixed order environment → harness manifest →
    **repo readiness** → spec state → tests. The determinism the ordering exists to
    provide is unchanged; the justification for a fifth family rather than more entries
    in family 2 is that "is harny installed" and "is this repo legible to an agent" are
    different questions whose findings must not be read as one list.
  - **Invariant I2** reads *"Ready means all checks passed or were skipped with
    notices; not ready means at least one check failed."* The amended form is **ready
    means every check is `ok`, `skip`, or `warn`; not ready means at least one check is
    `fail`.** The determinism half of I2 is unchanged and must stay true.
- **A must-have gap is a red run.** This is a deliberate behavior change with real
  consequences: a repository that is green today and has no `README.md` will be red
  after this feature. That is the intent — the human's instruction is that a missing
  must-have item means the repo is not ready for SDD work — and it must be stated in the
  changelog and the README, not discovered.
- **The conventions-document check stays exactly where it is.** `conventions-doc`
  already enforces `AGENTS.md`/`CLAUDE.md` as blocking in family 2. It is deliberately
  **not** moved into the new family: moving it would mean a repo with a stale committed
  `.sdd/doctor/run-doctor.mjs` (one that does not know the new family) would silently
  stop enforcing the single most important must-have. Its id, position, and outcome are
  untouched; the new family does not duplicate it.
- **RD-6 is untouched.** The readiness check writes nothing, ever, on any outcome; the
  not-ready exit code stays `6` at the verb and `2` at the runner, distinct from all CLI
  error codes (`BG-6`).
- **RD-7 must continue to hold.** `npx harny doctor` and a direct
  `node .sdd/doctor/run-doctor.mjs` must still evaluate the same checks and reach the
  same ready/not-ready conclusion, from one `buildDoctorChecks` implementation.
- **`BG-3`/`BG-11` hold.** The runner stays byte-identical across every scaffolded repo
  and hard-codes nothing that belongs in `--checks` (G7).
- **`BG-17`/`CLI-4` hold.** `buildDoctorChecks` stays pure: identical config and
  generators produce a byte-identical `checks.json`.
- **Backward compatibility of the checks data.** A `checks.json` generated before this
  feature must still run correctly against the new runner: an entry with no tier is
  must-have, and an absent repo-readiness section simply contributes no lines.
- **Coding standards S1–S7 apply** (`AGENTS.md` § "Coding standards"): TypeScript/ESM
  with `.js` specifiers and `node:` prefixes (S1); `HarnessError` as the only
  deliberate error (S2); determinism, path containment, single trailing newline (S3);
  **no new runtime or dev dependency** (S4) — none is needed; shared constants imported
  from their owning module, never re-literalled (S5) — what SC7 enforces; vitest tests
  mirroring `src/`, with `Spec:`/`Covers:` headers and no contract id in a test name
  (S6); and no single tool's mechanic named as the only possibility in tool-neutral
  content (S7) — which governs how `templates/doctor/README.md` describes the per-tool
  instruction files.
- **Skill parity is mandatory** (`FC-11`): a change to `.claude/skills/<id>/SKILL.md`
  lands identically in `templates/skills/<id>/SKILL.md` in the same change.
- **Skill frontmatter stays within the six permitted keys** (`SL-3`) and the
  description cap (`SL-4`) — both edited skills' `description` fields grow.
- **`harny-standards` owns coding conventions; this check does not.** The target repo
  needs no second conventions document: the one `harny-standards` already points at
  (`AGENTS.md`, `CLAUDE.md`, or the project's equivalent) is the one this check
  asserts the presence and coherence of. `harny-doctor` names `harny-standards` as the
  owner of `S1`–`S7`-style compliance rather than re-judging it.
- **`harny-adr` is not extended.** It writes ADRs into `specs/archived/<feature>/
  decisions/` for a feature that shipped; a target repo with no harny spec history has
  no such directory. That is precisely why the architecture item accepts a plain
  `ARCHITECTURE.md`/`AGENTS.md` and does not require ADR history.

## Prior Art

**In this codebase:**

- `specs/archived/readiness-doctor/` (all five files) — the feature this one extends.
  Its `BG-1` (families in fixed order), `BG-2` (no check aborts the run), `BG-3`
  (nothing hard-coded in the runner), `BG-9` (probe-false is a skip, never a failure),
  `BG-11` (byte-identical runner) and `BG-17` (pure `buildDoctorChecks`) are the
  guarantees this feature must preserve while adding to.
- `src/doctor.ts:89–94` — the `conventions-doc` entry: the existing, single repo-level
  document check, and the model the new entries follow.
- `src/doctor.ts:130–150` — the `conductor:` and `core-skills:` loops: the established
  pattern for deriving check entries per resolved `Generator` rather than from a
  hard-coded tool list. G6/SC7 reuse it verbatim.
- `src/doctor.ts:74` (`HARNESS_GATE`) and **ADR 0020** (`.sdd/harness.json`-gated
  scaffold-artifact checks) — the established way to make a check inert in a repo harny
  never scaffolded, instead of penalising it.
- `src/generators/types.ts` — `skillsDir` (**ADR 0011**) and `hooksPath` are declarative
  per-generator members holding a per-tool path fact; `renderHook` (**ADR 0014**) is a
  method because it renders structure. The new guidance-path member is a path fact, so
  it follows `skillsDir`, not `renderHook`.
- `templates/doctor/README.md` behavior items 3 and 4 — the existing argument for why a
  skip is a notice and never a pass. The `warn` outcome is the missing third case that
  argument implies but does not currently have.
- `.claude/skills/harny-standards/SKILL.md` — the "pointer plus checklist, never a
  second copy" shape and its portability guardrail. `harny-doctor`'s new coherence step
  must read the same way.
- `.claude/skills/harny-document/SKILL.md` step 2.2/2.3 — already bootstraps a minimal
  `CHANGELOG.md` and `ARCHITECTURE.md`/`AGENTS.md` when neither exists. G5 generalises a
  clause that is already there rather than inventing a new behavior.
- The three pipeline gates (`AGENTS.md` § "The live pipeline") — the never-self-approve
  pattern G4 reuses for the delegation hand-off.

**External:**

- Martin Fowler, *Harness Engineering* (`plan.md:149`; `AGENTS.md` § "Feedforward vs.
  feedback") — readiness is feedforward: it runs before work starts, never per turn and
  never per PR.
- The `AGENTS.md` cross-tool convention, verified 2026-09-14 for the two tools whose
  native root file it is: Cursor's CLI reads `AGENTS.md` (and `CLAUDE.md`) at the
  project root alongside `.cursor/rules`; Codex CLI loads `AGENTS.md` from global,
  project-root and current-directory layers. Kiro reads `.kiro/steering/` and also
  supports `AGENTS.md`; GitHub Copilot reads `.github/copilot-instructions.md`. These
  facts carry the same re-verification caveat as open reservations `AL-30` and
  `CG-1`/`O4` already on record; `contract.md` records them and bounds their blast
  radius.
- A "Project AI-Readiness Advisor" system prompt supplied by the human as inspiration
  only. Its harvestable idea is the *categories of evidence* worth checking — entry
  conditions, maintainability, architecture fitness. Everything structural about it
  (enumerated 28-item checklist, numeric scoring, maturity levels, connectors,
  delivery, tenancy, branding) is listed under § Non-Goals and deliberately not carried
  over.
