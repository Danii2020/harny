# Roadmap: cli-skeleton

> **Ordering rationale.** Phases run inward-out: the toolchain must exist before
> anything compiles (P1); the canonical reader must exist before there is a payload to
> generate from (P2); the payload must exist before a generator can consume it (P3);
> only then can the interactive/CI surface wire it together (P4); packaging and the
> oracle comparison come last because they validate the assembled whole (P5).
>
> **Test-first note.** Per `AGENTS.md`, the default flow is red-first: `sdd-test-writer`
> authors the failing tests for **all five phases** from `contract.md` before the
> executor starts Phase 1, and those tests are reviewed at the second human gate.
> Phase 5 is therefore *validation of the assembled system and its packaging*, not
> "the phase where tests get written". Each phase below is complete when its slice of
> the pre-existing red tests goes green without editing them.
>
> Each phase cites the contract items and intent goals it satisfies.

## Implementation Phases

> **Amendment round 1 (2026-07-30, after the audit's REJECTED verdict).** The phase
> structure below is unchanged and still correct — no phase was added, removed, or
> resequenced. Three phases gained scope within their existing goals, all of it
> checklisted in `tasks.md`:
>
> - **Phase 2** — amended parsing rules 1/9/10/11 (metadata-block boundary, the general
>   authoring-blockquote exclusion, `authoringNote` observability) and the
>   `roleIds`/`roleOverrides` split with `mergeConfig`'s new required `templates`
>   parameter. Tasks 2.4a–2.4c, 2.8a–2.8c, 2.9a.
> - **Phase 4** — rewiring `cli.ts` and `prompts.ts` onto the split fields, plus the two
>   Error Handling rows that shipped unimplemented (mid-write partial-state disclosure;
>   warn-once on an unknown capability token). Tasks 4.3a, 4.7a, 4.9a, 4.9b.
> - **Phase 5** — five verification tasks (5.14–5.18) replacing checks that passed for
>   the wrong reason, and Task 5.19 (the re-run) reopened.
>
> Phases 1 and 3 are untouched. The risk table below records which risks materialized
> and why their original mitigations were insufficient.

### Phase 1: Project bootstrap & toolchain
**Goal**: Turn a Markdown-only repo into a buildable, testable, runnable Node+TS CLI
package — so that `node bin/harness.js --help` works and `vitest` can execute a test.
(Contract: Module map, Data Models — build and packaging, guarantees 17, 19; G1)
**Dependencies**: None
**Estimated complexity**: Low

1. Create `package.json` exactly per the contract's shape: name `harny`,
   `"type": "module"`, the single `bin` entry `harny` → `bin/harness.js`, the `files` allowlist,
   `engines.node >= 20.19.0`, the five scripts, and the verified dependency versions
   (`commander@15.0.0`, `@clack/prompts@1.7.0`; dev `typescript@7.0.2`,
   `vitest@4.1.10`, `@types/node@26.1.2`).
2. Create `tsconfig.json`: `nodenext` module/resolution, `es2023` target,
   `strict: true`, `verbatimModuleSyntax: true`, `rootDir: src`, `outDir: dist`,
   `include: ["src"]`.
3. Create `vitest.config.ts` with `environment: 'node'` and
   `include: ['tests/**/*.test.ts']`.
4. Extend `.gitignore` with `node_modules/` and `dist/`, leaving the existing entries
   untouched.
5. Create `src/vocabulary.ts` — the five closed vocabularies and their derived types,
   importing nothing (guarantee 21).
6. Create `src/errors.ts` — the `EXIT` table, `HarnessError` with `exitCode`, and
   `isHarnessError`.
7. Create `bin/harness.js`: shebang, `import { main } from '../dist/cli.js'`, set
   `process.exitCode`; no logic beyond that (guarantee 17).
8. Create a minimal `src/cli.ts` that builds a `commander` program with the `init`
   command declared (action still unimplemented) so `--help` renders and the phase is
   independently verifiable.
9. Confirm `npm install`, `npm run build`, `npm run typecheck`, and `npx vitest run`
   all execute.

### Phase 2: Canonical template engine
**Goal**: Read the shipped canonical layer as typed data — the single source of truth
for role content *and* for model-tier defaults — and turn a config into a payload.
(Contract: `src/vocabulary.ts`, `src/config.ts`, `src/templates.ts`, `src/engine.ts`,
the eight normative parsing rules, guarantees 1, 4, 5, 6, 7, 12; G3, G4, G9)
**Dependencies**: Phase 1
**Estimated complexity**: Medium

1. Implement `src/templates.ts` metadata parsing per the eight normative rules:
   heading detection, first-`: `-only splitting, snake→camel key mapping, fatal on
   missing required keys, **lenient on unknown keys**, fatal on an out-of-enum
   `cost_tier`.
2. Implement `parseCapabilityList`: comma tokens, `name (scope)` → `{ name, scope }`,
   unknown tokens preserved with `known: false`. This is what keeps the auditor's
   `write-files (audit.md only)` from being dropped (closes AL-7).
3. Implement `parseRoleTemplate` (body keyed off `## Role body`, blank-line-trimmed,
   otherwise verbatim) and `parseConductorTemplate` (metadata block of only
   `id`/`purpose`; body = everything after it). The conductor's reduced metadata is
   legitimate and must not be treated as an error (closes AL-7).
4. Implement `resolveTemplatesRoot()` from `import.meta.url`, and verify it resolves
   identically from `src/` under vitest and from `dist/` after a build.
5. Implement `loadCanonicalTemplates()`: read the five roles, the conductor, and the
   five spec-schema files (the latter byte-for-byte, never reformatted); fail with
   `TEMPLATE` naming the resolved root on any missing file.
6. Implement `src/config.ts`: `defaultConfig(templates)` deriving each role's tier
   from parsed `cost_tier` (guarantee 7 — no hardcoded tier literals anywhere in
   `src/`), plus `validateConfig`, `mergeConfig` (merging `roles` by id, never by
   position), `serializeConfig`, `loadConfigFile`, and the four flag-list parsers.
7. Implement `src/engine.ts`: `buildPayload` (enabled roles in `ROLE_IDS` order,
   conductor always present, `reducedGates` computed), the `SPEC_SCHEMA_DIR` /
   `HARNESS_CONFIG_PATH` constants, and `buildSharedFiles` emitting the five schema
   files plus `.sdd/harness.json` exactly once (guarantee 12, closes AL-5).
8. Grep-verify guarantee 4: no role/conductor/schema prose, and no `cost_tier`
   literal, exists anywhere under `src/`.

### Phase 3: Generator adapter interface & the Claude Code reference generator
**Goal**: Fix the contract every per-tool generator will implement, and prove it with
one working implementation whose output is diffable against this repo's live
`.claude/`. (Contract: `src/generators/types.ts`, `markdown-yaml.ts`,
`claude-code.ts`, `index.ts`, the Claude Code mapping tables, guarantees 1, 2, 3, 8,
10, 11, 16, 19; G5, G6, G7)
**Dependencies**: Phase 2
**Estimated complexity**: Medium

1. Define `src/generators/types.ts`: `WrapperFormat`, `GeneratedFile`,
   `CapabilityMapping`, and `Generator` — with `conductorPath` deliberately
   independent of `agentsDir`, and `roleFileName` returning a name (so `.md`,
   `.agent.md`, and `.toml` are all expressible). No implementation here.
2. Implement `src/generators/markdown-yaml.ts`: `yamlQuote` (escape `\` and `"`,
   encode newlines), `renderFrontmatter` (fields plus YAML `#` comment lines),
   `renderProvenance`, and `renderProjectConfigBlock` with the
   `GENERATED_BLOCK_BEGIN`/`END` markers. Built here rather than inside
   `claude-code.ts` because four of five future targets share it.
3. Implement `src/generators/claude-code.ts`: the mapping tables from the contract
   (`most-capable`→`opus`, `mid`→`sonnet`, `cheapest`→`haiku`; the six-capability
   token table), `mapCapabilities` returning both `tokens` and `notes`, and
   `mapModel` honouring `override` verbatim (guarantee 10).
4. Implement `renderRole`: frontmatter (`name`, `description` = purpose + invocation,
   `model`, `tools`) plus a YAML comment per capability note, the provenance line,
   then the canonical body **byte-for-byte** (guarantee 1), ending in exactly one
   newline (guarantee 19).
5. Implement `renderConductor`: Skill-style frontmatter, provenance, verbatim
   conductor body, then the delimited generated project-config block — the only place
   configuration may appear (guarantee 3).
6. Implement `src/generators/index.ts`: the registry, `getGenerator`, and
   `availableToolIds()` returning `['claude-code']` in this feature.
7. Add the interface-sufficiency evidence table in tests: the five targets' expected
   `agentsDir`, `roleFileName` result, `wrapperFormat`, and `conductorPath`, asserted
   to be expressible by the interface (guarantee 11).

### Phase 4: Integration — prompts, writer, and the `init` pipeline
**Goal**: Make `npx harny init` actually work, interactively and
non-interactively, safely and reversibly. (Contract: `src/prompts.ts`,
`src/writer.ts`, `src/init.ts`, `src/cli.ts`, the `runInit` 13-step sequence, the
interactivity resolution rule, the flag table, guarantees 9, 13, 14, 15, 18; G1, G2,
G6, G8)
**Dependencies**: Phase 3
**Estimated complexity**: High

1. Implement `src/writer.ts`: `planWrites` (conflict detection), `assertContained`
   (path containment, guarantee 15), `applyWrites` (conflict check strictly before the
   first write, recursive `mkdir`, guarantee 13).
2. Implement `src/prompts.ts` with `@clack/prompts`: the five questions in
   `plan.md` §4 order using the verified widget APIs, each `isCancel` result raising
   `HarnessError('CANCELLED')`; unimplemented tools offered with the
   "generator not shipped yet" hint; per-role tier `select` defaulting to the canonical
   tier plus a `custom…` path to a `text` model id.
3. Implement `confirmWrite` (skipped under `--yes`), returning `false` → `CANCELLED`.
4. Implement `src/init.ts` `runInit` following the contract's 13-step sequence exactly,
   with `templatesRoot`, `overrides`, and `io` as injected seams so tests can drive it
   against fixtures without a TTY.
5. Implement the reduced-gates warning (guarantee 9) and the per-tool skip warning,
   plus the `NO_GENERATOR` failure when no selected tool is available (guarantee 18).
6. Complete `src/cli.ts`: the full `init` flag table, `--model` repeatable collection,
   flag → `PartialHarnessConfig` translation, the interactivity resolution rule
   (`--yes` → `--config` → non-TTY error → interactive with preset questions skipped),
   and `HarnessError` → `ExitCode` mapping with `main` returning the code rather than
   calling `process.exit` (guarantee 17).
7. Wire `--dry-run` to print the plan and return `written: []` (guarantee 14).

### Phase 5: Validation, packaging & oracle comparison
**Goal**: Prove the assembled system against every guarantee that can only be checked
end-to-end — fidelity, determinism, packaging, and non-mutation of the canonical
layer. (Contract: guarantees 1–21, Error Handling Contract, Integration Points; G7,
G9, G10, and every success criterion in `intent.md`)
**Dependencies**: Phases 1–4
**Estimated complexity**: Medium

1. End-to-end run: `init --yes --tools claude-code` into a temp directory; assert the
   exact twelve-file manifest (5 roles, 1 Skill, 5 schema files, `.sdd/harness.json`)
   and exit code 0 with no TTY.
2. Fidelity check: for all five roles and the conductor, assert the canonical body is a
   byte-for-byte substring of the generated file (guarantee 1); assert configuration
   appears only inside the generated block (guarantee 3).
3. Scope-survival check: assert `audit.md only` appears in the generated
   `.claude/agents/sdd-auditor.md` (guarantee 8).
4. Canonical-default check: point `templatesRoot` at a fixture with a mutated
   `cost_tier` and assert the CLI's default tier follows it (guarantee 7).
5. Determinism check: run twice, diff the outputs, expect zero difference
   (guarantee 16).
6. Safety checks: `--dry-run` writes nothing (14); re-run without `--force` exits 3 and
   writes nothing (13); with `--force` succeeds; non-TTY without `--yes`/`--config`
   exits 2 (Error Handling row).
7. Packaging check: `npm pack --dry-run` includes `bin/`, `dist/`, and all eleven
   `templates/**` files and excludes `src/`, `tests/`, `specs/` (guarantee 20).
8. Non-mutation check: `git status --porcelain` shows no modification under
   `templates/` or `.claude/`; `src/` contains no canonical prose and no tier literal
   (guarantees 4, 5).
9. Oracle comparison: compare generated `.claude/agents/*.md` against the live files
   **structurally** — frontmatter keys present, `model` value per role, body provenance
   — explicitly *not* byte-wise, since the live files retain `<example>` blocks and
   `color:` keys the canonical layer intentionally dropped (Integration Points).
10. Toolchain sweep: `npm run typecheck` and `npm test` clean; record any dropped or
    unresolved item for `audit.md`.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `typescript@7.0.2` (the new Go port, released 2026-07-08) has emit or `nodenext` behaviour differing from TS 5.x in a way that breaks the `tsc`-only build | Med | Med | Phase 1 step 9 makes a real build the phase's exit criterion, so this surfaces on day one rather than at packaging. Documented fallback: pin `typescript@~5.9` — nothing in the source depends on TS 7 features, only on `tsc` emitting ESM. |
| A generator silently mangles canonical prose (reflow, heading shift, trailing-whitespace normalization) and nobody notices | Med | High | Guarantee 1 is asserted as a byte-for-byte substring check across all five roles plus the conductor (Phase 5.2), not as a fuzzy or snapshot match |
| **MATERIALIZED (AL-6)** — the *parser* never extracts part of a canonical body, so no generator ever mangles it and every fidelity check still passes | Med | High | **The row above did not cover this**: a substring check proves output contains the parsed body, not that the parsed body is the whole file. Mitigation is now Guarantee 23 + Task 5.14, which reads the raw canonical file and asserts literal expected text — deliberately **not** routed through the parser |
| Configuration leaks into canonical prose as the "obvious" way to honour a disabled gate | Med | High | Guarantee 3 quarantines config inside `GENERATED_BLOCK_BEGIN`/`END`; the contract forbids interleaving; Phase 5.2 asserts it |
| Tier defaults get hardcoded in `prompts.ts` because it is easier than threading templates through | High | Med | **MATERIALIZED (AL-4)** — rated `High` and it happened, three times (`cli.ts:57`, `config.ts:216`, `prompts.ts:80`, all `?? 'mid'`). Both stated mitigations missed it: the Phase 5.4 mutated-fixture test only covers the `defaultConfig` path, not the `--model` merge path where the literal actually sat, and the Phase 2.8 grep was never asserted as a test (T41 documents the clause as deliberately unasserted). Mitigation is now **structural**: `mergeConfig` takes a required `templates` parameter, so a fallback has nothing to fall back *from* — plus Task 5.18 asserts the grep that was skipped |
| A test passes for the wrong reason — varying two inputs at once, or asserting against the code's own output — and buys false confidence at the review gate | High | High | **MATERIALIZED three times this round** (AL-6 via self-referential T40; AL-2 via T32 varying gates *and* roles; AL-4 via T41's unasserted clause). Tasks 5.14, 5.16, 5.18 replace each with a check that can actually fail. Standing rule for the test writer: vary one thing per assertion, and never assert a parser's output against that same parser |
| Two config concerns share one field because they look similar, making one of them structurally impossible | Med | High | **MATERIALIZED (AL-1/AL-2/AL-3)** — selection and per-role override shared `roles`, and `mergeConfig`'s never-remove semantics made deselection unimplementable while the type mismatch crashed the TTY path. Mitigation: Guarantee 22 splits `roleIds` from `roleOverrides`, mirroring how `gates` already worked. Design smell to watch for: a new field that cannot use the same merge semantics as its closest existing sibling |
| The `Generator` interface turns out insufficient for the TOML or `.agent.md` target, discovered in week 3 after four generators are written against it | Med | High | Guarantee 11 plus the Phase 3.7 five-target evidence table; `conductorPath` and `roleFileName` were designed specifically for the two known-awkward cases |
| `templates/` is accidentally modified (e.g. a "quick fix" to a canonical file) | Low | High | Guarantee 5; Phase 5.8 `git status` check; the contract lists `templates/` as a read-only input |
| Prompt code is untestable, so the interactive path ships unverified and rots | High | Med | The non-interactive escape hatch is a first-class goal (G8) so `runInit` is fully testable; `prompts.ts` is kept to widget wiring only, with all decisions in `config.ts`/`init.ts` |
| YAML `#` comment lines inside frontmatter are rejected by some consumer's parser | Low | Med | Comments are valid YAML and only carry advisory capability notes; the same information is already present in the role body's own prose, so a rejecting parser loses nothing normative |
| Claude Code's tool-name vocabulary (`LS`, `TaskGet`, `mcp__context7__*`) drifts, invalidating the mapping table | Med | Low | The table is confined to `claude-code.ts` — one file, one table, no other module knows a tool name; the live `.claude/` files pin today's truth |
| Writing `.sdd/` collides with an unrelated existing convention in a user's repo | Low | Low | Conflict detection (guarantee 13) refuses to overwrite; `--force` is opt-in |
| Scope creep into the other four generators or MCP config because the interface makes them cheap | Med | Med | `intent.md` Non-Goals name them explicitly; `availableToolIds()` returning exactly `['claude-code']` is an asserted expectation, so an extra generator breaks a test |
| `npx` cold-start cost grows past usefulness | Low | Med | Two-runtime-dependency budget is a stated constraint; no bundler, no schema library |

