# Contract: documentation-role-completion

> Guarantee id prefix: **`RC-`** (role completion). Every guarantee below carries a
> stable id and cites the `intent.md` goal it serves.
>
> **Affected capabilities** (read by `harny-sync` archive mode step 4):
> `pipeline-roles`, `skill-library`, `readiness-checks`.

## Interfaces

### Public API

#### 1. `templates/doctor/run-doctor.mjs` — a family selector (MODIFIED)

The runner gains one optional flag. Its absence reproduces today's behavior exactly,
byte for byte, so every existing caller — including `src/doctor.ts:401`, which spawns
`[runnerAbsolutePath, '--checks', checksJson]` and is **not** modified by this
feature — is unaffected.

```js
/** The five check families, in the fixed order `main` runs them. Frozen, ordered,
 *  and owned here: this is structural (which code paths exist), not data, so it
 *  follows `DEFAULT_CHECKS_PATH`'s precedent — "a hard-coded convention of the
 *  runner's own invocation" — and does not violate BG-3, which forbids hard-coding
 *  *values that arrive via `--checks`* (command strings, stack names, the specs
 *  directory name, schema file names, the `Shipped:`/verdict literals). None of
 *  those are introduced here. */
const FAMILY_TOKENS = ['environment', 'harness', 'repo-readiness', 'spec-state', 'tests'];

/** `undefined` (the flag absent) means "run all five families", the pre-feature
 *  behavior. A present value must be a member of `FAMILY_TOKENS`. */
function parseArgs(argv) {
  let checksArg;
  let onlyArg; // NEW
  // ... `--checks <path-or-inline-json>` unchanged ...
  // `--only <family>`:
  //   - missing value            -> fail(...) (exit 1)
  //   - value not in FAMILY_TOKENS -> fail(...) naming the accepted set (exit 1)
  //   - repeated flag            -> last occurrence wins, consistent with `--checks`
  return { checksArg, onlyArg };
}
```

Invocation, unchanged in shape:

```
node run-doctor.mjs [--checks <path-or-inline-json>] [--only <family>]
```

The selector this feature exists for:

```
node .sdd/doctor/run-doctor.mjs --only spec-state
```

**Why a selector rather than a new check:** the shipped-but-unarchived condition
already has a detector (`templates/doctor/run-doctor.mjs:245`, family 4). Authoring a
second one would duplicate a rule that already exists, which is exactly what `S5`
forbids. What was missing was never the detection — it was a way to run that
detection cheaply, at the moment of the completion claim, without family 5 spawning
the full test suite.

#### 2. `templates/roles/sdd-documentation.md` — role metadata (MODIFIED)

```markdown
- cost_tier: mid
- cost_rationale: This role writes prose from already-verified facts, but it is not
  pure synthesis: it orchestrates a three-call knowledge-base hand-off (`harny-sync`
  archive -> `harny-adr` -> `harny-sync` capability/index update) and must verify that
  the archive actually landed before reporting completion. That verification duty, and
  the length of the tail it has to carry without dropping it, is why this role sits at
  `mid` rather than `cheapest` (most-capable for deep reasoning, mid for bounded
  implementation/verification work, cheapest for pure synthesis/writing).
```

The prior rationale's claim that the role does "no independent verification of its
own" is the specific sentence this feature retires; it was already inaccurate and is
made plainly false by `RC-9`.

#### 3. The completion precondition — content contract

The same commitment is written in three places, in each one's own voice: the canonical
role body (`templates/roles/sdd-documentation.md`) and both copies of
`harny-document/SKILL.md`. Its required elements:

1. The role reports completion **only after** the spec-state check returns no failing
   line for **its own** feature.
2. The check is named as a runnable command, stated generically (the readiness runner
   shipped at `.sdd/doctor/run-doctor.mjs`) with a concrete invocation as an
   attributed example — satisfying `S7`/`PR-7`, and true for all five tools, since the
   runner's path and bytes never vary by tool.
