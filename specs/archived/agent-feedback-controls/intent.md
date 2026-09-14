# Intent: agent-feedback-controls

Shipped: 2026-09-14

## Problem Statement

harny has a strong **feedforward** layer and an almost empty **feedback** layer, and
the repo's own prose already claims the feedback layer exists.

Martin Fowler's harness-engineering article
(https://martinfowler.com/articles/harness-engineering.html#FeedforwardAndFeedback)
splits an agent harness's controls on two axes: **feedforward** (guides that steer the
agent *before* it acts) vs. **feedback** (sensors that observe *after* it acts and let
it self-correct), each further split into **computational** (fast, deterministic —
linters, type checkers, tests, CI) vs. **inferential** (slow, semantic — AI review,
LLM-as-judge). Mapped onto this repo:

**What harny has (feedforward, and a lot of it).**

- Five canonical role prompts at `templates/roles/sdd-*.md`, each with the abstract
  `cost_tier`/`capabilities` metadata schema (`AGENTS.md:96–119`).
- `AGENTS.md` § "Coding standards" S1–S7 (`AGENTS.md:204–212`) as the single source of
  truth for code-level conventions.
- `harny-standards` (`.agents/skills/harny-standards/SKILL.md`), a pointer-plus-checklist
  that both `sdd-executor` and `sdd-auditor` consult so they don't each re-derive
  "match the existing code style" separately.
- Three human gates and the conductor's sequencing rules
  (`templates/conductor/sdd-conductor.md`).

All of these steer *before* the agent writes a line. None of them observe the result.

**What harny does not have (computational feedback).** The two skills that are supposed
to close the loop only run the test suite:

- `.agents/skills/harny-audit/SKILL.md:74–78` — Step 5 "Test coverage audit. Run the
  test suite with the project's own runner and verify all tests pass". No build, no
  lint, no type-check.
- `.agents/skills/harny-implement/SKILL.md:83–85` — the executor's final checklist reads
  "The test suite passes via the project's own runner" plus "`harny-standards` S1–S6
  were checked". Again: no lint, no type-check.

**The prose already claims otherwise.** Four separate places describe a toolchain run
that no skill implements:

| Claim | Location |
|---|---|
| "sdd-auditor (verifies the contract + runs the toolchain)" | `README.md:21` |
| "runs the toolchain (build/lint/tsc/test)" | `plan.md:27` |
| "sdd-auditor (verifies the contract + runs the full toolchain)" | `plan.md:45` |
| "re-run the gates yourself (type-check, lint, the test suite)" | `templates/conductor/sdd-conductor.md:68`, `.claude/skills/sdd-conductor/SKILL.md:47` |

This is aspirational documentation, not shipped behavior — a false-confidence risk of
exactly the kind `specs/current/cli-init.md` AL-19 already records elsewhere in this
repo ("a green test whose name claims more than it verifies").

**Nothing gives an agent in-loop feedback at all.** Even if `harny-audit` did run a
linter, it would run *once*, at the end of a feature, in the auditor's own context. The
mechanism Fowler describes — a sensor that observes the agent's *own work*, close
enough to the action that the agent can self-correct before compounding the error —
has no implementation anywhere in this repo. Every one of the five target tools exposes
a native agent-lifecycle hook surface for precisely this, and harny generates into none
of them.

**The right granularity is the agent's turn, not the individual edit.** A sensor is only
useful if the agent is still in a position to act on it *and* the cost of running it
stays proportionate to the signal it produces. Firing on every `Edit`/`Write` fails the
second test: five successive edits to one file produce five identical linter and
type-checker runs, four of which report findings about an intermediate state the agent
had already moved past. That is latency without information — it slows the loop it is
meant to tighten, and it trains the agent to tune the sensor out. Batching per turn
keeps the self-correction property (the agent is still holding the context that produced
the error and gets the findings before it hands control back to the human) while
collapsing N edits into exactly one run over the deduped set of files that turn touched.
The turn is also the natural boundary because all five target tools expose a
turn-completion event (see § Constraints → Verification constraints), so the canonical
behavior needs no per-tool fallback to be expressible everywhere. Waiting longer than
the turn — until "all the implementation is done" — would collapse this control back
into what `harny-audit` already does badly: one late run, far from the action, in
someone else's context.

**Post-integration feedback is likewise absent.** There is no `.github/` directory in
this repo at all (verified: `ls .github` → No such file or directory), no CI workflow,
and `package.json:8–14` defines only `build`, `typecheck`, `test`, `test:watch`,
`prepack` — no `lint` script, and no ESLint/Prettier/Biome config file exists at the
repo root. So harny's own PRs are gated by nothing, and a scaffolded downstream repo
inherits the same nothing.

**The hook this feature was built to hang on already exists and is deliberately inert.**
`config.stack` was added by `cli-skeleton` explicitly as a forward reference to this
layer, and is documented as such in three places that all say the same thing:

- `specs/archived/cli-skeleton/contract.md:939–944` — "**Forward reference — the
  agnostic layer (NOT implemented here).** `config.stack` is captured and persisted for
  the future CI/hooks/gitleaks layer; nothing reads it now, by design".
