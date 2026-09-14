# Audit: agent-feedback-controls

> **Audited 2026-09-13 by `sdd-auditor` (`harny-audit`).** Every row below was
> re-verified independently against the working tree — the toolchain was re-run, the
> generated artifacts were regenerated and byte-diffed, and the hook mechanism was
> exercised end to end as a real subprocess. Rows pre-filled by the executors were
> treated as claims to check, not as evidence; corrections are marked
> **[auditor correction]**.
>
> Ids are pre-mapped so the auditor does not invent the traceability: Requirements use
> `intent.md`'s own **SC** ids, Contract Compliance uses `contract.md`'s **BG**/**V**
> ids, and Test Coverage uses **T** ids tied to `tasks.md`.
>
> **Id-collision note:** `contract.md` already uses `R1`–`R4` for *reservations*. This
> file therefore does **not** reuse `R` for requirement rows — reservations keep their
> `R` ids in § Reservation Status below, and requirements are addressed by `SC` id.
>
> ---
>
> **RE-AUDITED 2026-09-13 by `sdd-auditor` (`harny-audit`), second pass — post-amendment
> A1.** After the first pass's APPROVED WITH RESERVATIONS verdict, `contract.md` was
> amended (§ "Post-audit amendment A1") to close finding **F1 (HIGH)**, and that
> amendment was implemented: `src/feedback.ts` gained `FeedbackInstall`/
> `StackProfile.ciInstall`, `templates/hooks/run-feedback.mjs` gained the CI-only
> `--whole-project` flag, and `src/engine.ts`'s `renderCiWorkflow` was rewritten to emit
> at most one install step plus exactly one runner invocation.
>
> This second pass did **not** re-derive from scratch what the first pass already
> verified line by line; it spot-checked for regression (the full suite, re-run by the
> auditor, is the strong signal) and spent its independent verification effort on what
> A1 changed. **Everything A1 claims was verified by execution, not by reading**: the
> real workflow was rendered through `buildFeedbackFiles`, parsed with a real YAML
> parser, and both of its `run:` shell scalars were executed verbatim under `bash -e`
> against real checkouts — including a deliberate, then-reverted type error to prove the
> gate goes red on a genuine finding.
>
> One new finding was raised in this pass (**F13, HIGH** — this repo's own dogfood
> artifacts were stale after A1, so F1 was closed in the product but still live in
> harny's own tracked workflow) and was **fixed and re-verified within this same pass**.
> One new LOW finding (**F14**) remains open. Rows the prior green-phase report marked
> `[executor, green-phase, UNAUDITED]` are now audited and carry `[auditor, A1 pass]`.
>
> Deferred items are carried forward **unchanged** and were not re-litigated: Tasks
> 4.7–4.12 (SC12/SC13/R2), Task 6.5 (R1), Phase 7.5–7.6 (post-sign-off hand-off).

## Requirements Checklist

| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| SC1 | Single named module/table maps `config.stack` → commands; no second copy of any command string in `templates/hooks/**`, `templates/ci/**`, or the skill body | intent.md G1 | PASS | `tests/feedback.test.ts`'s BG-7 grep gate now scans real content — `templates/ci/harny-feedback.yml` and `claude-code.ts`'s `renderHook` both interpolate `STACK_PROFILES` commands only at generation time, never as source literals — and passes (Task 2.6) |
| SC2 | Unrecognized/blank stack ⇒ defined non-fatal outcome; never a crash, never a silently empty hook/workflow | intent.md G1 | PASS | `tests/init.test.ts` Task 2.9 block: unresolved stack still writes `.claude/settings.json`, the runner and the workflow; `io.warn` names the value and every `STACK_PROFILE_IDS` entry; conductor block records "(no built-in profile)" |
| SC3 | `config.stack` read by a code path affecting output beyond `markdown-yaml.ts:54–55`; the three "captured only" comments corrected | intent.md G1 | PASS | `buildPayload` resolves `stackProfile` (Task 2.16), consumed by `renderCiWorkflow`/`renderHook`; `src/config.ts:49–50`, `src/cli.ts:168`, `src/prompts.ts:170` no longer say "captured only" (Task 2.19) |
| SC4 | `templates/hooks/` states the canonical behavior tool-neutrally: turn as unit, once per turn, deduped touched-file set | intent.md G2 | PASS | **[auditor]** Read `templates/hooks/README.md` in full: § "The behavior" states all six properties (turn is the unit, accumulate-dedup-run-once, empty turn silent, probe-false skip, findings before yielding, re-entry guard) with **no tool named**; every tool appears only under § "Attributed examples" afterwards — S7/PR-7 satisfied by construction, not by assertion |
| SC5 | Each of five generators emits its hook at the verified native path, bound to the verified turn-completion event, with dated first-party citation; none binds commands to a per-edit event | intent.md G2 | PASS | Phase 6 (Tasks 6.3/6.4/6.7/6.8) ships the remaining four `renderHook` implementations at their V1-verified paths (`.cursor/hooks.json`, `.kiro/hooks/harny-feedback.json`, `.github/hooks/harny-feedback.json`, `hooks.json`), each bound to its verified turn-completion event (`stop`, `agentStop`, `agentStop`, `Stop`). Every one of the five generators' accumulator entry invokes the shared runner's `accumulate` mode only, never `run` — asserted per tool by `tests/generators/{cursor,kiro,github-copilot,codex}.test.ts`'s "no mapped command is bound to the per-edit event (BG-3)" blocks. **[auditor]** Independently re-confirmed by rendering all five artifacts and comparing every field to V1 (paths, event ids, wrapper shapes, Copilot's `bash` key, Codex's `apply_patch` matcher). One caveat belongs to BG-18, not here: the *turn-completion* facts are all cited, but Kiro's and Copilot's *accumulator payload* field shape is not — see F3/R5 |
| SC6 | Canonical behavior survives adaptation on all five tools; gaps surfaced, never dropped | intent.md G2 | PASS | All five tools register both the accumulator and the turn-completion runner (BG-2); each delivers findings via its own V4-documented channel with no gap silently dropped: Claude Code/Codex non-blocking (`additionalContext`/`systemMessage`), Kiro non-blocking (STDOUT), Cursor/Copilot forced-continuation (`followup_message`/`{"decision":"block",…}`) — the only two tools with no non-blocking option, per V4's own table, not an implementation gap |
| SC6a | N edits across M files (N > M > 1) ⇒ exactly one invocation covering exactly M paths | intent.md G2 | PASS | **[auditor]** Not taken from the test suite alone: three real `accumulate` invocations (2× `src/feedback.ts`, 1× `src/engine.ts`) were piped into the **shipped** `.sdd/feedback/run-feedback.mjs`, producing a 3-line turn file; one `run` invocation then executed each command once over the 2 deduped paths (`eslint` skipped by probe, `tsc` run once, exit 0) and deleted the turn file. N=3, M=2, invocations=1 |
| SC7 | Exactly one GitHub Actions workflow written regardless of tool count | intent.md G3 | PASS | `tests/engine.test.ts` Task 2.4 block: `buildFeedbackFiles` emits exactly one runner + one workflow file across 1/3/5-tool selections, byte-identical regardless of tool count |
| SC8 | Workflow triggers on `pull_request` and runs the G1 commands | intent.md G3 | PASS | `tests/engine.test.ts` Task 2.5 block: workflow declares `pull_request`, mentions every resolved profile's distinctive command token, switches commands when the profile switches, and stays command-free (no `eslint`/`ruff`) when unresolved |
| SC9 | `harny-feedback` exists in both roots, satisfies six-key/five-section shape contract, bridged by tracked relative symlink | intent.md G4 | **PARTIAL** | **[auditor correction — was PASS.]** Two of three clauses hold and were re-verified by hand: both roots exist and `diff` is empty; frontmatter declares 5 of the 6 permitted keys and no others (no `disable-model-invocation`); the five body sections appear in the required order. **The third clause fails: the bridge symlink is not git-tracked.** `git ls-files .claude` returns only the eight pre-existing bridges, and `git status --porcelain` reports `?? .claude/skills/harny-feedback`. The link itself is correct (`lrwxr-xr-x … harny-feedback -> ../../.agents/skills/harny-feedback`) and `git check-ignore` confirms `.gitignore:6` re-includes it. **Mitigating fact, verified:** `git add -A --dry-run` does list `add '.claude/skills/harny-feedback'`, so an ordinary staging of this feature captures it — the whole feature is uncommitted, and several other new artifacts (`src/feedback.ts`, `templates/hooks/`) are untracked too, while `.claude/settings.json` and the other feedback artifacts were selectively staged. So this is "unmet at audit time and easy to lose", not "broken". No test catches it: `tests/skill-library.test.ts` asserts symlink-ness via `lstat`, never tracking, and `tests/canonical-fidelity.test.ts` explicitly allowlists the entry as contracted. See finding F2 |
| SC9a | `harny-feedback` ∈ `CORE_SKILL_IDS`, ∉ `OPTIONAL_SKILL_IDS`; counts 7/2/9 | intent.md G4 | PASS | **[auditor]** Verified against behavior, not only the unit tests: `src/vocabulary.ts` reads 7/2/9 with `harny-feedback` last in `CORE_SKILL_IDS`; a real `harny init … --skills none` still writes `.claude/skills/harny-feedback/SKILL.md`; `--skills harny-feedback` exits with the existing `USAGE` text ("…is always scaffolded and cannot be named with --skills…"), listing all seven core ids |
| SC10 | No second copy of a severity definition; maps onto `harny-audit`'s buckets by reference | intent.md G4 | PASS | `.agents/skills/harny-feedback/SKILL.md` Step 4 maps findings onto `harny-audit`'s CRITICAL/HIGH/MEDIUM/LOW by reference, restates no definition |
| SC11 | `harny-implement` and `harny-audit` updated in **both** `.agents/skills/` and `templates/skills/` in the same feature | intent.md G4 | PASS | Both roots' Step 4/5 and final checklist updated in this change (Tasks 3.12–3.14) |
| SC12 | A real PR against `harny` triggers the workflow; result visible on the PR | intent.md G5 | **DEFERRED (human decision)** | Tasks 4.7–4.8 were explicitly deferred by the human as non-blocking for "done" status, to be completed separately from this audit. Not counted as a failure. ~~**Auditor warning attached (F1):** as generated, the workflow will be **red** on that first PR — it runs `npx eslint` / `npx tsc --noEmit` after `actions/checkout@v4` with no dependency-install step and with `requires` probes ignored.~~ **[auditor, A1 pass — the F1 warning is withdrawn; both blockers are fixed.]** The workflow this repo would actually run on that PR is now A1's shape, and the auditor executed it end to end against a dependency-free copy of this working tree: `npm ci` → 63 packages, **exit 0**; then the runner invocation → ``skipped `eslint`: requirement not met``, `harny-feedback: 1 of 2 command(s) ran, 1 skipped.`, **exit 0** — `tsc --noEmit` genuinely ran and passed. The expected SC12 result is therefore a **green and meaningful** check, exactly what `contract.md` § A1 predicts. SC12 itself stays deferred to the human (only a real `pull_request` event proves the trigger) but is no longer **blocked** |
| SC13 | Tracked `.claude/settings.json` fires the hook at end of a live turn; findings reach the agent before it yields | intent.md G5 | **DEFERRED (human decision) — substantially evidenced** | Tasks 4.9–4.12 deferred by the human; R2's restart-and-record criterion stays the human's. **New auditor evidence, both halves exercised:** (a) *live accumulator* — this audit ran in a Claude Code session that started **after** `.claude/settings.json` existed (the R2 restart condition), and a real `Edit` to this file caused the `PostToolUse` hook to fire, writing `.sdd/feedback/.turns/<session-id>` containing exactly the edited path; the scratch file stayed invisible to `git status` (only the tracked `.turns/.gitignore` appears). (b) *`Stop` delivery* — the **verbatim `command` string from this repo's own `.claude/settings.json`** was executed as a subprocess against a turn holding one deliberately type-broken file; it emitted exactly one line of `{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"finding from \`tsc\` (exit 1): …TS2322…\nskipped \`eslint\`: requirement not met…"}}` and exited 0. What remains unobserved is only the delivery of that payload into a live agent's context, which is what R2 says requires the human |
| SC14 | Dogfood artifacts derived from the same canonical templates; divergence stated and justified | intent.md G5 | PASS — **[auditor, A1 pass: was transiently FAILED by F13, now re-verified]** | `.claude/settings.json`, `.github/workflows/harny-feedback.yml`, `.sdd/feedback/run-feedback.mjs` generated by invoking `buildPayload`/`claudeCodeGenerator.renderHook`/`buildFeedbackFiles` directly (not hand-authored). Byte-diffed against a genuine `harny init <scratch> --tools claude-code --stack typescript --yes` downstream run: all three artifacts identical, zero bytes of difference. The one recorded divergence (DC-4, process/scope only — the 22 non-feedback files a full `init` also writes were not generated into this repo, to avoid clobbering hand-authored `.claude/agents/**` and the symlink bridge) is written up in `contract.md` § "Dogfood generation divergence (Task 4.5, SC14)". **[auditor, A1 pass]** A1 broke this row and it has since been repaired: A1 revised the canonical runner and `renderCiWorkflow` **without** regenerating this repo's own copies, leaving a staged, pre-A1 `.github/workflows/harny-feedback.yml` (one raw step per command, no install) and a staged, pre-A1 `.sdd/feedback/run-feedback.mjs` (9034 bytes, zero occurrences of `--whole-project`) — finding **F13**. Both were regenerated and re-checked by the auditor: `diff templates/hooks/run-feedback.mjs .sdd/feedback/run-feedback.mjs` is **empty** (11728 bytes both), this repo's workflow is **byte-identical** to a fresh `harny init --stack typescript` rendering, `.claude/settings.json` was byte-identical throughout (A1 touched no generator), and the repo's own staged workflow was then executed end to end (install exit 0, feedback step exit 0, `.turns/` untouched). SC14's three artifacts are once again provably plain generator output |
| SC15 | `specs/current/feedback-controls.md` created from `capability-template.md`, all sections filled, stable ids in a fresh prefix | intent.md G6 | **N/A at audit time (post-sign-off hand-off)** | Roadmap 7.5 / Tasks 7.8 place this **after** the audit and the human gate, by `harny-sync` archive mode. Out of this audit's scope by the pipeline's own stamp-then-archive ordering (`AGENTS.md`, SW-7); not a gap. Verified only that no one hand-wrote it early: `specs/current/` carries no `feedback-controls.md` yet |
| SC16 | `_index.md` keyword rows added for `hook`, `lint / type-check`, `CI / GitHub Actions`, `stack`, `feedback` | intent.md G6 | **N/A at audit time (post-sign-off hand-off)** | Same hand-off as SC15 (Task 7.9). Verified `specs/current/_index.md` was **not** hand-edited in this working tree — `git status` shows it unmodified, which is the invariant that mattered during implementation |
| SC17 | `AGENTS.md` names the four-quadrant vocabulary and classifies each existing control | intent.md G7 | PASS | `AGENTS.md` new `## Feedforward vs. feedback` section: cites Fowler's harness-engineering article, table classifies role prompts/`AGENTS.md` conventions/`harny-standards`/three gates as feedforward-inferential, native hooks + CI as feedback-computational, feedback-inferential explicitly named "deliberately empty" |
| SC18 | `README.md:21` and the two `plan.md` lines become true or are corrected | intent.md G7 | PASS | All three reworded from "runs the toolchain" to "confirms the per-turn hook fired and CI is green", matching `.agents/skills/harny-audit/SKILL.md` Step 6a's actual verify-don't-re-run behavior (BG-17); `templates/conductor/sdd-conductor.md:68` and `.claude/skills/sdd-conductor/SKILL.md:47`'s "re-run the gates yourself" lines are out of this feature's scope (not among the two named locations) and were left untouched. **[auditor]** Re-read all four locations intent.md's own table named. The three rewordings are accurate descriptions of BG-17's shipped behavior. The fourth (the conductor's "re-run the gates yourself") is defensibly unchanged: it is an *instruction* to the conductor, not a claim that something already runs, and "verify, don't trust" remains correct. Flagged only as the residual under F11 — the reworded prose now asserts a green CI that has never executed |
| SC19 | All seven contradicted current-truth statements amended by name; `EXPECTED_TEMPLATE_FILES` and `toHaveLength` updated in the same change | intent.md (all) | PASS | `contract.md`'s existing "Amendments to shipped current-truth statements" table covers all seven (SL-1, CLI-10, TG-10, TG-1, TG-3 clarification, `AGENTS.md:25–26`, SL-10); verified each against the shipped code/spec state, one drift found and corrected (CLI-10: 25 → 26, the real `npm pack --dry-run` count). `tests/packaging.test.ts`'s `EXPECTED_TEMPLATE_FILES` gained the four missing paths and `toHaveLength(22)` → `(26)` in the same change |
| SC20 | `npm run typecheck` and `npm test` pass; artifacts respect S3 (determinism, containment, single trailing `\n`) | intent.md (all) | PASS | **[auditor]** Re-run by the auditor, not taken from the executors' report: `npm run typecheck` clean; `npm test` → **27 files, 439/439 passing**, 2.4 s, fully offline. S3 re-verified against real output rather than unit tests: two `harny init --tools all --stack typescript --yes` runs into separate temp dirs are `diff -r`-identical (determinism); all 74 written paths are relative and inside `targetDir`; each of the seven new artifact kinds ends in exactly one `\n` (byte-checked, no `\n\n`, no CRLF); the generated `.sdd/feedback/run-feedback.mjs` is byte-identical to `templates/hooks/run-feedback.mjs` |

## Contract Compliance

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| BG-1 | One run per turn: M deduped paths, each command executed exactly once | PASS | `tests/hooks/run-feedback.test.ts` — batching proof (Phase 1, runner in isolation) |
| BG-2 | Two-part mechanism always: every hook config registers both accumulator and runner | PASS | All five generators now register both: Claude Code (`PostToolUse`/`Stop`), Cursor (`afterFileEdit`/`stop`), Kiro (`postToolUse`/`agentStop`), Copilot (`postToolUse`/`agentStop`), Codex (`PostToolUse`/`Stop`) — each including the escape-hatch (no-resolved-profile) case. `tests/generators/{claude-code,cursor,kiro,github-copilot,codex}.test.ts`'s "both registrations" blocks, all passing |
| BG-3 | No per-edit invocation; accumulator never executes a mapped command | PASS | `tests/hooks/run-feedback.test.ts` (Phase 1, runner in isolation) |
| BG-4 | Empty turn is a no-op | PASS | `tests/hooks/run-feedback.test.ts` (Phase 1, runner in isolation) |
| BG-5 | Loop safety via re-entry flag; cannot drive the 8-block / loop_limit-5 guards | PASS | `tests/hooks/run-feedback.test.ts` (Phase 1, runner in isolation) |
| BG-6 | Findings reach the agent before it yields, via each tool's documented channel | PASS | All five tools resolved. Claude Code: `{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":…}}` on exit 2, else silent, exit 0. Codex: `{"systemMessage":…}` on exit 2, else silent, exit 0 (Stop's own non-blocking channel per V4). Kiro: always exits 0, forwards the runner's combined stdout/stderr verbatim (STDOUT-as-context). Cursor: `{"followup_message":…}` on exit 2 (its only `stop` channel, a forced continuation per V4), suppressed at/above `loop_count` 5. Copilot: `{"decision":"block","reason":…}` on exit 2 (its only `agentStop` channel). Each verified by a real-subprocess test against `tests/fixtures/hooks/fake-runner.mjs` in its own `tests/generators/*.test.ts` |
| BG-7 | Single source of command strings; no literal outside `src/feedback.ts` | PASS | `tests/feedback.test.ts` Task 2.6 grep gate, now scanning real content: `templates/ci/harny-feedback.yml` and `claude-code.ts` both interpolate commands at generation time only, never as a source literal |
| BG-8 | Escape hatch inert, never fatal, never silent; legible in four places | PASS | All four surfaces present: `resolveStackProfile` never throws (Phase 1); hook/workflow still written and inert (`tests/init.test.ts` Task 2.9); `io.warn` names the value + `STACK_PROFILE_IDS` (`src/init.ts`); conductor block records "(no built-in profile)" (`src/generators/markdown-yaml.ts`) |
| BG-9 | Absent tooling skipped with a notice, exit status unaffected | **PASS** | **[auditor, A1 pass — was PARTIAL, now closed.]** The original audit found this held in the runner but not in CI (`renderCiWorkflow` emitted one raw step per command and never consulted `requires` — F1). A1 rewrote `renderCiWorkflow` to invoke the same shared runner CI uses in every other case, so both surfaces now reach `probeSatisfied` through the identical code path. Re-verified by execution against this repo's own regenerated, staged workflow: `skipped \`eslint\`: requirement not met (tool not installed in this repo)`, exit 0. The guarantee now genuinely holds "on every surface this feature ships", as its own text claims |
| BG-10 | One workflow per run; `pull_request`; `pathMode` ignored in CI, and its steps are the runner (REWRITTEN by A1) | PASS | **[auditor, A1 pass.]** Re-rendered the real workflow for `typescript` (3 steps: checkout, one install step, one `run --whole-project` step), `python` (2 steps: checkout, one `run --whole-project` step, no install — R6), and the escape hatch (2 steps: checkout, one notice step — unchanged from pre-A1, as A1 specified). One step per command — the pre-A1 shape — is gone; confirmed by grep, zero occurrences. Executed both `typescript` steps verbatim under `bash -e`: install (`npm ci`, exit 0) then the runner invocation (`eslint` skipped, `tsc` genuinely ran, exit 0 clean / exit 2 with a deliberately introduced, then-reverted type error) |
| BG-11 | `run-feedback.mjs` byte-for-byte identical in generated output | PASS | `tests/engine.test.ts` Task 2.4 block's dedicated byte-for-byte check against `templates/hooks/run-feedback.mjs` |
| BG-12 | Determinism, containment, single trailing `\n`; JSON only via `renderJson` | PASS | `tests/init.test.ts` Task 2.8 block (two independent runs byte-identical; every hook/CI path relative, contained, single trailing `\n`); `.claude/settings.json` is emitted only through `renderJson` |
| BG-13 | Conflict detection before any write for pre-existing hook/CI paths | PASS | `tests/init.test.ts` Task 2.7 block: pre-existing `.claude/settings.json` without `--force` raises `CONFLICT` naming it, before any write |
| BG-14 | Skipped tools contribute no hook artifact | PASS | Two layers, both green: `tests/generators/registry.test.ts`'s hook-emitting-generator-set guard now asserts `renderHook` returns a `GeneratedFile` for **all five** registered generators (the "skip" state this guard protected in Phase 2 no longer exists — every registered generator emits); the actual per-run skip behavior (CLI-7 — a tool *not selected* via `--tools` contributes no artifact) is unaffected by this phase and remains covered by `tests/e2e-init.test.ts`'s exact-file-set assertions for each single-tool run (e.g. `--tools cursor` writes `.cursor/hooks.json` only, never `.kiro/hooks/**`/`.github/hooks/**`/`hooks.json`) |
| BG-15 | `harny-feedback` is core; `--skills none` still emits it; naming it is a `USAGE` error | PASS | `tests/config.test.ts` (Tasks 3.1/3.2), green — `withCoreSkills`/`parseSkillList` in `src/config.ts` are generic over `CORE_SKILL_IDS`/`SKILL_IDS`, so no `src/config.ts` edit was needed |
| BG-16 | Skill parity: both roots edited identically | PASS | `harny-feedback` SKILL.md byte-identical across roots (`tests/skills-fidelity.test.ts`); `harny-implement`/`harny-audit` edits landed in both `.agents/skills/` and `templates/skills/` in this change |
| BG-17 | Auditor verifies the hook ran and CI is green; does not re-invoke the tools | PASS | `.agents/skills/harny-audit/SKILL.md` Step 6a (mirrored in `templates/skills/harny-audit/SKILL.md`) explicitly verifies, and explicitly states it must not re-invoke the mapped commands |
| BG-18 | Every per-tool fact traces to a V1–V6 row with its 2026-09-13 first-party URL | **PARTIAL** | **[auditor correction — was PASS.]** True for every fact the artifacts are *shaped* by — path, event id, wrapper structure, feedback channel — all re-verified row by row against the five rendered artifacts. **One class of fact is asserted in code without a V-row behind it:** `kiro.ts` and `github-copilot.ts` each comment that the tool's post-edit payload "already matches the shape the shared, byte-frozen runner reads", i.e. that it carries `tool_input.file_path` plus a recognized turn key. V3 pins only "tool context JSON on STDIN" (Kiro) and "tool input payload" (Copilot) — neither field name is cited. Claude Code (`tool_input.file_path`), Cursor (`file_path`, and it is reshaped) and Codex (`tool_input`) *are* pinned. This is the AL-30 silent-failure class in its worst form: if the field differs, `accumulate` exits 0 having recorded nothing, the `Stop` runner sees an empty turn, and the tool looks instrumented while producing nothing. Recommend a new reservation R5. See finding F3 |
| V1 | Turn-completion event id, config path and wrapper shape correct per tool | PASS | All five confirmed by their own generator test: Claude Code `Stop`/`.claude/settings.json`/nested `{"hooks":{...}}`; Cursor `stop`/`.cursor/hooks.json`/`{"version":1,"hooks":{...}}`; Kiro `agentStop`/`.kiro/hooks/harny-feedback.json`/`{"version":"v1","hooks":[...]}`; Copilot `agentStop`/`.github/hooks/harny-feedback.json`/`{"version":1,...}` with the `"bash"` key; Codex `Stop`/`hooks.json`/the same nested shape as Claude Code |
| V2 | Accumulator present on every tool (no Stop payload enumerates touched files) | PASS | All five generators' accumulator registration verified present, including in the escape-hatch case, by each tool's "both registrations (BG-2)" test block |
| V3 | Correct accumulation surface per tool (Cursor `afterFileEdit`; Kiro `postToolUse`) | PASS | Cursor's `afterFileEdit` accumulator reshapes Cursor's flat `{file_path,session_id}` payload into `{tool_input:{file_path},…}` before piping to the shared runner's `accumulate` mode — verified end to end against the real, unmodified runner as a subprocess (`tests/generators/cursor.test.ts`'s dedicated flat-payload test). Kiro/Copilot/Codex's `postToolUse`/`postToolUse`/`PostToolUse` accumulators pass their payload through unmodified, since those tools' payloads already nest under `tool_input` (or are read directly by the runner) |
| V4 | Correct feedback channel per tool | PASS | Claude Code `hookSpecificOutput.additionalContext`; Cursor `{"followup_message":…}` with `loop_count`-5 suppression; Kiro exit-0 + STDOUT; Copilot `{"decision":"block","reason":…}` with `stop_hook_active` suppression (via the real shared runner); Codex `{"systemMessage":…}` with `stop_hook_active` suppression (via the real shared runner). Each verified by its own real-subprocess test |
| V5 | Claude Code mechanics: `matcher`, `${CLAUDE_PROJECT_DIR}`, `stop_hook_active` | PASS | `matcher`/`${CLAUDE_PROJECT_DIR}` tested in `tests/generators/claude-code.test.ts`; `stop_hook_active` handled in the shared runner (Phase 1, `tests/hooks/run-feedback.test.ts` BG-5 block), unchanged by this phase |
| IF-1 | `Generator` gains `hooksPath` (declarative) + `renderHook` (method); departure from ADR 0011 recorded | PASS | `src/generators/types.ts` — departure rationale recorded in both the interface doc comment and `contract.md`; `tests/generators/registry.test.ts` guards every generator declaring a non-empty, mutually distinct `hooksPath` |
| IF-2 | `src/feedback.ts` imports only `vocabulary.js`/`errors.js`; no import cycle (CLI-11) | PASS | Code review of `src/feedback.ts` (Phase 1) — module has zero imports, trivially satisfying the "only these two" ceiling with no cycle |
| IF-3 | `renderJson` is the only JSON serialization path (TG-5, invariant 1) | PASS | All five `renderHook` implementations emit JSON exclusively through `renderJson` — no hand-rolled `JSON.stringify(…, null, 2)` call outside it. `wrapPosixShellArg` (shell-argument quoting, the companion serialization concern for embedding wrapper scripts/commands JSON in generated `command`/`bash` strings) was likewise consolidated into `src/generators/json.ts` alongside `renderJson` and imported by all five generators, rather than re-literalled per tool (`AGENTS.md` S5) |
| IF-4 | `harny-feedback` appended **last** in `CORE_SKILL_IDS`; ordering comment updated | PASS | **[auditor correction — was PARTIAL; the blocking condition has since been resolved.]** `src/vocabulary.ts` appends `harny-feedback` last in `CORE_SKILL_IDS` and carries the updated ordering comment. The Task 3.3 test that was red at the time this row was written now passes: its assertion was corrected to the invariant the contract's own code snippet implies — the eight pre-existing ids keep their exact relative order (asserted against a hardcoded list, independent of `SKILL_IDS`), `harny-feedback` sits at index 6, `harny-adr` at 7. The auditor re-read the corrected test and confirms it did not weaken into a tautology. **Residual, documentation-only:** `contract.md` § "Insertion position" still claims appending "leaves all eight existing ids at their current indices", which is false at the flattened `SKILL_IDS` level (`harny-adr`/`harny-standards` shift 6/7 → 7/8) and true only of *relative order* and of the six core indices. See finding F6 |
| IF-5 | `runInit` still 13 steps (CLI-1); artifacts join the existing assembly step | PASS | `src/init.ts` — hook artifacts and `buildFeedbackFiles` join step 11 (the existing render/assembly step); the numbered 1–13 sequence is unchanged (the two new warnings are `9b`/inline, not new numbered steps) |
| DEP-1 | **No new runtime or dev dependency**; set unchanged from the five pinned packages | PASS | `tests/packaging.test.ts` "no dependency drift" block (unchanged, still green); `package.json` untouched by this phase — `renderJson` wraps `JSON.stringify`, the CI workflow reuses the existing `yamlQuote`, no new module added |
| BG-19 | **(A1, NEW)** In CI, a finding fails the job — exit 2 is not translated | PASS | **[auditor, A1 pass.]** Executed the real, staged runner-invocation step against this repo with a deliberately introduced type error in `src/feedback.ts`: `` finding from `tsc` (exit 1): `` + the real `TS2322` error, step exit **2** (red under `bash -e`'s propagation). Reverted the error: exit 0 again. `stop_hook_active` is never read in this code path (confirmed by inspection of `runWholeProject`), so the exit-2 signal is genuinely unmediated — the deliberate inverse of every hook wrapper, which never lets exit 2 fail the tool's own process |
| BG-20 | **(A1, NEW)** CI never touches turn state; no hook config may pass `--whole-project` | PASS | **[auditor, A1 pass.]** Both halves verified. CI half: ran the runner-invocation step against a checkout with `.sdd/feedback/.turns/` deleted entirely — commands ran, no directory was created, confirmed by `runRunMode`'s structure (`--whole-project` returns into `runWholeProject` before any STDIN read or turn-key resolution). Hook half: re-rendered all five tools' hook configs (`--tools all`) and grepped each for the literal `--whole-project` — zero occurrences in any of the five; across the entire generated tree the flag appears only in `.sdd/feedback/run-feedback.mjs` and `.github/workflows/harny-feedback.yml`, exactly where it belongs |
| BG-21 | **(A1, NEW)** The `python` profile's CI gate is probe-skip-only, by deliberate scope decision | PASS | **[auditor, A1 pass.]** Rendered the `python` workflow: no install step (2 steps total: checkout, runner invocation). Executed it under a stock-like `PATH` with neither `ruff` nor `mypy` present: `skipped ruff`, `skipped mypy`, `harny-feedback: 0 of 2 command(s) ran, 2 skipped.`, exit 0 — legible, not silent, exactly as BG-21's text and reservation R6 describe. No Python install convention was silently invented; `python`'s `StackProfile.ciInstall` is genuinely absent, not merely empty |
| AM-1..7 | All seven amendments applied (SL-1, CLI-10, TG-10, TG-1, TG-3 clarification, `AGENTS.md:25–26`, SL-10) | PASS (manifest) / N/A (application) | **[auditor]** Split deliberately. The *manifest* is complete and correct: all seven rows are present in `contract.md` § "Amendments to shipped current-truth statements", and the auditor re-checked each against the shipped state — SL-1 nine/core, CLI-10 **26** (`find templates -type f` = 26, matching `tests/packaging.test.ts`'s `toHaveLength(26)`), TG-10 +1 hook artifact per resolved generator, TG-1 narrowed by `hooksPath`+`renderHook` (both present in `src/generators/types.ts`), TG-3 clarification, `AGENTS.md:25–26` CI clause removed (re-read; now "a demo application or any publishing tooling" plus a parenthetical naming the real workflow), SL-10 +1 tracked path (`.gitignore:3`). *Applying* them to `specs/current/**` is `harny-sync`'s post-sign-off step (Task 7.7) and is correctly not done yet — `git status specs/current` is clean |

### Auditor re-verification of the rows left at PASS

Every PASS row above was re-checked against behavior rather than accepted from its
executor note. What the auditor did directly, beyond re-running the suite:

- **Rendered all five hook artifacts** from the real generators and compared each
  field to `contract.md` V1: `.claude/settings.json` (nested `hooks`, `PostToolUse`
  `matcher: "Edit|Write"`, `Stop`, `${CLAUDE_PROJECT_DIR}`), `.cursor/hooks.json`
  (`version: 1`, `afterFileEdit` + `stop`, per-entry `command`/`type`/`timeout`,
  `followup_message` suppressed at `loop_count ≥ 5`), `.kiro/hooks/harny-feedback.json`
  (`"version": "v1"`, array-of-hooks, camelCase `postToolUse`/`agentStop`, always
  exit 0 + STDOUT), `.github/hooks/harny-feedback.json` (`version: 1`, the **`bash`**
  key, `postToolUse` + `agentStop`, `{"decision":"block"}`), `hooks.json` (nested
  `hooks`, `PostToolUse` `matcher: "apply_patch"`, `Stop`, `{"systemMessage":…}`).
  BG-2 holds on all five; BG-3 holds because every accumulator entry invokes the
  runner's `accumulate` mode only.
- **Exercised the shipped runner as a subprocess** for BG-1 (3 edits / 2 files ⇒ one
  run, 2 deduped paths), BG-4 (unknown turn key ⇒ exit 0, no output, no command run),
  BG-5 (same failing command: `stop_hook_active: true` ⇒ exit 0, `false` ⇒ exit 2),
  BG-9 (probe-false skip notice, exit unaffected).
- **Ran `harny init` for real**, twice with all five tools (`diff -r` identical —
  BG-12), once with one tool (BG-14/CLI-7: only `.claude/settings.json`, no other
  tool's hook file), once with `--stack cobol` (BG-8: `io.warn` naming the value and
  both profile ids, workflow notice step, hook commands `'[]'`, conductor block
  "Project stack: cobol (no built-in profile)" — all four surfaces legible), and once
  into a populated directory (BG-13: exit 3, the hook/CI paths listed as conflicts,
  nothing written).
- **Parsed the generated workflows with a YAML parser**: valid, `on: pull_request`,
  steps `Checkout` → `eslint (lint)` → `tsc (typecheck)` (or the single notice step in
  the escape-hatch case) — SC8/BG-10 hold as text *and* as YAML.
- **Confirmed BG-7's grep gate is real**, not nominal: it scans `src/`, `templates/`
  and `.agents/skills/` for each command's full joined `argv` and excludes only
  `src/feedback.ts`.
- **Confirmed BG-16 by diffing both skill roots**: `harny-feedback`'s `SKILL.md` is
  byte-identical across roots, and the new `harny-feedback` wording added to
  `harny-implement` Step 4 / final checklist and to `harny-audit` Step 6a is
  character-for-character the same in `.agents/skills/` and `templates/skills/`; the
  only remaining differences are the pre-existing, documented `S1–S6`/`S1–S7`
  generalizations. The SC11/BG-16 claim is genuine, not merely asserted.
- **Confirmed SC14 by byte-diff**: this repo's `.claude/settings.json`,
  `.github/workflows/harny-feedback.yml` and `.sdd/feedback/run-feedback.mjs` are
  byte-identical to a fresh `harny init --tools claude-code --stack typescript`
  generation performed by the auditor, and the runner is byte-identical to
  `templates/hooks/run-feedback.mjs`.

## Test Coverage

| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Alias matching, normalization, `undefined` for blank/unknown (Tasks 1.1) | PASSING | `tests/feedback.test.ts` (25/25) |
| T2 | `renderJson` determinism and trailing newline (Task 1.2) | PASSING | `tests/generators/json.test.ts` (5/5) |
| T3 | **Batching: N edits / M files ⇒ one invocation, M paths** (Task 1.3) | PASSING | `tests/hooks/run-feedback.test.ts` (8/8) |
| T4 | Accumulate mode never executes a mapped command (Task 1.4) | PASSING | `tests/hooks/run-feedback.test.ts` (8/8) |
| T5 | Empty turn is a no-op (Task 1.5) | PASSING | `tests/hooks/run-feedback.test.ts` (8/8) |
| T6 | Probe-false command skipped, exit status unaffected (Task 1.6) | PASSING | `tests/hooks/run-feedback.test.ts` (8/8) |
| T7 | Re-entry suppresses blocking response (Task 1.7) | PASSING | `tests/hooks/run-feedback.test.ts` (8/8) |
| T8 | Claude Code emits both registrations in the nested wrapper shape (Task 2.1) | PASSING (3/3) | `tests/generators/claude-code.test.ts` |
| T9 | No mapped command bound to a per-edit event (Task 2.2) | PASSING (2/2) | `tests/generators/claude-code.test.ts` |
| T10 | Hook-emitting generator set guard (Tasks 2.3, 6.2) | PASSING (11/11) — both halves: every generator declares a non-empty, mutually distinct `hooksPath`, and `renderHook` now returns a `GeneratedFile` for all five registered generators (the flip from Phase 2's `['claude-code']`-only set) | `tests/generators/registry.test.ts` |
| T11 | Runner + workflow emitted exactly once across 1/3/5 tools (Task 2.4) | PASSING (5/5, including the BG-11 byte-for-byte check) | `tests/engine.test.ts` |
| T12 | Workflow triggers on `pull_request` with profile commands (Task 2.5) | PASSING (3/3) | `tests/engine.test.ts` |
| T13 | No command-string literal outside `src/feedback.ts` (Task 2.6) | PASSING — now a live regression guard: `templates/ci/harny-feedback.yml` and `claude-code.ts` both exist and interpolate commands only at generation time, and the grep gate confirms no literal copy | `tests/feedback.test.ts` |
| T14 | `CONFLICT` on pre-existing `.claude/settings.json` without `--force` (Task 2.7) | PASSING (1/1) | `tests/init.test.ts` |
| T15 | Determinism, containment, trailing newline (Task 2.8) | PASSING (2/2) | `tests/init.test.ts` |
| T16 | Escape hatch: artifacts written, exit 0, warn, conductor block note (Task 2.9) | PASSING (1/1) | `tests/init.test.ts` |
| T17 | Skill tier membership and counts 7/2/9 (Task 3.1) | PASSING | `tests/config.test.ts` |
| T18 | `--skills none` still scaffolds; naming it is a `USAGE` error (Task 3.2) | PASSING | `tests/config.test.ts` |
| T19 | Appending preserves the eight pre-existing skills' emission order (Task 3.3) | **PASSING** — **[auditor correction — was FAILING]**; the assertion was corrected after that note was written, and the whole suite is now green. The auditor re-read the corrected test: it still asserts the eight pre-existing ids against a hardcoded list (so it cannot pass merely because `SKILL_IDS` changed), still feeds `buildSkillFiles` a deliberately reversed input order, and now asserts `emittedIds[6] === 'harny-feedback'` / `[7] === 'harny-adr'` — the invariant `contract.md`'s own `CORE_SKILL_IDS` snippet implies. Not a weakened test; the original assertion was the wrong one. The residual is documentation-only (F6) | `tests/engine.test.ts` |
| T20 | Skill byte-identical across both roots; shape contract satisfied (Task 3.4) | PASSING | `tests/skills-fidelity.test.ts` (byte-identity, new — required adding a `DIVERGENCE_TABLE['harny-feedback']` entry to the test file itself, per that file's own header comment naming this `harny-implement`'s job, Tasks 3.6/3.8); `tests/skills-templates.test.ts` (shape contract — generic/glob-driven, no new code needed) |
| T21 | `.claude/skills/harny-feedback` is a symlink (Task 3.5) | PASSING | `tests/skill-library.test.ts` — generic/glob-driven, no new code needed |
| T22 | Packaging manifest: the new `templates/**` paths and the length assertion (Task 5.6) | PASSING — **[auditor]** four paths added (`templates/skills/harny-feedback/SKILL.md`, `templates/hooks/README.md`, `templates/hooks/run-feedback.mjs`, `templates/ci/harny-feedback.yml`) and `toHaveLength(26)`. The row's own "three paths / 25" wording was the stale estimate; **26 is correct** — independently confirmed by `find templates -type f \| wc -l` = 26 | `tests/packaging.test.ts` |
| T23 | Per-generator hook suites for the remaining four tools (Task 6.1) | PASSING — all tests across the four files pass unedited against the real `renderHook` implementations (Tasks 6.3/6.4/6.7/6.8): Cursor (29/29 total in the file; the renderHook-specific blocks include the real-subprocess `afterFileEdit` flat-payload-reshape test and the `loop_count`-5 suppression test), Kiro (22/22), GitHub Copilot (27/27, including the real-shared-runner `stop_hook_active` re-entry test), Codex (43/43, including the real-shared-runner `stop_hook_active` re-entry test). Combined with T10's Task 6.2 flip (11/11), all 29 previously-red tests now pass. Full suite: 439/439 passing (27 files), zero regressions; `npm run typecheck` clean. `tests/e2e-init.test.ts` (outside this feature's red-phase set) required updating six hardcoded file-count assertions that encoded the Phase 2 stub state — same ripple class as the Phase 3 note in `tasks.md` § Notes | `tests/generators/{cursor,kiro,github-copilot,codex}.test.ts` |
| T24 | No regression in existing role/conductor output (Tasks 2.20, 7.2) | PASSING — **[auditor]** Phase 7 re-confirmation performed: full suite re-run by the auditor, 27 files / 439 tests, zero failures, `canonical-fidelity` included. The auditor also read that file's `isContractedEntry` allowlist and confirms each of its five classes is a genuinely contracted artifact of this feature (`templates/hooks/**`, `templates/ci/**`, `.claude/settings.json`, the ninth bridge symlink) rather than a silenced regression | `tests/canonical-fidelity.test.ts` |
| T25 | `run-feedback.mjs` byte-for-byte in generated output (Task 7.3) | PASSING — **[auditor correction — was PENDING/"TBD by test-writer"]**; the coverage already exists in `tests/engine.test.ts`'s Task 2.4 block, and the auditor additionally verified it against real CLI output (`diff templates/hooks/run-feedback.mjs <target>/.sdd/feedback/run-feedback.mjs` empty after a real `harny init`) | `tests/engine.test.ts` + real `harny init` output |
| T26 | `Stop` hook wrapper delivers findings via `hookSpecificOutput.additionalContext`, exit 0, never a forced continuation (BG-6, V4; Task 2.12 post-review resolution) | PASSING (2/2) — real-subprocess test against a fixture runner (`tests/fixtures/hooks/fake-runner.mjs`), confirmed failing (`expected 2 to be +0`) before the wrapper existed | `tests/generators/claude-code.test.ts` |
| T27 | `FeedbackInstall`/`ciInstall` shape: `typescript`'s npm-ci → npm-install fallback, each requiring non-empty `anyFile`; `python` has no `ciInstall` (Task A1.1) | **[auditor, A1 pass — re-verified, UNAUDITED marker removed] PASSING (29/29)** — `FeedbackInstall`/`StackProfile.ciInstall?` added to `src/feedback.ts` per contract.md § Interfaces/§ Data Models (Task A1.6); all three tests in the file's `ciInstall` describe block now pass unedited | `tests/feedback.test.ts` |
| T28 | BG-7 grep gate extended to `ciInstall[].argv` tokens, not duplicated (Task A1.2) | **[auditor, A1 pass — re-verified, UNAUDITED marker removed] PASSING** — now a live regression guard: confirmed no `ciInstall[].argv` token appears outside `src/feedback.ts` across `src/`, `templates/`, `.agents/skills/` | `tests/feedback.test.ts` |
| T29 | `renderCiWorkflow`: at most one install step + exactly one `run --whole-project` step, never one step per command, for `typescript`/`python`/escape-hatch (Task A1.3) | **[auditor, A1 pass — re-verified, UNAUDITED marker removed] PASSING (23/23)** — `renderCiWorkflow` rewritten (Task A1.7): `typescript` emits one install step (`ciInstall`'s gate chain, declaration order) + one runner-invocation step; `python` emits the runner-invocation step only (no `ciInstall`); the escape-hatch case is byte-unchanged (one notice step) | `tests/engine.test.ts` |
| T30 | Runner `--whole-project`: no turn file/turn-key required, `.turns/` never touched, `per-file` receives exactly `.`, probe-skip unchanged, finding still exits 2, `stop_hook_active` never honored (Task A1.4) | **[auditor, A1 pass — re-verified, UNAUDITED marker removed] PASSING (13/13)** — `--whole-project` added to `templates/hooks/run-feedback.mjs`'s `parseRunArgs`/`run` mode (Task A1.8); all 5 tests in the `run --whole-project` describe block pass as real subprocesses, unedited | `tests/hooks/run-feedback.test.ts` |
| T31 | No generated hook config passes `--whole-project` (Task A1.5) | **[auditor, A1 pass — re-verified, UNAUDITED marker removed] PASSING** — held throughout, since no generator was touched by A1 (confirmed: `git diff` shows zero changes to any of the five `src/generators/{claude-code,cursor,kiro,github-copilot,codex}.ts` files) | `tests/generators/registry.test.ts` |

> **[executor, 2026-09-13, green-phase for A1.6–A1.10] Unaudited.** The five rows above
> record that the A1 red-phase tests (T27–T31) now pass against the shipped
> implementation, not that they have been re-reviewed by `harny-audit`. Per the A1
> banner in `contract.md` and `tasks.md`, this work — `src/feedback.ts`'s `ciInstall`,
> `src/engine.ts`'s rewritten `renderCiWorkflow`, `templates/hooks/run-feedback.mjs`'s
> `--whole-project` flag, and the `templates/hooks/README.md` /
> `templates/ci/harny-feedback.yml` / `.agents/skills/harny-audit/SKILL.md` prose
> updates — needs its own audit pass before A1 is considered closed end-to-end. Full
> suite after this pass: 27 files / **451/451** passing, zero regressions;
> `npm run typecheck` clean.

> **[AUDITOR, 2026-09-13] The T19 finding below is RESOLVED and is retained only as
> the record of how.** The incompatibility was real as analyzed, and the executor was
> right to report rather than rewrite. It was resolved the correct way: the *test's*
> assertion — not `src/vocabulary.ts`, not `src/config.ts`, not
> `tests/config.test.ts` — was corrected to the invariant `contract.md`'s own
> `CORE_SKILL_IDS` snippet implies (`harny-feedback` last **within the core array**,
> hence `SKILL_IDS` index 6, not last of all nine). `tests/engine.test.ts` and
> `tests/config.test.ts` are now simultaneously green, and the suite is 439/439. What
> survives is a documentation defect only, carried forward as finding **F6**:
> `contract.md` § "Insertion position" still asserts a stronger index-preservation
> property than the code has. `tasks.md` Task 3.15 (`[!]`) and its Blocked Items entry
> are **stale** and should be updated to reflect the resolution (finding **F4**).
>
> **T19 finding (HIGH, discovered during Task 3.15 confirmation, not silently fixed).**
> `tests/engine.test.ts`'s "appending harny-feedback preserves emission order" test
> requires `SKILL_IDS[SKILL_IDS.length - 1]` to be `'harny-feedback'` (i.e.
> `harny-feedback` ordered **after** both `harny-adr` and `harny-standards`). This is
> mathematically incompatible with a separate, pre-existing, currently-passing
> `tests/config.test.ts` test ("a pre-feature config literal with no 'skills' key
> resolves to the defaults…"), which exercises `src/config.ts`'s `defaultConfig` /
> `mergeConfig` and requires the opposite relative order (`harny-feedback` **before**
> `harny-standards`), because `defaultConfig`'s `skills` field is built as
> `[...CORE_SKILL_IDS, ...DEFAULT_OPTIONAL_SKILL_IDS]` — a literal concatenation, not a
> `SKILL_IDS`-driven sort — and `CORE_SKILL_IDS` must end in `harny-feedback` (BG-15,
> SC9a). Since both `mergeConfig` (via `withCoreSkills`/`orderedUnique(…, SKILL_IDS)`)
> and `buildSkillFiles` (via `SKILL_IDS.indexOf`) read the *same* `SKILL_IDS` export, no
> single array ordering can satisfy "`harny-feedback` before `harny-standards`" and
> "`harny-feedback` after `harny-standards`" simultaneously. Verified by hand-tracing
> both code paths and by testing a second candidate `SKILL_IDS` ordering, which flips
> which test fails rather than fixing either. Resolving this needs either an amendment
> to `contract.md`'s "Insertion position" argument (whose "leaves all eight existing
> ids at their current indices" claim holds only for the six pipeline+sync ids, not for
> `harny-adr`/`harny-standards`, under the literal `CORE_SKILL_IDS`/`SKILL_IDS` code it
> shows) or a change to `src/config.ts`'s `defaultConfig`/`parseConfigFile` to route
> through `withCoreSkills` instead of raw concatenation — both out of scope for
> `src/vocabulary.ts`-only Tasks 3.10–3.11 and outside this pass's authorized file set
> (`src/config.ts` is Phase 2's exclusively while its green phase is in flight). Not
> resolved by editing `tests/engine.test.ts` — test bugs are reported, not silently
> rewritten. `src/vocabulary.ts` currently implements `contract.md`'s literal
> `CORE_SKILL_IDS`/`SKILL_IDS` code (harny-feedback appended last within
> `CORE_SKILL_IDS`, `SKILL_IDS` formula unchanged), which keeps 100% of
> `tests/config.test.ts` (29/29, including this pre-existing test) and BG-15/SC9a
> green, at the cost of this one `tests/engine.test.ts` assertion.

## Manual Acceptance Checks

> Not automatable. Each has a required action and an explicit exit criterion; none may
> be marked satisfied by inspection alone.

| ID | Check | Required action | Status | Evidence |
|---|---|---|---|---|
| MA-1 | SC12 — CI on a real PR | `gh pr create` against `main`; record run URL + `gh pr checks` output. `act`/`workflow_dispatch` do **not** count | **DEFERRED (human decision)** — not a failure | Explicitly deferred by the human as non-blocking for "done"; to be performed separately. Auditor confirms nothing was faked in its place: no PR exists, no run URL is claimed, and `act`/`workflow_dispatch` were not substituted. **Do finding F1 first** — as generated the run will be red |
| MA-2 | SC13 — hook in a live session | **New** Claude Code session; edit introducing a type error; capture transcript showing `additionalContext` findings | **DEFERRED (human decision)** — substantially evidenced by the auditor | The accumulator half **was** observed live in this audit's own session (started after `.claude/settings.json` existed): a real `Edit` produced `.sdd/feedback/.turns/4ec0eef3-…` containing exactly the edited path. The `Stop` half was executed verbatim from this repo's settings against a deliberately type-broken file and emitted the expected single `additionalContext` line, exit 0 (payload quoted in the SC13 row). Only the in-context delivery to a live agent remains for the human |
| MA-3 | SC13/BG-4 — edit-free turn | Capture a turn touching no files producing no hook output | **PASS (mechanism) / DEFERRED (live capture)** | Auditor ran the shipped runner with a turn key that has no turn file: no command executed, no stdout, no stderr, exit 0. The live-session capture stays with MA-2's human step |
| MA-4 | R2 exit criterion | Record that the restart was **performed**, or escalate R2 with the reason. "Verified without restart" is a contract violation | **SATISFIED as escalation** | SC13 is **not** marked verified anywhere — the required discipline. R2 remains open and human-gated; `tasks.md` Tasks 4.9–4.12 remain `[ ]` with the reason recorded. No one claimed the restart |
| MA-5 | R1 — Kiro trigger casing | **Live Kiro run** confirming the hook fires. Re-reading the contradictory docs does not close R1 | **OPEN — correctly escalated, not a defect** | No live Kiro install is reachable from this environment. Auditor confirms R1 was **not** closed by re-reading docs: `tasks.md` Task 6.5 is `[!]` with the reason, the Blocked Items entry names it, and the shipped artifact uses the `types/`-page camelCase form as V6 resolved. Stays open until someone with Kiro access confirms |
| MA-6 | R1 exit criterion | If no live Kiro: escalate R1 naming **both** candidate spellings | **CLOSED** | Verified by the auditor: `contract.md` § Open reservations R1 carries MEDIUM (human-gated) severity, cites V6's two disagreeing pages, and names both candidate spellings (camelCase `agentStop` vs. the `hooks/` page's PascalCase `PostFileSave`-style example). The exit criterion is met exactly as written |
| MA-7 | SC14 — dogfood provenance | Confirm dogfood artifacts derive from canonical templates; record any divergence | **CLOSED** | `.claude/settings.json` / `.github/workflows/harny-feedback.yml` / `.sdd/feedback/run-feedback.mjs` produced via the real generator code paths (`buildPayload`, `claudeCodeGenerator.renderHook`, `buildFeedbackFiles`), then byte-diffed against a `harny init` run against a scratch target with equivalent flags (`--tools claude-code --stack typescript --yes`) — `diff` empty for all three. Divergence (process/scope only, DC-4) recorded in `contract.md` § "Dogfood generation divergence (Task 4.5, SC14)". Also confirmed: `.gitignore`'s `!.claude/settings.json` line re-includes only that one path (`git status --ignored` shows `.claude/settings.local.json` still `!!`; `git ls-files` confirms `.claude/agents/**` untracked — **[auditor correction:]** but **eight**, not nine, `.claude/skills/harny-*` symlinks are tracked; `harny-feedback`'s bridge is present and correctly un-ignored yet never `git add`ed, see finding F2); and the resolved `typescript` profile actually skips `eslint` (`skipped \`eslint\`: requirement not met`, no `.eslintrc*`/`eslint.config.*` at repo root) and actually runs `tsc --noEmit` (clean baseline: silent exit 0; a deliberately introduced type error in `src/feedback.ts` was caught — `finding from \`tsc\` (exit 1)\`, run exit 2 — then reverted) when `.sdd/feedback/run-feedback.mjs` is invoked in `run` mode with this repo's own resolved commands. Tasks 4.7–4.12 (real PR, live-session restart) remain PENDING/out of scope for this pass |

## Reservation Status

> Carried from `contract.md` § Open reservations. The auditor records whether each was
> closed, remains open, or was escalated.

| ID | Reservation | Severity | Status |
|---|---|---|---|
| R1 | Kiro docs disagree on trigger casing; wrong id fails silently (AL-30 class) | MEDIUM (human-gated) | **OPEN — correctly escalated.** Not penalized in the verdict: the reservation was raised the way `contract.md` R1 itself requires (both spellings named, camelCase shipped with the reason, never closed by re-reading the same docs). Needs a human with Kiro access |
| R2 | SC13 unverifiable in the authoring session; requires restart (CR-1 class) | MEDIUM (human-gated) | **OPEN — correctly escalated**, and narrowed by this audit: the accumulator half was observed firing live and the `Stop` command was executed verbatim (see SC13/MA-2). What remains is only the human-side restart-and-record |
| R3 | Cursor/Copilot deliver findings only by forcing a continuation | LOW | **ACCEPTED — verified as the documented ceiling.** Auditor confirmed from the rendered artifacts that Cursor emits `followup_message` and suppresses it at `loop_count ≥ 5`, and Copilot emits `{"decision":"block"}` and relies on the runner's `stop_hook_active` suppression; both are silent on clean turns, so the cost is confined to findings turns exactly as R3 states |
| R4 | Kiro `fileSave`/`fileCreate` are IDE-only; accumulation uses `postToolUse` | LOW | **ACCEPTED — implemented as described** (`kiro.ts` accumulates on `postToolUse`, covering IDE and CLI). Note it does **not** cover the separate, newly-found payload-shape risk — see R5 below |
| **R5** | **(NEW, raised by this audit.)** Kiro's and GitHub Copilot's post-edit payload field shape is assumed, not cited: both generators pass the payload through unmodified on the premise that it carries `tool_input.file_path` and a recognized turn key, which `contract.md` V3 does not pin for either tool. If the assumption is wrong, `accumulate` exits 0 recording nothing and the turn looks empty — instrumented in appearance, inert in fact (AL-30 class, identical in kind to R1) | MEDIUM (human-gated) | **CLOSED (recording only).** Now present in `contract.md` § Open reservations, word-for-word matching this row. Closeable only by a live Kiro run and a live Copilot run, or by a first-party citation pinning both payloads' file-path field |
| **R6** | **(A1, post-audit.)** The `python` profile's CI gate is probe-skip-only: no `ciInstall`, so `ruff`/`mypy` are absent on a stock runner, both skip, and the job is green having checked nothing (BG-21) | MEDIUM (scope, deliberate) | **ACCEPTED — verified as the documented, legible ceiling.** [auditor, A1 pass] Executed the real `python` workflow under a stock-like `PATH`: `skipped ruff`, `skipped mypy`, `harny-feedback: 0 of 2 command(s) ran, 2 skipped.`, exit 0 — the vacuum is loud in the log, not silent. Scoped out deliberately (no single correct Python install convention to guess among pip/poetry/uv), not an oversight. Closeable by a future feature adding `ciInstall` to the `python` profile |
| **R7** | **(A1, post-audit.)** The `typescript` profile's install candidates cover npm only; a pnpm/Yarn-Berry repo can fall through to a working-but-wrong `npm install` and re-enter F1's exact failure (`npx` resolving an unrelated `tsc`) if the install doesn't actually populate `node_modules` correctly, since `ToolProbe` has no way to ask "is this tool installed *locally*" | MEDIUM (design, deferred) | **ACCEPTED — real, correctly-scoped deferral.** [auditor, A1 pass] Reproduced R7's exact failure mode directly: running the runner-invocation step against a dependency-free checkout (before the install step ran) gave `npx tsc` resolving an unrelated package, precisely as described. The robust fix (a `localBinary` probe kind checking `node_modules/.bin/<name>`) is out of A1's approved scope, which was CI reuse of existing probe logic, not a new probe kind |

## Non-Goal Scope Check

> `harny-audit` Step 3 requires confirming nothing from the Non-Goals list was
> implemented.

| Non-Goal | Status | Notes |
|---|---|---|
| Generic git hooks (`pre-commit`/`pre-push`) as the mechanism | CONFIRMED (not violated) | No `.husky/`, no `lefthook`, no tracked `pre-commit`/`pre-push` file, and no `src/`/`templates/` code path emitting one. The only hook surfaces generated are the five tools' native agent-lifecycle configs |
| Gitleaks / secret scanning | CONFIRMED (not violated) | No occurrence of `gitleaks` or any secret-scanning step in `src/`, `templates/` or `.github/`. The `cli-skeleton` forward reference stays narrowed to CI + hooks as intent.md declared |
| CI providers other than GitHub Actions | CONFIRMED (not violated) | No `.gitlab-ci.yml`, `.circleci/`, Jenkins or Azure Pipelines file anywhere in the tree; exactly one workflow template (`templates/ci/harny-feedback.yml`) and no provider-abstraction layer |
| Inferential feedback (AI review / LLM-as-judge) | CONFIRMED (not violated) | The generated workflow's steps, parsed as YAML, are `Checkout` plus one step per resolved `STACK_PROFILES` command — no reviewer action, no model call. `FeedbackCommand.kind` is the closed pair `'lint' \| 'typecheck'`. The quadrant is named as deliberately empty in `AGENTS.md`, which is the intended treatment |
| An `init.sh` readiness script | CONFIRMED (not violated) | No `init.sh` is tracked or generated |
| A conductor doc-readiness rule | CONFIRMED (not violated) | `git status` shows `templates/conductor/` and `.claude/skills/sdd-conductor/` **unmodified** by this feature; no doc-readiness delegation rule was added |
| A new pipeline role (`ROLE_IDS` stays five) | CONFIRMED (not violated) | `src/vocabulary.ts`'s `ROLE_IDS` is unchanged at five members; the capability shipped as the shared skill `harny-feedback`, and no generator's agent list gained an entry (a real five-tool `harny init` writes exactly five role artifacts per tool) |
| Re-tiering any existing skill (`OPTIONAL_SKILL_IDS` stays `harny-adr`, `harny-standards`) | CONFIRMED (not violated) | `OPTIONAL_SKILL_IDS` is still exactly `['harny-adr','harny-standards']` and `DEFAULT_OPTIONAL_SKILL_IDS` still exactly `['harny-standards']`. Only `CORE_SKILL_IDS` grew, 6 → 7 |
| Installing ESLint for harny itself | CONFIRMED (not violated) | Task 4.6 asserted the **skip**, not an install: no `.eslintrc*`/`eslint.config.*` at repo root, no ESLint added to `package.json`; the runner's `run` mode skips the `eslint` command with `skipped \`eslint\`: requirement not met (tool not installed in this repo)` and `tsc --noEmit` runs and reports real findings (verified with a deliberate, reverted type error) |
| Retrofitting archived specs | CONFIRMED (not violated) | `git status --porcelain specs/archived` is empty — not one archived file was touched. The stale "eleven files" claim is queued for `specs/current/cli-init.md` via the amendment manifest, exactly as intent.md required |

## Audit Log

| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-13 | sdd-auditor (`harny-audit`, full pass) | **F1 — the generated CI gate cannot pass as written.** `.github/workflows/harny-feedback.yml` runs `npx eslint` and `npx tsc --noEmit` after `actions/checkout@v4` with no dependency install and with `requires` probes ignored. Reproduced in a dependency-free checkout: eslint exit 2 ("couldn't find an eslint.config.*"), tsc exit 1 (npx resolves the unrelated `tsc` package). Harny's own PR gate would be red; every scaffolded Node repo inherits it; BG-9's skip-not-fail promise holds in the runner but not in CI | HIGH | **RESOLVED (in product) — see F13 for a follow-on gap this fix itself exposed.** [auditor, A1 pass] The human approved a `contract.md` amendment ("Post-audit amendment A1"); it was implemented (`FeedbackInstall`/`ciInstall`, the runner's `--whole-project` flag, `renderCiWorkflow` rewritten to invoke the shared runner instead of one raw step per command) and re-verified by execution: the real rendered workflow's steps were run verbatim, including a deliberate, then-reverted type error to prove the gate goes red on a genuine finding. BG-9/BG-10 rows above updated to PASS |
| 2026-09-13 | sdd-auditor | **F2 — `.claude/skills/harny-feedback` is untracked**, so SC9/SL-2's "git-tracked relative symlink" clause is unmet. Link and target are correct; `.gitignore:6` re-includes it; it was simply never `git add`ed while this feature's other feedback artifacts were staged. `git add -A --dry-run` does include it, so a normal staging closes it. Unenforced by tests (symlink-ness is asserted, tracking is not) | MEDIUM (LOW once staged) | **FIXED.** [auditor, A1 pass] `git ls-files .claude/skills` now lists nine bridges including `harny-feedback` (staged `A`), confirmed directly, not re-derived |
| 2026-09-14 | sdd-auditor (`harny-audit`, A1 re-audit pass) | **F13 — this repo's own dogfood artifacts were stale after A1, so F1 was closed in the product but still live in harny's own tracked workflow.** `.github/workflows/harny-feedback.yml` and `.sdd/feedback/run-feedback.mjs`, both staged from before A1 landed, were never regenerated: the workflow still had the pre-A1 one-raw-step-per-command shape (no install, no `--whole-project`), and the runner was 9034 bytes with zero occurrences of `--whole-project` (vs. the canonical 11728-byte file). Caught by execution, not by reading: the first run of the real staged CI step against this checkout exited 0 with **no output at all** — the old runner's "no turn key ⇒ silent exit 0" dead-code path, a vacuously green gate. `contract.md` § "Dogfood generation divergence" asserted "byte-identical… no content divergence of any kind", which was false the moment A1 shipped without a regeneration step; SC14's third clause was unmet as a direct result | HIGH | **FIXED, within the same pass that found it.** The conductor regenerated both files via the real generator code paths (`buildPayload`/`claudeCodeGenerator.renderHook`/`buildFeedbackFiles`), confirmed `diff templates/hooks/run-feedback.mjs .sdd/feedback/run-feedback.mjs` empty (11728 bytes both) and the workflow byte-identical to a fresh `harny init --stack typescript` rendering, staged both, then re-executed the exact real steps that first exposed the bug: `npm ci` (63 packages, exit 0), then the runner invocation — `` skipped `eslint`: requirement not met ``, `harny-feedback: 1 of 2 command(s) ran, 1 skipped.`, exit 0. No test currently compares this repo's own committed `.sdd/feedback/**`/`.github/workflows/**` against canonical or generated output, so a future canonical-runner change could silently reintroduce this class of drift — worth a regression test as a follow-up, not a blocker |
| 2026-09-14 | sdd-auditor (`harny-audit`, A1 re-audit pass) | **F14 — `harny-feedback`'s own SKILL.md was not updated for A1's CI-awareness clause.** BG-17's A1 extension (a green CI run alone is not sufficient evidence; read the `N of M ran` summary and report `N = 0` as a gap) landed in `.agents/skills/harny-audit/SKILL.md` Step 6a (and its `templates/skills/` twin, byte-identical — BG-16 holds), but `.agents/skills/harny-feedback/SKILL.md` Step 3's auditor-facing guidance still stops at "its latest run against the change is green", with no mention that a run which skipped every command is not evidence of anything. Contract-compliant — A1's integration list names only `harny-audit` — but the two skills now disagree in emphasis on the same point | LOW | **OPEN.** Add one sentence to `harny-feedback`'s Step 3 pointing at the same "N = 0 is a gap" rule `harny-audit` now states, so a human reading either skill gets the same guidance |
| 2026-09-13 | sdd-auditor | **F3 — Kiro's and Copilot's post-edit payload field shape is assumed, not cited** (BG-18). Both generators forward the payload unmodified on the premise it carries `tool_input.file_path`; V3 pins that field only for Claude Code, Cursor and Codex. A wrong field name silently accumulates nothing (AL-30 class) | MEDIUM | Raised as new reservation **R5**; record it in `contract.md` § Open reservations and close it with a live Kiro/Copilot run or a first-party citation |
| 2026-09-13 | sdd-auditor | **F4/F5 — status records out of date**: `tasks.md` Task 3.15 `[!]` and its Blocked Items entry still describe the T19 incompatibility as unresolved (it was resolved by correcting the Task 3.3 assertion; suite is 439/439), and eighteen demonstrably-complete tasks remain `[ ]` (1.1–1.7, 3.1–3.5, 6.1–6.2, 7.1–7.4) | MEDIUM | This file's rows corrected by the auditor (T19 → PASSING, IF-4 → PASS, T22/T25/T24 updated). `tasks.md` should be reconciled by `harny-implement` before archival |
| 2026-09-13 | sdd-auditor | **Mid-session deviations reviewed and found sound.** Phase 1's `templates.test.ts`/`canonical-fidelity.test.ts` allowlist fixes, the Task 3.3 assertion correction, the `additionalContext` wrapper resolution, and the human-authorized `.turns/.gitignore` exception were each re-checked against the working tree: the allowlists cover only genuinely contracted artifacts; the corrected Task 3.3 test still proves what it claims; the wrapper was verified by executing the real generated `command`; and the `.gitignore` mechanism was verified live — a turn scratch file written by the hook during this audit stayed invisible to `git status` while the `.gitignore` itself remained staged. The only residue is documentation drift (F4, F6, F7, F8) | LOW | No code change required; reword the affected `contract.md`/`tasks.md`/`.gitignore` lines |
| 2026-09-13 | sdd-auditor | **BG-17 self-check (this feature's own change to auditing behavior).** Step 6a was applied to this feature: the per-turn hook **was** observed firing live (a real `Edit` in this audit's session produced `.sdd/feedback/.turns/<session-id>` holding exactly the edited path, in a session started after `.claude/settings.json` existed), and the `Stop` command from this repo's own settings was executed verbatim and returned findings via `additionalContext` at exit 0. The **CI half could not be satisfied**: no workflow run exists, because no PR has been opened (deferred), and F1 says the first run would be red. Per Step 6a this is reported as a gap, not waived. The auditor did **not** re-invoke the mapped lint/type-check commands as an audit step — `npm test`/`npm run typecheck` were run under Step 5, which is a different obligation | MEDIUM | Closes when SC12 is performed after F1 is fixed |
| 2026-09-13 | sdd-executor (Phase 4 pass) | `contract.md` § State Changes claims `.sdd/feedback/.turns/` is "runtime-only, gitignored in the target repo," but no task/code implements this — confirmed via `git check-ignore -v` showing nothing ignores it, in this repo or any downstream-generated repo. Surfaced by Phase 4 dogfooding once the hook actually fired. | LOW (correctness gap between documented and actual behavior; cosmetic — untracked scratch noise, not a functional break) | **FIXED — human-authorized exception to the normal propose→test→implement sequence.** The executor correctly declined twice (once on principle, once because it would not act on approval relayed rather than stated directly by the human); the human then explicitly chose, in-conversation, to fix it now rather than route it through the full SDD flow. The conductor implemented it directly in the main thread as a result (`buildFeedbackFiles` in `src/engine.ts` now emits `.sdd/feedback/.turns/.gitignore`, content `*\n!.gitignore\n` — a bare `*` was tried first and found, via a real `git add` check in a throwaway repo, to self-ignore the ignore file itself, which would have silently defeated the mechanism on a fresh clone). A regression test was added to `tests/engine.test.ts` after the fact. `contract.md`'s State Changes table corrected to name the mechanism. This repo's own dogfood artifacts regenerated and confirmed `git add`-able. Full suite re-verified: 411/411 passing, typecheck clean. See `tasks.md` § Notes for the full account. |

## Final Verdict

**Status**: **APPROVED WITH RESERVATIONS**

**Summary**: **[Updated 2026-09-14, A1 re-audit pass.]** The feature is built as
specified and the parts that matter most were verified by execution, not by reading:
the per-turn batching, the escape hatch, loop safety, determinism, byte-identical
canonical fidelity and all five tools' hook shapes all hold against real generator
output, the Claude Code hook was observed firing in a live session during the first
audit pass, and the CI gate (post-audit amendment A1) was proven to genuinely lint/
typecheck and to go red on a real finding by executing its actual rendered steps,
including a deliberately introduced and reverted type error. Of the original audit's
five findings, **F1, F2, F4 and F5 are now fixed and verified**; **F3 is recorded**
as reservation R5, not yet closeable without a live Kiro/Copilot run. This pass raised
one new finding, **F13 (HIGH)**, and fixed it within the same pass: A1 revised the
canonical runner and CI-workflow logic but left this repo's own committed dogfood
artifacts stale, reproducing F1 specifically for harny's own future PR; both files
were regenerated, byte-diffed against canonical, and re-executed successfully. One new
LOW finding, **F14**, remains open (a documentation-emphasis gap in `harny-feedback`'s
own SKILL.md, not a functional defect). Approval carries reservations for R1
(Kiro casing), R2 (live-session restart), R5 (uncited Kiro/Copilot payload shape), R6
(Python CI is deliberately decorative), and R7 (npm-only install can re-enter F1 on
pnpm/Yarn-Berry) — all correctly recorded and none penalized as defects.

**Deferred by human decision — explicitly NOT counted against this verdict**:

- **Tasks 4.7–4.12 (SC12, SC13, R2)** — the real PR and the live-session restart. The
  human deferred these as non-blocking for "done", to be completed separately. Nothing
  was faked in their place, and SC13 was never marked verified, which is the discipline
  `roadmap.md` demanded.
- **Task 6.5 (R1)** — live Kiro confirmation of the `agentStop` casing. Correctly
  escalated as an open, human-gated reservation naming both candidate spellings, rather
  than closed by re-reading the same contradictory docs. This is the required behavior,
  not a defect.
- **Phase 7.5–7.6** — `harny-sync` archive mode (`specs/current/feedback-controls.md`,
  `_index.md` regeneration) and `harny-adr`. These run **after** this verdict and the
  human's sign-off, per the stamp-then-archive ordering. SC15/SC16/AM-application are
  marked N/A-at-audit-time for that reason; the auditor verified only that no one
  hand-wrote them early (`specs/current/` is untouched).

**Critical Issues** (must fix before merge): **none.**

**Warnings** (should fix, not blocking):

- **F1 (HIGH) — RESOLVED (2026-09-14, post-audit amendment A1, re-verified by
  execution).** Original text retained below for the record.
- **F1 (HIGH) — the generated CI gate cannot pass as written.**
  `.github/workflows/harny-feedback.yml` runs `npx eslint` and `npx tsc --noEmit` after
  `actions/checkout@v4` with **no dependency-install step** and with each command's
  `requires` probe ignored. Reproduced by the auditor in a dependency-free checkout of
  this repo's own sources: `npx eslint` → **exit 2** ("ESLint couldn't find an
  eslint.config.* file"), `npx tsc --noEmit` → **exit 1** ("This is not the tsc command
  you are looking for" — `npx` resolves the unrelated `tsc` package, and even with real
  TypeScript the check would fail on unresolved `commander`/`@clack/prompts` imports).
  Consequences: harny's own first PR (SC12) shows a red gate, which is the opposite of
  G5's dogfood claim; every scaffolded Node repo inherits the same; and BG-9's
  skip-not-fail promise — the guarantee whose own rationale is "a hook that fails
  because a linter is absent trains users to delete it" — holds only in the runner, not
  in CI. Note this is a **spec gap faithfully implemented** (BG-10 never asked CI to
  honor probes), so the fix is a contract amendment plus an implementation change, not
  a rebuke of the executor. Minimum viable fix: reuse the runner's probe logic in the
  CI step (or gate each step on its marker file) and add a dependency-install step for
  the `typescript` profile.
- **F2 — RESOLVED.** `git ls-files .claude/skills` now lists nine bridges including
  `harny-feedback`, staged. Original text retained below for the record.
- **F2 (MEDIUM→LOW once staged) — `.claude/skills/harny-feedback` is not git-tracked.**
  SC9 and SL-2 require a *tracked* relative symlink. The link exists and is correct and
  `.gitignore:6` re-includes it, but `git status` reports
  `?? .claude/skills/harny-feedback` while the other eight bridges are tracked and this
  feature's other new artifacts (`.claude/settings.json`, the workflow, the runner)
  were selectively staged. `git add -A --dry-run` confirms an ordinary staging does
  pick it up, so the risk is losing it in a selective commit rather than a broken
  mechanism — but as of this audit SC9's third clause is literally unmet. No test
  catches this — `tests/skill-library.test.ts` asserts symlink-ness, never tracking,
  and `tests/canonical-fidelity.test.ts` allowlists the entry as contracted. Consider a
  `git ls-files`-based assertion so SL-2's tracking clause stops being unenforced.
- **F3 (MEDIUM) — uncited payload-shape assumption on Kiro and GitHub Copilot (BG-18).**
  Both generators pass the post-edit payload through unmodified on the premise that it
  carries `tool_input.file_path` and a recognized turn key; `contract.md` V3 pins that
  field for Claude Code, Cursor and Codex but not for these two. A wrong field name is
  silent: `accumulate` exits 0 having recorded nothing and the turn looks empty. Raised
  as **R5**; add it to `contract.md` § Open reservations so it is carried like R1
  rather than living only in this file.
- **F4 — RESOLVED.** `tasks.md` Task 3.15 is now `[x] RESOLVED` with the full account;
  its stale Blocked Items entry was removed. Original text retained below for the
  record.
- **F4 (MEDIUM) — stale status records, corrected here.** `tasks.md` Task 3.15 is still
  `[!]` and the Blocked Items entry still describes the T19 incompatibility as
  unresolved, and this file's T19/IF-4 rows still said FAILING/PARTIAL, although the
  Task 3.3 assertion was corrected and the suite is 439/439. Corrected in this audit;
  `tasks.md` should be updated to match so the next reader is not misled.
- **F5 — RESOLVED.** All eighteen tasks flipped to `[x]`; the thirteen tasks still
  `[ ]` are exactly the human-deferred sets (4.7–4.12, 7.5–7.10), no longer ambiguous.
  Original text retained below for the record.
- **F5 (MEDIUM) — task-completion hygiene.** Eighteen tasks are still `[ ]` although
  demonstrably complete: the red-phase sets 1.1–1.7, 3.1–3.5 and 6.1–6.2 (every one of
  those test blocks exists, carries its `Spec:`/`Covers:` header, and passes) and the
  validation set 7.1–7.4 (typecheck, suite, BG-11, determinism — all re-confirmed by
  this audit). `harny-audit` Step 4 wants every task `[x]` or `[!]` with a reason;
  right now "not started" and "done but unticked" are indistinguishable, which is the
  same false-signal class this feature exists to remove.
- **F13 (HIGH) — RESOLVED within the A1 re-audit pass.** This repo's own committed
  dogfood artifacts (`.github/workflows/harny-feedback.yml`,
  `.sdd/feedback/run-feedback.mjs`) were stale after A1 landed — regenerated,
  byte-diffed against canonical (empty diff), and re-executed successfully (`npm ci`
  exit 0; `eslint` skipped, `tsc` genuinely ran, exit 0). See the Audit Log entry for
  the full account, including how it was caught (a real execution that silently
  exited 0 with no output, not a code read).
- **F14 (LOW) — open.** `harny-feedback`'s own SKILL.md Step 3 was not updated for
  A1's "green alone is not sufficient evidence" guidance, unlike `harny-audit`'s twin
  update. Add one sentence pointing at the same "N = 0 is a gap" rule.

**Recommendations** (nice to have):

- **F6 (LOW)** — `contract.md` § "Insertion position" claims appending
  `harny-feedback` "leaves all eight existing ids at their current indices". False at
  the flattened `SKILL_IDS` level (`harny-adr`/`harny-standards` shift 6/7 → 7/8); true
  of relative order and of the six core indices. Reword to what the corrected test now
  asserts.
- **F7 (LOW)** — `contract.md` § Dependencies says harny's dogfood profile "runs `tsc
  --noEmit` via the existing `typecheck` script". It does not: `STACK_PROFILES` runs
  `npx tsc --noEmit` directly, and `ToolProbe.script` is currently used by no profile
  at all. `tasks.md` Task 4.6's self-report repeats the inaccurate wording. Either fix
  the prose or switch the probe to `{ script: 'typecheck' }`.
- **F8 (LOW)** — the `.gitignore` comment still reads "the harny-* skill bridge is
  tracked"; `contract.md`'s amendment shows it as "…the harny-* skill bridge **and the
  shared feedback hook settings** are tracked". The functional line is correct and
  verified; only the comment drifted.
- **F9 (LOW, S6)** — `harny-standards` S6 says contract ids never appear in test names,
  yet this feature's `describe` titles carry `BG-*`/`SC*` ids. It is consistent with
  long-standing repo practice (85 such names across the suite, predating this feature),
  so the honest resolution is to reconcile the standard with reality rather than to
  single this feature out. Reported, per S6, as a finding; no fix applied.
- **F10 (LOW)** — four of five hook configs address the runner by a plain repo-relative
  path, silently depending on the tool invoking hooks with `cwd` at the repo root. Only
  Claude Code uses a documented project-dir macro, and only `kiro.ts` records the
  assumption in a comment. Same silent-failure family as R5; worth one sentence in
  `templates/hooks/README.md` or each generator's comment.
- **F11 (LOW)** — prose currently leads proof: `AGENTS.md` states this repo's workflow
  "runs on every PR" and `README.md`/`plan.md` describe the auditor confirming CI is
  green, while the workflow has never executed (SC12 deferred, and F1 says it would be
  red today). This is the aspirational-documentation pattern intent.md was written to
  end. Complete SC12 — after F1 — at or before merge, so the claim becomes true rather
  than pending.
- **F12 (LOW)** — `harny-feedback`'s Inputs/Guardrails name `src/feedback.ts` as
  **required**, and the file ships byte-identically into every scaffolded project,
  where it does not exist; the skill would then "report that as a finding and stop".
  Its own § Guardrails portability bullet already has the right formula ("or the
  project's equivalent") — apply it in Inputs and Step 1 too, the way `harny-standards`
  says "`AGENTS.md`, `CLAUDE.md`, or the project's equivalent". Structurally the skill
  is a faithful copy of the `harny-standards` precedent (shared role, writes none,
  pointer-not-copy, severities by reference); this is the one place the pointer is
  pinned to harny's own layout.
- Consider a regression test asserting the **CI** path honors probes once F1 is fixed,
  so the hook and the gate cannot drift apart again.