3. A failing line for a **different** feature is reported as a finding, never silently
   ignored and never fixed in passing — that other feature's archive is not this
   invocation's business.
4. An explicit statement that describing the archive step, or handing it back as a
   "next step", is **not** completing it.

### Data Models

No new persisted data structure. Specifically, and deliberately:

```ts
// src/doctor.ts — UNCHANGED by this feature.
export interface DoctorChecksFile {
  readonly version: 1;
  readonly specs: {
    readonly dir: string;
    readonly reservedDirs: readonly string[];
    readonly schemaFiles: readonly string[];
    readonly shippedMarker: string;
    readonly approvedVerdicts: readonly string[];
  };
  readonly require: readonly DoctorCheck[];
  readonly repoReadiness: readonly DoctorCheck[];
  readonly repoReadinessLabel: string;
  readonly commands: readonly ReadinessCommand[];
}
```

`DoctorChecksFile` gains **no field**, `DoctorCheck` gains **no field**, and
`.sdd/doctor/checks.json` is **not regenerated** by this feature. The selector is an
argument to the runner, not data in the checks file — which is what keeps
`checks.json` byte-stable and keeps a `checks.json` generated by an earlier harny
working unchanged against the new runner.

The only structural addition is the runner-local `FAMILY_TOKENS` array shown above.

### State Changes

| Artifact | Change | Why |
|---|---|---|
| `templates/doctor/run-doctor.mjs` | MODIFIED — `--only` parsing; each of the five family blocks guarded by a `selected(token)` predicate | `RC-1`, `RC-2` |
| `.sdd/doctor/run-doctor.mjs` | REGENERATED — byte-identical to the template | FC-13 |
| `tests/fixtures/golden/ci-workflow-root/run-doctor.mjs` | REGENERATED — third byte-identical copy | `RC-17` |
| `templates/roles/sdd-documentation.md` | MODIFIED — tier, rationale, hand-off parity, completion precondition | `RC-7`, `RC-9`, `RC-10` |
| `templates/skills/harny-document/SKILL.md` | MODIFIED — completion precondition (skill voice) | `RC-9` |
| `.agents/skills/harny-document/SKILL.md` | MODIFIED — identical text to the above | `RC-9`, `RC-12` |
| `.sdd/harness.json` | REGENERATED — `sdd-documentation` tier `cheapest` → `mid` | FC-13 |
| `templates/conductor/sdd-conductor.md` | MODIFIED — archive verification before "pipeline is done" | `RC-14` |
| `.claude/skills/sdd-conductor/SKILL.md` | MODIFIED — drift repair + archive verification | `RC-15` |
| `.sdd/doctor/checks.json` | **UNCHANGED** | no new check, no new field |
| `.claude/settings.json` | **UNCHANGED** | not touched |
| `.github/workflows/harny-feedback.yml` | **UNCHANGED** | not touched |
| `src/**` | **UNCHANGED** | the selector defaults to today's behavior |

## Behavior Guarantees

### L1 — the load-bearing layer (serves G1, G2)

1. **RC-1 — The selector is additive and default-transparent.** With `--only` absent,
   the runner evaluates all five families in the same fixed order and produces
   byte-identical stdout to the pre-feature runner for the same repo state and
   `--checks` input. *(G1)*
2. **RC-2 — `--only spec-state` evaluates family 4 alone.** It emits no
   `node-version` line, no family-2/3 presence lines, no family-3 label line, and
   **spawns no child process whatsoever** — in particular none from the `commands`
   (tests) family. *(G1; intent SC3)*
3. **RC-3 — The exit-code taxonomy is preserved exactly.** `0` when no evaluated
   check failed; `2` when at least one did; `1` when the runner itself could not run
   — now additionally including an unknown `--only` value and a `--only` with no
   value. A selector-scoped run that evaluates a family with no findings exits `0`;
   it never exits `0` by virtue of having evaluated nothing it was asked to evaluate.
   *(G1)*
