# Roadmap: agent-feedback-controls

> Traces to `intent.md` G1–G7 / SC1–SC20 and `contract.md`'s interfaces, behavior
> guarantees (BG-1…BG-18), amendments table, and reservations R1–R4.
>
> **Scheduling frame.** Specced 2026-09-13; the DevFest Quito workshop is 2026-09-26,
> **13 days out** (`intent.md` § Business constraints). Phases 1–4 are the
> demo-critical slice and end at an explicit **workshop-ready checkpoint**. Phase 6
> (the other four tool adapters) is the only phase intent.md permits to land after
> Sep 26 — see § "Why the feature does not archive at the checkpoint".

## Implementation Phases

### Phase 1: Foundation — the mapping and the runner
**Goal**: `config.stack` becomes a live input, and the canonical turn-batched runner
exists and is testable standing alone, before any tool knows about it.
**Dependencies**: None
**Estimated complexity**: Medium
**Demo-critical**: yes

1. Create `src/feedback.ts`: `PathMode`, `ToolProbe`, `FeedbackCommand`,
   `StackProfile`, `STACK_PROFILE_IDS`, `STACK_PROFILES` (the `typescript` and
   `python` profiles exactly as `contract.md` § Data Models fixes them), and
   `resolveStackProfile`. Import only `./vocabulary.js` and `./errors.js` — CLI-11
   forbids a cycle, and this module must not reach into `templates.ts` or `config.ts`.
2. Add the three path constants (`FEEDBACK_RUNNER_PATH`, `CI_WORKFLOW_PATH`,
   `TOUCHED_FILES_DIR`) here, so no call site ever re-literals them (`AGENTS.md` S5).
3. Implement `resolveStackProfile`'s normalization (lower-case, strip punctuation and
   whitespace) and its `undefined` return for blank/absent/unrecognized input. It
   **never throws** — BG-8's non-fatal guarantee starts here.
4. Create `src/generators/json.ts` with `renderJson`: insertion-order keys, 2-space
   indent, exactly one trailing `\n`. Wraps `JSON.stringify`; adds no dependency.
5. Create `templates/hooks/README.md` — the canonical hook behavior stated
   tool-neutrally (SC4): the turn is the unit, commands run once over the deduped
   touched-file set, findings reach the agent before it yields. Name the behavior
   first and each tool only as an attributed example (`AGENTS.md` S7 / PR-7).
6. Create `templates/hooks/run-feedback.mjs`, the shared runner, in two modes:
   - **accumulate** — append one path to `.sdd/feedback/.turns/<turn-key>` and exit.
     Never executes a mapped command (BG-3).
   - **run** — read the turn file, dedup by absolute path, evaluate each command's
     `requires` probe, execute the survivors once (`per-file` gets the paths appended,
     `whole-project` does not), delete the turn file, emit findings on stdout as the
     tool-neutral payload the per-tool adapters wrap.
   Resolve the turn key by the documented precedence (`turn_id` → `session_id` →
   `sessionId` → `conversation_id`) and honor the re-entry flag (`stop_hook_active`)
   so BG-5's loop safety is in the shared runner, not duplicated per tool.

**Red-phase tests**: `tests/feedback.test.ts` — alias matching and normalization;
`undefined` for blank/unknown; profile shape/order. `tests/generators/json.test.ts` —
determinism and trailing newline. Runner tests drive `run-feedback.mjs` as a
subprocess over fixture turn files, asserting **BG-1 (one invocation, M deduped
paths)**, BG-3, BG-4 (empty turn is a no-op) and BG-9 (absent tool is skipped, exit
status unaffected).

---

### Phase 2: The Claude Code hook, the CI workflow, and the generator seam
**Goal**: the tool the live demo runs on emits a working turn-batched hook, and every
run emits the PR gate. This is the phase that makes the feature demonstrable.
**Dependencies**: Phase 1
**Estimated complexity**: High
**Demo-critical**: yes

1. Extend `Generator` (`src/generators/types.ts`) with `hooksPath` (declarative) and
   `renderHook(payload): GeneratedFile | undefined` (a method — `contract.md`
   § Interfaces records why this departs from ADR 0011).