## File Change Map

**Created — package & toolchain (Phase 1)**
- `package.json` — CREATE — package metadata, `bin` entries, `files` allowlist, scripts, pinned deps
- `tsconfig.json` — CREATE — `nodenext`/`es2023`/`strict`, `src` → `dist`
- `vitest.config.ts` — CREATE — node environment, `tests/**/*.test.ts`
- `bin/harness.js` — CREATE — executable ESM shim; sets `process.exitCode`
- `src/vocabulary.ts` — CREATE — the five closed vocabularies; imports nothing
- `src/errors.ts` — CREATE — `EXIT` table, `HarnessError`, `isHarnessError`

**Created — engine (Phase 2)**
- `src/templates.ts` — CREATE — canonical location, loading, metadata/body/capability parsing
- `src/config.ts` — CREATE — config shape, canonical-derived defaults, validation, merge, serialization, flag-list parsing
- `src/engine.ts` — CREATE — `buildPayload`, `buildSharedFiles`, `SPEC_SCHEMA_DIR`, `HARNESS_CONFIG_PATH`

**Created — generators (Phase 3)**
- `src/generators/types.ts` — CREATE — the `Generator` adapter interface (the week 3–4 contract)
- `src/generators/markdown-yaml.ts` — CREATE — shared wrapper helpers for the four MD+YAML targets
- `src/generators/claude-code.ts` — CREATE — the one reference generator
- `src/generators/index.ts` — CREATE — registry, `getGenerator`, `availableToolIds`