4. **RC-4 — Determinism (`S3`).** Identical repo state plus identical arguments
   produce byte-identical stdout and an identical exit code. The selector introduces
   no ordering, timing, or environment dependence. *(G1)*
5. **RC-5 — Family 4's condition is reused, never duplicated.** The
   shipped-and-approved-but-still-under-`specs/` predicate keeps exactly one
   implementation. `--only spec-state` re-enters the existing block; it does not
   introduce a parallel detector, and `reservedDirs` continues to exclude `current`
   and `archived`, so an already-archived feature contributes no line. *(G1)*
6. **RC-6 — `src/` is untouched and `npx harny doctor` is unchanged.**
   `src/doctor.ts` continues to spawn the runner with `['--checks', checksJson]` and
   no selector, so the verb's output, exit mapping, and `DoctorResult` shape are
   identical to today. *(G1)*
7. **RC-9 — Archive verification is a precondition on the completion report.**
   `templates/roles/sdd-documentation.md` and both copies of
   `harny-document/SKILL.md` each state all four elements listed under § Interfaces
   item 3: report only after a clean check for its own feature; the command, stated
   generically with an attributed example; a different feature's failing line
   surfaced as a finding; and the explicit statement that narrating the archive step
   is not performing it. *(G2)*
8. **RC-13 — The contract states where the guarantee ends, in the same breath as the
   guarantee.** L1's **judgment** is deterministic: whether a feature is
   shipped-but-unarchived is computed from files on disk and reported as an exit
   code, never as a narration. L1's **invocation** is an agent instruction, and an
   agent that drops the tail of its procedure can equally drop the verification step
   at the end of it. **This feature therefore does not guarantee that the archive
   always happens.** It guarantees that *when the check is run*, the answer is
   computed rather than asserted; and it lowers the probability of the drop at
   source (`RC-7`). The residual risk — a run that skips both the hand-off and its
   verification, and reports success — is real, is not closed here, and is carried
   as a declared reservation in `audit.md`. The unchanged backstop is
   `harny-doctor`'s next session-start / pre-spec-work run, which is the only layer
   whose firing does not depend on the failing agent's cooperation. *(G1, G2)*

### L2 — probability reduction at the source (serves G4)

9. **RC-7 — `sdd-documentation` declares `cost_tier: mid`,** with a `cost_rationale`
   that no longer claims the role performs no verification of its own. This is a
   reduction in failure probability and **explicitly not a bound**: a `mid`-tier
   model can also drop a step, which is why `RC-9` exists independently of it. *(G4)*
10. **RC-8 — The tier propagates to all five tools with no generator change.** Each
    generator resolves `sdd-documentation` through its own existing tier→model map —
    `claude-code.ts:23`, `cursor.ts:27`, `kiro.ts:26`, `github-copilot.ts:27`,
    `codex.ts:37` — yielding that tool's `mid` model id. No file under
    `src/generators/` is modified, and `COST_TIERS` at `src/vocabulary.ts:22` keeps
    all three tokens in the same order. `cheapest` becomes unoccupied by the five
    default roles and remains reachable via a `--model` override or a user-authored
    role. *(G4)*

### L3 — defence in depth, advisory unless stated otherwise (serves G3, G5)

11. **RC-10 — Role-template ↔ skill parity for the hand-off tail.**
    `templates/roles/sdd-documentation.md` names all three hand-off sub-steps in
    order — `harny-sync` archive mode, then `harny-adr`, then `harny-sync` again for
    the capability docs and `_index.md` — matching
    `harny-document/SKILL.md`'s Step 3. The role template currently names `harny-adr`
    **zero** times; after this feature it names it as a distinct sub-step. *(G5)*
