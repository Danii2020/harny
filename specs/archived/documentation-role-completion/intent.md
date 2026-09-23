# Intent: documentation-role-completion

**Shipped: 2026-09-23**

## Problem Statement

The `sdd-documentation` role reliably completes the first part of its procedure and
then **narrates the remainder instead of performing it** — handing the tail back to
its caller as "next steps required" / "now ready for `harny-sync` archive mode to…".
Three reproductions across two features, all dropping the same tail:

| # | Feature | Date | Completed | Dropped |
|---|---|---|---|---|
| 1 | `dogfood-quick-fixes` | 2026-09-22 | README, CHANGELOG, `Shipped:` stamp | archive move, ADRs, capability-doc updates — returned as "next steps required" |
| 2 | `ci-workflow-root` (run 1) | 2026-09-23 | steps 1–6 + `Shipped:` stamp | archive move — *described* as "now ready for `harny-sync` archive mode to…" rather than done |
| 3 | `ci-workflow-root` (run 2) | 2026-09-23 | archive move | — (completed after being re-sent for that step alone) |

Reproduction 2 is the decisive one: the invocation brief **numbered all seven steps
and carried an explicit warning** — "This role has a history of stopping after the
first few steps and handing the rest back as 'next steps'. Do not do that." The role
dropped the tail anyway.

This is a **product** defect, not a dogfood annoyance. `templates/roles/sdd-documentation.md`
ships to every repo `npx harny init` scaffolds, for all five tools. Every downstream
user inherits a documentation role that drops its archive step.

### What this session's exploration established, and where it corrects the brief

Four findings reshape the design, and two of them contradict the premise the feature
was handed to us with. They are stated up front because the remedy follows from them.

**F1 — The restructure remedy is already implemented in the layer that actually
executes, and it failed there.** The invoking brief describes the procedure as
"Steps 1–6, where Step 3 item 4 bundles 'Stamp the spec, then hand off to archive'
as a single sub-item". That is true of `templates/roles/sdd-documentation.md:43`.
It is **not** true of what the live agent ran. `.claude/agents/sdd-documentation.md`
is a thin pointer whose body says "Your instructions live in the `harny-document`
skill… It is the single source of truth for this role's behavior; this file adds no
rules of its own", preloading it via `skills:`. That skill —
`.agents/skills/harny-document/SKILL.md`, reached through the tracked
`.claude/skills/harny-document` symlink — already states the hand-off as **top-level
Step 3**, with three explicitly numbered and named sub-steps:

> 3. **Hand off to the knowledge-base skills, in this order** …
>    1. Run **`harny-sync` in archive mode** …
>    2. Run **`harny-adr`** …
>    3. Run **`harny-sync`** again …

All three failures occurred against *that* text. Promoting the archive hand-off to a
top-level step is therefore **not** the fix: it is already true where it counts, and
the failure reproduced three times regardless. This retires design option 2 from the
brief as a candidate for the load-bearing layer. (It remains worth doing in the role
template — see F2 — but as a parity correction, not as the remedy.)

**F2 — The role template and the skill have genuinely diverged, and the role template
is the weaker of the two.** `templates/roles/sdd-documentation.md` buries the
hand-off as Step 3 item 4, and **never mentions `harny-adr` or the second
`harny-sync` call at all**. A downstream user receives both artifacts; they disagree
about what the role's tail is. This is a real defect in shipped content independent of
the tail-drop, and it is in scope.

**F3 — A deterministic detector for this exact failure already exists, already ships
to all five tools, and simply fires too late.** `templates/doctor/run-doctor.mjs`'s
check family 4 ("spec state") already computes precisely the shipped-but-unarchived
condition and fails on it:

```js
if (shipped && approved) {
  emit(
    `spec-state:${name}`,
    'fail',
    `${specsDir}/${name} is shipped and approved but was never archived (run harny-sync archive mode)`,
  );
}
```

`shipped` is a `Shipped:` header line in `intent.md`; `approved` is an
`approvedVerdicts` match in `audit.md`; any `fail` exits the runner `2` (not ready).
The bytes are identical in all three copies on disk today
(`templates/doctor/run-doctor.mjs`, `.sdd/doctor/run-doctor.mjs`,
`tests/fixtures/golden/ci-workflow-root/run-doctor.mjs`), and the runner is
tool-neutral: its bytes never vary by stack or by tool.

This check would have caught **all three** reproductions. It did not, because
`harny-doctor` runs at *session start and before new spec work* — one session too
late.

