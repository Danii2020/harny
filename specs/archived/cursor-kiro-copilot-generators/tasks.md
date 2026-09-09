# Tasks: cursor-kiro-copilot-generators

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

Every task cites the `roadmap.md` phase step it belongs to and the `contract.md`
Behavior Guarantee (`Gu n`) or interface section it serves. Default TDD applies: the
`4.x`-numbered *test* tasks inside Phases 1–3 are red-phase work owned by
`sdd-test-writer` and precede the implementation task they guard.

## Phase 1: Shared layer + AL-5 retrofit

- [x] Task 1.1 (red): test `yamlFlowSequence` — quoting, joining, `[]` for empty input — `tests/generators/markdown-yaml.test.ts` (Phase 1.1, Gu 3, T1). Test written and passing (T1, 4 cases incl. the `a"b`/`c\d` escaping case) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 1.2 (red): test `renderSpecSchemaPointerBlock` — normative shape, opens with `GENERATED_BLOCK_BEGIN` and closes with `GENERATED_BLOCK_END`, names the passed directory — `tests/generators/markdown-yaml.test.ts` (Phase 1.2, Gu 8, T2). Test written and passing (T2), including the "names the passed directory, not a hardcoded value" case — confirmed in the full `npx vitest run` (192/192).
- [x] Task 1.3 (red): extend the Claude Code role-artifact test to require the pointer block after the canonical body, while re-asserting the unchanged frontmatter keys, model values and provenance — `tests/generators/claude-code.test.ts` (Phase 1.5, Gu 8, C19, T3). Test written and passing (T3); pre-feature assertions (path, `name`, `model: opus`, provenance) re-asserted alongside the new marker-ordering assertion — confirmed in the full `npx vitest run` (192/192).
- [x] Task 1.4: implement `yamlFlowSequence` — `src/generators/markdown-yaml.ts` (Phase 1.1, Gu 3)
- [x] Task 1.5: implement `renderSpecSchemaPointerBlock`, reusing the existing block markers — `src/generators/markdown-yaml.ts` (Phase 1.2, Gu 8)
- [x] Task 1.6: import `SPEC_SCHEMA_DIR` from `../engine.js` and append the pointer block in `renderRole` — `src/generators/claude-code.ts` (Phase 1.3, Gu 8)
- [x] Task 1.7: confirm no runtime import cycle was introduced (`engine.ts` still imports nothing from any generator at runtime) — `src/engine.ts`, `src/generators/claude-code.ts` (Phase 1.4, `cli-skeleton` Gu 21). Verified: `engine.ts` only has a type-only import of `GeneratedFile` from `./generators/types.js`, erased at compile time; `claude-code.ts` imports the `SPEC_SCHEMA_DIR` value from `../engine.js`. No cycle.
- [x] Task 1.8: run `npx tsc --noEmit` and the generator test files; confirm no Claude Code assertion was loosened relative to its pre-feature version — `tests/generators/claude-code.test.ts` (Phase 1.5). `tsc --noEmit` clean; `tests/generators/markdown-yaml.test.ts` + `tests/generators/claude-code.test.ts` = 26/26 passing.

## Phase 2: The three generators

### Cursor
- [x] Task 2.1 (red): test Cursor `mapModel` — `most-capable`→`claude-opus-5`, `mid`→`claude-4.6-sonnet`, `cheapest`→`gpt-5.4-mini`, plus a bracket-parameter override returned verbatim — `tests/generators/cursor.test.ts` (Phase 2.1, Gu 9, T4). Test written and passing (T4), including the `inherit` literal-override case — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.2 (red): test Cursor `mapCapabilities` — `tokens` always `[]`; one note per capability; the scoped-capability and unknown-token notes; the single `harny note` about `readonly` — `tests/generators/cursor.test.ts` (Phase 2.1, Gu 5, T5). Test written and passing (T5, 6 cases) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.3 (red): test `isReadonlyRole` and the conditional `readonly:` key — true for a synthetic read-only capability list, false (key absent) for all five real roles — `tests/generators/cursor.test.ts` (Phase 2.1, C16, T6). Test written and passing (T6), including the scope-qualifier case — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.4 (red): test Cursor `renderRole` — path `.cursor/agents/<role>.md`, quoted `name`/`description`/`model`, provenance line, verbatim body, pointer block, exactly one trailing `\n` — `tests/generators/cursor.test.ts` (Phase 2.1, Gu 12, 13, T7). Test written and passing (T7). Per AL-27, the pointer-block assertion this task's own name promised was added after the fact (`renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR)` containment) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.5 (red): test Cursor `renderConductor` — path `.cursor/skills/sdd-conductor/SKILL.md`, `name`/`description` only, the D7 overlap `harny note`, the project-config block — `tests/generators/cursor.test.ts` (Phase 2.1/2.5, Gu 6, 7, T8). Test written and passing (T8), including both compatibility paths (`.claude/agents`, `.codex/agents`) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.6: implement `cursorGenerator` and `isReadonlyRole` — `src/generators/cursor.ts` (Phase 2.1, Gu 1, 2, 5, 6, 7, 9)

