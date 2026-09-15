# Intent: readiness-doctor

**Shipped: 2026-09-14**

## Problem Statement

`AGENTS.md` § "Feedforward vs. feedback" classifies every control this repo ships
into one of Fowler's four quadrants, and one cell is empty by construction:
**feedforward-computational** — a fast, deterministic check that runs *before* the
agent acts. The cell's own text names the gap: *"there is no feedforward-computational
quadrant in this repo today (a deterministic pre-check, e.g. a schema validator run
before the agent starts, would belong there if one is ever added)."*

The consequence is concrete, not theoretical. Every computational control harny ships
today (`FC-1`–`FC-21`) observes work that has **already happened**: the per-turn hook
fires at turn boundary after the agent edited files, and the CI workflow fires per PR
after the change is pushed. Nothing verifies, at the moment a session starts, that the
harness the agent is about to rely on is actually installed and coherent. Four failure
modes follow, all currently silent:

1. **A half-scaffolded harness.** `npx harny init` may have been run months ago, with
   a subset of tools, and files deleted or moved since. `SL-5`'s missing-skill STOP
   guard only catches a skill a *thinned agent declared* and failed to preload — it
   cannot see a deleted `.sdd/spec-schema/`, an absent conductor artifact, or a
   `.sdd/feedback/run-feedback.mjs` that was never committed (the exact condition
   `renderRunnerInvocation`'s `test -f` guard in `src/engine.ts:217` already
   anticipates, but only for CI, and only after the agent's work is done).
2. **An incoherent spec state.** `harny-sync` archive mode has five preconditions; a
   feature that half-satisfies them (five files present, `audit.md` approved,
   `Shipped:` stamped, never archived) sits in `specs/<feature>/` indefinitely, and
   `harny-propose`'s Step 0 lookup — bounded to `_index.md` plus ≤3 capability docs —
   is by design incapable of noticing. A new feature then gets proposed against a
   knowledge base that is quietly out of date.
3. **An unknown-red test suite.** The agent begins a feature with no evidence the
   suite was green *before* it touched anything, so the first red test it sees cannot
   be attributed. `src/feedback.ts:29–31` documents why the per-turn hook will never
   close this: `kind` is deliberately `'lint' | 'typecheck'` and *"deliberately NOT
   `test`: the test suite is already run by `harny-implement`/`harny-audit` and is far
   too slow for a per-turn hook."* Correct for a per-turn hook — and it leaves a
   full-suite run with no owner at all at session start.
4. **A missing conventions document.** A repo with no `AGENTS.md` (or equivalent)
   sends every SDD role into the "derive conventions from exploration" fallback path
   without anyone being told that is what happened.

Who is affected: (a) the agent, which starts work on unverifiable ground and spends
its first turns rediscovering breakage; (b) the human, who scaffolded a harness once
and has no cheap way to ask "is this still wired up?"; (c) every downstream repo
`npx harny init` scaffolds, which today receives a feedback surface and no
feedforward one.

This feature fills that cell with `harny-doctor`: one core skill, one generated,
dependency-free Node readiness script scaffolded into every target repo, and one new
CLI verb that runs it without the caller needing to know where it landed.

## Goals

1. **G1 — Ship `harny-doctor` as the tenth `harny-*` skill and the eighth core
   skill.** Verb-shaped per the `harny-propose`/`harny-audit`/`harny-sync` naming
   convention and rule 4 of the shape contract; satisfying `SL-1`/`SL-3`'s six
   portable frontmatter keys and five required body sections; present in both skill
   roots (`.agents/skills/` dogfood + `templates/skills/` shipped) at byte parity;
   always scaffolded, never selectable via `--skills`, exactly as `FC-9` established
   for `harny-feedback`.
2. **G2 — Ship exactly one canonical readiness script, in Node, scaffolded into every
   target repo.** Canonical source under `templates/`, copied byte-for-byte into the
   target repo at a `.sdd/`-rooted path, following `I5`'s runner-fidelity rule: no
   per-tool variant, no per-stack variant of the script itself, no transform at
   generation time. Node (`.mjs`), not Bash, and not a user-selectable choice between
   the two — the justification is recorded under Constraints.
3. **G3 — Cover four check families, and only those four.** (i) environment/runtime;
   (ii) required base harness files present; (iii) spec-state sanity across
   `specs/current/` and any in-flight `specs/<feature>/`; (iv) a full test-suite run.
   Each check reports a legible, actionable line; the script's exit code distinguishes
   "ready" from "not ready" deterministically.
4. **G4 — No new command literals anywhere.** `FC-1`'s single-canonical-source rule
   extends to the readiness commands: the test-suite command per stack lives in
   exactly one named table in `src/`, and no test command string appears as a literal
   in any template, skill body, or generated artifact. The canonical script receives
   its commands as data, the same way `run-feedback.mjs` already does.
5. **G5 — Preserve the existing conflict rule unchanged.** An existing readiness
   script at the target path is treated exactly like every other generated artifact
   under `CLI-5`: nothing is written, the run exits `CONFLICT` (3), unless `--force`
   is passed. No merge behavior, no managed block, no in-place enhancement.
6. **G6 — Keep the `harny-doctor` / `harny-feedback` boundary explicit and
   enforceable.** `harny-doctor` owns session-start and pre-spec-work readiness;
   `harny-feedback` keeps sole ownership of the per-turn lint/type-check trigger and
   the "before marking a task done" trigger. Neither skill restates the other's
   commands or severity definitions; each names the other by name for the case it does
   not own.
7. **G7 — Fill the feedforward-computational cell and correct every count this
   feature changes.** `AGENTS.md`'s quadrant table gains a real entry where it today
   says *"(none — feedforward controls here are prose/process, not computational
   checks)"*; the skill-count statements that this feature invalidates (and the ones
   already stale from `agent-feedback-controls`) are corrected in the same pass, the
   way `FC-17`/`FC-18` did.