2. **Add both members to all five generators in this phase.** TypeScript makes a new
   required interface member a compile error in every implementation at once, so the
   other four cannot wait for Phase 6. Each of `cursor.ts`, `kiro.ts`,
   `github-copilot.ts`, `codex.ts` receives its **real** `hooksPath` constant from
   `contract.md` V1 and a `renderHook` that returns `undefined` — the documented
   "contributes no hook artifact" state (BG-14, CLI-7's established shape), not a
   placeholder file at a path the tool would read.
3. **Guard the stubs so they cannot silently persist.** Add a test asserting the exact
   set of hook-emitting generator ids — `['claude-code']` after this phase, all five
   after Phase 6. This is deliberate protection against the `skill-library.md`
   **AL-P9** failure class (a thing silently never shipped, with no test detecting it
   at authorship time); a forgotten stub fails the suite instead of shipping quiet.
4. Implement `claudeCodeGenerator.renderHook`: `.claude/settings.json` carrying **both**
   registrations required by BG-2 — `PostToolUse` with `matcher: "Edit|Write"` calling
   the runner in accumulate mode, and `Stop` calling it in run mode — in the nested
   `{"hooks":{"<Event>":[{"hooks":[{"type":"command","command":…}]}]}}` shape (V1), via
   `renderJson`, using `${CLAUDE_PROJECT_DIR}` for the runner path (V5). Findings are
   returned through `hookSpecificOutput.additionalContext` (V4) so a clean lint run
   costs no extra turn.
5. Create `templates/ci/harny-feedback.yml`: `on: pull_request`, the resolved profile's
   commands with `pathMode` ignored (CI always checks the whole project, BG-10), and
   all configuration confined between `GENERATED_BLOCK_BEGIN`/`END`. Interpolated
   command strings are quoted with the existing shared `yamlQuote`
   (`src/generators/markdown-yaml.ts:15–18`) — no YAML module, no dependency.
6. Add `buildFeedbackFiles(payload)` to `src/engine.ts`, emitting the runner and the
   workflow **once per run** regardless of tool count, mirroring `buildSharedFiles`
   (CLI-8). Add `stackProfile` to `ProjectConfigSummary` and resolve it in
   `buildPayload`, so `config.stack` finally affects output (SC3).
7. Wire both into `src/init.ts:196–201` — inside the existing render/assembly step.
   `runInit`'s 13-step sequence (CLI-1) does not gain a step.
8. Correct the three "captured only" comments (`src/config.ts:49–50`, `src/cli.ts:168`,
   `src/prompts.ts:170`) to say what now reads `stack` (SC3).
9. Implement the escape hatch end to end (BG-8, SC2): unresolved profile ⇒ artifacts
   still written, runner and workflow print one named notice and exit 0, `io.warn`
   names the value and lists `STACK_PROFILE_IDS`, conductor block records
   "(no built-in profile)".

**Red-phase tests**: `tests/generators/claude-code.test.ts` — both registrations
present, exact event ids, nested wrapper shape, `${CLAUDE_PROJECT_DIR}` usage, no
per-edit binding of a mapped command (BG-3). `tests/engine.test.ts` — runner and
workflow emitted exactly once across 1/3/5-tool selections (BG-10). `tests/init.test.ts`
— conflict on a pre-existing `.claude/settings.json` without `--force` (BG-13);
determinism across two runs (BG-12). Plus the hook-emitting-generator-set guard from
step 3, and a test that no `STACK_PROFILES` command string appears as a literal outside
`src/feedback.ts` (BG-7/SC1).

---

### Phase 3: `harny-feedback` — the shared skill and its role wiring
**Goal**: the executor and the auditor both route through one skill that owns the
mapping and the severity translation. Structurally independent of Phase 2 (depends only
on Phase 1) and may be built in parallel with it.
**Dependencies**: Phase 1
**Estimated complexity**: Medium
**Demo-critical**: yes

1. Author `.agents/skills/harny-feedback/SKILL.md` — six portable frontmatter keys,
   five body sections, `metadata.harny-role: shared`, `harny-writes: none`, mirroring
   `harny-standards`' pointer-not-copy discipline. It names `src/feedback.ts` as the
   mapping's owner and maps findings onto `harny-audit`'s existing
   CRITICAL/HIGH/MEDIUM/LOW buckets **by reference** (SC10). Must not set
   `disable-model-invocation` (`skill-library.md` invariant 2).
2. Copy to `templates/skills/harny-feedback/SKILL.md` and create the tracked relative
   symlink `.claude/skills/harny-feedback → ../../.agents/skills/harny-feedback`
   (SL-2, never a copy).
3. Append `'harny-feedback'` to `CORE_SKILL_IDS` (`src/vocabulary.ts`) **last**, and
   update the array's ordering comment to "…then the shared skills (`harny-sync`,
   `harny-feedback`)". Appending is the only position that preserves all eight existing
   indices and therefore existing emission order (CLI-4) — `contract.md`
   § "Insertion position" carries the argument.