### Kiro
- [x] Task 2.7 (red): test Kiro `mapModel` — `claude-opus-5` / `claude-sonnet-4.6` / `claude-haiku-4.5`, override verbatim — `tests/generators/kiro.test.ts` (Phase 2.2, Gu 9, T9). Test written and passing (T9) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.8 (red): test Kiro `mapCapabilities` — the category-tag table, dedup and stable order; `task-tracking` → note only; `docs-lookup` → `@context7` plus its note; scoped and unknown capabilities — `tests/generators/kiro.test.ts` (Phase 2.2, Gu 5, T10). Test written and passing (T10); `toEqual(['read','write','shell','web','@context7'])` pins order and dedup exactly against a deliberate duplicate input — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.9 (red): test Kiro `renderRole` — path `.kiro/agents/<role>.md`, `tools` rendered as a flow sequence through the shared helper, verbatim body, pointer block — `tests/generators/kiro.test.ts` (Phase 2.2, Gu 3, 12, T11). Test written and passing (T11), including the never-emitted-keys sweep and an all-five-roles no-throw case — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.10 (red): test Kiro `renderConductor` — path `.kiro/skills/sdd-conductor/SKILL.md`, `name` equal to the containing folder name, the skills-not-loaded-by-default `harny note` — `tests/generators/kiro.test.ts` (Phase 2.2/2.5, Gu 6, 7, T12). Test written and passing (T12) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.11 (red): test the 1024-character skill-description guard for Kiro — `HarnessError('TEMPLATE')` naming artifact, measured length and limit — `tests/generators/kiro.test.ts` (Phase 2.4, Gu 10, T13). Test written and passing (T13), both sides of the 1024-char boundary — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.12: implement `kiroGenerator`, including both conditional notes and the description guard — `src/generators/kiro.ts` (Phase 2.2/2.4, Gu 1, 2, 5, 6, 7, 9, 10)

### GitHub Copilot
- [x] Task 2.13 (red): test Copilot `mapModel` — `Claude Opus 5` / `Claude Sonnet 4.5` / `Claude Haiku 4.5`, override verbatim, values emitted quoted — `tests/generators/github-copilot.test.ts` (Phase 2.3, Gu 9, T15). Test written and passing (T15) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.14 (red): test Copilot `roleFileName` and the generated path `.github/agents/sdd-architect.agent.md` — `tests/generators/github-copilot.test.ts` (Phase 2.3, Gu 2, T14). Test written and passing (T14) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.15 (red): test Copilot `renderRole` — **no** `tools` key present anywhere in the frontmatter; every capability present as a note; the github.com model adapter note; verbatim body; pointer block — `tests/generators/github-copilot.test.ts` (Phase 2.3, Gu 5, C18, T15). Test written and passing (T15, 7 cases), including the never-emitted-keys sweep and an all-five-roles no-throw case — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.16 (red): test Copilot `renderConductor` — path `.github/skills/sdd-conductor/SKILL.md`, `name`/`description` only, the model-invoked `harny note` — `tests/generators/github-copilot.test.ts` (Phase 2.3/2.5, Gu 6, 7, T17). Test written and passing (T17) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.17 (red): test the 30,000-character body guard and the 1024-character skill-description guard for Copilot — `tests/generators/github-copilot.test.ts` (Phase 2.4, Gu 10, T13, T16). Test written and passing (T13, T16), both sides of both boundaries — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.18: implement `githubCopilotGenerator`, including both guards — `src/generators/github-copilot.ts` (Phase 2.3/2.4, Gu 1, 2, 5, 6, 7, 9, 10)