> **Text correction (2026-09-23, `documentation-role-completion` post-ship).** The
> claim above — that the family-4 check "would have caught all three reproductions" —
> was **false as written**, and is left byte-unchanged here as the record of what was
> believed at ship time. The check matched the marker with
> `line.trim().startsWith(shippedMarker)`, so it saw only a bare `Shipped: <date>`
> line; the documentation role stamps the **bolded** `**Shipped: <date>**`, which that
> match missed. Two of the three reproductions (`dogfood-quick-fixes`,
> `ci-workflow-root`) are bold-stamped and would have been **invisible** to it, as
> were 6 of the 14 archived specs. The defect predated this feature — the line is
> byte-identical at `HEAD` `d3c2741` — but this feature made it load-bearing, and the
> first clean `--only spec-state` run reported during this feature's own ship was green
> because it could see nothing, not because nothing was stranded. Found by probe
> immediately before commit, fixed in the same change as **RC-19**
> (`STAMP_LEADING_MARKUP`, plus 7 tests in `tests/doctor-runner.test.ts` covering five
> markup forms and two false-positive guards). The corrected check fires on the bolded
> stamp, still fires on the bare one, and still ignores prose that merely names the
> marker. **`RC-R1` is unaffected and remains open**: this concerns whether the sensor
> can see, not whether it is invoked. What the human operator did by hand all session is exactly what this check
does automatically, at the wrong moment. **The feature's core move is therefore to
re-trigger an existing computational sensor at the moment of the completion claim,
not to author new advisory prose.**

**F4 — The orchestrator has no model of the documentation stage at all, so option 4
could not have been operating.** `templates/conductor/sdd-conductor.md` (the shipped
artifact) is correct: it names `sdd-documentation (auto, non-gated)` in its pipeline
diagram, carries hard rule #4 on the post-audit hand-off, and closes with "Once
documentation completes, the pipeline is done for this feature." The **live**
conductor, `.claude/skills/sdd-conductor/SKILL.md`, has drifted badly behind it:

- its pipeline diagram ends at `[HUMAN REVIEWS AUDIT]` and **never mentions
  `sdd-documentation`**;
- it carries four hard rules, not five — the template's hard rule #4 is absent;
- its "FLOW automatically" list omits `auditor → documentation`;
- its "Closing the loop" omits the documentation-completes-the-pipeline line.

The drift went unnoticed because `.claude/skills/sdd-conductor/` is **untracked**
(`.gitignore` allowlists only `.claude/skills/harny-*`) and **no test guards it** —
`tests/helpers/paths.ts:22` declares `REAL_CLAUDE_CONDUCTOR_PATH` "the oracle for
conductor placement", and nothing in the suite imports it. So the orchestrator
driving this repo's own pipeline does not know the documentation stage exists, and
could not have verified its archive. This is a **dogfood-only** defect: the shipped
template is fine, downstream users are unaffected.

### Why the obvious remedy is the wrong one

Adding a hard rule telling the role to finish is the advisory tier. The evidence
says that tier does not hold here: the procedure already lists every step (F1), and
an explicit numbered warning in the invocation still did not prevent the failure
(reproduction 2). A self-verification step added at the tail has a further
circularity problem — it lives in the same text whose tail is being dropped, so an
agent that stops after step 2 never reaches step 5's self-check either. Advisory
text is at most one component of the answer, and never the load-bearing one.

### The layered design, with each layer's strength stated honestly

| Layer | Mechanism | Strength |
|---|---|---|
| **L1 — load-bearing** | Archive completion becomes a **completion precondition** checked by the existing family-4 spec-state logic, made cheaply invokable at claim time via a new family selector on the runner. Invoked by both the role (before it reports) and the conductor (before it declares the pipeline complete). | The **judgment** is deterministic — an exit code, not a narration. The **invocation** is still an agent instruction; this is why L4 remains the backstop. Not a guarantee. |
| **L2 — probability reduction at the source** | `cost_tier: cheapest` → `mid`, with a corrected `cost_rationale`. One line in the role template; propagates to all five tools through the existing per-generator tier→model maps with **no generator edit**. | Reduces failure rate; **does not bound it**. A `mid`-tier model can also drop a step. Explicitly not a guarantee. |
| **L3 — defence in depth** | Role-template/skill parity (F2), plus an explicit "you have not finished until" completion condition in both voices, plus repairing the live conductor's drift (F4) and adding a presence-gated guard so it cannot silently drift again. | **Purely advisory**, except the conductor guard, which is a real test. Named as defence in depth, never relied on. |
| **L4 — backstop, already exists** | The next `harny-doctor` session-start / pre-spec-work run. Unchanged by this feature. | The only layer whose firing does not depend on the failing agent's cooperation — but it is after the fact. |