**Created — integration (Phase 4)**
- `src/writer.ts` — CREATE — plan, conflict detection, containment, apply
- `src/prompts.ts` — CREATE — the five `plan.md` §4 questions
- `src/init.ts` — CREATE — the 13-step `runInit` composition root
- `src/cli.ts` — MODIFY — expand the Phase 1 stub into the full flag table, interactivity rule, and error→exit mapping

**Created — tests (authored by `sdd-test-writer` before Phase 1; one file per module plus end-to-end)**
- `tests/vocabulary.test.ts`, `tests/errors.test.ts`, `tests/templates.test.ts`,
  `tests/config.test.ts`, `tests/engine.test.ts`, `tests/generators/markdown-yaml.test.ts`,
  `tests/generators/claude-code.test.ts`, `tests/generators/registry.test.ts`,
  `tests/writer.test.ts`, `tests/init.test.ts`, `tests/cli.test.ts`,
  `tests/e2e-init.test.ts`, `tests/packaging.test.ts`, `tests/canonical-fidelity.test.ts`
- `tests/fixtures/templates/**` — CREATE — a minimal canonical tree, including a variant
  with a mutated `cost_tier` (guarantee 7) and one with a malformed metadata block

**Modified**
- `.gitignore` — MODIFY — add `node_modules/`, `dist/`; existing entries untouched

**Deliberately untouched (read-only inputs)**
- `templates/**` — all eleven canonical files
- `.claude/**` — the live pipeline, used only as a comparison oracle
- `plan.md`, `AGENTS.md`, `CLAUDE.md`, `specs/canonical-role-templates/**`

**Handled after the audit, not by the executor**
- `README.md`, `CHANGELOG.md`, `AGENTS.md` — the `sdd-documentation` role updates these
  once the audit verdict is approved, per the pipeline's automatic non-gated handoff.
  The executor must not pre-empt it.