- `src/config.ts:49–50` — "Captured only; nothing in this feature consumes it. Omitted
  when blank."
- `src/cli.ts:168` — `.option('--stack <name>', 'Project stack (captured only)')` and
  `src/prompts.ts:170` — "Project stack? (captured only — nothing in this feature reads
  it)".

It threads all the way through to `src/engine.ts:31` (`ProjectConfigSummary.stack`) and
`src/engine.ts:76`, but its only consumer today is `src/generators/markdown-yaml.ts:54–55`,
which renders it as one human-readable prose line in the conductor's generated block.
`plan.md:139` states its original purpose outright: "Project stack? (optional, only
adjusts the agnostic CI layer)."

And the ask itself is already written down: `plan.md:149` — "add linters and any other
kind of feedback tool for the agents, reference about feedforward and feedback
controls: <the Fowler URL>". `plan.md`'s week-4 row names the same package:
"reintegrate the agnostic layer (CI, hooks, gitleaks) from plan v1".

**Who is affected.** (a) Every agent running any harny role, which cannot see a type
error it just introduced until a human or a much later audit finds it; (b) the human at
each of the three gates, who is reviewing claims ("the toolchain passes") that no
mechanism produced; (c) every downstream repo scaffolded by `npx harny init`, which
receives seven feedforward artifacts per tool and zero feedback artifacts; (d) harny
itself, whose PRs merge with no automated gate.

### Current-truth statements this feature contradicts (declared, not silent)

`harny-sync` lookup returned `skill-library`, `tool-generators` and `cli-init`, and
confirmed the territory is otherwise unclaimed (see § Prior Art). Five statements must
be amended rather than quietly broken:

1. **`specs/current/skill-library.md` SL-1 — "The system SHALL provide eight `harny-*`
   skills"**, enumerated by name. Adding `harny-feedback` makes **nine**, and it joins
   the **core** tier (decided — see G4): `CORE_SKILL_IDS` goes 6 → 7,
   `OPTIONAL_SKILL_IDS` stays 2, `SKILL_IDS` goes 8 → 9. The closed vocabulary lives at
   `src/vocabulary.ts:37–53` and is load-bearing for `--skills` parsing
   (`src/config.ts:452–492`), `withCoreSkills` (`src/config.ts:92–94`), the interactive
   prompt, and config validation. SL-1 must be amended to nine, and its enumeration must
   record the tier, not just the name.
2. **`specs/current/cli-init.md` CLI-10 — "all eleven `templates/**` files"**. This is
   *already* stale: `tests/packaging.test.ts:67` asserts `toHaveLength(22)`, and that
   file's own header (`tests/packaging.test.ts:13–16`) records "CLI-10's manifest grows
   from eleven to twenty-two". This feature grows it a third time
   (`templates/hooks/**`, `templates/ci/**`), so CLI-10 needs a correction *and* an
   increment, and the hardcoded `EXPECTED_TEMPLATE_FILES` list
   (`tests/packaging.test.ts:28–50`) must gain the new paths.
3. **`specs/current/tool-generators.md` TG-10 — "exactly 30 tool artifacts (5 tools ×
   6 each)"**. A hook artifact per tool changes that count.
4. **`AGENTS.md:25–26` — "The repo does not yet include a demo application or any
   publishing/CI tooling. Those are future work; do not assume they exist."** The
   dogfood goal (G5) makes this false for CI.
5. **`specs/current/skill-library.md` SL-10 / `.gitignore:2`.** `git check-ignore -v
   .claude/settings.json` resolves to `.gitignore:2` (`.claude/*`) — a real,
   *tracked* `.claude/settings.json` for harny's own hook is impossible without editing
   `.gitignore`, whose four-line ordering SL-10 explicitly calls "load-bearing".
   `.claude/settings.local.json` must stay ignored.

A sixth, softer one: **TG-1** describes the `Generator` interface as "deliberately
sufficient for all five targets without amendment". ADR 0011 already narrowed that
claim once when `skillsDir` was added. This feature will likely narrow it a second
time; ADR 0011's reasoning (add a declarative member, not a `render*` method) is the
precedent to follow or to consciously depart from.

## Goals

1. **G1 — One stack→command mapping, defined once, consumed three times.** A single
   table keyed on `config.stack` mapping a stack to its computational-feedback commands
   (e.g. TypeScript/Next.js → ESLint + `tsc --noEmit`; Python/FastAPI → Ruff + mypy),
   with an explicit escape hatch for a stack not in the table. It is the sole source of
   truth for the native hook, the CI workflow, and `harny-feedback`. This turns
   `config.stack` from a documented forward reference into a live input, closing the
   `specs/archived/cli-skeleton/contract.md:939–944` reservation — narrowed to CI+hooks,
   with gitleaks dropped (see § Non-Goals).

