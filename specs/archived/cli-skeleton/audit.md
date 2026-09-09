# Audit: cli-skeleton

> Compliance-tracking scaffold. All rows are seeded `PENDING`; the `sdd-auditor` fills
> in status and evidence after implementation. Traceability is reflexive: every `Rn`
> cites an `intent.md` goal (`Gn`) or success criterion (`SCn`), every `Cn` cites a
> `contract.md` interface or numbered Behavior Guarantee, and every `Tn` cites the
> guarantee or error-handling row it verifies.
>
> Unlike the previous feature (whose deliverable was Markdown), this deliverable is
> **executable code**, so the Test Coverage section tracks real automated tests run by
> the project's own runner (`vitest run`), not grep sweeps. The auditor is still
> expected to run the toolchain itself — `npm run typecheck` and `npm test` — rather
> than trusting the executor's report.

## Auditor's toolchain run (2026-07-30, run directly by `sdd-auditor`)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, 0 errors |
| `npm run build` (`tsc -p tsconfig.json`) | exit 0, 13 files emitted to `dist/` |
| `npx vitest run` | **106 passed / 106**, 15 files, 0 skipped, 0 todo, 0 only |
| `npm pack --dry-run --json` | 29 entries: `bin/harness.js`, 13 × `dist/**`, **11 × `templates/**`**, `AGENTS.md`, `CHANGELOG.md`, `README.md`, `package.json`; **zero** under `src/`, `tests/`, `specs/` |
| `git status --porcelain -- templates .claude` | empty |
| Hand run of the built CLI | `node bin/harness.js init <tmp> --yes --tools claude-code` → exit 0, exactly the twelve contracted files; two runs into separate dirs `diff -r`-identical |

Beyond the suite, the auditor exercised **every** Error Handling Contract row against
the real built CLI and confirmed each exit code individually (0/1/2/3/4/5 all observed
at the contracted rows), and re-derived guarantee 1, 12, 19 and 20 from the generated
artifacts rather than from the tests' own assertions.

## Requirements Checklist
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | From a clean checkout, `npm install && npm run build && npm test` succeeds and `node bin/harness.js --help` lists the `init` command | intent.md G1 / SC1 | PASS | Build, typecheck and 106/106 tests run by the auditor. `--help` renders `Usage: harny [options] [command]` and lists `init`. |
| R2 | Interactive `init` asks exactly the five `plan.md` §4 questions, in order, with all five roles and all three gates pre-selected and each role's tier equal to its canonical `cost_tier` | intent.md G2 / SC2 | PARTIAL | Question order, widgets and defaults are correct (`tests/prompts.test.ts`, code review of `src/prompts.ts`). **But** the preset path for question 2 is broken: with `--roles` in a TTY, `preset.roles.map(r => r.id)` yields `[undefined]` and the run aborts. See AL-1. |
| R3 | Tier defaults are derived from `templates/roles/*.md` at runtime: mutating a canonical `cost_tier` changes the CLI default with no source change | intent.md G4 / SC3 | PASS | `defaultConfig` reads `template.metadata.costTier`; the `mutated-cost-tier` fixture flips architect `most-capable`→`cheapest` with no source change (`tests/config.test.ts`). |
| R4 | `init --yes --tools claude-code` into an empty temp dir exits 0 with no TTY and produces exactly the twelve contracted files (5 agents, 1 Skill, 5 schema files, `.sdd/harness.json`) | intent.md G6, G8, G9 / SC4 | PASS | Reproduced by the auditor by hand and by `tests/e2e-init.test.ts` T36 (which spawns the real `bin/harness.js`). |
| R5 | Every generated role file parses as YAML frontmatter + Markdown carrying `name`, `description`, `model`, `tools`, with `model` = `opus`/`sonnet`/`haiku` per tier | intent.md G6 / SC5 | PASS | Inspected all five generated files: architect/auditor `opus`, test-writer/executor `sonnet`, documentation `haiku`. |
| R6 | For all five roles, the canonical `## Role body` appears byte-for-byte in the generated file | intent.md G7 / SC6 | PASS | Auditor re-ran the substring check against freshly generated output for all five roles: all `BODY-VERBATIM-OK`. |
| R7 | The auditor's scoped capability `write-files (audit.md only)` survives generation — the scope text is present in `.claude/agents/sdd-auditor.md`, not discarded | intent.md G5 / SC7 | PASS | Generated frontmatter carries `# capability note: write-files is scoped to audit.md only`. **AL-7 closed (capability half).** |
| R8 | `.sdd/spec-schema/` contains all five schema files byte-identical to `templates/spec-schema/*.md` | intent.md G9 / SC8 | PASS | `cmp` on all five generated vs canonical files: identical. **AL-5 closed.** |
| R9 | Loading succeeds for all six canonical files including the conductor, whose metadata legitimately lacks `cost_tier`/`capabilities`; covered by an explicit test | intent.md G3 / SC9 | PASS | `parseConductorTemplate` requires only `id`/`purpose`; real conductor loads. **AL-7 closed (conductor half).** |
| R10 | Deselecting roles or gates changes only the delimited generated block, never canonical prose; fewer than three gates emits a visible warning | intent.md G7 / SC10 | PARTIAL | **Gates half PASS**: `--gates` replaces wholesale, the warning names the missing gates, and only the delimited block changes. **Roles half FAIL non-interactively**: `--roles sdd-architect` still emits all five agent files (verified by hand). See AL-2. |
| R11 | Selecting a tool with no generator reports it as skipped without crashing or partial output; if no selected tool has a generator, exit is non-zero and nothing is written | intent.md G5 / SC11 | PASS | `--tools cursor,kiro` → two skip warnings, exit 4, target dir left empty. Mixed selection reports `skippedTools: ['cursor']` and still generates. |
| R12 | `init --dry-run` prints the full planned file list and writes nothing | intent.md G8 / SC12 | PASS | Target dir had 0 entries after `--dry-run`; all twelve paths printed. |
| R13 | Re-running `init` over existing output exits non-zero listing colliding paths, unless `--force` | intent.md G8 / SC13 | PASS | Exit 3 with all twelve collisions listed; `--force` → exit 0. |
| R14 | `init` in a non-TTY without `--yes` or `--config` exits non-zero naming both escape hatches, rather than hanging | intent.md G8 / SC14 | PASS | Exit 2, message names both `--yes` and `--config <file>`; returns immediately. |
| R15 | `npm pack --dry-run` lists `bin/`, `dist/`, and all eleven `templates/**` files, and nothing under `src/`, `tests/`, or `specs/` | intent.md G10 / SC15 | PASS | Verified via `npm pack --dry-run --json`. The explicit `files` allowlist — not `.gitignore` — is what excludes `specs/`. |
| R16 | `templates/` and `.claude/` are byte-for-byte unchanged by this feature | intent.md G3 / SC16 | PASS | `git status --porcelain -- templates .claude` empty after a full suite run plus several by-hand CLI runs. |
| R17 | `tsc --noEmit` and the test suite both pass with zero errors | intent.md G1 / SC17 | PASS | Run directly by the auditor. |
| R18 | Every `intent.md` Non-Goal is respected | intent.md Non-Goals | PASS | `src/generators/` holds exactly `types.ts`, `markdown-yaml.ts`, `claude-code.ts`, `index.ts`; `availableToolIds()` = `['claude-code']`; no MCP code or config; no `templates/agnostic-layer/`; `config.stack` captured and read by nothing; no publish/lint/CI tooling; only the `init` command; `templates/` unedited; `.claude/` used as oracle only. |
| R19 | The dependency budget holds: exactly two runtime dependencies, at the verified versions, no bundler | intent.md Constraints | PASS | `package.json` + `package-lock.json` top level: runtime `commander@15.0.0`, `@clack/prompts@1.7.0`; dev `typescript@7.0.2`, `vitest@4.1.10`, `@types/node@26.1.2`. Build is plain `tsc`. |
| R20 | Reflexive traceability holds across this feature's own spec set | AGENTS.md; intent.md Constraints | PARTIAL | Every `Cn` cites a contract interface/guarantee, every `Tn` maps to a real non-skipped test, every task cites a phase and a guarantee. Two internal `contract.md` inconsistencies surfaced by implementation: (a) the `--roles` flag description cannot be reconciled with the normative step-4 `mergeConfig` semantics (AL-2); (b) `assertContained`'s doc cites `HarnessError('UNEXPECTED'-mapped)`, but `'UNEXPECTED'` is not a `HarnessErrorCode` (AL-8). |