L2 is the reason to expect fewer failures; **L1 is the reason a failure that does
happen cannot be reported as success.** Those are different jobs and the spec keeps
them separate.

### Declared contradiction of current truth (`harny-propose` Step 0)

`harny-sync` lookup mode returned `specs/current/pipeline-roles.md`, whose **PR-2 —
Cost-tier assignment per role** states:

> The system SHALL map `cost_tier`: architect and auditor → `most-capable`;
> test-writer and executor → `mid`; documentation → `cheapest`.

…with the matching Scenario "…and documentation resolves to `cheapest`". **L2
contradicts PR-2 directly.** This is declared, not silent, and justified as follows:

1. PR-2's tier for this role rests on the `cost_rationale` in
   `templates/roles/sdd-documentation.md:8`, which claims the role "does no design
   and **no independent verification of its own**, so it is pure synthesis/writing
   work". That premise is false today and becomes more false under L1: the role
   orchestrates three sub-skill invocations (`harny-sync` → `harny-adr` →
   `harny-sync`) and, under this feature, must verify that the archive landed.
2. The three reproductions are the empirical case: the only role on the cheapest
   tier is the only role with a recorded tail-drop.
3. PR-2 is amended, not repealed — the other four roles' tiers are untouched, the
   3-tier vocabulary in `src/vocabulary.ts:22` is untouched, and no generator's
   tier→model map changes. `cheapest` simply becomes unoccupied by the five default
   roles, and remains available to a user's `--model` override or a custom role.

No other statement returned by the lookup is contradicted. **SW-7**
(stamp-then-archive lifecycle) and **SL-6/SL-7** (`harny-sync` modes and triggers)
are upheld and, under L1, enforced rather than merely instructed.

## Goals

1. **G1 — Make the archive hand-off's completion checkable by an exit code, not by a
   narration.** Reuse the existing family-4 spec-state logic rather than authoring a
   second detector, and make it invokable at claim time without running the full
   readiness sweep (which spawns the whole test suite).
2. **G2 — Make "archive verified" a precondition on the documentation role's
   completion report,** so the role cannot truthfully report success while
   `specs/<feature>/` still exists in the shipped-and-approved state.
3. **G3 — Give the orchestrator a model of the documentation stage and a duty to
   verify it,** in both the shipped template and the drifted live conductor, and stop
   the live conductor from silently drifting again.
4. **G4 — Raise `sdd-documentation` from `cheapest` to `mid` and correct its
   now-false `cost_rationale`,** propagating to all five tools with no generator
   change.
5. **G5 — Restore role-template ↔ skill parity for the hand-off tail (F2)** so the
   two artifacts a downstream user receives agree on what the role's final step is,
   including `harny-adr` and the second `harny-sync` call.
6. **G6 — Keep the remedy scoped to `sdd-documentation`** and record, rather than
   act on, the question of whether the other four roles carry the same risk.

## Success Criteria

- [ ] **SC1** — The readiness runner accepts a family selector that runs the
      spec-state family alone, exits `0` when no feature is shipped-but-unarchived
      and `2` when one is, and rejects an unknown selector value as a usage error
      (exit `1`) — never as a silently-empty, falsely-green run. *(G1)*
- [ ] **SC2** — With a fixture feature directory carrying a `Shipped:` header in
      `intent.md` and an approved verdict in `audit.md`, the selector-scoped run
      names that feature and exits `2`; after the directory is moved under
      `specs/archived/`, the same run exits `0`. *(G1)*
- [ ] **SC3** — The selector-scoped run spawns **no** command from the `commands`
      (test-suite) family, so it is cheap enough to run at the end of every
      documentation turn. *(G1)*
- [ ] **SC4** — Both `templates/roles/sdd-documentation.md` and both copies of
      `harny-document/SKILL.md` state the verification as a **precondition on
      reporting** — the role reports completion only after the check returns
      not-shipped-but-unarchived — and name the command that produces that verdict.
      *(G2)*
- [ ] **SC5** — The generated `sdd-documentation` artifact for **all five**
      generators carries the completion-precondition text verbatim, with no
      generator source change — the `dogfood-quick-fixes` GR-5 pattern at
      `tests/canonical-fidelity.test.ts:543` reused. *(G2, G5)*
- [ ] **SC6** — `templates/conductor/sdd-conductor.md` requires the conductor to
      verify the archive before declaring the pipeline complete, and states that it
      does so by running the check rather than by reading the role's own report.
      *(G3)*