8. **G8 — Ship a second CLI verb that runs the readiness check in the current repo.**
   `npx harny <verb>` runs the scaffolded readiness script against a target directory,
   so the check is reachable without the human knowing the generated script's path.
   It is a **second, separate command** — a sibling of `init` on the same `commander`
   program (`src/cli.ts:159–175`), never a fourteenth step bolted onto `runInit`'s
   fixed 13-step sequence (`CLI-1`). It carries its own usage-error handling, its own
   exit-code semantics for the "checked successfully, result is red" outcome (which no
   existing `HarnessErrorCode` expresses — see Constraints), and writes nothing, ever,
   so `CLI-5`'s conflict rule is not in play on this path at all.

## Success Criteria

- [ ] **SC1 (G1)** `src/vocabulary.ts` exports `CORE_SKILL_IDS` of length 8 with
      `harny-doctor` last, `OPTIONAL_SKILL_IDS` of length 2 unchanged, and `SKILL_IDS`
      of length 10; `npx harny init --skills none` still scaffolds `harny-doctor`, and
      naming it in `--skills` is a `USAGE` error.
- [ ] **SC2 (G1)** `.agents/skills/harny-doctor/SKILL.md` and
      `templates/skills/harny-doctor/SKILL.md` both exist, each declaring exactly the
      six portable frontmatter keys with a `description` under the 1,536-character cap
      (`SL-3`, `SL-4`) and the five required body sections in order; the pair has an
      entry in `tests/skills-fidelity.test.ts`'s `DIVERGENCE_TABLE` (without one, that
      test fails loudly by construction for a tenth skill).
- [ ] **SC3 (G1)** `.claude/skills/harny-doctor` exists as a relative symlink to the
      `.agents/` canonical copy, never a copy (`SL-2`), and is git-tracked under
      `SL-10`'s existing `!.claude/skills/harny-*` rule with no `.gitignore` change
      required.
- [ ] **SC4 (G2)** A single canonical `.mjs` script under `templates/` is written into
      the target repo byte-identical to its canonical source, exactly once per run
      regardless of how many tools are selected (the `CLI-8`/`BG-10` write-once rule),
      and ends in exactly one `\n` (`CLI-4`).
- [ ] **SC5 (G2)** The script runs on Node `>=20.19.0` with zero dependencies, using
      only Node builtins already demonstrated in `templates/hooks/run-feedback.mjs`
      (`node:fs`, `node:path`, `node:child_process`); `npm ls --prod` in a scaffolded
      repo shows no dependency added by this feature (`S4`).
