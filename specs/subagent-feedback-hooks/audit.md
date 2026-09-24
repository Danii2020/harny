# Audit: Subagent Feedback Hooks

## Requirements Checklist
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | Every path a subagent touches reaches a check on each wired tool | intent.md G1 | PASS | Claude Code, Cursor and Codex all register a subagent-completion event that runs the same runner over the same turn file. Caveat, already recorded as contract.md open questions 1–2 and not a defect of this implementation: on Codex the subagent's `accumulate` may still land under a different `turn_id`, and on Cursor `afterFileEdit` may not fire inside a subagent at all — in both cases the registration is inert, never wrong. |
| R2 | Findings reach the subagent at its own stop | intent.md G2 | PASS | Live subprocess run of the generated Claude Code `SubagentStop` command with a failing mapped command emitted the finding through `hookSpecificOutput.additionalContext`. Cursor and Codex reuse their existing, already-covered `followup_message` / `systemMessage` wrappers verbatim. |
| R3 | No finding the conductor sees today is lost by checking earlier | intent.md G3 | PASS | Live: the same finding was emitted by the subagent run and again by the subsequent turn-completion run, on the same turn file, on all three wired tools. Turn file present after the first, deleted after the second. |
| R4 | Only documented events wired; the rest recorded as probes | intent.md G4 | PASS | The three wired events match contract.md § Verified per-tool facts. Kiro and Copilot are untouched and their open status is recorded in contract.md § Open questions 3–4, together with the Codex `turn_id` (1) and Cursor `afterFileEdit` (2) probes — all four stated as open, none claimed to work. |
| R5 | SC5 — `templates/hooks/README.md` states the new behavior tool-neutrally | intent.md SC5 | DEFERRED | Task 3.1 is `[!]`, deliberately handed to the documentation role. Not scored here. |
| R6 | SC6 — R8 updated with this session's live Claude Code evidence and narrowed | intent.md SC6 | FAIL | `specs/current/feedback-controls.md:388` R8 is verbatim as at HEAD. contract.md § Integration Points defers this to "archive time", but `tasks.md` carries **no task at all** for it, in any phase or in Blocked Items — so it has no owner and no tracked deferral. See Audit Log F2. |

## Contract Compliance
| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | SF-1 same hook file and shape; no new path, artifact or `Generator` member | PASS | Rendered all five generators at HEAD and at working tree and diffed: `hooksPath` unchanged on all five (`.claude/settings.json`, `.cursor/hooks.json`, `hooks.json`, `.kiro/…`, `.github/…`); each new registration is a sibling key inside the existing `hooks` object in the tool's own already-shipped entry shape. `git diff src/generators/types.ts` empty — no `Generator` member added. No new file in a real five-tool `harny init` (85 files, same path set). |
| C2 | SF-2 same runner, same commands payload, plus `--keep-turn`; never `--whole-project` | PASS | Structural diff of each rendered config: the subagent command equals the turn-completion command plus the trailing `--keep-turn` (Cursor/Codex) or the in-script `,"--keep-turn"` array element (Claude Code); same `run-feedback.mjs` path, same inline `--commands` JSON; `--whole-project` absent from every rendered hook config on all five tools. |
| C3 | SF-3 `--keep-turn` is a boolean on `run`, inert under `--whole-project` | PASS | `parseRunArgs` gains one boolean beside `wholeProject`; the only behavioral branch is `if (!keepTurn) fs.rmSync(file, …)` at the end of `runRunMode`, after the `wholeProject` early return — so it is structurally unreachable under `--whole-project`. Confirmed live (see C8). |
| C4 | SF-4 turn file survives a subagent-stop run; at-least-once delivery | PASS | Drove the *generated* subagent command for all three wired tools as a real subprocess against a real `.sdd/feedback/.turns/<key>` file: turn file present after the subagent run, absent after the subsequent turn-completion run, on Claude Code, Cursor and Codex. With a deliberately failing mapped command, the finding was emitted at the subagent run **and** again at the turn-completion run. |
| C5 | SF-5 three tools wired on their documented events and channels | PASS | Rendered events are exactly `hooks.SubagentStop` (Claude Code), `hooks.subagentStop` (Cursor), `hooks.SubagentStop` (Codex). Channel strings present in each subagent command: `hookSpecificOutput.additionalContext`, `followup_message` + `loop_count`, `systemMessage`. Codex and Cursor subagent `timeout` = 60 = their `Stop`/`stop` timeout. |
| C6 | SF-6 emitted `hookEventName` matches each registration | PASS | Ran both generated Claude Code commands as subprocesses with a failing mapped command: `SubagentStop` emitted `{"hookSpecificOutput":{"hookEventName":"SubagentStop",…}}`, `Stop` emitted `"hookEventName":"Stop"`. Both exited 0 (non-blocking, BG-6 preserved). |
| C7 | SF-7 Kiro and Copilot hook bytes unchanged | PASS | Built HEAD into a scratch tree and rendered both generators from the HEAD `dist/` and the working-tree `dist/` with an identical payload: `.kiro/hooks/harny-feedback.json` and `.github/hooks/harny-feedback.json` are byte-identical, and neither contains `--keep-turn`. `git diff` on `src/generators/kiro.ts` and `src/generators/github-copilot.ts` is empty. |
| C8 | SF-8 component dispatch, filters, probe skip, re-entry guard, exit codes unchanged | PASS | The subagent path reaches `runRunMode` through the identical code path — the only `keepTurn` reference in the runner is the `rmSync` guard; nothing branches on "this was a subagent". Live: probe-skipped commands exited 0 silently; a failing mapped command exited 2 into the wrapper, which converted it to the tool's non-blocking channel and exit 0, identically for both events. |
| C9 | SF-9 FC-13 dogfood identity and CLI-14 component-invariance hold; goldens updated | PASS | `.sdd/feedback/run-feedback.mjs` is byte-identical to `templates/hooks/run-feedback.mjs` (`diff -q`). This repo's `.claude/settings.json` is byte-identical to `claudeCodeGenerator.renderHook` re-rendered from this repo's own `.sdd/harness.json`. The new registration is built from `runner` + `commands` only — component-independent, so CLI-14 holds. Exactly two golden files moved, both pure insertions (`10 0` numstat, zero removed lines), containing only the `SubagentStop` block; `PostToolUse` and `Stop` byte-unchanged; no other golden file is modified per `git status`. |
| C10 | SF-10 eighth README property is tool-neutral; tools named only as examples | N/A (deferred) | `templates/hooks/README.md` is unmodified; task 3.1 is explicitly `[!]` and deferred to the documentation role. Not scored against this implementation run. |