2. **G2 — Pre-integration computational feedback: native per-tool agent-lifecycle
   hooks, batched per turn.** One canonical hook behavior, stated tool-neutrally in a
   new `templates/hooks/` directory (parallel to `templates/roles/`):

   > *When the agent completes a turn, run the stack-appropriate linter/type-checker
   > **once** over the deduped set of files the agent created or modified during that
   > turn, and surface the findings back to the agent before it yields control.*

   The unit of work is the **turn**, not the edit: five edits to one file produce one
   run over one file, and edits spread across three files produce one run over those
   three. A file touched and then reverted within the same turn still appears once in
   the set — dedup is by path, not by edit count. The observable contract is a single
   invocation per turn, so an implementation that re-runs per edit does not satisfy G2
   even if its findings are correct (§ Problem Statement gives the argument).

   Each `src/generators/*.ts` adapts this into its tool's own native hook format,
   exactly as it already adapts a canonical role body into a per-tool wrapper. The
   primary event is each tool's **turn-completion** event — all five have one, verified
   2026-09-13 (§ Constraints → Verification constraints): Claude Code `Stop`
   (`settings.json`), Cursor `stop` (`.cursor/hooks.json`), Kiro `Agent Stop`
   (`.kiro/hooks/<id>.json`), GitHub Copilot `agentStop`/`Stop` (`.github/hooks/*.json`),
   Codex CLI `Stop` (`hooks/hooks.json`).

   A tool's **post-edit** event (Claude Code/Codex `PostToolUse`, Cursor `onPostEdit`,
   Copilot `postToolUse`, Kiro `PostFileSave`/`PostFileCreate`) is a permitted secondary
   use *only* to accumulate the touched-file set that the turn-completion handler then
   consumes — it must not itself invoke the mapped commands. Whether accumulation is even
   necessary is a per-tool question `contract.md` must answer: a tool whose
   turn-completion payload already enumerates the turn's file changes (or whose session
   transcript is readable from the handler) needs no accumulator at all, and the simpler
   form is preferred wherever it is available. Either way the observable behavior is
   identical and turn-scoped, which is what `templates/hooks/` states; the accumulation
   mechanism is a per-tool adaptation detail, not part of the canonical behavior.

3. **G3 — Post-integration computational feedback: a GitHub Actions workflow
   template.** A canonical workflow template generated into the target repo's
   `.github/workflows/`, triggered on `pull_request`, running the same G1 commands
   headlessly as a PR gate. Written once per run regardless of tool count — the same
   shape as `buildSharedFiles` (`src/engine.ts:101–108`), which already writes
   `.sdd/spec-schema/*` and `.sdd/harness.json` exactly once per `cli-init.md` CLI-8.

4. **G4 — `harny-feedback`, a shared skill both the executor and the auditor delegate
   to.** Mirroring `harny-standards`' established pattern — "a pointer plus a checklist,
   never a second copy of the rules" (`.agents/skills/harny-standards/SKILL.md:24–27`)
   — a ninth skill that owns the G1 mapping and maps its findings onto `harny-audit`'s
   existing CRITICAL/HIGH/MEDIUM/LOW severity buckets
   (`.agents/skills/harny-audit/SKILL.md:112–117`). `harny-implement` invokes it before
   marking a task done, alongside its existing `harny-standards` call
   (`.agents/skills/harny-implement/SKILL.md:74–76`). `harny-audit`'s job is to **verify
   the hooks actually ran and were heeded**, and that the CI workflow is present and
   green — the "verify, don't trust" stance already written at
   `templates/conductor/sdd-conductor.md:68` — not to re-invoke the tools from scratch.
   This also makes `README.md:21` / `plan.md:27,45` true for the first time.

   **`harny-feedback` is a CORE skill (decided).** It joins `CORE_SKILL_IDS`
   (`src/vocabulary.ts:37–44`, 6 → 7 members), always scaffolded into every generated
   project regardless of `--skills`, in the same tier as `harny-propose`, `harny-test`,
   `harny-implement`, `harny-audit`, `harny-document` and `harny-sync` — **not** the
   optional tier, whose current members are `harny-adr` and `harny-standards`
   (`src/vocabulary.ts:47–49`). The reason is the whole premise of this feature: a
   pipeline that ships feedforward-only is the status quo being fixed, so the one
   mechanism that makes generated projects *observe* their own output cannot be the one
   a user can silently end up without. An opt-in feedback skill would be absent from
   exactly the runs where its absence is least visible — a workshop demo, or a real
   project whose operator never read the `--skills` flag — and harny would go on
   shipping the same feedforward-only pipeline while appearing to have fixed it.
   Core membership is also structurally enforceable: `withCoreSkills`
   (`src/config.ts:92–94`) re-adds every core id unconditionally, so "core skill absent"
   is not an expressible config state (the `Gu 14` guarantee), whereas an optional skill's
   absence is a normal, silent outcome.

   Two consequences worth stating now. First, `harny-feedback` will sit in a *different
   tier* than `harny-standards`, the skill whose structure it copies — the shared-pointer
   *shape* is the precedent, the tier is not. Second, that asymmetry is deliberate and
   load-bearing for G4's wiring: `harny-implement` and `harny-audit` will delegate to
   `harny-feedback` **unconditionally** (it is always present), but their existing
   `harny-standards` delegation is conditional, since a user can deselect it — which is
   precisely the silent-degradation class `skill-library.md` SL-5's missing-skill STOP
   guard exists to catch. Whether `harny-standards` should be promoted to core for the
   same reason is a real question this feature deliberately does **not** answer
   (see § Non-Goals).