- [ ] **SC6 (G3)** Running the script in a correctly scaffolded repo prints one line
      per check across all four families and exits `0`; running it in a repo with a
      deleted harness file prints that file's path and a remediation line, and exits
      non-zero with a distinct code from an internal/usage error.
- [ ] **SC7 (G3)** Running it against a repo whose `specs/<feature>/` is missing one
      of the five schema files, or carries a `Shipped:` stamp with an approved
      `audit.md` and was never archived, reports that feature by name — the two
      conditions `harny-propose`'s bounded Step 0 lookup structurally cannot see.
- [ ] **SC8 (G3)** A check whose tooling is absent in the target repo is **skipped
      with a notice, never failed** — the same probe-skip semantics as `I3`/`FC-8`,
      reusing the existing probe evaluation rather than a second implementation.
- [ ] **SC9 (G4)** Grepping all of `src/`, `templates/`, and `.agents/skills/` for a
      complete test-suite command string finds it only in the one canonical mapping
      module in `src/` and in generated inline data — never as a source-level literal
      (the `FC-1` grep gate, extended).
- [ ] **SC10 (G5)** With a file already present at the generated script's path and no
      `--force`, `runInit` writes **nothing at all** (not just "nothing at that path")
      and exits `3`; with `--force`, it overwrites. No test asserts any merge or
      managed-block behavior, because none exists.
- [ ] **SC11 (G6)** `harny-feedback`'s `SKILL.md` retains its two triggers verbatim
      (`harny-implement` before marking a task done; `harny-audit` verification) —
      diffable as unchanged on those lines — and `harny-doctor`'s body references
      `harny-feedback` by name for the per-turn case rather than describing it.
- [ ] **SC12 (G7)** `AGENTS.md`'s feedforward/feedback table's
      feedforward-computational cell names this feature's script; the "no
      feedforward-computational quadrant in this repo today" sentence beneath it is
      rewritten rather than left contradicting the table.
- [ ] **SC13 (G7)** Every skill-count statement in the repo agrees after this feature:
      `AGENTS.md` (currently "nine"), `README.md:49,62,183` (currently "eight" —
      already stale before this feature), `templates/skills/README.md:4` (currently
      "eight-skill" — likewise), and `README.md:135`'s "seven core skills".
- [ ] **SC14 (G7)** `tests/packaging.test.ts`'s `EXPECTED_TEMPLATE_FILES` is updated to
      the new total and still asserts the manifest is closed (`CLI-10`), with `src/`,
      `tests/`, and `specs/` excluded.
- [ ] **SC15 (G7)** This repo's own scaffolded copy of the readiness script is
      byte-identical to what `npx harny init` produces for a downstream repo — the
      `FC-13` dogfood-fidelity rule, applied to this feature's artifact.
- [ ] **SC16 (G8)** `npx harny --help` lists exactly two commands, `init` and the new
      verb, and `Usage:` still reads `harny [options] [command]` (the explicit
      `.name('harny')` requirement at `src/cli.ts:144–151`); the new verb's own
      `--help` lists its arguments and flags.
- [ ] **SC17 (G8)** Running the new verb in a correctly scaffolded repo exits `0`;
      running it where the readiness check reports a blocking finding exits with a
      code that is **distinct from** `EXIT.UNEXPECTED` (1, reserved for bugs) and from
      every existing `HarnessErrorCode` mapping (2/3/4/5/130), so "the harness is not
      ready" is never confused with "the CLI broke" (`CLI-2`).
- [ ] **SC18 (G8)** Running the new verb in a directory with no scaffolded readiness
      script is a `USAGE` error (exit 2) naming the missing path and the remediation
      (`npx harny init`) — the same disclosure posture `renderRunnerInvocation`'s
      missing-runner guard already takes in CI (`src/engine.ts:217`), never a silent
      exit 0 and never a stack trace.
- [ ] **SC19 (G8)** The new verb writes nothing under any flag combination: a test
      snapshots the target tree before and after a run (including a red run) and
      asserts byte-for-byte equality, so the one command that executes project tooling
      can never mutate the repo it is inspecting.
