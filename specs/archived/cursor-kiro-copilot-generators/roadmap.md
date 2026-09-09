# Roadmap: cursor-kiro-copilot-generators

> **Flow.** Default TDD applies (`AGENTS.md`): `sdd-test-writer` produces the red-phase
> tests for a phase before `sdd-executor` implements it. The phases below are ordered so
> that the shared layer changes land first — three generators written against a moving
> shared module would be three merge conflicts waiting to happen.
>
> **Build coupling (audit AL-20).** `npm test` does **not** build, and
> `tests/e2e-init.test.ts` spawns `bin/harness.js`, which imports `dist/`. Every phase
> that touches `src/` must run `npm run build` before trusting an end-to-end assertion.
> This is called out per phase rather than assumed.

## Implementation Phases

### Phase 1: Shared layer + AL-5 retrofit

**Goal**: Add the two shared helpers every new generator depends on, and close the
residual AL-5 gap uniformly across all four generators — before any new generator
exists, so no generator is written against a shape that is about to change.
**Dependencies**: None.
**Estimated complexity**: Low.

1. Add `yamlFlowSequence(values)` to `src/generators/markdown-yaml.ts` (contract
   § "Public API — `src/generators/markdown-yaml.ts`", guarantee 3).
2. Add `renderSpecSchemaPointerBlock(specSchemaDir)` to the same module, reusing the
   existing `GENERATED_BLOCK_BEGIN`/`GENERATED_BLOCK_END` markers so `cli-skeleton`
   guarantee 3 (configuration quarantined between markers) still holds (guarantee 8).
3. Import `SPEC_SCHEMA_DIR` (value) from `src/engine.ts` into
   `src/generators/claude-code.ts` and append the pointer block to `renderRole`'s
   output, per contract § "SUPERSEDES — role artifact shape for **all four**
   generators" (guarantee 8).
4. Confirm no runtime import cycle was introduced: `engine.ts` must still import
   nothing from any generator at runtime (`cli-skeleton` guarantee 21).
5. Update the Claude Code tests that pin the old role-artifact shape — extending the
   assertions, never loosening them (`tests/generators/claude-code.test.ts`).

### Phase 2: The three generators

**Goal**: Three sibling `Generator` implementations, each a faithful adapter of the
verified per-tool facts, each reusing the shared layer rather than re-deriving it.
**Dependencies**: Phase 1.
**Estimated complexity**: Medium — the logic per file is small; the risk is in the
mapping tables being right, which is why `contract.md` sources each one.

1. `src/generators/cursor.ts` — `agentsDir`, `roleFileName`, `conductorPath`,
   `mapModel` table, `mapCapabilities` (empty `tokens`, everything in `notes`),
   `isReadonlyRole`, `renderRole`, `renderConductor` (guarantees 1, 2, 5, 6, 7, 9).
2. `src/generators/kiro.ts` — same surface, plus the category-tag token table
   (`read`/`write`/`shell`/`web`/`@context7`) and the `task-tracking`/`docs-lookup`
   notes (guarantees 1, 2, 5, 9).
3. `src/generators/github-copilot.ts` — same surface, `<role>.agent.md` naming,
   `tools` deliberately unset, the github.com model caveat as an adapter note
   (guarantees 1, 2, 5, 9).
4. Implement the vendor-limit guards in the two generators that need them: Kiro and
   Copilot skill `description` ≤ 1024 chars, Copilot role body ≤ 30,000 chars, each
   throwing `HarnessError('TEMPLATE')` (guarantee 10, Error Handling Contract).
5. Emit each tool's conductor caveat as a `# harny note:` frontmatter comment
   (guarantee 7).

### Phase 3: Registry and CLI-surface integration

**Goal**: Make the three tools genuinely selectable end to end, and re-point every
existing test that used an unimplemented tool as a stand-in.
**Dependencies**: Phase 2.
**Estimated complexity**: Low, but touches several existing test files — the place
where an accidental coverage loss is most likely.

1. Register all three in `src/generators/index.ts` in `TOOL_IDS` order and update the
   module's doc comment, which currently states that only Claude Code ships
   (guarantee 1).
2. Update `tests/generators/registry.test.ts`: `availableToolIds()` is now four ids;
   only `codex` resolves to `undefined`. Keep the guarantee-11 five-target evidence
   table — it still covers Codex, which remains unimplemented.
