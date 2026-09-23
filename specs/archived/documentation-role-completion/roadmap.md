# Roadmap: documentation-role-completion

> Phase ordering principle: the **deterministic layer lands first**. L1 (`RC-1`–`RC-6`)
> is the only part of this feature with executable behavior and the only part that can
> be tested by running something rather than by reading prose. It goes in Phase 1 so
> that the content phases that follow can *name a command that already works* instead
> of forward-referencing one.
>
> Per this repo's default (`AGENTS.md` § Working conventions), the test-writer's red
> phase precedes each implementation phase. The phases below describe implementation;
> `tasks.md` interleaves the red-phase tasks at their real positions.

## Implementation Phases

### Phase 1: Foundation — the family selector and its three copies

**Goal**: Make the existing family-4 detector cheaply runnable at claim time, and keep
every byte-identical copy of the runner in sync.
**Dependencies**: None
**Estimated complexity**: Medium

1. Add `--only <family>` parsing to `templates/doctor/run-doctor.mjs`'s `parseArgs`,
   returning `{ checksArg, onlyArg }` instead of a bare `checksArg`. Reject a missing
   value and an unknown token via the existing `fail()` (exit 1), extending the
   "unknown flag" message to mention `--only` (`RC-3`).
2. Introduce the runner-local `FAMILY_TOKENS` array and a `selected(token)` predicate
   that returns `true` when `onlyArg` is `undefined` (the default-transparent path,
   `RC-1`).
3. Guard each of the five family blocks in `main()` with `selected(...)`. Family 1's
   `node-version` emit and its empty-`commands` notice, family 3's label line, and
   family 5's `spawnSync` loop must all sit **inside** their guards — family 5's
   especially, since `RC-2` forbids spawning any child process under
   `--only spec-state`.
4. Confirm the exit line (`process.exit(failCount > 0 ? 2 : 0)`) needs no change: a
   selector-scoped run with no findings exits `0` through the same expression
   (`RC-3`).
5. Regenerate the two other byte-identical copies from the edited template:
   `.sdd/doctor/run-doctor.mjs` and
   `tests/fixtures/golden/ci-workflow-root/run-doctor.mjs` (`RC-17`).

**Deliberately not done in this phase**: no change to `src/doctor.ts`, no change to
`DoctorChecksFile`, no regeneration of `.sdd/doctor/checks.json`. `RC-6` and the
Data Models section depend on all three staying untouched.

### Phase 2: Core Logic — the role's tier, rationale, parity, and completion precondition

**Goal**: Land L2 and the role-content half of L1 in the canonical template and both
skill copies, so all five tools inherit them with no generator change.
**Dependencies**: Phase 1 (the precondition text names the command Phase 1 creates)
**Estimated complexity**: Medium

1. `templates/roles/sdd-documentation.md`: `cost_tier: cheapest` → `mid`, and replace
   the `cost_rationale` with the corrected text in `contract.md` § Interfaces item 2
   (`RC-7`). One line each; no generator edit (`RC-8`).
2. Same file: restructure the hand-off so it names all three sub-steps in order —
   `harny-sync` archive, `harny-adr`, `harny-sync` capability/index update — bringing
   it to parity with the skill, which already has them (`RC-10`). This is the F2
   divergence: the role template names `harny-adr` zero times today.
3. Same file: add the completion precondition with all four required elements
   (`RC-9`), stated generically with an attributed example (`S7`/`PR-7`).
4. `templates/skills/harny-document/SKILL.md`: add the same precondition in skill
   voice.
5. `.agents/skills/harny-document/SKILL.md`: add **identical** text. Adding it to both
   copies is what keeps it out of both `forbiddenInTemplate` and `requiredInTemplate`
   and leaves the declared `DIVERGENCE_TABLE` entry untouched (`RC-12`).
6. Regenerate `.sdd/harness.json` so `sdd-documentation`'s recorded tier becomes
   `mid` (`RC-17`, FC-13).

**Ordering note**: steps 4 and 5 must land in the same change. A window in which only
one copy carries the text is a red `tests/skills-fidelity.test.ts`.

### Phase 3: Integration — the orchestrator