### Cross-cutting for Phase 2
- [x] Task 2.19 (red): test that the auditor's `audit.md only` scope text reaches the generated auditor artifact for all three tools, driven from the **real** canonical templates — `tests/generators/{cursor,kiro,github-copilot}.test.ts` (Phase 2, Gu 5, T18). Test written and passing (T18) in all three files, driven from the real canonical `sdd-auditor` template — confirmed in the full `npx vitest run` (192/192).
- [x] Task 2.20 (red): test that each of the three `renderConductor` implementations succeeds against the **real** canonical conductor (metadata `id`/`purpose` only) — `tests/generators/{cursor,kiro,github-copilot}.test.ts` (Phase 2, Gu 6, T19). Test written and passing (T19) in all three files, each pinning `Object.keys(metadata).sort()` before rendering — confirmed in the full `npx vitest run` (192/192).

## Phase 3: Registry and CLI-surface integration

- [x] Task 3.1 (red): update the registry test — `availableToolIds()` is the four ids in `TOOL_IDS` order; only `codex` resolves to `undefined`; the five-target evidence table is retained unchanged — `tests/generators/registry.test.ts` (Phase 3.2, Gu 1, T20). Test written and passing (T20); `toEqual` on the exact ordered array, five-target evidence table retained verbatim — confirmed in the full `npx vitest run` (192/192).
- [x] Task 3.2: register `cursorGenerator`, `kiroGenerator`, `githubCopilotGenerator` and update the module doc comment (it currently states only Claude Code ships) — `src/generators/index.ts` (Phase 3.1, Gu 1, C20)
- [ ] Task 3.3: re-point the `--tools cursor` → exit-4 case at `codex`, preserving the assertion substance — `tests/cli.test.ts` (Phase 3.3, T21)
- [ ] Task 3.4: re-point the skipped-tool warning and all-unavailable cases at `codex` — `tests/init.test.ts` (Phase 3.3, T21)
- [ ] Task 3.5: re-point the `generator not shipped yet` prompt-hint assertion at `codex`, and assert the three newly available tools carry **no** hint — `tests/prompts.test.ts` (Phase 3.3, T21)
- [x] Task 3.6 (red): end-to-end per-tool runs — `--tools cursor`, `--tools kiro`, `--tools github-copilot` each produce exactly the contracted file set and exit 0 — `tests/e2e-init.test.ts` (Phase 3.4, Gu 11, T22). Test written and passing (T22); exact-set `toEqual`, not `toContain` — confirmed in the full `npx vitest run` (192/192).
- [x] Task 3.7 (red): end-to-end four-tool run — 24 tool artifacts plus exactly one copy of each shared artifact, spec-schema files byte-identical to `templates/spec-schema/*.md` — `tests/e2e-init.test.ts` (Phase 3.4, Gu 11, T23). Test written and passing (T23) — confirmed in the full `npx vitest run` (192/192).
- [x] Task 3.8: run `npm run build` before executing the end-to-end additions, and record that the run was against a fresh `dist/` (AL-20) — `package.json` scripts unchanged (Phase 3.5). Ran `npm run build` (clean tsc build) immediately before `npx vitest run`; e2e-init.test.ts's 5 describe blocks (per-tool + four-tool run) all passed against that fresh dist/.

## Phase 4: Validation, fidelity and evidence