## Contract Compliance
| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | Module map realized: all contracted modules exist at their contracted paths with the contracted responsibilities, and no extra module smuggles in unspecified behavior | PASS | Directory listing vs. the Module map: `bin/harness.js` + 13 `src/**.ts` = all 14 mapped rows present, no extras. (The seed row said "fifteen"; the contract's Module map has 14 rows — a seed miscount, not an implementation gap.) |
| C2 | `src/errors.ts` — the seven-value `EXIT` table, `HarnessError.exitCode` mapping, `isHarnessError` | PASS | Read `src/errors.ts`; `tests/errors.test.ts` asserts all five code→exit mappings and the discriminator. |
| C3 | `src/vocabulary.ts` — the five closed vocabularies and derived types, importing nothing | PASS | File has zero `import` statements; contents match the contract literally. |
| C4 | `src/config.ts` — `HarnessConfig` shape and `CONFIG_VERSION`; `defaultConfig`, `loadConfigFile`, `validateConfig`, `mergeConfig` (by role id, not position), `serializeConfig`, and the four flag-list parsers | PARTIAL | All ten exports present with the contracted signatures; `mergeConfig` merges by id (T12). **Deviation:** `mergeConfig` silently widens its runtime contract to accept bare `RoleId` strings, and does so using a hardcoded `tier: 'mid'` literal (`src/config.ts:216`) — see AL-3, AL-4. |
| C5 | `src/templates.ts` types | PASS | All seven exported types match the contract field-for-field, including `Capability.scope`/`known`. |
| C6 | Parsing rules 1–8 implemented exactly | PASS | Auditor traced each rule to code: rule 1 `extractMetadataBlockLines`, rule 2 `ENTRY_RE` (first-`: `-only, remainder preserved), rule 3 explicit snake→camel field mapping, rule 4 `ROLE_REQUIRED_KEYS` loop fatal / unknown keys ignored, rule 5 fatal out-of-enum `cost_tier`, rule 6 `parseCapabilityList` preserving unknowns, rule 7 id∈`ROLE_IDS` **and** id↔H1, rule 8 `## Role body` required. Both directions of the rule-4/rule-5 asymmetry tested (T5). *Rule 1's literal application is the root cause of AL-6.* |
| C7 | `resolveTemplatesRoot()` resolves identically from `src/` (vitest) and `dist/` (built) | PASS | `path.dirname(fileURLToPath(import.meta.url)) + '/../templates'`; both `src/` and `dist/` are one level below the package root. Confirmed by the suite (src path) and by the by-hand `bin/harness.js` runs (dist path) both loading the same eleven files. |
| C8 | `src/engine.ts` — payload types, `SPEC_SCHEMA_DIR`, `HARNESS_CONFIG_PATH`, `buildPayload`, `buildSharedFiles` | PASS | All present and matching; `reducedGates` computed as `gates.length < GATE_IDS.length`. |
| C9 | `src/generators/types.ts` — `WrapperFormat`, `GeneratedFile`, `CapabilityMapping`, `Generator` | PASS | Interface-only file (no implementation). `conductorPath` is a standalone field, `roleFileName` returns a name. Scrutinized hardest per the seed note: it is sufficient for all five targets (C29). |
| C10 | `src/generators/markdown-yaml.ts` — `yamlQuote`, `renderFrontmatter`, `renderProvenance`, `renderProjectConfigBlock`, block markers | PASS | Correctly factored *outside* `claude-code.ts`; `claude-code.ts` imports all three renderers. Nothing Claude-Code-specific leaked into the shared module. |
| C11 | Claude Code mapping tables exact | PASS | `agentsDir`, `conductorPath`, `wrapperFormat`, `roleFileName` match; `most-capable`→`opus`, `mid`→`sonnet`, `cheapest`→`haiku`; all six capability rows match the contract token-for-token and are cross-checked against the live `.claude/agents/*.md` oracle (T24). |
| C12 | `renderRole` / `renderConductor` output shapes match the contract's illustrated forms | PARTIAL | Key order, provenance placement, blank line, and body position all match. Two deviations: `name` is emitted quoted (`name: "sdd-auditor"`) where the illustration shows it unquoted (cosmetic, valid YAML — AL-9); and `renderConductor`'s body omits the canonical intro paragraph (AL-6). |
| C13 | `src/generators/index.ts` — registry, `getGenerator`, `availableToolIds()` = `['claude-code']` | PASS | Verified; the four unimplemented ids resolve to `undefined`. |
| C14 | `src/prompts.ts` — `PromptDefaults`, `runInitPrompts`, `confirmWrite`; the five questions in order with the contracted widgets and defaults | PARTIAL | The five questions, their order, widgets, `required` flags, `custom…` escape and per-role canonical-tier default are all correct. **Defect:** the preset branch for question 2 assumes `preset.roles` is `RoleSelection[]`, which `--roles` violates (AL-1); and question 3 carries a `?? 'mid'` tier literal (AL-4). |
| C15 | `src/writer.ts` — `WritePlan`, `planWrites`, `applyWrites`, `assertContained` | PASS | Signatures match; containment asserted for every file during planning, before any write. |
| C16 | `src/init.ts` — seams and the 12-step sequence in order | PASS | Steps traced in `src/init.ts` and found in the contracted order and numbering; step 9 (resolve generators / collect skips / `NO_GENERATOR`) strictly precedes step 10 (render) and step 11 (plan), as the seed note requires. All four seams (`templatesRoot`, `overrides`, `configFile`, `io`) are injectable and used by the tests. |
| C17 | `src/cli.ts` — `buildProgram`, `main` returning `ExitCode`; the full `init` flag table; the interactivity resolution rule | PARTIAL | All ten flags declared with the contracted names/arities; `--model` is repeatable via a collector; interactivity precedence is exactly `--yes` → `--config` → non-TTY `USAGE` → interactive; `main` returns codes and never exits. **Defects in flag→config translation:** AL-1, AL-2, AL-3, AL-4. |
| C18 | `package.json`, `tsconfig.json`, `vitest.config.ts` match the contracted shapes | PASS | `package.json` byte-shape matches including name `harny`, the single `bin` entry, the `files` allowlist, `engines`, five scripts, pinned deps. `vitest.config.ts` matches. `tsconfig.json` matches all eight contracted fields and adds exactly one: `"types": ["node"]` — **auditor independently verified this is necessary**, not scope creep: removing it reproduces `TS2591 Cannot find name 'node:fs/promises'` (and 11 more) under the pinned `typescript@7.0.2` + `@types/node@26.1.2`. |
| C18b | Naming consistency after the `create-sdd-harness` → `harny` rename | PASS | Repo-wide grep for `create-sdd-harness` (excluding `specs/`) returns nothing. `--help` reads `Usage: harny [options] [command]` and contains no `harness.js`. Markers are `<!-- harny:begin … -->` / `<!-- harny:end … -->`; provenance reads `generated by harny from templates/…`. Surviving "harness" uses are exactly the two sanctioned internal paths plus the `Harness*` type names the contract itself specifies. |
| C19 | Guarantee 1 — Canonical fidelity | PASS | Auditor re-derived independently of the tests: all five role bodies and the conductor body are contiguous byte-for-byte substrings of freshly generated output. (See AL-6 for what the conductor `body` does *not* contain in the first place.) |
| C20 | Guarantee 2 — Wrapper-only variation | PASS | `renderRole`/`renderConductor` only concatenate; no reflow, truncation, heading rewrite, or whitespace normalization touches `template.body`. |
| C21 | Guarantee 3 — Configuration quarantined between markers | PASS | Config-derived text appears only inside `renderProjectConfigBlock`'s output; role files carry no config at all beyond the mapped model/tools wrapper fields. T32 asserts prose before the marker is identical across configurations. |
| C22 | Guarantee 4 — Single canonical source: no copy/excerpt/paraphrase of any `templates/` file, and **no tier literal**, anywhere in `src/` | FAIL | **Prose half PASS**: no canonical text in `src/` (T41's 60-char-window check, plus auditor grep). **Tier-literal half FAIL**: three hardcoded tier defaults survive — `src/cli.ts:57`, `src/config.ts:216`, `src/prompts.ts:80` (all `?? 'mid'`). `src/cli.ts:57` is reachable and produces observably wrong persisted state. See AL-4. (The `MODEL_BY_TIER` keys in `claude-code.ts` are the contract-mandated mapping table and are *not* a violation.) |
| C23 | Guarantee 5 — No canonical mutation | PASS | No `fs.write*`/`rename`/`rm` targets `templates/` or `.claude/` anywhere in `src/`; `git status` on both paths is clean after full exercise. |
| C24 | Guarantee 6 — Conductor always on, always emitted, never a `RoleSelection` | PASS | `buildPayload` populates `conductor` unconditionally; `runInit` step 10 emits `renderConductor` per generator regardless of role selection; `RoleId` excludes `sdd-conductor` so it is not expressible. |
| C25 | Guarantee 7 — Tier defaults equal parsed `costTier` for every role | PASS | For the `defaultConfig` path (which is what the guarantee states). Note the erosion at the `--model` path is tracked under C22/AL-4, not here. |
| C26 | Guarantee 8 — Nothing silently dropped | PASS | Every known token maps to ≥1 Claude Code token; scoped tokens produce a `is scoped to` note; unknown tokens produce an `unmapped capability:` note; both reach the rendered frontmatter as `# capability note:` comments. Verified on the real auditor role. |
| C27 | Guarantee 9 — Reduced gates permitted, warned, recorded, never recommended | PASS | `--gates post-specs` → warning naming `post-red-tests, post-audit` and "never the recommended configuration"; the generated block carries the same NOTICE. Resolves the `AGENTS.md`-vs-`plan.md` tension exactly as `intent.md` Constraints specifies. |
| C28 | Guarantee 10 — `modelOverride` wins over the tier mapping and is emitted verbatim | PARTIAL | Honored verbatim when `--model` is used alone (verified: `model: my-custom-model-id`). **Silently discarded** when `--roles` is also present and does not name that role — see AL-3. |
| C29 | Guarantee 11 — Interface sufficiency for all five known targets, with the evidence table in tests | PASS | `tests/generators/registry.test.ts` builds a compile-checked fake `Generator` per target and asserts `.claude/agents/sdd-architect.md`, `.cursor/…`, `.kiro/…`, `.github/agents/sdd-architect.agent.md`, `.codex/agents/sdd-architect.toml`, plus `conductorPath` independence, for all five. |
| C30 | Guarantee 12 — Shared artifacts written exactly once, schema files byte-identical | PASS | `buildSharedFiles` is called once outside the per-generator loop (`src/init.ts:136`); T16 asserts single emission under a two-tool selection; `cmp` confirms byte-identity of all five schema files. |
| C31 | Guarantee 13 — Non-destructive by default; conflict detection before the first write | PASS | `planWrites` collects every conflict before `applyWrites` is entered; `applyWrites` throws `CONFLICT` as its first statement. Exit 3 and no mutation observed. |
| C32 | Guarantee 14 — `--dry-run` writes nothing at all, including no `.sdd/` | PASS | Target directory contained 0 entries; the dry-run branch returns before `applyWrites`, and `planWrites` only calls `fs.access`. |
| C33 | Guarantee 15 — Path containment | PASS | `assertContained` rejects absolute paths and any post-normalization `..` escape; called for every file in `planWrites`. |
| C34 | Guarantee 16 — Deterministic output | PASS | Auditor ran the built CLI twice into separate temp dirs; `diff -r` reported no difference. No timestamp, PID, or random source exists in the render path. |
| C35 | Guarantee 17 — No `process.exit` in library code | PASS | Repo-wide grep: the only `process.exit` occurrence in `src/` is inside a doc comment. `bin/harness.js` sets `process.exitCode` and contains nothing else. |
| C36 | Guarantee 18 — All-or-nothing generator availability | PASS | Mixed selection succeeds with `skippedTools`; all-unavailable selection throws `NO_GENERATOR` (exit 4) before any render, leaving the target empty. |
| C37 | Guarantee 19 — Every generated file ends in exactly one `\n` | PASS | Auditor byte-counted trailing newlines on all twelve generated files: all exactly 1. Holds for the pass-through spec-schema files too. |
| C38 | Guarantee 20 — Packaging completeness | PASS | See the toolchain table above. |
| C39 | Guarantee 21 — No runtime import cycles; cycle-freedom does not rely on `import type` erasure | PASS | `src/vocabulary.ts` imports nothing. Enumerated every non-type import in `src/`: no module pair imports the other at runtime. The two remaining type-only cycles (`engine.ts` ↔ `generators/types.ts`, `init.ts` ← `prompts.ts`) are mandated by the contract's own code blocks and are fully erased under `verbatimModuleSyntax`. |
| C40 | Error Handling Contract — all twenty rows behave as tabled, with the contracted exit code | PARTIAL | **18/20 verified individually against the built CLI** (unknown flag → 1; unknown tool/role/gate id → 2; malformed `--model` → 2; missing `--config` → 2; wrong-shape config → 2; non-TTY without escape hatch → 2; empty selection → 2; reduced gates → warn + 0; cancel → 130 via `CANCELLED`; missing template root/file → 5; missing metadata key / no `## Role body` → 5; out-of-enum `cost_tier` → 5; unknown extra key ignored → 0; skipped tool → warn + 0; no generator → 4 + nothing written; conflict → 3 + nothing written; escaping path → throw before write → 1; missing target dir → 2). **2 rows not implemented:** "Filesystem error mid-write → already-written paths are reported" (AL-5) and "unknown capability token → `io.warn` **once**" (AL-7 below; the `notes`-surfacing half of that row *is* implemented). |
| C41 | Dependencies — contracted inputs and packages only, at verified versions | PASS | Manifest and lockfile diffed against the contract: exactly `commander@15.0.0` + `@clack/prompts@1.7.0` runtime, `typescript@7.0.2` + `vitest@4.1.10` + `@types/node@26.1.2` dev. No undeclared package. Only `node:fs/promises`, `node:path`, `node:url`, `node:process` builtins used. |
| C42 | Integration Points — AL-5 and AL-7 closed; future generators need no engine change; `.sdd/harness.json` persisted; `config.stack` captured and unused | PASS | **AL-5 independently verified closed**: `.sdd/spec-schema/{intent,contract,roadmap,tasks,audit}.md` land in the target repo byte-identical to source, so the architect role body's "packaged alongside this role" reference resolves; the conductor's generated block names the directory. **AL-7 independently verified closed on both halves**: the real conductor parses with `id`/`purpose` only, and `write-files (audit.md only)` reaches the generated auditor file as structured `Capability.scope` → a frontmatter capability note. A fifth generator needs only one new file plus one registry entry — `templates.ts`, `engine.ts`, `writer.ts`, `prompts.ts` contain no per-tool knowledge. `stack` is serialized into `.sdd/harness.json` and read by nothing. |
| C43 | Integration Points — the oracle comparison is structural, not byte-wise | PASS | `tests/generators/claude-code.test.ts` T24 compares frontmatter key presence, per-role `model` value, and provenance presence — never bytes. The auditor confirmed a byte-wise comparison would (correctly) fail, since the live files retain `<example>` blocks, `color:` keys, and a hand-written `description`. |

## Test Coverage
> Automated tests run by the project's own runner (`vitest run`). The auditor runs the
> suite and `tsc --noEmit` directly rather than trusting the executor's report, and
> confirms each row's test exists, is not skipped, and fails when the behavior it
> guards is broken.

All 43 rows below correspond to real, executing, non-skipped tests. The suite contains
**zero** `.skip`, `.todo`, or `.only` markers (grep-verified) and requires no network or
external service — every test is offline, driving either in-process modules or a locally
spawned `node bin/harness.js`.

| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Vocabularies are the contracted closed sets; `src/vocabulary.ts` imports nothing (guarantee 21) | PASS | `tests/vocabulary.test.ts` |
| T2 | `HarnessError` maps each `HarnessErrorCode` to the contracted exit code; `isHarnessError` discriminates correctly | PASS | `tests/errors.test.ts` |
| T3 | Metadata parsing: all seven role keys extracted; values containing `: ` survive; snake→camel mapping applied (rules 1–3) | PASS | `tests/templates.test.ts` |
| T4 | Missing required key, absent `## Role body`, and `id`↔H1 mismatch each raise `TEMPLATE` naming file and key (rules 4, 7, 8) | PASS | `tests/templates.test.ts` |
| T5 | An unknown **extra** metadata key is ignored, while an out-of-enum `cost_tier` is fatal (rules 4, 5 — the deliberate asymmetry) | PASS | `tests/templates.test.ts` |
| T6 | `parseCapabilityList`: plain tokens, `name (scope)` → `{ name, scope }`, unknown tokens preserved with `known: false` (rule 6, guarantee 8) | PASS | `tests/templates.test.ts` |
| T7 | The real `templates/conductor/sdd-conductor.md` parses successfully with only `id`/`purpose` metadata (R9, closes AL-7) | PASS | `tests/templates.test.ts` — asserts `body.length > 0` only; see AL-6 for the coverage gap this leaves |
| T8 | The real eleven-file `templates/` tree loads; a missing file raises `TEMPLATE` naming the resolved root; `resolveTemplatesRoot()` agrees from `src/` and `dist/` (C7) | PASS | `tests/templates.test.ts` |
| T9 | Spec-schema templates are loaded byte-for-byte with no reformatting (guarantee 12) | PASS | `tests/templates.test.ts` |
| T10 | `defaultConfig` derives every tier from the canonical `cost_tier`; a fixture with a mutated tier changes the default with no source change (R3, guarantee 7) | PASS | `tests/config.test.ts` |
| T11 | `validateConfig` rejects unknown ids, empty tool/role lists, and a wrong `version`, each with `USAGE` and the valid set in the message | PASS | `tests/config.test.ts` |
| T12 | `mergeConfig` merges `roles` by id rather than by position, and is right-biased | PASS | `tests/config.test.ts` — note: this test is what pins `mergeConfig` to additive-only semantics (AL-2) |
| T13 | `serializeConfig` is stable and round-trips through `loadConfigFile` | PASS | `tests/config.test.ts` |
| T14 | Flag-list parsers: `all` expansion, `none` for gates, `role=tier` vs `role=<literal>` in `--model`, and `USAGE` on unknown ids | PASS | `tests/config.test.ts` |
| T15 | `buildPayload`: enabled roles only, in `ROLE_IDS` order; conductor always present; `reducedGates` computed; `TEMPLATE` when an enabled role has no template (guarantee 6) | PASS | `tests/engine.test.ts` |
| T16 | `buildSharedFiles` emits the five schema files plus `.sdd/harness.json` exactly once even with multiple tools selected (R8, guarantee 12) | PASS | `tests/engine.test.ts` |
| T17 | `yamlQuote` escapes `\`, `"`, and newlines; `renderFrontmatter` emits fields plus `#` comment lines and valid delimiters | PASS | `tests/generators/markdown-yaml.test.ts` |
| T18 | `renderProjectConfigBlock` is fully delimited and states roles, gates, stack, schema dir; reduced gates produce an explicit notice (guarantees 3, 9) | PASS | `tests/generators/markdown-yaml.test.ts` |
| T19 | `mapModel`: the three tier mappings, plus `override` returned verbatim (guarantee 10) | PASS | `tests/generators/claude-code.test.ts` |
| T20 | `mapCapabilities`: the six-row token table, dedup, stable order; scoped and unknown capabilities appear in `notes` (guarantee 8) | PASS | `tests/generators/claude-code.test.ts` |
| T21 | `renderRole` emits the contracted frontmatter keys and ends in exactly one `\n` (R5, guarantee 19) | PASS | `tests/generators/claude-code.test.ts` |
| T22 | The generated `sdd-auditor.md` contains the scope text `audit.md only` (R7, guarantee 8) | PASS | `tests/generators/claude-code.test.ts` |
| T23 | `renderConductor` emits Skill frontmatter, verbatim body, and the generated block — in that order | PASS | `tests/generators/claude-code.test.ts` |
| T24 | Structural (not byte-wise) oracle comparison against the live `.claude/agents/*.md` (C43) | PASS | `tests/generators/claude-code.test.ts` |
| T25 | Registry: `getGenerator` resolves `claude-code`, `undefined` for the four unimplemented ids; `availableToolIds()` is exactly `['claude-code']` (guarantee 18) | PASS | `tests/generators/registry.test.ts` |
| T26 | Five-target interface-sufficiency evidence table (guarantee 11) | PASS | `tests/generators/registry.test.ts` |
| T27 | `assertContained` rejects absolute paths and `..` escapes (guarantee 15) | PASS | `tests/writer.test.ts` |
| T28 | `planWrites` collects conflicts in stable order; `applyWrites` throws `CONFLICT` before writing anything, and succeeds under `force` (guarantee 13) | PASS | `tests/writer.test.ts` |
| T29 | `runInit` follows the 12-step sequence (C16) | PASS | `tests/init.test.ts` |
| T30 | Reduced gates produce a warning naming the missing gates via injected `io.warn` (R10, guarantee 9) | PASS | `tests/init.test.ts` |
| T31 | A selected tool without a generator is reported/warned while others generate; when none is available, `NO_GENERATOR` and nothing written (R11, guarantee 18) | PASS | `tests/init.test.ts` |
| T32 | Deselecting a role changes only the generated block, leaving canonical prose untouched (R10, guarantee 3) | PASS (weak) | `tests/init.test.ts` — **passes for the wrong reason.** The "partial" run passes `roles: ['sdd-architect']` **and** `gates: ['post-specs']`; the roles override is a no-op (AL-2), so the two outputs differ solely because of the gates. The role-deselection half of R10 is effectively untested. |
| T33 | Interactivity resolution: `--yes` and `--config` force non-interactive; non-TTY without either exits 2 naming both escape hatches (R14) | PASS | `tests/cli.test.ts` |
| T34 | `main` returns the contracted `ExitCode` for each error class and never calls `process.exit` (guarantee 17) | PASS | `tests/cli.test.ts` |
| T35 | `--help` renders as `Usage: harny …` (not `harness.js`) and lists the `init` command and its flags (R1, C18b) | PASS | `tests/cli.test.ts` |
| T36 | End-to-end `init --yes --tools claude-code` produces exactly the twelve contracted files and exits 0 with no TTY (R4) | PASS | `tests/e2e-init.test.ts` — auditor re-read the repaired `listFilesRecursively` helper: the fix threads the original `root` through the recursion (`root: string = dir`), and **all twelve assertions still carry full nested paths**. No assertion was weakened, removed, or loosened; no other test in the file changed. |
| T37 | `--dry-run` writes nothing — not even `.sdd/` — and prints the full planned list (R12, guarantee 14) | PASS | `tests/e2e-init.test.ts` |
| T38 | Re-run without `--force` exits 3 listing collisions and writes nothing; with `--force` it succeeds (R13, guarantee 13) | PASS | `tests/e2e-init.test.ts` |
| T39 | Determinism: two runs with identical inputs produce byte-identical output (guarantee 16) | PASS | `tests/e2e-init.test.ts` — the repaired helper restored the real nested-path comparison; auditor independently reproduced determinism with `diff -r` |
| T40 | Canonical fidelity: all five role bodies plus the conductor body appear byte-for-byte in generated output (R6, guarantees 1, 2) | PASS (weak on conductor) | `tests/canonical-fidelity.test.ts` — the role half is strong. The conductor half compares generated output against the **parsed** `conductor.body`, so it is self-referential and cannot detect content the parser never extracted (AL-6). |
| T41 | Single-source and non-mutation: `src/` holds no canonical prose and no tier literal; nothing under `templates/`/`.claude/` is modified (R16, guarantees 4, 5) | PARTIAL | `tests/canonical-fidelity.test.ts` — the prose and non-mutation halves are covered. The **"no tier literal in `src/`" clause is deliberately not asserted** (documented rationale in the file header: T10 was judged to cover it behaviorally). That judgement is what let AL-4 ship: T10 only exercises the `defaultConfig` path, and the three surviving `?? 'mid'` literals sit on other paths. |
| T42 | Packaging: `npm pack --dry-run` includes `bin/`, `dist/`, and all eleven `templates/**` files and excludes `src/`, `tests/`, `specs/` (R15, guarantee 20) | PASS | `tests/packaging.test.ts` |
| T43 | `runInitPrompts` asks the five questions in order with the contracted widgets/defaults; skips preset questions; cancellation raises `CANCELLED`; `confirmWrite` raises `CANCELLED` on decline (R2, SC2, G2) | PASS (gap) | `tests/prompts.test.ts` — the "skips a preset question" case uses a well-typed `RoleSelection[]` preset, so it does not exercise the shape `src/cli.ts` actually produces for `--roles`; AL-1 slips through this gap |

## Audit Log
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-07-30 | sdd-auditor | **AL-1 — `harny init --roles <list>` hard-fails in an interactive TTY.** `src/cli.ts:buildRoleOverrides` emits bare `RoleId` strings into `overrides.roles`. `src/prompts.ts:61` then does `preset.roles.map(role => role.id)` → `[undefined]`, question 3 is skipped, `orderedRoles` resolves to `[]`, and `runInit` step 6 aborts with the misleading `Invalid config (resolved init configuration): "roles" must have at least one entry.` Reproduced directly against `dist/`. `src/cli.ts` is the only producer of this shape, so the executor's judgment-call-3 mitigation (making `mergeConfig` tolerant) covered one of the two consumers and missed the other. | CRITICAL | Fix at the producer, not the consumers: have `buildRoleOverrides` emit well-typed `RoleSelection[]`, resolving each role's tier from the canonical default rather than inventing one. This single fix also resolves AL-3 and the reachable half of AL-4. |
| 2026-07-30 | sdd-auditor | **AL-2 — `--roles` cannot deselect roles; it is additive-only.** Verified by hand: `init --yes --tools claude-code --roles sdd-architect` still writes all five `.claude/agents/sdd-*.md`. This is *contract-compliant* — `contract.md`'s normative step 4 routes flags through `mergeConfig`, whose own contracted semantics ("merges per role id, never by position") cannot remove a base role, and T12 pins that behavior. The executor's judgment call 2 is therefore correct as an implementation decision. But the *outcome* contradicts `intent.md` G8 ("per-question flags") for question 2 and leaves SC10's "deselecting roles" unreachable outside a TTY — `--config` is affected identically, since it merges through the same function. | HIGH | Contract amendment required, not just code: give role *selection* a mechanism distinct from `mergeConfig`'s per-id merge (e.g. `PartialHarnessConfig.roles` replaces the set while per-id tier/override merging continues to apply). Then strengthen T32 to vary roles alone, with gates held constant. |
| 2026-07-30 | sdd-auditor | **AL-3 — `--roles` silently discards `--model` assignments for roles it does not name.** `buildRoleOverrides` computes `ids = roleIds ?? [...assignments.keys()]`, so with `--roles A --model B=x` the assignment for `B` is dropped entirely. Verified: `--roles sdd-architect --model sdd-auditor=my-custom-model-id` left the auditor on `model: opus` with no `modelOverride` recorded. Violates Behavior Guarantee 10 (`modelOverride` always wins and is emitted verbatim) in that flag combination, and violates the contract's pervasive "nothing is silently dropped" posture with no warning emitted. | HIGH | Union the two sources: the override set must be `roleIds ∪ assignments.keys()`, or `--model` for an unselected role must be an explicit `USAGE` error. Add a regression test combining both flags. |
| 2026-07-30 | sdd-auditor | **AL-4 — Behavior Guarantee 4's "never from a literal in `src/`" clause is violated by three hardcoded `'mid'` tier defaults**, at `src/cli.ts:57`, `src/config.ts:216`, and `src/prompts.ts:80`. The `cli.ts` one is reachable and user-visible: `init --yes --model sdd-auditor=<literal-model-id>` persists `{"id":"sdd-auditor","tier":"mid"}` into `.sdd/harness.json`, though the auditor's canonical `cost_tier` is `most-capable`. Because `.sdd/harness.json` is contractually the read-back surface for a future `harness mcp add` *and* a valid `--config` input, this durably records a wrong canonical-derived value; a later re-run from that file would downgrade the auditor to `sonnet`. Verified by inspecting the written file. | HIGH | Derive the tier from the canonical/base config at every one of the three sites instead of defaulting to `'mid'`. Then add the `src/`-wide tier-literal assertion that T41 deliberately omitted, scoped to exclude `vocabulary.ts` and `claude-code.ts`'s contract-mandated `MODEL_BY_TIER` keys. |
| 2026-07-30 | sdd-auditor | **AL-5 — Error Handling Contract row "Filesystem error mid-write" is not implemented.** The table promises "already-written paths are reported / Partial state disclosed, never hidden". `applyWrites` accumulates `written` locally and lets any `fs` rejection propagate, discarding the accumulator, so a mid-write `EACCES`/`ENOSPC` leaves the user with a partially scaffolded repo and no disclosure of which files landed. No test covers this row. | MEDIUM | Wrap the write loop and attach the accumulated paths to the thrown error's `details`, or surface them via `io.warn` before rethrowing. Add a test using an unwritable path partway through the plan. |
| 2026-07-30 | sdd-auditor | **AL-6 — The generated conductor Skill silently drops the canonical conductor's opening role statement.** `contract.md` parsing rule 1 defines the metadata block as running to the next `## ` heading, and `ConductorTemplate.body` as "everything after the metadata block". Applied literally to the real `templates/conductor/sdd-conductor.md`, that swallows lines 8–17 — the blockquote note *and* the paragraph "You are the **conductor** of the SDD pipeline, not a participant. Your job is to sequence the five `sdd-*` roles, enforce the human review gates, and verify their work…" — so the generated `.claude/skills/sdd-conductor/SKILL.md` begins abruptly at `## Pipeline`. Verified by generating and diffing against the canonical file; the live `.claude/` oracle carries the equivalent sentence, so the generated artifact is materially thinner than the thing it is meant to reproduce. Guarantee 1 is not technically broken (the parsed `body` *does* appear verbatim), and T40/T7 cannot catch it because both compare against the parser's own output. The executor's judgment call 1 — implement the normative text literally and flag it — was procedurally correct; the outcome should not ship silently. | HIGH | Contract decision required. Recommended: amend parsing rule 1 so a metadata block ends at the last consecutive `- key: value` entry (or the first subsequent non-list, non-blank line) rather than at the next `## `; the blockquote is then legitimately excluded as meta-commentary while the role statement is preserved. Add a non-self-referential test asserting the intro sentence reaches the generated Skill. |
| 2026-07-30 | sdd-auditor | **AL-7 — Error Handling Contract row "unknown capability token → `io.warn` once" is not implemented.** The preservation half of the row works (`known: false` survives parsing, and `mapCapabilities` surfaces `unmapped capability: <name>` into the rendered frontmatter — auditor confirmed the mechanism). But nothing in `src/init.ts` or the generators ever calls `io.warn` for an unknown token, so the operator-facing signal the row promises is absent. This is the exact forward-compatibility path the prior audit's open `ask-human` recommendation depends on. | MEDIUM | Collect unknown capability names during render and `io.warn` once, listing them. Cover with a fixture carrying an unknown token. |
| 2026-07-30 | sdd-auditor | **AL-8 — `contract.md` is internally inconsistent on `assertContained`'s error type.** Its doc comment says "Throws `HarnessError('UNEXPECTED'-mapped)`", but `'UNEXPECTED'` is not a member of `HarnessErrorCode`, so that is unconstructible. The implementation throws a plain `Error`, which `main` maps to exit 1 — exactly what the Error Handling Contract row ("Throw before any write / 1 / Treated as a generator bug") specifies. Implementation is right; the contract prose is wrong. | LOW | Spec cleanup: reword the doc comment to "throws a plain `Error`, surfaced as `EXIT.UNEXPECTED`". |
| 2026-07-30 | sdd-auditor | **AL-9 — Cosmetic deviations from illustrated shapes.** (a) `renderRole` emits `name: "sdd-auditor"` where the contract's illustrated block shows `name: sdd-auditor` unquoted — semantically identical YAML, and the contract labels the block a shape illustration. (b) `main` prints a stack trace for unexpected throws unconditionally, where the Error Handling row says "message plus stack under `--dry-run`/verbose, generic otherwise". (c) `assertWritableDirectory` verifies existence and directory-ness but not writability, despite the row's wording. | LOW | Optional polish; none of these affect a guarantee or an exit code. |
| 2026-07-30 | sdd-auditor | **AL-10 — Judgment call 4 (`"types": ["node"]` in `tsconfig.json`) independently confirmed necessary, not scope creep.** The auditor removed the field and re-ran `npx tsc --noEmit`: 12 × `TS2591 Cannot find name 'node:fs/promises'` / `'node:path'` / `'node:url'` / `'node:process'` / `'node:readline'` / `'node:stream'` across `src/` and `@clack/*`'s own `.d.mts` files, under the contract-pinned `typescript@7.0.2` + `@types/node@26.1.2`. Restored; typecheck clean. The addition is purely additive — all eight contracted `tsconfig` fields are unchanged, and `package.json`/`vitest.config.ts` are byte-identical to the test-writer's versions. | LOW (informational) | No action. Worth folding into `contract.md`'s pinned `tsconfig` shape so the next reader does not re-litigate it. |
| 2026-07-30 | sdd-auditor | **AL-11 — `AGENTS.md` shows as modified in the working tree; attributed to the human, not the executor.** The diff is one sentence (`create-sdd-harness` → `harny`). `roadmap.md` lists `AGENTS.md` as both "deliberately untouched" and "handled after the audit by `sdd-documentation`", so an executor edit would be scope creep. File mtimes place it at 09:33, before every executor artifact (`.gitignore` 09:46, `src/` 10:55) and alongside `plan.md` (09:32) — i.e. it is part of the human's spec-review-gate rename pass. Recorded so `sdd-documentation` knows `AGENTS.md` is already partially renamed. | LOW (informational) | No action against this implementation. `sdd-documentation` should complete the rename sweep across `AGENTS.md`, `README.md`, and `CHANGELOG.md`. |
| 2026-07-30 | sdd-auditor | **AL-12 — Prior-audit findings AL-5 and AL-7 (from `specs/canonical-role-templates/audit.md`) independently verified CLOSED.** AL-5: `.sdd/spec-schema/*.md` are deployed into the target repo and `cmp`-identical to `templates/spec-schema/*.md`, so the architect role body's "packaged alongside this role" reference resolves after generation; the conductor's generated block names the directory. AL-7: both halves closed — the real conductor parses with an `id`/`purpose`-only metadata block, and `write-files (audit.md only)` reaches the generated auditor file as `# capability note: write-files is scoped to audit.md only`. Verified against freshly generated output, not against the executor's report. | INFO | Closed. Record in the prior feature's audit trail. |

## Final Verdict

**Status**: REJECTED

**Summary**: The core of this feature is in genuinely good shape — 106/106 tests green,
`tsc` clean, packaging exact, canonical fidelity of all five role bodies proven
independently, `templates/` and `.claude/` untouched, both carried-forward findings
(AL-5, AL-7) verified closed, and every non-goal respected. It is rejected on a narrow,
tightly-scoped set of defects concentrated in one function — `src/cli.ts`'s flag →
`PartialHarnessConfig` translation — which crashes a documented flag, silently drops a
guaranteed model override, and violates Behavior Guarantee 4's explicit "no tier literal
in `src/`" clause with observably wrong persisted output.

**Critical Issues** (must fix before merge):
- **AL-1** — `harny init --roles <list>` hard-fails in an interactive TTY with a
  misleading `"roles" must have at least one entry` error, because `src/cli.ts` emits
  bare `RoleId` strings that `src/prompts.ts` reads as `RoleSelection` objects. Fixing
  the producer (emit well-typed `RoleSelection[]` with tiers resolved from canonical
  defaults) also fixes AL-3 and the reachable half of AL-4.
- **AL-3** — `--roles A --model B=x` silently discards the `--model` assignment for `B`,
  breaking Behavior Guarantee 10 in that combination with no warning.
- **AL-4** — Behavior Guarantee 4 is violated: three hardcoded `'mid'` tier literals in
  `src/`, one of them reachable and persisting a wrong `tier` into `.sdd/harness.json`
  (auditor's canonical tier is `most-capable`; the file records `mid`).
- **AL-6** — The generated conductor Skill drops the canonical conductor's defining
  opening paragraph. This one needs a **contract decision**, not just a code change:
  parsing rule 1's literal boundary is what causes it, and the executor implemented the
  rule correctly. Escalating to the human rather than resolving it unilaterally.
- **AL-2** — `--roles` cannot deselect roles at all, non-interactively. Also needs a
  contract amendment: `contract.md`'s own step-4 `mergeConfig` routing makes the
  documented flag semantics unachievable, and `intent.md` G8/SC10 assume otherwise.

**Warnings** (should fix, not blocking):
- **AL-5** — "Filesystem error mid-write reports already-written paths" is unimplemented;
  a partial scaffold would be left undisclosed.
- **AL-7** — The `io.warn`-once signal for unknown capability tokens is unimplemented
  (the preservation and `notes`-surfacing halves do work).
- **T41** — Restore the `src/`-wide tier-literal assertion that was deliberately dropped;
  its absence is precisely why AL-4 shipped.
- **T32** — Strengthen so it varies roles alone, with gates held constant; it currently
  passes only because of the gates difference.
- **T40 / T7** — The conductor fidelity assertions are self-referential (generated output
  vs. the parser's own `body`) and cannot detect AL-6. Add one assertion against the
  canonical file's raw text.

**Recommendations** (nice to have):
- **AL-8** — Correct `contract.md`'s `assertContained` doc comment; `'UNEXPECTED'` is not
  a constructible `HarnessErrorCode`. The implementation is right, the prose is wrong.
- **AL-10** — Fold `"types": ["node"]` into `contract.md`'s pinned `tsconfig` shape, with
  the `TS2591` rationale, so it is not re-litigated.
- **AL-9** — Optional polish: unquoted `name:` in frontmatter, stack traces gated on
  verbosity, real writability probing on the target directory.
- **AL-11** — `sdd-documentation` should complete the `create-sdd-harness` → `harny`
  rename sweep across `AGENTS.md`, `README.md`, and `CHANGELOG.md` once approved.
- Re-audit scope after fixes should be narrow: `src/cli.ts:buildRoleOverrides`,
  `src/prompts.ts:61`, `src/config.ts:216`, the conductor body boundary, and the four
  test strengthenings above. Nothing else in the implementation needs to move.

### Standing notes for the auditor

- **Run the toolchain yourself.** `npm run typecheck` and `npm test` are the project's
  own commands; do not accept a reported pass. Confirm no test is `.skip`ped and that
  the fidelity tests (T40, T41) actually fail when fidelity is broken — a substring
  assertion that trivially passes is worse than no assertion.
- **The three highest-risk deviations to look for**, per `roadmap.md`'s risk table:
  (1) tier defaults hardcoded in `src/` instead of read from canonical `cost_tier`
  (defeats G4 and guarantee 7); (2) configuration applied by editing canonical prose
  instead of via the delimited generated block (defeats G7 and guarantee 3);
  (3) a second per-tool generator sneaking in because the interface makes it cheap
  (violates an explicit Non-Goal).
  *Outcome this round: risk (1) materialized (AL-4) — the roadmap's own mitigation
  ("Phase 2.8 greps `src/` for tier literals") was dropped at test-writing time.
  Risks (2) and (3) did not materialize.*
- **Two carried-forward findings from `specs/canonical-role-templates/audit.md` are
  claimed closed here** — AL-5 by `.sdd/spec-schema/` deployment (R8/C42) and AL-7 by
  conductor parsing plus `Capability.scope` (R7/R9/C42). *Both independently verified
  closed against freshly generated output; see AL-12.*
- **One open recommendation from that audit is deliberately NOT addressed here**: adding
  an `ask-human` token to the capability vocabulary. *Forward-compatibility confirmed
  working at the parser and renderer (T6, and the `unmapped capability:` note path), so
  the token can be added later with no CLI change — but note AL-7 above: the `io.warn`
  half of that path is missing.*
- **Non-goal sweep is a first-class check** (R18). *Passed cleanly: exactly one
  generator, no MCP code, no agnostic layer, no demo, no publish/lint/CI tooling, no
  command other than `init`, no canonical edits.*

---
---

# AUDIT PASS 2 — re-audit after amendment round 1 (2026-07-30)

> **Everything above this line is audit pass 1 and is preserved verbatim.** Nothing in
> it has been deleted, edited, or restated. This second pass is a **full independent
> re-audit**, not a diff review: the entire Requirements Checklist, Contract Compliance
> set and Test Coverage set were re-verified from scratch, the whole toolchain was
> re-run by the auditor, and every pass-1 finding AL-1 … AL-8 had its **original repro
> steps re-executed against the current code**. New and changed rows are recorded below;
> a pass-1 row not restated here was re-verified and still holds at its pass-1 status.
>
> New findings in this pass continue the pass-1 numbering and start at **AL-13**.

## Auditor's toolchain run — pass 2 (2026-07-30, run directly by `sdd-auditor`)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, 0 errors |
| `npm run build` | exit 0, 13 files emitted to `dist/` |
| `npx vitest run` | **115 passed / 115**, 15 files, **0 skipped, 0 todo, 0 only, 0 pending** (confirmed via the JSON reporter, not the summary line) |
| `npm pack --dry-run --json` | 29 entries: `bin/harness.js`, 13 × `dist/**`, **11 × `templates/**`**, `AGENTS.md`, `CHANGELOG.md`, `README.md`, `package.json`; **zero** under `src/`, `tests/`, `specs/` |
| `git status --porcelain -- templates .claude` | empty, before and after full exercise |
| Hand runs of the built CLI | every Error Handling Contract row re-executed individually; exit codes 0/1/2/3/4/5 all observed at the contracted rows |

**Independent verification technique used this pass.** Because three pass-1 defects
survived a green suite by being tested self-referentially, this pass did not rely on the
suite's own assertions for any guarantee. Specifically:

1. **Raw-text fidelity re-derivation.** Canonical bodies were sliced out of the raw
   `templates/*.md` files with `fs.readFile` (never through `parseRoleTemplate` /
   `parseConductorTemplate`) and asserted as substrings of freshly generated output:
   conductor 6535 chars, architect 4768, test-writer 6013, executor 3780, auditor 4683,
   documentation 3573 — **all present byte-for-byte**. This is the whole body, not one
   anchor sentence.
2. **Interactive-path probing through the real seams.** The `@clack/prompts` module was
   replaced at the ESM-resolver level by a recording stub and the **built `dist/` code**
   was driven through `runInit` / `runInitPrompts` with the injected `io`, so the
   interactive branch was exercised for real without a TTY.
3. **Mutation testing of the amendment-round tests.** Each fix was individually reverted
   in `src/` and the paired new test re-run, to confirm it *can* fail for the right
   reason. Results in AL-21 below.

## Requirements Checklist — pass 2 (new and changed rows)

| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R2 | Interactive `init` asks exactly the five `plan.md` §4 questions, in order, with all five roles and all three gates pre-selected and each role's tier equal to its canonical `cost_tier` | intent.md G2 / SC2 | **PASS** (was PARTIAL) | AL-1 no longer reproduces. Auditor drove the real `dist/` prompt path through a stubbed clack seam and recorded the widget sequence: 1 `multiselect` tools (`required: true`, default `['claude-code']`), 2 `multiselect` roles (`required: true`, default all five), 3–7 one `select` per role with defaults `most-capable / mid / mid / most-capable / cheapest` — exactly the canonical `cost_tier` values, 8 `multiselect` gates (`required: false`, default all three), 9 `text` stack. With `--roles sdd-architect` preset, Q2 is correctly **skipped** and resolves to exactly `[sdd-architect]` instead of `[undefined]`. |
| R10 | Deselecting roles or gates changes only the delimited generated block, never canonical prose; fewer than three gates emits a visible warning | intent.md G7 / SC10 | **PASS** (was PARTIAL) | Roles half now works: `init --yes --tools claude-code --roles sdd-architect` writes exactly one `.claude/agents/*.md` (auditor re-ran the AL-2 repro by hand). Quarantine re-verified independently: with roles varied and gates held constant, the conductor prose before `GENERATED_BLOCK_BEGIN` is byte-identical between the five-role and one-role runs, while the delimited block differs and correctly reads `Enabled roles: sdd-architect`. |
| R20 | Reflexive traceability holds across this feature's own spec set | AGENTS.md; intent.md Constraints | **PASS** (was PARTIAL) | Both pass-1 inconsistencies are closed by the amendments: (a) `--roles` semantics and the normative `mergeConfig` step-4 routing are now reconciled via the `roleIds`/`roleOverrides` split (Guarantee 22); (b) `assertContained`'s doc comment now correctly says plain `Error` → exit 1 (AL-8). Every `Cn` still cites a contract item, every `Tn` maps to a real non-skipped test, every task cites a phase and a guarantee. `roadmap.md`'s risk table was updated to record which risks materialized. |
| R21 | **(NEW)** A flag-supplied `--model` override is never silently discarded on **any** path — `USAGE` error non-interactively, `io.warn` interactively | intent.md G2, G8 / contract Guarantee 22 | **PASS** | Both halves re-derived by the auditor. Non-interactive: `--roles sdd-architect --model sdd-auditor=…` → exit 2, message names the excluded role and the enabled set, target dir left empty. Interactive: same override with the auditor deselected at Q2 → run **completes** and writes, emits exactly one warning naming the role plus "not applied"/"deselected", and the override is genuinely not applied. Control case (role kept) emits **no** warning and applies the override verbatim (`model: my-custom-id`). |
| R22 | **(NEW)** Canonical bodies reach generated output **complete**, not merely contiguous | intent.md G7 / contract Guarantee 23 | **PASS** | AL-6 no longer reproduces. The generated Skill now opens with `You are the **conductor** of the SDD pipeline, not a participant.`; the 8-line authoring blockquote is excluded from the body and retained verbatim on `authoringNote` (every line `>`-prefixed). Verified non-self-referentially against raw file text for all six artifacts — see the toolchain note above. |
| R23 | **(NEW)** Partial write state is disclosed on a mid-write filesystem failure | contract Error Handling Contract | **PASS** | AL-5 closed. Auditor forced a real mid-plan `mkdir` failure: the thrown plain `Error` names the failing path **and** both already-written paths (`2 file(s) already written before the failure: a.txt, b.txt`), preserves the original fs error via `Error.cause`, and maps to exit 1. Partial state confirmed real on disk. |
| R24 | **(NEW)** An unknown capability token warns once per run and still reaches output | contract Error Handling Contract, Guarantee 8 | **PASS** | AL-7 closed. With a fixture identical to the real templates except one injected token (`mind-reading (only on tuesdays)` — one variable changed), the run emitted **exactly one** warning naming the token and its source file, and the token still reached the generated frontmatter as `# capability note: unmapped capability: mind-reading`. Control run against the unmodified real templates emitted **zero** warnings of any kind. |

*All other pass-1 requirement rows (R1, R3–R9, R11–R19) were re-verified this pass and
remain **PASS** at their pass-1 evidence.*

## Contract Compliance — pass 2 (new and changed rows)

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C4 | `src/config.ts` — config shape, `defaultConfig`, `loadConfigFile`, `validateConfig`, `mergeConfig`, `serializeConfig`, the four flag-list parsers | **PASS** (was PARTIAL) | The bare-`RoleId` runtime widening and the `tier: 'mid'` literal are both gone. `mergeConfig` now takes the required `templates` parameter and applies the contracted fixed order (`roleIds` replaces membership → `roleOverrides` layer on → scalars replace). Read line by line; no tier literal remains. |
| C12 | `renderRole` / `renderConductor` output shapes | **PASS** (was PARTIAL) | The AL-6 half is fixed — `renderConductor` now emits the full canonical body including the intro paragraph. The remaining deviation is the cosmetic quoted `name:` (AL-9, unchanged, explicitly labelled a shape illustration by the contract). |
| C14 | `src/prompts.ts` — `PromptDefaults`, `runInitPrompts`, `confirmWrite`; the five questions | **PASS** (was PARTIAL) | Q2 now reads `preset.roleIds` (a `RoleId[]`); Q3 reads `preset.roleOverrides`. No `.id` is called on a preset role element anywhere. The `?? 'mid'` at the old line 80 is gone — Q3's default is read off the already-resolved `config.roles`, and an unresolvable role throws loudly rather than defaulting. Driven end to end through the stubbed clack seam. |
| C17 | `src/cli.ts` — `buildProgram`, `main`, the flag table, the interactivity rule | **PASS** (was PARTIAL) | `buildRoleOverrides` no longer couples the two flags (`ids = roleIds ?? [...assignments.keys()]` is gone); `--roles` sets `roleIds` only, `--model` sets `roleOverrides` only. All four pass-1 defects (AL-1…AL-4) re-tested against the built CLI and none reproduces. |
| C22 | Guarantee 4 — single canonical source, **no tier literal in `src/`** | **PASS** (was FAIL) | All three `?? 'mid'` literals (`cli.ts:57`, `config.ts:216`, `prompts.ts:80`) are removed. Auditor grepped `src/` independently of the test: no nullish-coalescing tier fallback remains. Behaviorally confirmed — `init --yes --model sdd-auditor=<literal>` now persists `"tier": "most-capable"` (the auditor's canonical tier) where pass 1 recorded `"mid"`. `MODEL_BY_TIER` in `claude-code.ts` and `COST_TIERS` in `vocabulary.ts` remain contract-mandated and are correctly not violations. |
| C28 | Guarantee 10 — `modelOverride` wins over the tier mapping, emitted verbatim | **PASS** (was PARTIAL) | The silent-discard path is gone. `--model sdd-auditor=my-custom-model-id` alone → `model: my-custom-model-id` in the generated file and `modelOverride` persisted. In combination with a contradicting `--roles`, the override is now an explicit `USAGE` error rather than a silent drop. |
| C40 | Error Handling Contract — every row behaves as tabled, with the contracted exit code | **PASS** (was PARTIAL) | **All twenty-two rows** (the twenty from pass 1 plus the two added this round) re-executed individually against the built CLI: unknown flag → 1; unknown tool/role/gate id → 2; malformed `--model` → 2; **out-of-set `--model` → 2 + nothing written (NEW)**; missing/invalid/wrong-version `--config` → 2; non-TTY without escape hatch → 2; missing target dir → 2; reduced gates → warn + 0; skipped tool → warn + 0; no generator → 4 + nothing written; conflict → 3 + nothing written, `--force` → 0; template root/file missing → 5; missing metadata key → 5; out-of-enum `cost_tier` → 5; unknown extra key ignored → 0; **unknown capability token → warn once + 0 (was unimplemented)**; **mid-write fs error → partial state disclosed + 1 (was unimplemented)**; escaping/absolute path → plain `Error` before any write → 1; **interactive deselected-override → warn + 0 (NEW)**. |
| C44 | **(NEW)** Guarantee 22 — selection and override are separate and cannot be conflated | **PASS** | `PartialHarnessConfig` carries `roleIds` (membership, wholesale replace) and `roleOverrides` (per-id tweak, never membership) as distinct fields; `RoleOverride` is a distinct type from `RoleSelection`. `--roles sdd-architect` yields exactly one agent file. A newly-enabled role's tier is derived from `templates` at merge time. The no-silent-drop invariant verified on **both** paths (see R21). |
| C45 | **(NEW)** Guarantee 23 — canonical bodies complete, verified non-self-referentially | **PASS** | See R22. The auditor's own verification deliberately bypassed the parser entirely, reading raw file text and slicing from the `## Role body` heading / metadata-block end to EOF. |
| C46 | **(NEW)** Parsing rules 9, 10, 11 implemented as **general** mechanisms, not a conductor special case | **PASS** | `extractBody()` is a single function called at both entry points (`parseRoleTemplate` passes `bodyHeadingIndex + 1`, `parseConductorTemplate` passes the metadata-block end). Rule 9 fires only on a *leading* blockquote; a later blockquote is preserved. Rule 10's `authoringNote` is populated on the conductor (8 lines) and correctly `undefined` on all five roles. Auditor confirmed against the real canonical layer that **no role body currently begins with a blockquote and no metadata value wraps onto a continuation line**, so amended rule 1's tighter boundary cannot truncate any real file. |
| C47 | **(NEW)** Amended `loadConfigFile` translation preserves the `serializeConfig` → `loadConfigFile` round trip | **PASS** | Re-derived end to end, not just at unit level: a run with `--roles sdd-architect,sdd-auditor --model sdd-auditor=my-lit --gates post-specs --stack node-ts` produced a `.sdd/harness.json`; replaying it through `--config` into a fresh directory yielded a **byte-identical `harness.json` and a byte-identical full output tree** (`diff -r` clean). |

*All other pass-1 contract rows (C1–C3, C5–C11, C13, C15, C16, C18, C18b, C19–C21,
C23–C27, C29–C39, C41–C43) were re-verified this pass and remain **PASS**. Guarantee 5
non-mutation, guarantee 12 shared-artifact byte-identity, guarantee 16 determinism,
guarantee 19 trailing newline, guarantee 20 packaging and guarantee 21 cycle-freedom
were each re-derived from freshly generated artifacts rather than from the suite.*

## Test Coverage — pass 2 (new and changed rows)

> Re-run by the auditor with the project's own runner: **115 passed / 115**, offline, no
> network or external service, `0` skipped / todo / only / pending. Each new row below
> was additionally **mutation-tested** — the behavior it guards was broken in `src/` and
> the test re-run — to confirm it can actually fail. Results in AL-21.

| ID | Test Description | Status | Test File |
|---|---|---|---|
| T5.14 | Conductor body completeness verified **non-self-referentially**: the raw canonical file is read with `fs.readFile` and a hardcoded literal sentence is asserted against both the raw file and the generated Skill (guarantee 23) | **PASS** | `tests/canonical-fidelity.test.ts` — genuinely non-self-referential; neither assertion routes through `template.body`. Mutation-confirmed: reverting parsing rule 1 makes it fail. |
| T5.15 | Rule 9/10: the conductor's leading blockquote is excluded from `body` and retained on `authoringNote`; a leading blockquote in a **role** body is excluded too (rule 9 is general); a **later** blockquote is preserved as ordinary content | **PASS** | `tests/templates.test.ts` — three tests, each varying one thing, all pinned to literal expected strings. Mutation-confirmed. |
| T5.16 | `--roles` actually deselects, asserted on the **emitted file set**, with gates deliberately left at their default | **PASS** | `tests/init.test.ts` (in-process, on `result.planned`) and `tests/e2e-init.test.ts` (spawns the real built CLI). Correctly isolates the one variable T32 confounded, and additionally asserts `gates` stayed at all three — so it cannot repeat T32's failure mode. Mutation-confirmed at the unit level; see AL-14 for the e2e variant's build coupling. |
| T5.17 | `--roles sdd-architect --model sdd-auditor=x` exits 2 naming both the excluded role and the enabled set, and writes nothing | **PASS** | `tests/cli.test.ts` — asserts exit code, both role names in the output, **and** an empty target dir. Mutation-confirmed. |
| T5.18 | The "no tier literal in `src/`" half of guarantee 4 that T41 had deliberately left unasserted | **PASS (narrow)** | `tests/canonical-fidelity.test.ts` — matches the `?? '<tier>'` fallback shape only, with block comments stripped first. Mutation-confirmed against a reintroduced `?? 'mid'`. Narrower than guarantee 4's clause — see AL-17. |
| T5.18a | Interactive counterpart: a `--model` override for a role deselected at Q2 warns, the run completes, nothing throws | **PASS** | `tests/init.test.ts` — drives `runInit` with `interactive: true` through a mocked `@clack/prompts` and the injected `io`; asserts the run resolved, the role is absent from `result.config.roles`, and a warning names the role plus "not applied". Mutation-confirmed: deleting step 6 makes it fail. **Auditor additionally re-derived this independently** against `dist/` with a different stub, including a control case the test itself lacks (role kept → no warning, override applied). |
| T7 | The real conductor parses with only `id`/`purpose` metadata | **PASS (still weak in itself)** | `tests/templates.test.ts` — unchanged, still asserts only `body.length > 0`. The pass-1 gap is now closed **elsewhere**, by T5.15's first test asserting `body.startsWith('You are the **conductor**')`. Acceptable, but T7's own assertion remains non-discriminating. |
| T12 | `mergeConfig` merges by id rather than position, leaving unrelated roles untouched | **PASS** | `tests/config.test.ts` — repaired onto `roleOverrides`. Auditor compared against the pass-1 version: the assertions still check merge-by-id **and** that all four unrelated roles keep their canonical tiers. Substance preserved; only the field name changed. Notably it no longer pins the additive-only semantics that AL-2 was trapped by. |
| T13 | `serializeConfig` is stable and round-trips through `loadConfigFile` | **PASS** | `tests/config.test.ts` — repaired onto `roleIds`/`roleOverrides`. Still asserts every id, tier and `modelOverride` survives the round trip. Not weakened. |
| T32 | Deselecting a role changes only the generated block | **FAIL (stale, misleading — see AL-13)** | `tests/init.test.ts:208` — still passes `overrides.roles`, a field that **no longer exists** on `PartialHarnessConfig`. Auditor executed its exact override object: the "partial" run enables **all five roles**, so the override is inert and the two outputs differ solely because of gates. The test passes, but its name and its `it(...)` text ("whether one role or five are enabled") describe something it does not do. Coverage is not lost — T5.16 covers the role half properly — so this is test hygiene, not a coverage hole. |
| T40 | Canonical fidelity: role and conductor bodies appear byte-for-byte in generated output | **PASS** | `tests/canonical-fidelity.test.ts` — the conductor half is still self-referential (compares against `templates.conductor.body`), which remains a structurally weak assertion **on its own**; it is now backstopped by T5.14. Left in place deliberately as the guarantee-1 (contiguity) check, with T5.14 carrying guarantee 23 (completeness). |
| T41 | Single-source and non-mutation | **PASS** | `tests/canonical-fidelity.test.ts` — the previously-unasserted tier-literal clause is now covered by the sibling T5.18 sweep. The prose and non-mutation halves are unchanged and still pass. |

*All other pass-1 test rows (T1–T6, T8–T11, T14–T31, T33–T39, T42, T43) were re-verified
this pass, all still real, executing, non-skipped, and passing.*

## Audit Log — pass 2
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-07-30 | sdd-auditor | **AL-13 — Pass-1 finding AL-1 CONFIRMED RESOLVED.** Original repro (`--roles <list>` in an interactive TTY → `[undefined]` → `"roles" must have at least one entry`) re-executed against the current `dist/` through a stubbed `@clack/prompts` resolver. Q2 is now correctly **skipped** with the log line `Roles already set by a flag: sdd-architect`, and the resolved config is exactly `[{id: 'sdd-architect', tier: 'most-capable'}]`. Fixed at the producer as recommended: `cli.ts` writes `roleIds`, `prompts.ts` reads `preset.roleIds`, and no `.id` is called on a preset element. | INFO | Closed. |
| 2026-07-30 | sdd-auditor | **AL-14 — Pass-1 finding AL-2 CONFIRMED RESOLVED.** `init --yes --tools claude-code --roles sdd-architect` now writes exactly **one** `.claude/agents/sdd-architect.md` (pass 1: all five), with the conductor still emitted (guarantee 6 intact) and the shared `.sdd/` artifacts unchanged. The contract amendment (Guarantee 22, `roleIds` replacing membership wholesale like `gates`) is implemented as specified in `mergeConfig`'s fixed merge order. | INFO | Closed. |
| 2026-07-30 | sdd-auditor | **AL-15 — Pass-1 finding AL-3 CONFIRMED RESOLVED, on both paths.** Non-interactive repro (`--roles sdd-architect --model sdd-auditor=my-custom-model-id`) now exits **2** with `roleOverride names role "sdd-auditor", which is not in the enabled role set. Enabled: sdd-architect.` and writes nothing. The interactive counterpart added by the architect beyond the original eight findings was independently driven through the injected `io`/prompt seams: the run **completes and writes** (9 files), emits exactly one warning naming the role and "not applied"/"deselected", and the override is genuinely not applied. A control run with the role kept emits **no** warning and applies the override verbatim — so the warning is not firing indiscriminately. This is a real fix, not a test that passes for the wrong reason. | INFO | Closed. |
| 2026-07-30 | sdd-auditor | **AL-16 — Pass-1 finding AL-4 CONFIRMED RESOLVED.** All three `?? 'mid'` literals are gone. The reachable, user-visible half re-tested: `init --yes --model sdd-auditor=<literal>` now persists `{"id":"sdd-auditor","tier":"most-capable","modelOverride":"my-custom-model-id"}` — the canonical tier — where pass 1 recorded `"tier":"mid"`. The structural mitigation the architect chose (making `templates` a required `mergeConfig` parameter, so a fallback has nothing to fall back *from*) is implemented and is the reason the defect cannot silently return by the same route. | INFO | Closed. |
| 2026-07-30 | sdd-auditor | **AL-17 — Pass-1 findings AL-5, AL-6, AL-7, AL-8 CONFIRMED RESOLVED.** *AL-5*: a forced mid-write `mkdir` failure now throws a plain `Error` naming the failing path **and** both already-written paths, with the fs error preserved on `Error.cause`, mapping to exit 1 — partial state disclosed, as the row promises. *AL-6*: the generated Skill now opens with the canonical defining sentence; the whole 6535-char conductor body reaches output verbatim (verified from raw file text, not the parser). *AL-7*: an injected unknown capability token produces exactly one `io.warn` naming token and source file, while still reaching output as a `# capability note:` line; a control run on the real templates warns zero times. *AL-8*: doc-only as the executor reported — `src/writer.ts` already documented a plain `Error`; the amended `contract.md` now matches, and the behavior (exit 1, thrown before any write) was re-confirmed for absolute and `..`-escaping paths. | INFO | Closed. |
| 2026-07-30 | sdd-auditor | **AL-18 — Amended parsing rules 1/9/10/11 pose no risk to the real canonical layer.** The concern with tightening rule 1's boundary is that it could truncate a legitimate metadata block, and with rule 9 that it could eat real content. Auditor checked the actual files rather than reasoning about them: **no** canonical role body begins with a blockquote (all five open with `You are …`), and **no** metadata value wraps onto a continuation line in any of the six files — the only non-bullet line inside any metadata region is the conductor's authoring blockquote, which is exactly what rule 9 is for. `authoringNote` is populated only on the conductor (8 lines, all `>`-prefixed) and correctly `undefined` on all five roles. | INFO (informational) | No action. |
| 2026-07-30 | sdd-auditor | **AL-19 — `tests/init.test.ts`'s T32 is now stale and its title overstates its coverage.** It still passes `overrides: { …, roles: ['sdd-architect'], gates: ['post-specs'] }`, but `roles` was removed from `PartialHarnessConfig` by this round's amendment. Because `tests/` is outside `tsconfig.json`'s `include`, this is not a type error — it is silently ignored at runtime. Auditor executed that exact override object: the "partial" run enables **all five roles**, so the run differs from the full run **only by gates**. The test therefore still passes, and its `describe`/`it` text ("deselecting a role…", "whether one role or five are enabled") describes behavior it does not exercise. Pass 1's recommendation was "strengthen T32 so it varies roles alone"; the test-writer instead added T5.16 (which does this correctly) and left T32 untouched. **No coverage is lost** — T5.16 covers the role half properly on both the in-process and packaged-binary paths — so this is test hygiene, not a hole. But leaving a green test whose name claims more than it does is the same false-confidence pattern pass 1 was rejected for. | MEDIUM | Change `roles:` → `roleIds:` on line 208 (the test then does what its name says and still passes), or retitle it as the gates-only quarantine check it has become. Not merge-blocking. |
| 2026-07-30 | sdd-auditor | **AL-20 — The end-to-end suite validates `dist/`, not `src/`.** `bin/harness.js` imports `../dist/cli.js`, and `npm test` is plain `vitest run` with no build step, so the five tests in `tests/e2e-init.test.ts` that spawn the real CLI assert against **whatever was last built**. Two consequences verified by the auditor: (a) with `src/config.ts` mutated to reintroduce the AL-2 defect but `dist/` left stale, the e2e T5.16 **still passed** — it only failed after `npm run build`; (b) with `dist/` moved aside, **all five e2e tests fail** outright. This is not a regression introduced this round (the shim and the e2e tests predate it), and `intent.md` SC1's documented sequence is `npm install && npm run build && npm test`, so the intended flow is build-first. It is recorded now because this round's verification leans on those e2e tests, and because during an amendment round — where only `src/` changes — a contributor running `npm test` alone gets a false-green on the packaged-binary path. | MEDIUM | Add a `pretest": "npm run build"` script so the coupling is enforced rather than remembered. Note this touches `package.json`, whose five scripts are pinned by `contract.md`'s Data Models section, so it needs a one-line contract amendment rather than a unilateral edit. Not merge-blocking. |
| 2026-07-30 | sdd-auditor | **AL-21 — Mutation testing: six of seven amendment-round tests provably fail for the right reason.** Each fix was reverted in `src/` and the paired test re-run. **Caught the defect:** T5.18a (step 6 deleted), T5.14 and T5.15 (rule 1 boundary reverted to the AL-6 behavior), T5.16 in-process (`roleIds` made inert), T5.17 (out-of-set override silently dropped), T5.18 (`?? 'mid'` reintroduced). **Did not catch it:** T5.16's e2e variant — but only because of the `dist/` staleness in AL-20; once rebuilt, it failed correctly. So every new test is genuinely discriminating. Full suite restored to 115/115 afterwards and `git status -- templates .claude` re-confirmed empty. | INFO (informational) | No action. This is the check pass 1's standing notes asked for, now performed. |
| 2026-07-30 | sdd-auditor | **AL-22 — T5.18's tier-literal sweep is narrower than the clause it discharges.** Guarantee 4 says "no tier literal in `src/`"; the test matches only the `?? '<tier>'` nullish-coalescing shape. It would not catch `tier: 'mid'` used as a default, `entry.tier \|\| 'mid'`, or `const DEFAULT_TIER = 'mid'`. It also strips only `/* … */` block comments, so a `//`-style line comment quoting the pattern would false-positive. The test-writer disclosed this narrowing and the rationale is sound (a bare substring sweep would false-positive on `COST_TIERS` and `MODEL_BY_TIER`, both contract-mandated), and the auditor confirmed independently by grep that no tier literal of **any** shape is currently used as a default in `src/`. Recording so the residual gap is known rather than assumed closed. | LOW | Optionally widen to also flag `\|\|`-style and bare-assignment defaults, or keep as-is and rely on the behavioral T10 for the `defaultConfig` path. |
| 2026-07-30 | sdd-auditor | **AL-23 — T5.14 pins one sentence where Guarantee 23 is framed more broadly.** The guarantee is titled "canonical bodies are complete, not merely contiguous", but its own normative text names exactly the one sentence T5.14 asserts, so the test is contract-conformant. The auditor's independent check went further and confirmed the **whole** body reaches output for all six artifacts, so there is no actual gap today — a regression that dropped, say, the conductor's final section would pass T5.14 while failing the auditor's check. | LOW | Optionally strengthen T5.14 to slice the raw file from the anchor sentence to EOF and assert that whole slice, which is what the auditor did by hand. |
| 2026-07-30 | sdd-auditor | **AL-24 — `runInit` step 6 re-checks only flag-supplied overrides, not a `--config` file's.** Step 6 guards on `options.overrides?.roleOverrides`, so `roleOverrides` arriving via `configFile` (step 3) are not re-checked after interactive prompts. This is **unreachable through the CLI** — `src/cli.ts` forces `interactive = false` whenever `--config` is present — and `contract.md`'s step 6 says "flag-supplied", so the implementation matches the contract exactly. Recorded only because a future library-level caller passing both `configFile` and `interactive: true` would get a silent drop on that path. | LOW (informational) | No action now. Worth a note if `--config` ever becomes compatible with interactive mode. |
| 2026-07-30 | sdd-auditor | **AL-25 — No regressions detected from the amendment round.** Every guarantee that passed in pass 1 was re-derived from freshly generated artifacts, not from the suite: packaging (29 entries, 11 templates, zero `src/`/`tests/`/`specs/`), determinism (`diff -r` clean across two fresh runs), spec-schema byte-identity (`cmp` clean on all five), trailing newline (exactly one on all twelve files), path containment, `NO_GENERATOR`, conflict/`--force`, `--dry-run` writing nothing, non-mutation of `templates/` and `.claude/`, the two-runtime-dependency budget at the pinned versions, guarantee 17 (`process.exit` appears in `src/` only inside a doc comment), guarantee 21 (runtime import graph enumerated and acyclic; `vocabulary.ts` has zero imports), and the full non-goal sweep (exactly one generator, `availableToolIds() === ['claude-code']`, only the `init` command, no MCP/agnostic-layer/lint/CI code). The `--config` round trip additionally now verifies byte-identical output trees end to end. | INFO | No action. |

## Final Verdict — pass 2

**Status**: **APPROVED WITH RESERVATIONS**

**Summary**: All eight pass-1 findings (AL-1 … AL-8, four of them CRITICAL) are
independently confirmed resolved — each original repro was re-executed against the
current code and none reproduces — and the architect's self-identified ninth fix, the
interactive-path `io.warn`, is a genuine fix rather than a test passing for the wrong
reason, verified by driving the built code through stubbed prompt and `io` seams
including a control case the suite itself lacks. Every Behavior Guarantee (1–23), every
Error Handling Contract row (all twenty-two), and every `intent.md` success criterion now
verifies; 115/115 tests pass offline, `tsc` is clean, packaging is exact, and
`templates/`/`.claude/` remain byte-for-byte untouched. The reservations are two
MEDIUM **test-integrity** issues that do not affect shipped behavior or any guarantee.

**Critical Issues** (must fix before merge):
- None.

**Warnings** (should fix, not blocking):
- **AL-19** — `tests/init.test.ts`'s T32 still passes the removed `overrides.roles`
  field, so its "deselecting a role" scenario is inert and it now varies only gates.
  It passes, and T5.16 covers the role half correctly, but the test's name claims
  coverage it does not have. One-word fix: `roles:` → `roleIds:`.
- **AL-20** — The e2e suite asserts against `dist/`, and `npm test` does not build.
  Verified: a `src/`-only regression goes undetected by the e2e tests unless someone
  remembers to rebuild, and `npm test` on an unbuilt tree fails all five. Add
  `"pretest": "npm run build"` — which requires a one-line `contract.md` amendment,
  since the five scripts are contract-pinned.

**Recommendations** (nice to have):
- **AL-22** — Widen T5.18's tier-literal sweep beyond the `?? '<tier>'` shape, or record
  explicitly that the behavioral T10 carries the rest of the clause.
- **AL-23** — Strengthen T5.14 to assert the whole raw body slice from the anchor
  sentence to EOF, as the auditor did by hand, rather than the single sentence.
- **T7** — Still asserts only `body.length > 0`. Now backstopped by T5.15, but the
  assertion itself remains non-discriminating and could simply adopt T5.15's
  `startsWith` check.
- **AL-24** — If `--config` ever becomes compatible with interactive mode, extend step 6
  to cover config-file-supplied `roleOverrides`.
- Carried forward unchanged from pass 1 and still open, none blocking: **AL-9**
  (cosmetic — quoted `name:`, unconditional stack traces, no real writability probe),
  **AL-10** (fold `"types": ["node"]` into the contract's pinned `tsconfig` shape with
  the `TS2591` rationale), **AL-11** (`sdd-documentation` should complete the
  `create-sdd-harness` → `harny` rename sweep across `AGENTS.md`, `README.md`,
  `CHANGELOG.md`), and the `.gitignore`-excludes-`specs/` note from `intent.md`
  Constraints.

### Standing notes carried into any future pass

- The pass-1 note "run the toolchain yourself" was honoured and extended: this pass also
  **mutation-tested** every new test (AL-21). That check should become routine here —
  three of this feature's shipped defects survived a green suite, and mutation testing is
  what distinguishes a test that passes from a test that can fail.
- **Risk-table outcome this pass**: the three highest-risk deviations from
  `roadmap.md` — hardcoded tier defaults, configuration leaking into canonical prose, and
  a second generator sneaking in — were all checked and **none is present**. Risk (1),
  which materialized as AL-4 in pass 1, is now structurally prevented by `mergeConfig`'s
  required `templates` parameter rather than merely tested against.
- **Both carried-forward findings from `specs/canonical-role-templates/audit.md` remain
  closed** (AL-5 via `.sdd/spec-schema/` deployment, AL-7 via conductor parsing plus
  `Capability.scope`), and the `io.warn` half of the `ask-human` forward-compatibility
  path — noted in pass 1 as missing — is now implemented and verified (R24).