3. Re-point the three existing tests that use `cursor` as "the unimplemented tool" at
   `codex`, preserving what each one actually asserts:
   `tests/cli.test.ts:131` (`--tools cursor` → exit 4), `tests/init.test.ts:147–168`
   (skipped-tool warning, and the all-unavailable case), `tests/prompts.test.ts:68–69`
   (the `generator not shipped yet` hint).
4. Extend `tests/e2e-init.test.ts` with per-tool runs and one four-tool run asserting
   the exact file sets and single-emission of the shared artifacts (guarantee 11).
5. `npm run build` before running the e2e additions (AL-20).

### Phase 4: Validation, fidelity and evidence

**Goal**: Prove the guarantees rather than assert them, using the verification
techniques `cli-skeleton`'s second audit pass established.
**Dependencies**: Phase 3.
**Estimated complexity**: Medium.

1. Extend `tests/canonical-fidelity.test.ts` to cover all four generators, slicing the
   canonical body out of the **raw** template file with `fs.readFile` — never through
   the parser (guarantee 12; AL-6/AL-23).
2. Add the "untouched modules" assertion backing guarantee 4: `src/generators/types.ts`,
   `templates.ts`, `engine.ts`, `writer.ts`, `prompts.ts`, `config.ts`, `cli.ts`,
   `init.ts`, `errors.ts`, `vocabulary.ts` unmodified by this feature (git-level check
   at review time, plus a test asserting no generator file contains a `---` literal or
   its own quoting routine — guarantee 3).
3. Assert the spec-schema pointer block is present in all 4 × 5 role artifacts and
   names exactly `SPEC_SCHEMA_DIR` (guarantee 8).
4. Assert determinism, containment and the single trailing newline for the three new
   tools (guarantee 13).
5. Mutation-test every new test: break the behavior it guards in `src/`, confirm it
   fails, restore (audit AL-21 — this is now a standing expectation in this repo).
6. Run the toolchain: `npx tsc --noEmit`, `npm run build`, `npx vitest run`,
   `npm pack --dry-run`, and `git status --porcelain -- templates .claude` (must be
   empty).
7. **Manual vendor verification** (not automatable, and the single highest-value
   check): generate into a scratch repo and confirm each tool actually loads its
   agents — Cursor lists the five subagents, Kiro lists them in its agent selector,
   Copilot recognizes `.github/agents/*.agent.md`. Record the outcome in `audit.md`.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A pinned model id is retired or renamed by a vendor, so generated agents fall back or fail at use time | High | Medium | Each table lives in exactly one place per generator (guarantee 9); `--model <role>=<literal>` is the documented user remedy; Phase 4.7 verifies against the live tools; `contract.md` records the verification date so staleness is visible rather than assumed |