- [x] Task 4.1: extend canonical-fidelity coverage to all four generators, slicing bodies from raw template text with `fs.readFile` (never via the parser) for the five roles and the conductor — `tests/canonical-fidelity.test.ts` (Phase 4.1, Gu 12, T24). Added an independent (non-parser) `sliceRawRoleBody`/`sliceRawConductorBody` reimplementation plus a describe block exercising all 4 generators x 5 roles + conductor.
- [x] Task 4.2: add the sweep asserting no file under `src/generators/` other than `markdown-yaml.ts` contains a `---` literal, a quoting routine or a frontmatter serializer — `tests/canonical-fidelity.test.ts` (Phase 4.2, Gu 3, T25). Mutation-tested (see Task 4.5 note) by introducing a `---` literal into cursor.ts.
- [x] Task 4.3: assert the spec-schema pointer block appears in all 4 × 5 role artifacts and names exactly `SPEC_SCHEMA_DIR` — `tests/canonical-fidelity.test.ts` (Phase 4.3, Gu 8)
- [ ] Task 4.4 (red): determinism for the three new tools — two identical runs, byte-identical trees — `tests/e2e-init.test.ts` (Phase 4.4, Gu 13, T26). Pre-existing red-phase test; not authored here. Passes against this feature's implementation (verified in the full `npx vitest run`).
- [x] Task 4.5: mutation-test every new or changed test — break the guarded behavior in `src/`, confirm failure, restore — `src/generators/*.ts`, `tests/generators/*.ts` (Phase 4.5, AL-21). Mutated and confirmed-then-restored: Cursor `mapModel`'s mid-tier value, `isReadonlyRole`'s run-shell check, Kiro's 1024-char description limit constant, Copilot's 30,000-char body limit constant, `yamlFlowSequence`'s escaping (naive vs. `yamlQuote`-reuse), the spec-schema pointer block's directory text, a `---` literal injected into `cursor.ts`, and dropping Kiro from the registry map. Every mutation produced a test failure in the expected test(s); every mutation was reverted and the suite re-confirmed green.
- [x] Task 4.6: run the full toolchain — `npx tsc --noEmit`, `npm run build`, `npx vitest run` (zero skip/todo/only), `npm pack --dry-run`, `git status --porcelain -- templates .claude` (must be empty) — repo root (Phase 4.6, Gu 14, R17, R18). All clean: 0 tsc errors, build succeeds, 192/192 tests pass with zero `.skip`/`.todo`/`.only` in `tests/`, `npm pack --dry-run` produces a 32-file tarball including the three new `dist/generators/*.js`, and the templates/.claude porcelain check is empty.
- [x] Task 4.7: verify guarantee 4 mechanically — `git diff --stat` shows no change to `src/generators/types.ts`, `src/templates.ts`, `src/engine.ts`, `src/writer.ts`, `src/prompts.ts`, `src/config.ts`, `src/cli.ts`, `src/init.ts`, `src/errors.ts`, `src/vocabulary.ts`, `package.json` (Phase 4.2, Gu 4, 14, R14, R15). `git diff --stat` against all eleven paths is empty.
- [!] Task 4.8: manual vendor verification against a scratch repo — Cursor lists the five subagents and the `/sdd-conductor` skill; Kiro lists them in its agent selector; Copilot recognizes `.github/agents/*.agent.md`; record outcomes and any contradiction with `contract.md`'s verified-facts table (Phase 4.7, Gu 2). BLOCKED: requires a human with live Cursor, Kiro and GitHub Copilot installs — not automatable in this environment. Flagged for the auditor/human as the single outstanding item before this feature can be considered fully verified per roadmap.md's own framing ("the single highest-value check").
- [x] Task 4.9: non-goal sweep — no `src/generators/codex.ts`, no MCP configuration file written by any code path, no `templates/agnostic-layer/`, no new command, `templates/` unedited, `src/generators/types.ts` unchanged (Phase 4, R19). All confirmed absent/unchanged.

## Blocked Items

[None yet]

## Notes

- **`plan.md` is not a source of truth for any per-tool fact.** If an implementation
  detail is ambiguous, re-verify against the vendor documentation cited in
  `contract.md` § "Verified per-tool facts" and record the outcome — do not fall back
  to `plan.md` §3's table, which is the artifact this feature exists to correct.
- **The two model-table rows most likely to be wrong** are Cursor's `mid`
  (`claude-4.6-sonnet`) and `cheapest` (`gpt-5.4-mini`); they come from Cursor's own
  model grouping rather than from an explicit tier statement. Task 4.8 is where that
  gets checked against reality. Kiro's and Copilot's tables map onto each vendor's own
  frontier/mid/fast groupings directly.
- **Do not "improve" the canonical templates** to fit a tool. A canonical file that
  does not fit is an `audit.md` finding, per `intent.md` Non-Goals.
- **If the `Generator` interface turns out to be insufficient** for something not
  anticipated in `contract.md` § "Interface sufficiency finding", stop and raise it as a
  finding rather than amending `src/generators/types.ts` in passing — that file is on
  the deliberately-untouched list precisely so the deviation is visible.
- **`README.md`, `CHANGELOG.md` and `AGENTS.md` are out of scope here** and are updated
  by `sdd-documentation` after an approved audit; all three currently claim only the
  Claude Code generator ships.

## Execution Log

**Green-phase execution completed: 2026-08-20.** All non-`(red)` tasks across Phases
1–4 implemented and verified per the notes above. `npx vitest run`: 192/192 passing,
0 skipped/todo/only. `npx tsc --noEmit`: clean. `npm run build`: clean. `npm pack
--dry-run`: succeeds, 32 files. `git status --porcelain -- templates .claude`: empty.
`git diff --stat` against the eleven deliberately-untouched paths (Gu 4/14): empty.
Non-goal sweep (Task 4.9): clean. Outstanding: **Task 4.8** (manual vendor
verification against live Cursor/Kiro/Copilot installs) requires a human and is not
performed here — flagged for the auditor.