- [ ] **SC7** — The live `.claude/skills/sdd-conductor/SKILL.md` names the
      `sdd-documentation` stage, carries the post-audit hard rule, lists
      `auditor → documentation` under automatic flow, and carries the archive
      verification. *(G3)*
- [ ] **SC8** — A **presence-gated** parity guard fails when the live conductor is
      present and missing any of SC7's elements, and **skips** (never fails) when the
      live conductor is absent — because `.claude/skills/sdd-conductor/` is untracked
      and absent on a fresh clone and in CI. *(G3)*
- [ ] **SC9** — `templates/roles/sdd-documentation.md` declares `cost_tier: mid`,
      and its `cost_rationale` no longer claims the role performs no verification.
      *(G4)*
- [ ] **SC10** — Each of the five generators resolves `sdd-documentation` to its own
      `mid`-tier model id, obtained from that generator's existing tier→model map,
      with **no diff in any file under `src/generators/`**. *(G4)*
- [ ] **SC11** — `templates/roles/sdd-documentation.md`'s hand-off step names all
      three sub-steps in order (`harny-sync` archive → `harny-adr` → `harny-sync`
      capability/index update), matching the skill. *(G5)*
- [ ] **SC12** — `templates/skills/harny-document/SKILL.md` and
      `.agents/skills/harny-document/SKILL.md` remain equal except for the entry
      declared in `tests/skills-fidelity.test.ts`'s `DIVERGENCE_TABLE`, and that
      entry's declared additive divergence still holds. *(constraint)*
- [ ] **SC13** — The full suite's baseline is preserved: **704 passing / 1 failing**
      before this feature; after it, the new tests pass and `tests/packaging.test.ts`
      remains the single known pre-existing failure. *(constraint)*
- [ ] **SC14** — FC-13 dogfood byte-identity holds: after regeneration, this repo's
      `.sdd/`, `.claude/settings.json` and `.github/workflows/harny-feedback.yml` are
      byte-identical to fresh `npx harny init` output. *(constraint)*

## Non-Goals

- **Fixing the tail-drop risk for the other four roles.** No tail-drop has been
  recorded for architect, test-writer, executor or auditor; all four sit on
  `mid`/`most-capable`, and none ends its procedure by delegating to a separate
  skill. Whether the risk generalizes is registered as an open question for a later
  feature (see § Constraints), deliberately **not** acted on here. Expanding to all
  five roles would make the tier change a pipeline-wide cost decision on three
  reproductions' worth of evidence about exactly one role.
- **Adding a new readiness check, a new check family, or a new `checks.json`
  field.** L1 reuses family 4 as-is; inventing a second detector for a condition that
  already has one would be the duplication `S5` exists to prevent.
- **Changing the three human gates.** Documentation remains the one automatic,
  non-gated hand-off; the archive verification is a completion precondition, not a
  fourth gate.
- **Making the live conductor tracked**, or changing `.gitignore`. SC8 handles the
  untracked file with a presence gate instead.
- **`monorepo-mode` / `components: [{path, stack}]`** — the next feature.
- **`package.json` and `tests/packaging.test.ts`.** Its one known failure (it pins
  `vitest: '4.1.10'` while `package.json` carries `^4.1.11`) stays failing.
- **The six LOW reservations `ci-workflow-root` left open** (AL-2…AL-6, AL-8),
  registered in `specs/current/_index.md` and not this feature's to close.
- **Closing R8** (only `Stop` is hooked, never `SubagentStop`). It is adjacent — a
  `SubagentStop` hook would be another place to fire L1 — but it is an open
  `feedback-controls` reservation with its own scope.

## Constraints

- **FC-13 dogfood byte-identity.** This repo's `.sdd/`, `.claude/settings.json` and
  `.github/workflows/harny-feedback.yml` must stay byte-identical to fresh
  `harny init` output. Two changes in this feature cross that line, and **both**
  require regeneration:
  1. `cost_tier: cheapest` → `mid` changes `.sdd/harness.json`, which records
     `{"id": "sdd-documentation", "tier": "cheapest"}` at line 25.
  2. Editing `templates/doctor/run-doctor.mjs` changes `.sdd/doctor/run-doctor.mjs`,
     which is byte-identical to it today.

  Additionally — outside `.sdd/` and therefore outside FC-13 proper, but broken by
  the same edit — `tests/fixtures/golden/ci-workflow-root/run-doctor.mjs` is a third
  byte-identical copy and must be regenerated in the same change.
  `.claude/settings.json` and `.github/workflows/harny-feedback.yml` are **not**
  touched by this feature. `.sdd/doctor/checks.json` is **not** touched, because L1
  adds no check and no `checks.json` field.