4. Update `harny-implement` Step 4 and its final checklist to invoke `harny-feedback`
   alongside `harny-standards`; update `harny-audit` Step 5 to **verify the hook ran and
   was heeded and that CI is green**, not to re-invoke the tools (BG-17).
5. Apply steps 1 and 4 to **both** roots — `.agents/skills/` and `templates/skills/` —
   in this phase (SC11, BG-16). This is the exact divergence class
   `templates-skill-library-parity` shipped to close; reopening it here would be a
   regression.

**Red-phase tests**: existing `tests/skill-library.test.ts` / `tests/skills-templates.test.ts`
discover skills by glob (`tests/skill-library.test.ts:49`), so they extend to nine
without hardcoding. New assertions: `harny-feedback` ∈ `CORE_SKILL_IDS` and ∉
`OPTIONAL_SKILL_IDS`; `--skills none` still scaffolds it; `--skills harny-feedback`
raises the existing `USAGE` "always scaffolded" error (BG-15/SC9a); the two roots stay
byte-identical for this skill.

---

### Phase 4: Dogfood on harny's own repo — the workshop-ready checkpoint
**Goal**: harny's own PRs are gated and harny's own agent sessions are instrumented,
using the same canonical templates a downstream user gets. This is the phase that
proves the feature rather than asserting it.
**Dependencies**: Phases 2 and 3
**Estimated complexity**: Medium
**Demo-critical**: yes — **this is the last phase required before Sep 26**

1. Amend `.gitignore` with the single line `!.claude/settings.json`, placed immediately
   after `.claude/*`. Verify with `git ls-files` that `.claude/settings.local.json` and
   `.claude/agents/**` remain ignored — SL-10 calls this block's ordering load-bearing,
   so the check is part of the step, not a follow-up.
2. Generate (do not hand-roll) harny's own `.claude/settings.json` and
   `.github/workflows/harny-feedback.yml` from the canonical templates, with
   `--stack typescript`. Record any divergence from pure generator output, with
   justification, in `contract.md`'s divergence discipline (SC14).
3. Confirm harny's own profile behaves as `contract.md` § Dependencies predicts: `tsc`
   runs via the existing `typecheck` script; **ESLint is skipped** through the ordinary
   BG-9 probe path, because this repo has no linter config. This usefully exercises the
   skip path on the maintainers' own repo — assert it rather than treating it as an
   accident.
4. **SC12 — attempt the real PR.** Push a branch, `gh pr create` against `main`,
   and record the workflow run URL plus `gh pr checks <n>` output in `audit.md`. A
   local `act` run or a `workflow_dispatch` trigger does **not** satisfy SC12; only a
   `pull_request` event proves the trigger.
5. **SC13 / R2 — attempt the live-session check, do not skip it.** In a **new** Claude
   Code session (settings load at startup), edit a file introducing a deliberate type
   error and capture the transcript excerpt showing the `Stop` hook's findings arriving
   via `additionalContext`; then capture an edit-free turn producing no output (BG-4).
   **R2 is a known limit, not an excuse**: the session that writes
   `.claude/settings.json` cannot observe it load, so this acceptance check requires a
   restart and a human. The phase's exit criterion is that the restart was *performed
   and recorded*, or that R2 is escalated with the reason it could not be. Marking SC13
   "verified" without a restart is a contract violation, not a reservation.

> **Workshop-ready checkpoint.** At the end of Phase 4 the feature is genuinely
> demoable: a live Claude Code turn produces batched lint/type findings, and a real
> harny PR shows a green gate. Phases 5–7 improve and complete it; none of them is
> required for the Sep 26 demo.

---

### Phase 5: Documentation, the feedforward/feedback vocabulary, and the amendment manifest
**Goal**: the framing ships as a deliverable (G7), the aspirational prose becomes true
(SC18), and every current-truth amendment is written down in the form `harny-sync` will
apply it.
**Dependencies**: Phase 4
**Estimated complexity**: Low
**Demo-critical**: no