**Goal**: Give the conductor a model of the documentation stage and a duty to verify
its archive, in both the shipped template and the drifted live copy, and make the
drift non-silent.
**Dependencies**: Phase 1 (the conductor names the same command), Phase 2 (the role's
report is what the conductor cross-checks)
**Estimated complexity**: Low

1. `templates/conductor/sdd-conductor.md`: in § "Closing the loop" and § "Conductor
   mechanics", require the conductor to confirm the archive landed by running the
   spec-state check itself before declaring the pipeline complete — an application of
   its existing "Verify, don't trust" rule and its "a role should not be trusted to
   certify its own gate" principle (`RC-14`).
2. `.claude/skills/sdd-conductor/SKILL.md`: repair the drift (`RC-15`) — add
   `sdd-documentation` to the pipeline diagram, add the post-audit hard rule matching
   the template's rule #4, add `auditor → documentation` to the automatic-flow list,
   and add step 1's archive verification. Dogfood-only; the shipped template was
   already correct.
3. Add the presence-gated parity guard (`RC-16`) with the exact skip/fail semantics
   the contract fixes: existence check on the path; absent ⇒ reported skip;
   present-but-empty ⇒ fail; present-and-missing-an-element ⇒ fail naming it.

### Phase 4: Testing & Validation

**Goal**: Prove every guarantee, and prove the constraint set (FC-13, fidelity,
baseline) still holds.
**Dependencies**: Phase 3
**Estimated complexity**: Medium

1. Runner behavior (`RC-1`–`RC-5`): default-transparency, `--only spec-state`
   scoping, the no-child-process assertion, the exit-code taxonomy including both new
   exit-1 cases, and determinism across two runs.
2. The shipped-but-unarchived round trip (intent SC2): a temp fixture with a
   `Shipped:` header and an approved verdict exits `2` and names the feature; after
   the directory moves under `specs/archived/`, the same run exits `0`.
3. Content assertions (`RC-7`, `RC-9`, `RC-10`) on the role template and both skill
   copies, following the substring convention this repo already uses for prose
   commitments (`tests/skills-fidelity.test.ts:486`).
4. Five-generator propagation (`RC-8`, `RC-11`) reusing the GR-5/GR-4 shape at
   `tests/canonical-fidelity.test.ts:543`, plus the "absent from the other four
   roles" half.
5. Fidelity and FC-13: `tests/skills-fidelity.test.ts` stays green with its
   `DIVERGENCE_TABLE` entry unedited (`RC-12`); the three regenerated files are
   byte-identical to their sources (`RC-17`); `.sdd/doctor/checks.json` is unchanged.
6. Baseline: full suite, expecting the new tests green and
   `tests/packaging.test.ts` as the single pre-existing failure (`RC-18`).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **The fix is invoked by the same agent that drops steps** — the verification step sits at the tail, exactly where the drop happens | High | High | Acknowledged in `RC-13` rather than papered over. Mitigated by three independent invokers (role, conductor, next `harny-doctor` run), by `RC-7` lowering the drop rate at source, and by making the check a *precondition on reporting* rather than a trailing step. **Not eliminated**; carried as a declared reservation. |
| A family guard is placed so that family 5 still spawns under `--only spec-state` | Medium | Medium | `RC-2` asserted directly: the test observes that no child process is spawned, not merely that no test output appears. Phase 1 step 3 calls this out specifically. |
| An unknown `--only` value silently runs nothing and exits `0`, falsely reporting readiness | Medium | **High** | `RC-3` makes it exit `1` via the existing `fail()`. This is the single most dangerous failure mode of a selector — a green run that evaluated nothing — and is tested explicitly. |
| The three `run-doctor.mjs` copies drift | Medium | Medium | All three regenerated in one change (Phase 1 step 5) and asserted byte-identical in Phase 4 step 5. The golden copy under `tests/fixtures/golden/` is the easiest to forget — it is outside `.sdd/` and outside FC-13's named set. |
| Only one `harny-document/SKILL.md` copy is edited | Medium | Medium | Phase 2 notes both must land together; `tests/skills-fidelity.test.ts`'s exhaustive-by-construction sweep already fails loudly on divergence. |
| The tier change breaks a test asserting `cheapest` | **Low** | Low | Investigated at spec time: `tests/config.test.ts` and `tests/cli.test.ts` read **fixtures** (`tests/fixtures/templates/well-formed/...`), not the real template; `tests/canonical-fidelity.test.ts` reads `template.metadata.costTier` dynamically. **No test asserts the real template's documentation tier.** The fixture files are deliberately left at `cheapest` — they are test inputs, not the shipped default. |
| The conductor parity guard fails in CI, where the live conductor is absent | Medium | **High** (red CI on a correct tree) | `RC-16` fixes the skip semantics precisely — existence check, reported skip, present-but-empty still fails. Called out because `.claude/skills/sdd-conductor/` is gitignored and this is the exact trap the guard must avoid. |
| Amending PR-2 is mistaken by `harny-sync` for a new statement, leaving two cost-tier rules | Low | Medium | Declared explicitly in `contract.md` § Amendments as **A-PR2**, naming the clause amended and the four clauses left unchanged. |
| Scope creeps into "fix all five roles" | Medium | Medium | Non-goal in `intent.md`; the generalization question is carried as an open reservation, not acted on. |
| `AGENTS.md`'s "six-step hand-off ordering" prose goes stale against `RC-10` | Medium | Low | Named in `contract.md` § Integration Points as the documentation role's own job at ship time — deliberately not edited by the executor. |