12. **RC-11 — The new role text reaches all five generated artifacts verbatim, with
    no generator change, and only this role.** For every generator,
    `generator.renderRole({ template, tier: template.metadata.costTier })` on the
    `sdd-documentation` template contains the completion-precondition text; the same
    call on each of the other four role templates does not. This reuses the
    `dogfood-quick-fixes` GR-5/GR-4 pattern at `tests/canonical-fidelity.test.ts:543`.
    *(G2, G5)*
13. **RC-12 — Skill-copy fidelity is preserved under its declared divergence.**
    `templates/skills/harny-document/SKILL.md` and
    `.agents/skills/harny-document/SKILL.md` remain equal except for the entry
    declared in `tests/skills-fidelity.test.ts`'s `DIVERGENCE_TABLE`. That entry is
    and remains:

    ```ts
    'harny-document': {
      kind: 'diverges',
      requiredInTemplate: ['rather than assuming any prior history exists'],
    },
    ```

    The new precondition text is added to **both** copies identically, so it is
    neither `forbiddenInTemplate` nor `requiredInTemplate`, and the declared additive
    divergence is untouched. *(constraint)*
14. **RC-14 — The shipped conductor verifies the archive before declaring the
    pipeline complete.** `templates/conductor/sdd-conductor.md` states that after the
    documentation role reports, the conductor confirms the archive landed by running
    the spec-state check itself, rather than by accepting the role's report — the
    direct application of its own existing "Verify, don't trust" mechanic and of its
    stated principle that "a role should not be trusted to certify its own gate."
    *(G3)*
15. **RC-15 — The live conductor's drift is repaired.**
    `.claude/skills/sdd-conductor/SKILL.md` gains, at minimum: `sdd-documentation` in
    its pipeline diagram; a post-audit hard rule matching the template's rule #4;
    `auditor → documentation` in its automatic-flow list; and `RC-14`'s archive
    verification. This is a dogfood-only repair — the shipped template was already
    correct, so no downstream user is affected. *(G3)*
16. **RC-16 — A presence-gated parity guard, precisely specified.** A test asserts
    the `RC-15` elements against `.claude/skills/sdd-conductor/SKILL.md` with this
    exact gating, so the test-writer implements it without guessing:

    - **Skip condition.** If `.claude/skills/sdd-conductor/SKILL.md` does not exist,
      the test **skips** and passes. `.claude/skills/sdd-conductor/` is untracked —
      `.gitignore` ignores `.claude/*` and allowlists only `.claude/settings.json`,
      `.claude/skills/` and `.claude/skills/harny-*` — so the file is absent on a
      fresh clone and in CI, where this test must not fail.
    - **Absence is detected by a filesystem existence check on that path**, not by a
      caught read error that could mask a permissions fault, and not by treating
      empty contents as absent: a present-but-empty file **fails**.
    - **Fail condition.** If the file exists, every required element must be present;
      a missing element fails and names the missing element.
    - The skip must be observable in the test report (a reported skip, not a silently
      passing empty assertion), so "guard never ran" is distinguishable from "guard
      ran and passed".

    *(G3)*

### FC-13 and baseline

17. **RC-17 — The regeneration set is exactly three files, and is stated exhaustively.**
    Because generated output changes, these must be regenerated so this repo stays
    byte-identical to fresh `npx harny init` output:

    | File | Why it changes | In FC-13's named set? |
    |---|---|---|
    | `.sdd/harness.json` | records `{"id": "sdd-documentation", "tier": ...}`, line 25, today `"cheapest"` | yes |
    | `.sdd/doctor/run-doctor.mjs` | byte-identical copy of the edited template | yes |
    | `tests/fixtures/golden/ci-workflow-root/run-doctor.mjs` | a **third** byte-identical copy, outside `.sdd/` and therefore outside FC-13 proper, but broken by the same edit | no — but must be regenerated in the same change |

    Verified byte-identical across all three copies at spec time. **Not touched, and
    must not be regenerated:** `.claude/settings.json`,
    `.github/workflows/harny-feedback.yml`, `.sdd/doctor/checks.json`,
    `.sdd/spec-schema/*`, `.sdd/feedback/*`, `.sdd/shared/probes.mjs`. *(constraint)*