5. **G5 — Dogfood on harny's own repo.** A real, tracked `.claude/settings.json` hook
   (harny is developed with Claude Code — `CLAUDE.md`) and a real
   `.github/workflows/` PR gate for this repo, both generated or configured consistently
   with what the templates produce downstream, not hand-rolled. Every prior harny feature
   has been proven on harny itself; a feedback mechanism that nobody's own PRs exercise
   is precisely the aspirational-documentation failure mode this feature exists to fix.

6. **G6 — A new `feedback-controls` capability in the knowledge base.** A
   `specs/current/feedback-controls.md` built from
   `.agents/skills/harny-sync/capability-template.md`, plus new keyword rows in
   `specs/current/_index.md` § Keyword lookup, so a future `harny-propose` run asking
   "does harny lint?" routes correctly instead of falling through to full exploration.

7. **G7 — Adopt the feedforward/feedback, computational/inferential vocabulary
   explicitly.** Name the pre-existing feedforward controls (role prompts, `AGENTS.md`
   conventions, `harny-standards`, the three gates) and the two new computational
   feedback controls (native hooks = pre-integration, every-turn; CI = post-integration,
   per-PR) in that vocabulary, in `AGENTS.md` and the new capability doc. The framing is
   part of the deliverable, not decoration — it is what `plan.md:149` literally asked
   for, and it is what tells a future contributor which quadrant a proposed control
   belongs in and whether that quadrant is already occupied.

## Success Criteria