- **Skill-copy fidelity.** `templates/skills/harny-document/SKILL.md` and
  `.agents/skills/harny-document/SKILL.md` must stay byte-identical **except** for
  entries declared in `tests/skills-fidelity.test.ts`'s `DIVERGENCE_TABLE`. Note the
  brief's simplification: these two files are *not* byte-identical today. The
  declared entry is `'harny-document': { kind: 'diverges', requiredInTemplate: ['rather
  than assuming any prior history exists'] }` — an additive divergence present only
  in the `templates/` copy. Any new text must be added to **both** copies identically,
  or the `DIVERGENCE_TABLE` entry must be amended deliberately.
- **Portability invariant (PR-3).** No canonical role file may name a concrete model
  id or a Claude-only path as its sole source of truth. The tier change must be
  expressed only as `cost_tier`; the concrete per-tool model ids stay in
  `src/generators/*.ts`, and `model: haiku` in `.claude/agents/sdd-documentation.md`
  stays where `CLAUDE.md` says it belongs.
- **S7 / PR-7 — no sole tool-specific mechanic in tool-neutral content.** The
  completion-precondition text reaches all five tools, so the command it names must
  be stated generically (the readiness runner) with any single tool's invocation as
  an attributed example.
- **S5 — a shared constant is imported from its owning module, never re-literalled.**
  Any new family-selector token is data owned by one module.
- **S3 — determinism.** The selector-scoped run must be deterministic given repo
  state, and the runner keeps its existing exit-code taxonomy (`0` ready, `2` not
  ready, `1` the runner itself could not run).
- **S6 — test conventions.** vitest; `tests/` mirrors `src/`; every test file opens
  with a `Spec:`/`Covers:` header; contract ids never appear in test names. Note
  AL-8/AL-P8: the suite already violates the last clause systematically; this
  feature follows the observed convention and does not reconcile it.
- **ADR numbering is globally monotonic.** 0031–0034 are used by `ci-workflow-root`;
  the next free number is **0035**.
- **Every contract guarantee needs a stable id.** This feature uses the `RC-`
  (role completion) prefix.
- **Open question, registered not acted on:** does the tail-drop risk generalize to
  the other four roles? Evidence today says no (none recorded, none on `cheapest`,
  none delegating at its tail), but the evidence is three data points about one role.
  This is carried forward as a reservation rather than resolved here.

## Prior Art

- **`dogfood-quick-fixes` (`specs/archived/dogfood-quick-fixes/`)** — the closest
  precedent, and the direct model for this feature's shape. It added the "never
  commit or push" hard rule to `templates/roles/sdd-documentation.md` **and** its
  skill-voice twin in both `harny-document/SKILL.md` copies (its item 2), and proved
  the rule reached all five generators' artifacts with no generator change
  (`tests/canonical-fidelity.test.ts:543`, GR-5/GR-4). It is also reproduction 1 of
  the failure this feature fixes.
- **`tests/canonical-fidelity.test.ts:543–591`** — the exact test shape SC5 reuses:
  render the role through each of the five generators via
  `generator.renderRole({ template, tier: template.metadata.costTier })` and assert
  the required text is present in the `sdd-documentation` artifact and absent from the
  other four. Because it reads `template.metadata.costTier` dynamically, it is
  tier-agnostic and does **not** break under G4.
- **`ai-sdlc-readiness` (PR-10, AR-19)** — precedent for amending `harny-document`'s
  procedure in both voices while leaving the post-audit path's preconditions
  provably unchanged, with substring-level assertions standing in for behavioral
  tests on prose commitments (`tests/skills-fidelity.test.ts:486`).
- **`readiness-doctor` (ADR 0018–0021)** — established the runner's five families,
  its `--checks` dual-form flag, and the `NOT_READY` exit-code taxonomy that SC1
  extends without altering.
- **`ci-workflow-root` (ADR 0031–0034)** — the immediately preceding feature;
  source of reproductions 2 and 3, and of the golden-fixture directory
  (`tests/fixtures/golden/ci-workflow-root/`) whose `run-doctor.mjs` copy this
  feature must regenerate.
- **`templates/doctor/README.md` and `run-doctor.mjs`'s header comment** — the
  canonical description of the five families, including family 4's
  shipped-but-unarchived condition, which L1 reuses verbatim rather than
  re-deriving.
- **Fowler's harness-engineering framing**, adopted in `AGENTS.md` § "Feedforward vs.
  feedback". L1 is a **computational feedback** sensor being re-triggered closer to
  the act it observes; L2/L3 are **inferential feedforward** guides. The distinction
  is what licenses calling L1 load-bearing and L2/L3 advisory.