18. **RC-18 — The test baseline is preserved.** Before this feature: 704 passing / 1
    failing. After: every new test passes, no previously-passing test regresses, and
    `tests/packaging.test.ts` remains the single known pre-existing failure (it pins
    `vitest: '4.1.10'` against `package.json`'s `^4.1.11`). This feature does not
    touch `package.json` or `tests/packaging.test.ts`. *(constraint)*

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| `--only` given a value not in `FAMILY_TOKENS` | `fail(...)` → stderr names the offending value and the accepted set; **exit 1** | A typo is a loud usage error, never a silently-empty run that exits `0` and falsely reports readiness |
| `--only` given with no following value | `fail(...)` → stderr names the flag; **exit 1** | Same |
| `--only` repeated | Last occurrence wins, matching `--checks`'s existing behavior | Predictable; no error |
| Any other unknown flag | Unchanged: `fail("unknown flag ...")`; **exit 1**, with the message extended to mention `--only` | Unchanged |
| `--checks` missing / unreadable / not valid JSON | Unchanged; **exit 1** | Unchanged — a readiness run never claims readiness having read nothing |
| `--only spec-state` run, one feature shipped-but-unarchived | One `FAIL spec-state:<feature>` line naming the feature and the `harny-sync` remediation; **exit 2** | The documentation role's precondition is unmet; it must complete the hand-off, not report |
| `--only spec-state` run, a **different** feature shipped-but-unarchived | That feature's line is emitted; **exit 2** | Per § Interfaces item 3, the role reports it as a finding and does not attempt to archive a feature it was not invoked for |
| `--only spec-state` run, `specs/` absent or empty | No family-4 lines; **exit 0** | Correct: nothing is stranded. Distinct from an error, which exits `1` |
| A feature directory missing schema files | Unchanged family-4 `fail` naming the missing files; **exit 2** | Unchanged |
| Live conductor file absent when the parity guard runs | Test **skips**, reported as a skip; suite passes | CI and fresh clones stay green (`RC-16`) |
| Live conductor present but missing a required element | Test **fails**, naming the element | Drift cannot recur silently |

## Dependencies

- **Internal:** `templates/doctor/run-doctor.mjs` (modified); `templates/shared/probes.mjs`
  (imported by the runner, unmodified); `src/doctor.ts` (read for `SPECS_DIR`,
  `SHIPPED_MARKER`, `APPROVED_VERDICTS`, `RESERVED_SPEC_DIRS` — **not modified**);
  `src/generators/*.ts` (read for tier→model maps — **not modified**);
  `src/vocabulary.ts` (`COST_TIERS` — **not modified**).
- **External packages:** **none added.** Per `S4`, adding a runtime or dev dependency
  requires an explicit line here, and the default is none. This feature adds none, and
  does not modify `package.json`.

## Integration Points

- **`harny-sync` archive mode** is the step being verified, not modified. Its
  preconditions (`SL-6`), its trigger from within the documentation hand-off
  (`SL-7`), and `SW-7`'s stamp-then-archive ordering are all upheld. L1 makes
  `SL-7`'s "invokes `harny-sync` archive in addition to, not instead of, its
  README/CHANGELOG/AGENTS.md duties" checkable rather than merely instructed.
- **`harny-doctor`** keeps its existing triggers unchanged — session start and
  before new spec work. This feature adds a *second invocation path* for the same
  family-4 logic; it does not widen `harny-doctor`'s own remit, and explicitly does
  not give it the per-turn trigger that `harny-feedback` owns.
- **The three human gates are unchanged.** Documentation remains the one automatic,
  non-gated hand-off (`PR-5`); the archive verification is a completion precondition
  inside that hand-off, not a fourth gate (`PR-6` untouched).
- **`AGENTS.md` § "Feedforward vs. feedback".** L1 is an existing **computational
  feedback** sensor re-triggered closer to the act it observes; L2 and L3 are
  **inferential feedforward**. The inferential-feedback cell stays deliberately
  empty. `AGENTS.md`'s prose describing `harny-document`'s "six-step hand-off
  ordering" will need updating to match `RC-10`'s shape — the documentation role's
  own job at ship time.
- **Portability (`PR-3`).** The tier is expressed only as `cost_tier`; concrete model
  ids stay in `src/generators/*.ts`, and `model: haiku` in
  `.claude/agents/sdd-documentation.md` stays where `CLAUDE.md` says per-tool model
  ids belong. That live agent file is untracked and is not a spec deliverable; if it
  is updated to a `mid`-tier model, that is a local change, not part of this
  contract.

## Amendments to current-state specifications

> Declared so `harny-sync` archive mode records them against the right capability,
> rather than merging them as if they were new statements.

| Amendment | Capability | Statement | Change | Justification |
|---|---|---|---|---|
| **A-PR2** | `pipeline-roles` | **PR-2 — Cost-tier assignment per role**: "architect and auditor → `most-capable`; test-writer and executor → `mid`; documentation → `cheapest`" | **AMENDED, not repealed.** The documentation clause becomes `mid`. Its Scenario's final clause changes from "documentation resolves to `cheapest`" to "documentation resolves to `mid`". The architect, auditor, test-writer and executor clauses are **unchanged**. | Human-approved at the post-specs gate. PR-2's documentation clause rested on a `cost_rationale` asserting the role performs "no independent verification of its own" — already inaccurate, and made plainly false by `RC-9`. Three reproductions across two features, all on the only role at `cheapest`. See `intent.md` § "Declared contradiction of current truth". |
| **A-PR2b** | `pipeline-roles` | The 3-tier vocabulary itself | **UNCHANGED.** `COST_TIERS` keeps `['most-capable', 'mid', 'cheapest']` in order. `cheapest` becomes unoccupied by the five default roles and stays reachable via `--model` override or a user-authored role. | An unoccupied tier is not a removed tier; removing it would break `--model` overrides and every generator's map. |
| **A-PR5** | `pipeline-roles` | **PR-5 — Automatic documentation hand-off** | **EXTENDED.** The hand-off's completion now additionally requires that the archive be verified (`RC-9`). PR-5's trigger, its `REJECTED` refusal, and its non-gated character are unchanged. | The hand-off was always specified to include the archive (`SL-7`); this makes completion checkable rather than adding a duty. |
| **A-SL7** | `skill-library` | **SL-7 — harny-sync invocation triggers** | **UNCHANGED in substance; strengthened in enforcement.** | `RC-5` reuses the existing detector; no `harny-sync` behavior changes. |
| **A-RD** | `readiness-checks` | The readiness runner's interface | **EXTENDED.** The runner gains an optional `--only <family>` selector (`RC-1`–`RC-4`); the five families, their order, `checks.json`'s schema, and the exit-code taxonomy are unchanged. | Family 4's detector existed and fired too late; this adds a trigger, not a check. |

## Reserved ADR numbers

Next free number is **0035** (0031–0034 are used by `ci-workflow-root`). Three
decisions in this contract meet a significance criterion; the documentation role
writes them at ship time into `specs/archived/documentation-role-completion/decisions/`.

| ADR | Title | Capability |
|---|---|---|
| 0035 | Verify the archive with the existing spec-state detector via a family selector, not with new advisory prose or a second check | `readiness-checks` |
| 0036 | Raise `sdd-documentation` to `mid`; leave `cheapest` unoccupied rather than reassigning another role to it | `pipeline-roles` |
| 0037 | Guard the untracked live conductor with a presence-gated parity test rather than tracking the file or leaving it unguarded | `pipeline-roles` |