| Kiro's `@context7` names an MCP server that is not configured, and Kiro treats an unknown reference as a hard error rather than an unavailable tool | Medium | Medium | Documented behavior is that unavailable tools are simply inaccessible; Phase 4.7 checks the real tool. If it errors, the fallback is to drop the token and keep only the note — a one-line change confined to `kiro.ts` |
| A tool's frontmatter parser is a lenient regex rather than a YAML parser and chokes on the `#` comment lines carrying capability notes | Medium | High (silently unusable agent files) | Comments are emitted after all key/value pairs (existing `renderFrontmatter` behavior), which is the most tolerated position; Phase 4.7 is the real check. If a tool rejects them, the fallback is to move that tool's notes into the body's generated block instead of the frontmatter |
| Copilot's `tools` omission grants broader access than the canonical `capabilities` intend | Medium | Low | Deliberate and disclosed (`contract.md` rationale + a per-artifact note); the alternative — a partially-correct allowlist — removes capabilities the pipeline needs, which fails silently and worse |
| The AL-5 retrofit changes `claude-code.ts`'s shipped output shape and a Claude Code test is loosened rather than extended to accommodate it | Medium | High | Phase 1.5 says extend, never loosen; the auditor should diff the Claude Code test assertions against their pre-feature versions specifically |
| Re-pointing the three `cursor`-as-stand-in tests at `codex` loses coverage (a test that no longer exercises what its name claims — exactly audit AL-19) | Medium | Medium | Phase 3.3 lists the three sites by file and line and requires the assertion substance to be preserved; mutation-test each (Phase 4.5) |
| Selecting Claude Code and Cursor together produces duplicate agents in two directories Cursor reads (D7) | Medium | Low | Disclosed in the generated Cursor conductor artifact and in `contract.md` Integration Points; no silent suppression or merging |
| Three generators land as three copy-pastes of `claude-code.ts` with drifted quoting/rendering logic | Medium | High | Guarantee 3 forbids per-tool YAML machinery and Phase 4.2 asserts it mechanically |
| Scope creep into Codex, MCP config or the agnostic layer, because the interface makes it cheap | Low | Medium | Explicit Non-Goals plus a first-class non-goal sweep in `audit.md`; `codex` must still resolve to `undefined` after this feature |
| Canonical content grows past a vendor limit later (Copilot's 30,000-char body) | Low | Medium | Guarantee 10's runtime guards turn it into a loud `TEMPLATE` error with the measured size, caught by the test suite rather than by a user |

## File Change Map

**Create**
- `src/generators/cursor.ts` — CREATE — the Cursor adapter (Phase 2.1).
- `src/generators/kiro.ts` — CREATE — the Kiro adapter (Phase 2.2).
- `src/generators/github-copilot.ts` — CREATE — the GitHub Copilot adapter (Phase 2.3).
- `tests/generators/cursor.test.ts` — CREATE — mapping tables, `isReadonlyRole`,
  render shapes, conductor, notes (Phases 2, 4).
- `tests/generators/kiro.test.ts` — CREATE — same, plus the category-tag table and the
  1024-char description guard.
- `tests/generators/github-copilot.test.ts` — CREATE — same, plus `<role>.agent.md`
  naming, the absent `tools` key, and the 30,000-char body guard.

**Modify**
- `src/generators/markdown-yaml.ts` — MODIFY — add `yamlFlowSequence` and
  `renderSpecSchemaPointerBlock` (Phase 1.1–1.2). Existing exports unchanged.
- `src/generators/claude-code.ts` — MODIFY — append the spec-schema pointer block to
  `renderRole`; import `SPEC_SCHEMA_DIR` from `../engine.js` (Phase 1.3). Mapping
  tables, frontmatter keys and the conductor path are **unchanged**.
- `src/generators/index.ts` — MODIFY — register the three generators; update the doc
  comment and `availableToolIds()`'s stated value (Phase 3.1).
- `tests/generators/markdown-yaml.test.ts` — MODIFY — cover the two new helpers
  (Phase 1).
- `tests/generators/claude-code.test.ts` — MODIFY — extend the role-artifact
  assertions for the pointer block (Phase 1.5).
- `tests/generators/registry.test.ts` — MODIFY — four available ids; only `codex`
  absent; keep the five-target evidence table (Phase 3.2).
- `tests/cli.test.ts` — MODIFY — line 131's `--tools cursor` → `--tools codex`
  (Phase 3.3).
- `tests/init.test.ts` — MODIFY — lines ~147–168's skipped-tool cases `cursor` →
  `codex` (Phase 3.3).
- `tests/prompts.test.ts` — MODIFY — lines ~68–69's `not shipped yet` hint assertion
  `cursor` → `codex` (Phase 3.3).
- `tests/e2e-init.test.ts` — MODIFY — per-tool file-set runs plus a four-tool run
  (Phase 3.4).
- `tests/canonical-fidelity.test.ts` — MODIFY — fidelity across all four generators,
  raw-file-sliced (Phase 4.1); the no-per-tool-YAML sweep (Phase 4.2).

**Deliberately untouched** (guarantee 4 — any change here is a finding, not a task)
- `src/generators/types.ts`, `src/templates.ts`, `src/engine.ts`, `src/writer.ts`,
  `src/prompts.ts`, `src/config.ts`, `src/cli.ts`, `src/init.ts`, `src/errors.ts`,
  `src/vocabulary.ts`, `bin/harness.js`, `package.json`, `tsconfig.json`,
  `vitest.config.ts`.
- `templates/**` and `.claude/**` — read-only inputs.
- `plan.md` — a planning artifact; discrepancies are recorded in `contract.md`.

**Handled after the audit by `sdd-documentation`, not by this feature**
- `README.md`, `CHANGELOG.md`, `AGENTS.md` — all three currently say only the Claude
  Code generator ships. Updating them is the automatic post-audit documentation step.
- `specs/cursor-kiro-copilot-generators/intent.md` — gets its `Shipped: <date>` stamp
  at that point.