- [ ] **SC20 (G8)** Invoking the new verb and invoking the generated script directly
      with `node` produce the same checks and the same exit code for the same repo
      state — the CLI verb is a locator and a runner, not a second implementation of
      the checks (the `G4`/`FC-1` no-second-source rule, applied to behavior rather
      than to command strings).

## Non-Goals

- **Enhancing an existing readiness script in place.** The user's original idea
  included "enhance what's already there" when a script already exists at the target
  path. **Deliberately deferred, not dropped:** v1 applies `CLI-5` unchanged (refuse,
  exit 3, unless `--force`). A merge/managed-block mechanism — the marker-delimited
  splice `src/engine.ts:177` already demonstrates for the CI workflow — is a
  well-formed follow-on feature, and would be the first place in the CLI where an
  existing user file is *modified* rather than written or refused; that is a
  significant enough posture change to deserve its own intent, contract and gate.
- **A Bash implementation, or a user-selectable Bash/Node choice.** There is exactly
  one implementation. Rationale under Constraints.
- **Native per-tool session-start hook wiring.** Firing the readiness check
  automatically via each tool's own session-start event would require the same class
  of dated, first-party per-tool verification `FC-5` needed for five turn-completion
  events, and would inherit reservations `R1`/`R5`'s failure mode (a wrong event name
  exits 0 having checked nothing). v1 wires the trigger through the skill's own
  `## When to use this` section; automatic hook-level wiring is a follow-on.
- **Any CLI verb beyond the one `G8` adds.** No `--fix`, no `--json` report format, no
  third command. `npx harny init` scaffolds; the new verb runs. Direct `node <path>`
  invocation remains fully supported and is the form hooks, CI, and other agents use.
- **Re-running lint/type-check inside the readiness check.** The doctor confirms the
  feedback surface is *present and wired*; it does not execute the mapped
  lint/typecheck commands. This is the same verify-don't-re-run discipline `FC-12`
  fixed for `harny-audit`.
- **Moving or duplicating `harny-feedback`'s triggers.** The per-turn trigger and the
  before-marking-a-task-done trigger stay exactly where they are (`FC-9`–`FC-12`).
- **Auto-fixing anything the doctor finds.** It reports and exits; it never writes,
  archives, regenerates `_index.md`, or invokes `harny-sync` archive mode on the
  human's behalf.