- [ ] **SC1 (G1)** A single named module/table maps a `config.stack` value to its
      computational-feedback commands. No second copy of any command string exists in
      `templates/hooks/**`, `templates/ci/**`, or the `harny-feedback` skill body —
      each references the mapping. This is `AGENTS.md` S5 ("a shared constant is
      imported from its owning module, never re-literalled at a call site") applied to
      the new layer.
- [ ] **SC2 (G1)** A stack value absent from the built-in table produces a defined,
      non-fatal outcome (documented escape hatch), never a crash and never a silently
      empty hook/workflow. A blank/omitted `--stack` likewise.
- [ ] **SC3 (G1)** `config.stack` is read by at least one code path that affects
      generated output beyond `src/generators/markdown-yaml.ts:54–55`'s prose line, and
      the three "captured only" comments (`src/config.ts:49–50`, `src/cli.ts:168`,
      `src/prompts.ts:170`) are corrected to describe what now reads it.
- [ ] **SC4 (G2)** `templates/hooks/` exists and states the canonical hook behavior
      tool-neutrally — including that its unit of work is the **agent turn**, that the
      commands run **once** per turn over the **deduped** set of files that turn created
      or modified, and that the findings reach the agent before it yields control.
      Satisfies `AGENTS.md` S7 / `pipeline-roles.md` PR-7 — no single tool's mechanic
      named as the only possibility.
- [ ] **SC5 (G2)** Each of the five generators emits its tool's hook artifact at that
      tool's verified native path, bound to that tool's verified **turn-completion**
      event, in that tool's verified native schema shape, with a first-party
      documentation citation dated at implementation time recorded in `contract.md` (the
      discipline `tool-generators.md` TG-6 already imposes on role artifacts). No
      generated hook binds the mapped commands to a per-edit event.
- [ ] **SC6 (G2)** The canonical hook behavior survives adaptation: the same observable
      effect (turn completes → stack-appropriate check runs once over the files that
      turn touched → findings visible to the agent before it yields) holds on every one
      of the five tools; any tool whose native surface cannot express some part of it
      surfaces the gap explicitly rather than dropping it — the `CapabilityMapping.notes`
      discipline of `cli-init.md` CLI-9 applied to hooks.
- [ ] **SC6a (G2)** Batching is demonstrated, not asserted: a turn containing N edits
      across M distinct files (N > M > 1) triggers exactly **one** invocation of the
      mapped commands, covering exactly M paths. This is the criterion that makes the
      per-edit implementation fail, and it is the one the human's cost objection turns
      on — a hook that produces correct findings N times does not pass.
- [ ] **SC7 (G3)** A run writes exactly one GitHub Actions workflow into
      `.github/workflows/` regardless of how many tools are selected, byte-identical
      across tool selections that share a stack.
- [ ] **SC8 (G3)** The generated workflow triggers on `pull_request` and runs the G1
      commands for the configured stack.
- [ ] **SC9 (G4)** `harny-feedback` exists at `.agents/skills/harny-feedback/SKILL.md`
      and `templates/skills/harny-feedback/SKILL.md`, satisfies the six-key/five-section
      shape contract in `.agents/skills/README.md:14,64` (`skill-library.md` SL-1/SL-3),
      and is bridged at `.claude/skills/harny-feedback` by a git-tracked relative symlink
      per SL-2.
- [ ] **SC9a (G4)** `harny-feedback` is a member of `CORE_SKILL_IDS`
      (`src/vocabulary.ts:37–44`), not `OPTIONAL_SKILL_IDS`. Concretely: `--skills none`
      still scaffolds it; naming it in `--skills` is a `USAGE` error with the
      "always scaffolded" message `parseSkillList` already produces for core ids
      (`src/config.ts:466–474`); and it appears in every generated project's skill set
      regardless of tool or role selection. `CORE_SKILL_IDS` has 7 members,
      `OPTIONAL_SKILL_IDS` still 2, `SKILL_IDS` 9.
- [ ] **SC10 (G4)** `harny-feedback` contains no second copy of a severity definition —
      it maps findings onto `harny-audit`'s existing CRITICAL/HIGH/MEDIUM/LOW buckets by
      reference, the same way `harny-standards` refuses to restate `AGENTS.md`'s rules
      (`.agents/skills/harny-standards/SKILL.md:47–49`).
- [ ] **SC11 (G4)** `harny-implement`'s Step 4 and final checklist invoke
      `harny-feedback` in addition to `harny-standards`, and `harny-audit` gains a
      verification step that checks the hooks ran and the CI gate is green, rather than
      re-running the tools itself. Both changes land in `.agents/skills/` **and**
      `templates/skills/` in the same feature — the divergence class that
      `templates-skill-library-parity` was created to close.
- [ ] **SC12 (G5)** A real pull request opened against the `harny` repository triggers
      the generated GitHub Actions workflow, and that run's result is visible on the PR.
      This is the acceptance check, not an inspection of the YAML.
- [ ] **SC13 (G5)** A tracked `.claude/settings.json` in this repo fires the hook at the
      end of a live Claude Code turn that edited one or more files, and the findings reach
      the agent's context before it yields control. `.gitignore` is amended to track it
      while keeping
      `.claude/settings.local.json` and `.claude/agents/**` ignored — SL-10's other
      guarantees are re-verified unbroken by `git ls-files` after the change.
- [ ] **SC14 (G5)** Harny's own hook and workflow are derived from the same canonical
      templates a downstream `npx harny init` would produce, with any divergence stated
      and justified in `contract.md` — the divergence-table discipline
      `templates-skill-library-parity` established.
- [ ] **SC15 (G6)** `specs/current/feedback-controls.md` exists, built from
      `capability-template.md` with every section filled, its Requirements carrying
      stable IDs in a fresh namespace prefix; `_index.md`'s five tables are regenerated
      by `harny-sync` archive mode, never hand-edited (`skill-library.md` invariant 4).
- [ ] **SC16 (G6)** `_index.md` § Keyword lookup gains rows routing at least `hook`,
      `lint / type-check`, `CI / GitHub Actions`, `stack` and `feedback` to the new
      capability.
- [ ] **SC17 (G7)** `AGENTS.md` names the four-quadrant vocabulary and classifies each
      existing control into a quadrant, so the reader can see which quadrant this feature
      fills and which (inferential) stays deliberately empty.
- [ ] **SC18 (G7)** `README.md:21` and the two `plan.md` lines either become true or are
      corrected; no shipped prose continues to claim an unimplemented toolchain run.
- [ ] **SC19 (all)** The five contradicted current-truth statements in § Problem
      Statement are each amended by name in `contract.md`, and `tests/packaging.test.ts`'s
      `EXPECTED_TEMPLATE_FILES` and its `toHaveLength` assertion are updated in the same
      change — no statement is broken silently.
- [ ] **SC20 (all)** `npm run typecheck` and `npm test` both pass, and the new
      artifacts respect `AGENTS.md` S3 (byte-identical output for identical inputs, every
      path relative and inside `targetDir`, exactly one trailing `\n`).

## Non-Goals

- **Generic git hooks (`pre-commit` / `pre-push`) as the mechanism.** The point is
  feedback delivered inside the agent's own turn, on the files that turn touched. A git
  hook fires at commit time, which is both too late (the agent has already yielded, often
  many turns ago) and the wrong scope (the commit's diff, not the turn's) — and it does
  not exist at all for agents that never run `git commit`. Note this is a rejection of
  the *mechanism*, not of batching: G2 batches to the turn boundary precisely because
  that is the last point at which the agent can still act on what it learns.
- **Gitleaks / secret scanning.** Named in `plan.md`'s week-4 row and in
  `specs/archived/cli-skeleton/contract.md:944`'s "CI/hooks/gitleaks" forward reference.
  This feature deliberately narrows that forward reference to CI + hooks and leaves
  gitleaks unclaimed for a future feature.
- **CI providers other than GitHub Actions.** No GitLab CI, CircleCI, Jenkins, or
  provider-abstraction layer. One provider, done properly.
- **Inferential feedback** — AI code review, LLM-as-judge, or any semantic reviewer.
  This feature ships the *computational* column only. The inferential column is named in
  the G7 vocabulary precisely so it is visible as deliberately empty rather than
  forgotten.
- **Re-tiering any existing skill.** `harny-feedback` joins the core tier (G4), but
  `OPTIONAL_SKILL_IDS` keeps exactly its current two members, `harny-adr` and
  `harny-standards` (`src/vocabulary.ts:47–49`), and `DEFAULT_OPTIONAL_SKILL_IDS` keeps
  its one (`harny-standards`, line 56). The argument for core membership in G4 arguably
  applies to `harny-standards` too — it is the other shared skill both the executor and
  auditor delegate to, and it is deselectable today — but promoting it would change the
  meaning of `--skills` for existing users and belongs in its own feature with its own
  gate. Named here so the inconsistency is a recorded decision rather than an oversight.
- **An `init.sh` project-readiness script** (`plan.md:150`). Separate idea, out of scope.
- **A conductor rule to check documentation readiness and delegate to
  `sdd-documentation`** (`plan.md:151`). Separate idea, out of scope.
- **A new pipeline role.** `ROLE_IDS` (`src/vocabulary.ts:10–17`) stays a closed
  five-member set; this capability ships as a shared skill (`harny-feedback`, the
  `harny-standards` pattern), not a sixth `sdd-*` role, and adds no entry to any
  generator's agent list. `pipeline-roles.md` PR-1 and PR-9 are untouched.
- **Installing or configuring a linter for harny itself beyond what the mapping
  requires.** This repo currently has no ESLint/Prettier/Biome config and no `lint`
  script (`package.json:8–14`); whether to add one is a dependency decision governed by
  `AGENTS.md` S4 and must be argued in `contract.md`, not assumed here.
- **Retrofitting archived specs.** `specs/archived/**` is never edited
  (`AGENTS.md:46–54`); the stale "eleven files" claim is corrected in
  `specs/current/cli-init.md`, not in the archive.

## Constraints

### Existing contracts this feature is bound by

| Source | Constraint |
|---|---|
| `cli-init.md` CLI-1 | `runInit` is a fixed 13-step sequence (`src/init.ts`). New artifact classes join at the file-assembly point (`src/init.ts:196–201`), before `planWrites`. |
| `cli-init.md` CLI-2 / `AGENTS.md` S2 | `HarnessError(code, …)` is the only deliberately thrown error; codes are the closed set `USAGE`/`CONFLICT`/`NO_GENERATOR`/`TEMPLATE`/`CANCELLED`. An unknown stack must map to one of these or to no error at all. |
| `cli-init.md` CLI-4 / `AGENTS.md` S3 | Determinism, path containment inside `targetDir`, exactly one trailing `\n` per artifact. |
| `cli-init.md` CLI-5 | Conflict detection completes before the first write; a pre-existing `.github/workflows/<name>.yml` or `.claude/settings.json` in a target repo is a `CONFLICT` unless `--force`. This is a real-world case: unlike `.sdd/`, `.github/workflows/` is very often already populated. |
| `cli-init.md` CLI-7 | A skipped tool contributes nothing. A hook artifact belongs only to a resolved generator (cf. `skillRootsFor`, `src/engine.ts:112–115`). |
| `cli-init.md` CLI-9 | No capability/config token silently dropped; anything the target format can't express is surfaced in notes that reach the rendered output. |
| `cli-init.md` invariant 1 | No code path in `src/` writes to `templates/` — it is a read-only canonical source. |
| `cli-init.md` invariant 3 / `AGENTS.md` S4 | Adding any runtime or dev dependency requires an explicit `contract.md` line. Today's set is exhaustive: `commander@15.0.0`, `@clack/prompts@1.7.0`, `typescript@7.0.2`, `vitest@4.1.10`, `@types/node@26.1.2`. A YAML serializer for the workflow would be a new dependency and must be argued, not assumed. |
| `tool-generators.md` TG-3/TG-4 | Canonical body preserved byte-for-byte; only path, file name, wrapper, mapped model, and mapped capability tokens differ per tool. Whether a JSON hook artifact can satisfy "canonical body as a contiguous substring" at all is an open design question `contract.md` must answer. |
| `tool-generators.md` TG-5 / invariant 1 | All serialization comes from the shared modules. Today those are `markdown-yaml.ts` and `toml.ts` only — **there is no JSON or YAML serializer module**, and four of the five hook formats are JSON while the CI workflow is YAML. New shared serialization modules are likely required, and no generator may hand-roll its own. |
| `tool-generators.md` TG-7 | Vendor limits are enforced loudly: exceeding one throws `HarnessError('TEMPLATE')` naming the artifact and the limit, before any write. Any hook-schema limit discovered during verification inherits this rule. |
| `tool-generators.md` invariant 3 | Adding a generator must not change existing generators' files. The inverse applies here: adding hook support touches all five, so the feature must not regress any existing role/conductor output — `tests/canonical-fidelity.test.ts` is the guard. |
| `skill-library.md` SL-1/SL-2/SL-3/SL-4 | `harny-feedback` must satisfy the shape contract, live canonically at `.agents/skills/`, be symlinked (never copied) into `.claude/skills/`, declare only the six portable frontmatter keys, and keep `description` within the character cap. |
| `skill-library.md` invariant 2 | `harny-feedback` must never set `disable-model-invocation` — it must remain preloadable into a subagent's `skills:` list. |
| `spec-workflow.md` SW-7 / `AGENTS.md:46–54` | Stamp-then-archive; a spec directory moves only via `harny-sync` archive mode and is never edited once archived. |
| `pipeline-roles.md` PR-7 / `AGENTS.md` S7 | In tool-neutral content, no single tool's mechanic may be named as the only possibility — name the behavior first, the tool as an attributed example. This directly shapes how `templates/hooks/` is written. |

### Verification constraints

- **Every per-tool hook schema must be re-verified against first-party documentation at
  implementation time.** The brief's event lists are a starting point, not a source. Two
  standing open reservations make this non-negotiable: `tool-generators.md` **AL-30**
  (Cursor/Kiro/Copilot facts verified once on 2026-08-12 and never re-verified against a
  live install — "a generator writing to a directory a tool never reads fails silently
  with exit code 0") and **CG-1/O4** (same for Codex). A hook artifact is *strictly worse*
  than a role artifact under this failure mode: a role file a tool ignores produces a
  visibly unhelpful agent; a hook a tool ignores produces an agent that looks
  well-instrumented and silently isn't — the exact false-confidence failure this feature
  exists to eliminate.
- **Turn-completion event, verified per tool (all 2026-09-13).** G2's per-turn batching
  is only expressible if every target tool actually exposes a turn-boundary event. All
  five do:

  | Tool | Turn-completion event | Source |
  |---|---|---|
  | Claude Code | `Stop` | https://code.claude.com/docs/en/hooks |
  | Cursor | `stop` | https://cursor.com/docs/hooks |
  | Kiro | `Agent Stop` — "fires when the agent has completed its turn and finished responding to the user" | https://kiro.dev/docs/hooks/types/ |
  | GitHub Copilot | `agentStop` / `Stop` | https://docs.github.com/en/copilot/reference/hooks-reference |
  | Codex CLI | `Stop` | Codex CLI hooks reference |

  Cursor additionally exposes `afterAgentResponse`, which also marks completion; `stop`
  is the cleaner turn-end signal and is the one G2 targets. Because the event exists
  everywhere, **no per-tool fallback to per-edit firing is needed for batching**, and a
  generator that emits one would be departing from the canonical behavior rather than
  accommodating a real gap. This resolves the *granularity* question only — it says
  nothing about each event's payload shape, handler contract, exit-code semantics, or
  whether the payload enumerates the turn's file changes, all of which remain subject to
  the re-verification rule above and are `contract.md`'s job.

- **Claude Code surface, verified (2026-09-13, Context7 → https://code.claude.com/docs/en/hooks):**
  a `type: "command"` hook entry is the correct shape;
  `hookSpecificOutput.additionalContext` is the documented field for appending
  information the agent then sees; `PostToolUse` supports a `matcher` (e.g.
  `"Edit|Write"`), which is the accumulation surface G2 permits as a *secondary* use only;
  and `${CLAUDE_PROJECT_DIR}` is the documented way to reference a project-relative script
  path. Together with `Stop` above, this makes G2's canonical behavior mechanically
  achievable on at least the workshop-demo tool. The other four tools' payload and
  handler details remain unverified in this document.
- **Per `harny-propose`'s own guardrail**, no hook-schema signature may be pinned in
  `contract.md` from memory; each needs a docs-lookup citation with a fetch date. The
  five rows above carry today's date and must be re-confirmed, not copied forward, when
  `contract.md` pins the full schemas.

### Compatibility constraints

- `.gitignore:2` (`.claude/*`) currently ignores `.claude/settings.json` — confirmed by
  `git check-ignore -v`. G5 cannot ship without amending it, and SL-10 calls that block's
  ordering load-bearing. The amendment must keep `.claude/agents/**` and
  `.claude/settings.local.json` ignored.
- `package.json:6` ships `templates` wholesale in the npm `files` array, so new template
  directories are packaged automatically — but `tests/packaging.test.ts:28–68` asserts an
  exact hardcoded list and length, so the test fails until updated.
- `skill-library.md` open reservation **AL-P9** — "a ninth skill directory in
  `templates/skills/` would be silently never shipped; no test detects it at authorship
  time" — is about to stop being hypothetical: `harny-feedback` is that ninth directory.
  This feature either closes AL-P9 or must explicitly account for it.
- Adding a skill id touches the closed vocabulary and everything keyed on it:
  `src/vocabulary.ts:37–56`, `parseSkillList` (`src/config.ts:452–492`), `withCoreSkills`
  (`src/config.ts:92–94`), the interactive skills prompt, and
  `specs/current/cli-init.md`'s `--skills` semantics. **Resolved: `harny-feedback` is
  core** (G4 carries the argument), so the change is an insertion into `CORE_SKILL_IDS`
  rather than `OPTIONAL_SKILL_IDS`. Two knock-ons this creates, both needing coverage in
  `contract.md`:
  - **Emission order is positional, not incidental.** `SKILL_IDS` is
    `[...CORE_SKILL_IDS, ...OPTIONAL_SKILL_IDS]` (`src/vocabulary.ts:51–53`) and
    `buildSkillFiles` sorts by `SKILL_IDS.indexOf` (`src/engine.ts:141–143`), so where
    `harny-feedback` is inserted within the core array determines generated file order.
    `cli-init.md` CLI-4 requires byte-identical output across runs; the insertion point
    must therefore be chosen deliberately and fixed, not appended by accident. The
    array's existing comment states its ordering rule — "Pipeline-role order, then sync"
    (`src/vocabulary.ts:36`) — and a shared, non-role skill does not obviously belong to
    either group, so that comment needs updating alongside the insertion.
  - **`parseSkillList` already has the guard.** Naming a core id in `--skills` throws
    `USAGE` with an "always scaffolded" message (`src/config.ts:466–474`); this is
    existing behavior `harny-feedback` inherits for free, but it changes the error surface
    for anyone who previously passed `--skills harny-feedback` expecting opt-in — a
    non-issue today only because the id does not yet exist.
- Node `>=20.19.0` (`package.json:7`); TypeScript ESM with `nodenext` resolution,
  `.js` specifiers on relative imports, `node:` prefix on builtins (`AGENTS.md` S1,
  `tsconfig.json`). `tsconfig.json` includes only `src`, so `tests/` is unchecked — the
  cause of the already-recorded AL-19 class of stale-test risk.
- `cli-init.md` open reservation **AL-20** — the e2e suite validates built `dist/`, not
  `src/`, so `npm test` alone can false-green a `src/`-only regression. A CI workflow for
  harny itself should not reproduce that hole.

### Business constraints

- The DevFest Quito workshop is **2026-09-26**, thirteen days from this document
  (`plan.md` § timeline). This feature must be genuinely demoable live, not merely
  specced — which is what makes the Claude Code hook (the tool the live demo runs on),
  `harny-feedback`, the workflow template, and the harny self-dogfood the first slice,
  with the remaining four tool adapters sequenced after. `roadmap.md` owns the phasing.

## Prior Art

**Inside this codebase.**

- **`harny-standards` is the exact structural precedent for `harny-feedback`**
  (`.agents/skills/harny-standards/SKILL.md`): a shared, role-agnostic
  (`metadata.harny-role: shared`), write-nothing (`harny-writes: none`) skill that both
  `harny-implement` and `harny-audit` delegate to, whose whole discipline is "a pointer
  plus a checklist, never a second copy of the rules" (lines 24–27, 47–49). ADR 0006
  records the single-source-of-truth argument. `harny-feedback` should be the same shape
  with a different subject: commands rather than conventions.
- **`buildSharedFiles`/`buildSkillFiles`** (`src/engine.ts:101–158`) are the established
  patterns for "write this once per run regardless of tool count" (the CI workflow) and
  "write this once per distinct destination" (the hooks), including the dedup-by-root
  trick `skillRootsFor` uses.
- **`templates-skill-library-parity`** is the closest process analogue: it added a whole
  new artifact class to `templates/`, threaded it through all five generators, extended
  the `Generator` interface with one declarative member (`skillsDir`, ADR 0011),
  grew `EXPECTED_TEMPLATE_FILES` from 11 to 22, and amended prior current-truth
  statements by name. Its intent.md's "current-truth statement this feature contradicts
  (declared, not silent)" section is the pattern § Problem Statement follows here.
- **`cursor-kiro-copilot-generators` and `codex-generator`** established the per-tool
  fact-verification discipline (`tool-generators.md` TG-6): every path, field name and
  limit carries a dated first-party citation. Hook schemas inherit it.
- **`specs/archived/cli-skeleton/contract.md:939–944`** is this feature's own charter,
  written two months in advance.

**Outside.**

- **Martin Fowler, "Harness Engineering" — § Feedforward and Feedback**
  (https://martinfowler.com/articles/harness-engineering.html#FeedforwardAndFeedback).
  The two-axis framing (feedforward vs. feedback × computational vs. inferential) that
  G7 adopts as this repo's vocabulary, and the source cited in the original ask at
  `plan.md:149`.
- **Claude Code hooks** (https://code.claude.com/docs/en/hooks, fetched 2026-09-13) —
  the `Stop` turn-completion event, plus the `PostToolUse` + `matcher` +
  `hookSpecificOutput.additionalContext` mechanism described in § Constraints.
- **Cursor** (https://cursor.com/docs/hooks), **Kiro**
  (https://kiro.dev/docs/hooks/types/) and **GitHub Copilot**
  (https://docs.github.com/en/copilot/reference/hooks-reference) hook references —
  cited here **only** for the turn-completion event name confirmed on 2026-09-13
  (§ Constraints → Verification constraints). Nothing else from these four tools'
  hook surfaces has been verified in this session; `contract.md` must fetch and cite
  each in full before pinning any schema.