## File Change Map

**Modified — canonical templates (ship to all five tools)**
- `templates/doctor/run-doctor.mjs` — MODIFY — `--only <family>` parsing,
  `FAMILY_TOKENS`, `selected()` predicate, five family guards (`RC-1`–`RC-5`)
- `templates/roles/sdd-documentation.md` — MODIFY — `cost_tier` → `mid`, corrected
  `cost_rationale`, three-sub-step hand-off parity, completion precondition
  (`RC-7`, `RC-9`, `RC-10`)
- `templates/skills/harny-document/SKILL.md` — MODIFY — completion precondition,
  skill voice (`RC-9`)
- `templates/conductor/sdd-conductor.md` — MODIFY — archive verification before
  declaring the pipeline complete (`RC-14`)

**Modified — dogfood / live pipeline**
- `.agents/skills/harny-document/SKILL.md` — MODIFY — identical text to the
  `templates/` copy (`RC-9`, `RC-12`)
- `.claude/skills/sdd-conductor/SKILL.md` — MODIFY — drift repair + archive
  verification (`RC-15`) — untracked file

**Regenerated — must stay byte-identical to their sources (`RC-17`)**
- `.sdd/doctor/run-doctor.mjs` — REGENERATE — from the edited template
- `.sdd/harness.json` — REGENERATE — `sdd-documentation` tier → `mid`
- `tests/fixtures/golden/ci-workflow-root/run-doctor.mjs` — REGENERATE — the third
  byte-identical copy

**Created — tests**
- `tests/doctor-runner-only.test.ts` — CREATE — the selector's behavior:
  default-transparency, `--only spec-state` scoping, no-child-process, exit-code
  taxonomy, determinism, and the shipped-but-unarchived round trip
  (`RC-1`–`RC-5`; intent SC1–SC3)
- `tests/conductor-parity.test.ts` — CREATE — the presence-gated live-conductor guard
  (`RC-16`; intent SC7, SC8)

**Modified — tests**
- `tests/canonical-fidelity.test.ts` — MODIFY — five-generator propagation of the
  completion-precondition text and its absence from the other four roles; the
  `mid`-tier resolution per generator (`RC-8`, `RC-11`)
- `tests/skills-fidelity.test.ts` — MODIFY — substring assertions for the precondition
  in both `harny-document` copies; `DIVERGENCE_TABLE` **not** edited (`RC-9`, `RC-12`)
- `tests/doctor.test.ts` — MODIFY — assert `src/doctor.ts` still spawns without a
  selector and `.sdd/doctor/checks.json`'s shape is unchanged (`RC-6`)

**Read but NOT modified** (asserted unchanged)
- `src/doctor.ts`, `src/generators/*.ts`, `src/vocabulary.ts`, `src/engine.ts`
- `.sdd/doctor/checks.json`, `.claude/settings.json`,
  `.github/workflows/harny-feedback.yml`
- `package.json`, `tests/packaging.test.ts`
- `tests/fixtures/templates/**` — the `cheapest` fixtures stay as they are
- `.claude/agents/sdd-documentation.md` — untracked, not a spec deliverable