## Test Coverage
| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Turn file survives `run --keep-turn` and is deleted by the next plain `run`, which still sees the same paths (SF-4) | PASS | `tests/hooks/run-feedback.test.ts` — real subprocess, real turn file; independently reproduced by the auditor against a real `harny init` tree |
| T2 | `--keep-turn` changes nothing else: a finding still exits 2 with the same output, and is still reported by the next run | PASS | `tests/hooks/run-feedback.test.ts` — auditor also confirmed exit 0 on pass, exit 2 on finding, exit 0 under `stop_hook_active` (I6), all unchanged by the flag |
| T3 | `--keep-turn` with `--whole-project` touches no turn state (declared PASS at red time) | PASS | `tests/hooks/run-feedback.test.ts` — auditor confirmed `.sdd/feedback/.turns/` is not even created under `--whole-project --keep-turn`, and exit 2 is still unmediated (BG-19) |
| T4 | Claude Code renders `SubagentStop` with `hookEventName: "SubagentStop"`, driven as a real subprocess; `Stop` still `"Stop"` via the pre-existing block | PASS | `tests/generators/claude-code.test.ts` — auditor independently ran both generated commands under `sh -c` against a real runner and a real turn file; see Audit Log |
| T5 | Cursor renders `subagentStop` reusing the `followup_message` wrapper and the `stop` timeout | PARTIAL | `tests/generators/cursor.test.ts` — asserts the rendered command **string** only; nothing executes the Cursor wrapper, so the argv forwarding SF-4 depends on is unguarded. See Audit Log F1. |
| T6 | Codex renders `SubagentStop` with the `systemMessage` wrapper and the same timeout | PARTIAL | `tests/generators/codex.test.ts` — same string-only limitation as T5. See Audit Log F1. |
| T7 | Every subagent registration carries `--keep-turn`, the same `--commands` payload, and no `--whole-project` | PASS | `tests/generators/{claude-code,cursor,codex}.test.ts`, `tests/generators/registry.test.ts` |
| T8 | Kiro and Copilot register exactly their two documented events and no `--keep-turn` — asserted once, in the five-tool wiring-topology table, rather than as a per-file byte golden (a frozen capture of a generated file is a change-detector that goes stale on the first legitimate change; see the retired `codex-generator` block in `tests/canonical-fidelity.test.ts`) | PASS (weaker than the roadmap's wording) | `tests/generators/registry.test.ts` — the topology table catches a stray event or a stray `--keep-turn` on either unwired tool. It does not assert byte-identity, which is what roadmap.md's File Change Map asked for; the auditor verified byte-identity against HEAD by hand instead. See Audit Log F3. |
| T9 | Golden tree: `.claude/settings.json` joins the declared byte-comparison exceptions with its own generator-identity re-assertion; path set unchanged | PASS (with a coverage note) | `tests/e2e-init.test.ts` — the replacement assertion re-renders through the real generator, which is a genuine invariant, but it is generator-relative: it cannot detect an unintended generator change the way a frozen golden can. Since the two `.claude/settings.json` goldens were regenerated **and** excluded, they are now inert in this test. See Audit Log F4. |
| T10 | (added) This repo's own `.claude/settings.json` is byte-identical to what the Claude Code generator renders for its `.sdd/harness.json` — the FC-13/SF-9 dogfood half no test covered; the runner half already had a guard and is reused, not duplicated | PASS | `tests/canonical-fidelity.test.ts` — auditor re-verified independently: this repo's `.claude/settings.json` is byte-identical to a fresh `renderHook` for its own `.sdd/harness.json`, and `.sdd/feedback/run-feedback.mjs` is byte-identical to `templates/hooks/run-feedback.mjs` |
| T11 | (not written) SF-10's README property ordering — prose, verified by review: any mechanical form would be a source-text grep, which the `high-value-tests` rubric excludes | N/A (deferred with task 3.1) | — |
| T12 | (MISSING) Nothing executes the Cursor or Codex subagent wrapper, so the argv forwarding that makes `--keep-turn` reach the runner on those two tools is untested | MISSING | — (see Audit Log F1) |

## Audit Log
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| | | | | |

## Final Verdict
_(to be completed by the auditing role)_

**Status**: PENDING

**Summary**:

**Critical Issues** (must fix before merge):

**Warnings** (should fix, not blocking):

**Recommendations** (nice to have):