- **Conductor documentation-delegation logic.** `plan.md`'s third next-step idea
  ("check for relevant documentation and delegate to `sdd-documentation` if it is not
  SDD-ready") is a separate proposal. `templates/conductor/sdd-conductor.md`'s
  doc-delegation behavior is not touched by this feature.
- **A sixth stack profile, or stack auto-detection.** The readiness mapping covers the
  two profiles `STACK_PROFILE_IDS` already declares (`typescript`, `python`) and
  inherits `FC-2`'s non-fatal escape hatch for anything else.

## Constraints

- **Implementation language is Node, fixed (binding input).** Every one of the five
  supported tools requires Node to run; `npx harny init` itself requires Node/npm;
  `package.json` already declares `"engines": { "node": ">=20.19.0" }`;
  `templates/hooks/run-feedback.mjs` is already shipped into every scaffolded project
  regardless of target stack (including `--stack python`) and shells out to that
  stack's own tools via `spawnSync`; GitHub's `ubuntu-latest` runner ships Node
  preinstalled. A second Bash implementation would duplicate `G4`/`FC-1`'s
  single-canonical-source discipline for no portability gain.
- **Only Node builtins already demonstrated in `run-feedback.mjs`.** `node:fs`,
  `node:path`, `node:child_process`. No API newer than the declared engines floor, and
  no dependency — `S4` requires an explicit `contract.md` line for any addition, and
  this feature adds none.
- **`CLI-1`'s sequence does not grow a fourteenth step.** This feature's artifacts join
  the existing render step (step 11), exactly as `agent-feedback-controls` did at
  `src/init.ts:225–238`. `G8`'s verb is a sibling command that never enters `runInit`
  at all, so `CLI-1` remains a statement about `init` and stays true verbatim.
- **The second verb must not weaken `init`'s guarantees.** It shares `main`'s
  error→exit mapping (`src/cli.ts:182–201`) and `assertWritableDirectory`'s `USAGE`
  posture, adds no interactive prompt (nothing to confirm — it writes nothing), and
  keeps `src/vocabulary.ts` import-free and the module graph acyclic (`CLI-11`): the
  new command module may import downward (errors, the readiness mapping) but nothing
  may import it back.
- **The new verb needs an exit code the current taxonomy does not have.** `main`
  returns `EXIT.OK` unconditionally once `parseAsync` resolves (`src/cli.ts:186`), and
  `EXIT`/`HarnessErrorCode` (`src/errors.ts:6–18`) is a closed set whose five
  non-zero codes all mean *the CLI could not do its job*. "The readiness check ran
  correctly and the answer is red" is neither `EXIT.OK` nor any of those, and must not
  reuse `EXIT.UNEXPECTED` (1), which `CLI-2` reserves for bugs. `contract.md` pins one
  of exactly two mechanisms — extending the taxonomy with a new code, or giving a
  command action a return channel to `main` — and records the choice with its cost.
- **Fourth current-truth amendment, conditional on that choice.** If `contract.md`
  extends the taxonomy, `CLI-2` ("its `HarnessErrorCode` maps to an exit code via a
  table … `USAGE`→2, `CONFLICT`→3, `NO_GENERATOR`→4, `TEMPLATE`→5, `CANCELLED`→130")
  gains a row and must be amended in `specs/current/cli-init.md`. Justified on the
  same grounds as the other three: `CLI-2`'s substantive guarantees are *one
  deliberate error type* and *a single table as the only mapping* — a sixth row
  obeys both; a hand-rolled `process.exitCode` write outside `bin/harness.js` would
  violate `cli-init.md` invariant 2, which is precisely why the shortcut is barred
  here. If instead the return-channel mechanism is chosen, the table is untouched and
  the amendment is to `main`'s unconditional-`EXIT.OK` behavior only.
- **`CLI-4` determinism, containment, trailing newline**; **`CLI-11`** no import
  cycles and `src/vocabulary.ts` still imports nothing; **`S1`–`S7`** coding standards,
  including `S5` (a shared constant is imported from its owning module, never
  re-literalled) and `S6` (`tests/` mirrors `src/`, `Spec:`/`Covers:` header, no
  contract ids in test names).
- **Shape-contract conformance is non-negotiable**: six frontmatter keys only
  (`SL-3`), `disable-model-invocation` specifically forbidden (skill-library invariant
  2), description ≤ 1,536 chars (`SL-4`), five body sections in order, reference other
  skills by name and never by path (shape-contract rule 5), one action per skill (rule
  7).
- **Both skill roots change in the same feature** (`FC-11`), and
  `tests/skills-fidelity.test.ts`'s bijection requires a `DIVERGENCE_TABLE` entry for
  the new pair or fails by construction.
- **Current-truth amendments (declared per `harny-propose` Step 0).** The
  `harny-sync` lookup brief returned three statements this feature will contradict.
  Each is amended deliberately and openly, never silently:
  - `SL-1` ("nine `harny-*` skills") → **ten**. Justified: `SL-1` is a count, not a
    closure rule; the shape contract's own § "Adding a ninth skill" advertises
    extension as the supported path, and `harny-doctor` is added by satisfying that
    document, exactly as intended.
  - `FC-9` ("7 core, 2 optional, 9 total", "`harny-feedback` last in core") →
    **8 core, 2 optional, 10 total**, with `harny-doctor` last in core. Justified: the
    *reason* `FC-9` pinned last position was insertion-order stability
    (`src/vocabulary.ts:38–40` — appending is the only position that preserves every
    existing member's index and therefore `CLI-4`'s emission order). Appending
    `harny-doctor` after `harny-feedback` honors that reason; it does not violate it.
    `FC-9`'s substantive guarantee — core skills are always scaffolded and unnameable
    via `--skills` — is extended to the new skill, not weakened.
  - `CLI-10` ("all twenty-six `templates/**` files") → the new total. Justified:
    `CLI-10`'s guarantee is that the packaging manifest is **closed and asserted**, not
    that the number is 26; `agent-feedback-controls` already moved it 22 → 26 on the
    same reasoning (`AM-2`).
  - No other current-truth statement is contradicted. In particular `FC-1` (single
    canonical command source) and `CLI-5` (refuse-unless-`--force`) are *strengthened
    by extension*, not amended.
- **Which capability this ships into.** `feedback-controls` is, by its own § Purpose,
  the *feedback* half of the Fowler split; a feedforward control does not belong in its
  `FC-` namespace. This feature opens a new capability doc with a fresh requirement-id
  namespace, created from `harny-sync`'s bundled `capability-template.md` per `SL-6`,
  plus keyword rows in `_index.md`. `contract.md` pins the capability name and prefix.
- **`specs/` is fully tracked** (`SL-10`, ADR 0003), so this feature's own spec
  directory is committed alongside its code.

## Prior Art

- **`agent-feedback-controls`** (`specs/archived/agent-feedback-controls/`) is the
  closest structural precedent and the direct sibling of this feature — the other half
  of the same Fowler grid. Reused directly: the "canonical `.mjs` copied byte-for-byte
  into `.sdd/`" pattern (`I5`, `templates/hooks/run-feedback.mjs` →
  `.sdd/feedback/run-feedback.mjs` via `buildFeedbackFiles`, `src/engine.ts:265–278`);
  the tolerated-absence template loader (`loadOptionalResource`,
  `src/templates.ts:436–445`) that lets lean test fixtures omit a subsystem; the
  probe-skip evaluator (`probeSatisfied`, `run-feedback.mjs:188–202`); the
  commands-as-inline-JSON transport (`readCommands`, `run-feedback.mjs:123–136`); and
  the core-tier skill precedent (ADR 0016).
- **`src/feedback.ts`** — the `StackProfile` / `FeedbackCommand` / `ToolProbe` shapes
  and `resolveStackProfile`'s normalized alias matching. This feature extends rather
  than forks them; `contract.md` pins exactly how the readiness commands attach
  without leaking a slow `test` command into the per-turn hook or the CI workflow,
  which is the specific harm `src/feedback.ts:29–31` warns about.
- **`templates-skill-library-parity`** — the `CORE_SKILL_IDS`/`OPTIONAL_SKILL_IDS`
  split, `buildSkillFiles`' per-root write-once emission (`src/engine.ts:307–328`), and
  ADR 0012's stronger-fidelity-for-skills rule.
- **`src/cli.ts`'s `init` command** — the model for `G8`'s verb: a `commander`
  subcommand declared on the shared program, a thin `run<Verb>Command` function that
  resolves and validates the target directory (`assertWritableDirectory`,
  `src/cli.ts:92–101`) and then delegates to a composition-root module, with every
  error surfaced through `main`'s single `HarnessError`→exit mapping. The new verb
  copies that shape; it does not invent a second one.
- **`harny-standards` and `harny-feedback`** — the pointer-plus-checklist skill shape
  this skill follows: name the single source, never restate its contents.
- **`harny-sync` lookup mode** — the bounded (≤4 files) read whose deliberate bound is
  precisely why an unbounded spec-state sanity check needs a different owner; and
  archive mode's five preconditions, which give the doctor a ready-made definition of
  "a feature that should have been archived and wasn't."
- **`templates/hooks/README.md`** — the tool-neutral "state the behavior first, name
  tools only as attributed examples" document shape (`S7`), the model for this
  feature's own canonical behavior doc.
- **Origin:** `plan.md:150` — *"add a kind of init.sh or sh script that will help us
  verify the readiness of the project by running the tests, the documentation files
  (agents.md) and the specs."* All three named subjects (tests, conventions doc,
  specs) are carried into `G3`'s four check families; the `.sh` form is deliberately
  superseded per Constraints.
- **External:** Martin Fowler, *Harness Engineering* §
  "Feedforward and feedback" (https://martinfowler.com/articles/harness-engineering.html#FeedforwardAndFeedback)
  — the source of the quadrant vocabulary `AGENTS.md` adopted and this feature
  completes.