1. `AGENTS.md`: add the four-quadrant vocabulary (feedforward/feedback ×
   computational/inferential), classify each existing control into a quadrant, and show
   which quadrant this feature fills and that the inferential column stays deliberately
   empty (SC17). Update the `templates/` tree (adds `hooks/`, `ci/`) and the skill list
   8 → 9.
2. Remove the CI clause from `AGENTS.md:25–26` ("does not yet include … any
   publishing/CI tooling") — false as of Phase 4.
3. `README.md:21` and `plan.md:27,45`: the "runs the toolchain" claims become true via
   Phase 3's wiring; reword them to describe what actually runs (SC18). No shipped prose
   may continue to claim an unimplemented toolchain run.
4. `tests/packaging.test.ts`: add the three new `templates/**` paths to
   `EXPECTED_TEMPLATE_FILES` and change `toHaveLength(22)` → `(25)`.
5. Write the amendment manifest into `contract.md`'s existing table so the
   documentation hand-off applies it verbatim, covering **all seven**: SL-1 (eight →
   nine, core tier), CLI-10 (eleven → 25, correcting a claim already stale at 22),
   TG-10 (artifact count), TG-1 (narrowed a second time after ADR 0011), the TG-3
   **clarification** (governs body-carrying artifacts — a clarification, not an
   amendment), `AGENTS.md:25–26`, and SL-10 (+1 tracked path).

---

### Phase 6: The remaining four tool adapters
**Goal**: Cursor, Kiro, GitHub Copilot and Codex CLI emit real turn-batched hooks,
replacing Phase 2's `undefined` stubs.
**Dependencies**: Phase 2
**Estimated complexity**: High
**Demo-critical**: **no — the only phase intent.md permits to land after Sep 26**

1. `cursor.ts` — `.cursor/hooks.json`, `{"version":1,"hooks":{…}}`; accumulate on
   **`afterFileEdit`** (preferred over `postToolUse`: it yields `file_path` directly,
   V3); run on `stop`. Findings return via `followup_message`, the only `stop` channel
   Cursor documents (V4) — so respect its `loop_limit` default of 5 (BG-5, R3).
2. `kiro.ts` — `.kiro/hooks/harny-feedback.json`, `{"version":"v1","hooks":[…]}`;
   accumulate on `postToolUse` (**not** `fileSave`/`fileCreate`, which are IDE-only and
   would leave Kiro CLI uninstrumented, V3/R4); run on `agentStop`. Findings return via
   exit 0 + STDOUT, which Kiro adds to agent context (V4).
   **R1 — the Kiro casing ambiguity must be attempted, not assumed.** Kiro's own two
   doc pages disagree (`types/` says camelCase `agentStop`; `hooks/` says "PascalCase,
   e.g. `PostFileSave`"), and a wrong trigger id fails silently with exit 0 — the
   AL-30 class. This phase ships the camelCase form and its acceptance check is a
   **live Kiro run** confirming the hook actually fires. If no live Kiro is available,
   R1 is escalated as an open, human-gated reservation naming both candidate spellings
   — never quietly closed by re-reading the same docs.
3. `github-copilot.ts` — `.github/hooks/harny-feedback.json`, `{"version":1,…}` with the
   **`"bash"`** script key (not `"command"`, V1); accumulate on `postToolUse`, run on
   `agentStop`. Findings return via `{"decision":"block","reason":…}`, respecting the
   8-consecutive-block override (BG-5, R3).
4. `codex.ts` — `hooks.json` with the `"hooks"` wrapper and nested `hooks` array (V1,
   first-party doc; secondary sources claiming root-level event names are wrong);
   accumulate on `PostToolUse`, run on `Stop`. Prefer `turn_id` as the turn key — Codex
   is the only tool that supplies one directly.
5. Flip the Phase 2 step-3 guard test to assert all five generator ids emit hooks.

**Red-phase tests**: one suite per generator asserting path, wrapper shape, both
registrations (BG-2), correct event ids per V1, and the tool-appropriate V4 channel.

---

### Phase 7: Validation and hand-off
**Goal**: full-suite green, the amendments applied, the capability registered.
**Dependencies**: Phases 5 and 6
**Estimated complexity**: Low
**Demo-critical**: no

1. `npm run typecheck` and `npm test` green; re-run `tests/canonical-fidelity.test.ts`
   to confirm no existing role/conductor output regressed (TG invariant 3).
2. Confirm BG-11: `templates/hooks/run-feedback.mjs` appears byte-for-byte in the
   generated `.sdd/feedback/run-feedback.mjs`.
3. Confirm BG-12 determinism across two full runs and path containment inside
   `targetDir`.
4. Audit, human gate, `Shipped:` stamp.
5. **`harny-sync` archive mode** then applies `contract.md`'s amendment table and
   creates `specs/current/feedback-controls.md` from `capability-template.md`, with
   stable ids in a fresh namespace prefix, and regenerates `_index.md`'s five tables
   including the new keyword rows (`hook`, `lint / type-check`, `CI / GitHub Actions`,
   `stack`, `feedback`) — **G6/SC15/SC16 land here, by the skill that owns
   `specs/current/`, not by hand.** `_index.md` is derived and never hand-edited
   (`skill-library.md` invariant 4), so this step cannot be pulled into an earlier phase.
6. `harny-adr` records the decisions meeting a significance criterion — at minimum the
   `renderHook`-as-method departure from ADR 0011, the no-YAML-dependency argument, and
   `harny-feedback`'s core-tier placement.

### Why the feature does not archive at the checkpoint

SC5 requires **all five** generators to emit a hook, so the feature cannot reach an
`APPROVED` verdict on Phase 4 alone. The workshop does not need it to: Phase 4 leaves a
working, demonstrable pipeline, and archival is a documentation-lifecycle event, not a
demo prerequisite. The alternative — splitting Phase 6 into a follow-on feature so this
one archives before Sep 26 — is **not** recommended: it would ship a `feedback-controls`
capability doc whose SC5 is false for four of five tools, which is precisely the
aspirational-documentation failure this feature exists to eliminate.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **R1 — Kiro trigger casing wrong** (V6: Kiro's own docs contradict each other); a wrong id fails silently with exit 0 | High | High | Phase 6 step 2 requires a **live Kiro run** as its acceptance check, not a re-read of docs; escalate R1 naming both spellings if unavailable. Post-Sep 26, so it never blocks the demo |
| **R2 — SC13 unverifiable in the authoring session** (settings load at startup, CR-1 class) | Certain | Medium | Phase 4 step 5 makes the restart a required, recorded action; "verified without restart" is a contract violation, not a reservation |
| Four `renderHook` stubs silently persist past Phase 6 (AL-P9 class) | Medium | High | Phase 2 step 3's generator-set guard test fails the suite the moment the set is stale |
| Adding a required `Generator` member breaks four generators at compile time mid-phase | Certain | Low | Anticipated: Phase 2 step 2 adds real `hooksPath` + `undefined`-returning `renderHook` to all five at once. The `undefined` return is a documented state (BG-14), not a placeholder artifact |
| Per-turn batching still too slow on a large repo (`tsc` is `whole-project`) | Medium | Medium | BG-9's probe skip and per-tool `timeout` fields (V1) bound it; `kind: 'test'` was deliberately excluded from `FeedbackCommand` as too slow for a per-turn hook |
| Cursor/Copilot findings consume a turn against their loop guards (R3) | Certain on findings turns | Low | Documented ceiling of those tools' surfaces; BG-5's re-entry check prevents runaway. Zero cost on clean turns |
| Interior insertion into `CORE_SKILL_IDS` shifts unrelated emission order (CLI-4) | Low | Medium | Phase 3 step 3 appends last — the only index-preserving position — with the argument recorded in `contract.md` |
| `.gitignore` edit breaks SL-10's load-bearing ordering | Low | High | Phase 4 step 1 pairs the edit with a `git ls-files` verification of the other two guarantees in the same step |
| Workshop slips because Phase 6 is treated as blocking | Medium | High | The checkpoint after Phase 4 is explicit; § "Why the feature does not archive" states the trade-off rather than leaving it implicit |
| Scope creep into ESLint-for-harny, gitleaks, or a second CI provider | Medium | Medium | All three are `intent.md` Non-Goals; `contract.md` § Dependencies argues the ESLint rejection explicitly so it is a decision, not a gap |

## File Change Map

**Phase 1**
- `src/feedback.ts` — CREATE — `STACK_PROFILES`, `resolveStackProfile`, path constants (G1)
- `src/generators/json.ts` — CREATE — deterministic `renderJson` (TG-5)
- `templates/hooks/README.md` — CREATE — canonical tool-neutral hook behavior (SC4)
- `templates/hooks/run-feedback.mjs` — CREATE — shared accumulate/run runner (G2)
- `tests/feedback.test.ts` — CREATE — mapping, normalization, escape hatch
- `tests/generators/json.test.ts` — CREATE — determinism
- `tests/hooks/run-feedback.test.ts` — CREATE — BG-1/BG-3/BG-4/BG-9

**Phase 2**
- `src/generators/types.ts` — MODIFY — `hooksPath`, `renderHook`
- `src/generators/claude-code.ts` — MODIFY — real `renderHook` (V1/V4/V5)
- `src/generators/{cursor,kiro,github-copilot,codex}.ts` — MODIFY — real `hooksPath`, `renderHook` returning `undefined`
- `templates/ci/harny-feedback.yml` — CREATE — `on: pull_request` workflow (G3)
- `src/engine.ts` — MODIFY — `buildFeedbackFiles`, `HookPayload`, `stackProfile`
- `src/init.ts` — MODIFY — assembly at lines 196–201; escape-hatch `io.warn`
- `src/config.ts`, `src/cli.ts`, `src/prompts.ts` — MODIFY — correct "captured only" comments (SC3)
- `tests/generators/claude-code.test.ts`, `tests/engine.test.ts`, `tests/init.test.ts` — MODIFY
- `tests/generators/registry.test.ts` — MODIFY — hook-emitting generator-set guard

**Phase 3**
- `.agents/skills/harny-feedback/SKILL.md` — CREATE
- `templates/skills/harny-feedback/SKILL.md` — CREATE
- `.claude/skills/harny-feedback` — CREATE — tracked relative symlink (SL-2)
- `src/vocabulary.ts` — MODIFY — append to `CORE_SKILL_IDS`; update ordering comment
- `.agents/skills/harny-implement/SKILL.md` + `templates/skills/harny-implement/SKILL.md` — MODIFY
- `.agents/skills/harny-audit/SKILL.md` + `templates/skills/harny-audit/SKILL.md` — MODIFY
- `tests/skill-library.test.ts`, `tests/skills-templates.test.ts`, `tests/config.test.ts`, `tests/prompts.test.ts` — MODIFY

**Phase 4**
- `.gitignore` — MODIFY — `!.claude/settings.json` (SL-10)
- `.claude/settings.json` — CREATE — generated, now tracked (SC13)
- `.github/workflows/harny-feedback.yml` — CREATE — harny's own PR gate (SC12)

**Phase 5**
- `AGENTS.md` — MODIFY — G7 vocabulary, `templates/` tree, skill list 8 → 9, CI clause removed
- `README.md` — MODIFY — line 21 toolchain claim (SC18)
- `plan.md` — MODIFY — lines 27, 45 (untracked locally; edit for consistency)
- `tests/packaging.test.ts` — MODIFY — three paths; `toHaveLength(25)`
- `specs/agent-feedback-controls/contract.md` — MODIFY — amendment manifest completed

**Phase 6**
- `src/generators/cursor.ts` — MODIFY — `afterFileEdit` + `stop`
- `src/generators/kiro.ts` — MODIFY — `postToolUse` + `agentStop` (R1)
- `src/generators/github-copilot.ts` — MODIFY — `postToolUse` + `agentStop`, `"bash"` key
- `src/generators/codex.ts` — MODIFY — `PostToolUse` + `Stop`, `turn_id`
- `tests/generators/{cursor,kiro,github-copilot,codex}.test.ts` — MODIFY
- `tests/generators/registry.test.ts` — MODIFY — guard set flipped to all five

**Phase 7** *(hand-off; written by `harny-document` / `harny-sync` / `harny-adr`, not by hand)*
- `specs/agent-feedback-controls/intent.md` — MODIFY — `Shipped:` stamp
- `specs/current/feedback-controls.md` — CREATE — from `capability-template.md` (G6)
- `specs/current/{skill-library,cli-init,tool-generators}.md` — MODIFY — amendments applied
- `specs/current/_index.md` — REGENERATE — five tables + new keyword rows (SC16)
- `specs/archived/agent-feedback-controls/decisions/*.md` — CREATE — ADRs
- `CHANGELOG.md` — MODIFY
