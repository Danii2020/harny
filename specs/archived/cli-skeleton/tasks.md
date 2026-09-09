# Tasks: cli-skeleton

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

Every task cites the `roadmap.md` phase it belongs to (by section) and the contract
item or guarantee it discharges (`Gn` = intent goal, `guarantee n` = `contract.md`
Behavior Guarantee). Paths are the real ones from this repo's layout: `bin/*.js`,
`src/*.ts`, `src/generators/*.ts`, `tests/*.test.ts`.

## Phase 1: Project bootstrap & toolchain

- [x] Task 1.1: Create `package.json` per the contract's pinned shape — name
      `harny`, `"type": "module"`, the single `bin` entry `harny` → `bin/harness.js`
      (an internal path, deliberately not renamed — see `intent.md` Prior Art),
      the `files` allowlist (`bin`, `dist`, `templates`, `README.md`,
      `CHANGELOG.md`, `AGENTS.md`), `engines.node >= 20.19.0`, the five scripts, and the
      verified versions `commander@15.0.0` / `@clack/prompts@1.7.0` /
      `typescript@7.0.2` / `vitest@4.1.10` / `@types/node@26.1.2` — `package.json` (G1, G10)
- [x] Task 1.2: Create `tsconfig.json` — `module`/`moduleResolution` `nodenext`, target
      `es2023`, `strict`, `verbatimModuleSyntax`, `rootDir: src`, `outDir: dist`,
      `include: ["src"]` — `tsconfig.json` (G1)
- [x] Task 1.3: Create `vitest.config.ts` — `environment: 'node'`,
      `include: ['tests/**/*.test.ts']` — `vitest.config.ts` (G1)
- [x] Task 1.4: Add `node_modules/` and `dist/` to `.gitignore`, leaving the existing
      four entries untouched — `.gitignore` (G1)
- [x] Task 1.5: Implement the five closed vocabularies (`TOOL_IDS`, `ROLE_IDS`,
      `GATE_IDS`, `COST_TIERS`, `CAPABILITY_NAMES`) and their derived types, with **no
      imports** — `src/vocabulary.ts` (G1, guarantee 21)
- [x] Task 1.6: Implement the `EXIT` table (`OK` 0, `UNEXPECTED` 1, `USAGE` 2,
      `CONFLICT` 3, `NO_GENERATOR` 4, `TEMPLATE` 5, `CANCELLED` 130), `HarnessError`
      with `details` and the `exitCode` getter, and `isHarnessError` —
      `src/errors.ts` (G1, Error Handling Contract)
- [x] Task 1.7: Implement the executable shim: shebang, import `main` from
      `../dist/cli.js`, assign `process.exitCode`, and nothing else — `bin/harness.js`
      (G1, guarantee 17)
- [x] Task 1.8: Stub the commander program so `--help` renders and the `init` command is
      declared (action not yet implemented). Call `.name('harny')` explicitly — without
      it commander derives the name from `argv[1]` and help would read
      `Usage: harness.js …`, leaking the internal file name — `src/cli.ts` (G1)
- [x] Task 1.9: Verify the toolchain end to end: `npm install`, `npm run build`,
      `npm run typecheck`, `npx vitest run` all execute — no file (G1)

## Phase 2: Canonical template engine

- [x] Task 2.1: Implement metadata-block parsing per normative rules 1–5: heading match
      `/^##\s+(Role )?Metadata\s*$/`, entry match `/^-\s+([a-z_]+):\s*(.*)$/`, split on
      the **first** `: ` only, snake→camel key mapping, fatal on missing required keys,
      **lenient on unknown keys**, fatal on out-of-enum `cost_tier` — `src/templates.ts`
      (G3, Error Handling rows for `TEMPLATE`)
- [x] Task 2.2: Implement `parseCapabilityList` — comma tokens, `name (scope)` →
      `{ name, scope }`, unknown tokens preserved with `known: false`. This is the fix
      that stops the auditor's `write-files (audit.md only)` scope being dropped —
      `src/templates.ts` (G5, guarantee 8, closes prior audit AL-7)
- [x] Task 2.3: Implement `parseRoleTemplate` — body keyed off `/^##\s+Role body\s*$/`,
      leading/trailing blank lines removed, everything else verbatim; fatal if the
      heading is absent or `id` mismatches the H1 — `src/templates.ts` (G3, guarantee 1)
- [x] Task 2.4: Implement `parseConductorTemplate` — accept a metadata block carrying
      only `id`/`purpose` **without** treating the absent `cost_tier`/`capabilities` as
      an error; body per amended rule 11 — `src/templates.ts` (G3,
      closes prior audit AL-7)
- [x] Task 2.4a **(REWORK — AL-6)**: Re-implement metadata-block termination per amended
      rule 1 — the block is the contiguous `- key: value` bullets, ending at the first
      line that is neither blank nor a bullet (or the next `## `), **not** at the next
      `## ` heading alone — `src/templates.ts` (G3, guarantee 23)
- [x] Task 2.4b **(NEW — AL-6)**: Implement the general authoring-commentary rule 9 — a
      leading blockquote immediately after the body-start marker (metadata-block end for
      the conductor, `## Role body` for a role) is excluded from `body`; a blockquote
      later in the body is ordinary content and is preserved — `src/templates.ts`
      (G3, guarantee 23)
- [x] Task 2.4c **(NEW — AL-6)**: Surface excluded commentary as `authoringNote` on
      `RoleTemplate` and `ConductorTemplate` per rule 10, so a wrong exclusion is
      inspectable rather than silent — `src/templates.ts` (G3, guarantee 23)
- [x] Task 2.5: Implement `resolveTemplatesRoot()` from `import.meta.url` and confirm it
      resolves identically from `src/` under vitest and from `dist/` after a build —
      `src/templates.ts` (G3)
- [x] Task 2.6: Implement `loadCanonicalTemplates()` — five roles, the conductor, and
      the five spec-schema files read byte-for-byte with no reformatting; `TEMPLATE`
      error naming the resolved root and missing path on any absence —
      `src/templates.ts` (G3, guarantee 12)
- [x] Task 2.7: Implement `defaultConfig(templates)` deriving every role's tier from the
      parsed canonical `cost_tier`, with **zero** tier literals in source —
      `src/config.ts` (G4, guarantee 7)
- [x] Task 2.8: Implement `validateConfig`, `mergeConfig`, and `serializeConfig`
      (declaration-order keys, 2-space indent, one trailing newline) — `src/config.ts`
      (G2, G8)
- [x] Task 2.8a **(REWORK — AL-1/AL-2/AL-3/AL-4)**: Split `PartialHarnessConfig`'s single
      `roles` field into `roleIds` (wholesale membership replacement, like `gates`) and
      `roleOverrides` (per-id tweaks that never change membership); add the `RoleOverride`
      type — `src/config.ts` (G2, G8, guarantee 22)
- [x] Task 2.8b **(REWORK — AL-2/AL-4)**: Re-implement `mergeConfig` with the required
      third parameter `templates: CanonicalTemplates` and the fixed order — `roleIds`
      replaces membership first, then `roleOverrides` layer on. Every newly-enabled
      role's tier is derived from its canonical `cost_tier`; **delete the three `?? 'mid'`
      literals** at `src/cli.ts:57`, `src/config.ts:216`, `src/prompts.ts:80` — no code
      path needs a fallback once `templates` is in scope — `src/config.ts`, `src/cli.ts`,
      `src/prompts.ts` (G4, guarantees 4, 7, 22)
- [x] Task 2.8c **(NEW — AL-3)**: Raise `USAGE` when a `roleOverride` names a role outside
      the resulting enabled set, naming the role, the excluding flag pair, and the enabled
      set — `src/config.ts` (G8, Error Handling row)
- [x] Task 2.9: Implement `loadConfigFile` plus `parseToolList` / `parseRoleList`
      (`'all'`) / `parseGateList` (`'all'`, `'none'`) / `parseModelAssignment`
      (`role=tier|literal`), each raising `USAGE` with the offending value and the valid
      set — `src/config.ts` (G8, Error Handling rows)
- [x] Task 2.9a **(REWORK — AL-2 consequence)**: Update `loadConfigFile` to translate the
      persisted `roles: RoleSelection[]` into `roleIds` + `roleOverrides`, preserving the
      `serializeConfig` → `loadConfigFile` round-trip (T13) while giving a config file the
      same replace-not-append semantics as `--roles` — `src/config.ts` (G8)
- [x] Task 2.10: Implement `buildPayload` — enabled roles in `ROLE_IDS` order, conductor
      always populated, `reducedGates` computed, `TEMPLATE` error if an enabled role has
      no canonical template — `src/engine.ts` (G3, guarantee 6)
- [x] Task 2.11: Implement `SPEC_SCHEMA_DIR` (`.sdd/spec-schema`),
      `HARNESS_CONFIG_PATH` (`.sdd/harness.json`), and `buildSharedFiles` emitting the
      five schema files byte-identically plus the resolved config **exactly once**
      regardless of tool count — `src/engine.ts` (G9, guarantee 12, closes prior audit AL-5)
- [x] Task 2.12: Grep `src/` to confirm no canonical role/conductor/schema prose and no
      `cost_tier` literal is embedded anywhere — no file (G3, G4, guarantee 4)

## Phase 3: Generator adapter interface & the Claude Code reference generator

- [x] Task 3.1: Define `WrapperFormat`, `GeneratedFile`, `CapabilityMapping`, and the
      `Generator` interface — `conductorPath` deliberately independent of `agentsDir`,
      `roleFileName` returning a file name so `.md` / `.agent.md` / `.toml` are all
      expressible. Interface only, no implementation — `src/generators/types.ts` (G5,
      guarantee 11)
- [x] Task 3.2: Implement `yamlQuote` (escape `\` and `"`, encode newlines as `\n`) and
      `renderFrontmatter` (fields plus YAML `#` comment lines) —
      `src/generators/markdown-yaml.ts` (G5)
- [x] Task 3.3: Implement `renderProvenance` and `renderProjectConfigBlock` with the
      `GENERATED_BLOCK_BEGIN` / `GENERATED_BLOCK_END` markers, stating enabled roles,
      active gates, stack, the spec-schema directory, and — when gates are reduced — an
      explicit notice — `src/generators/markdown-yaml.ts` (G7, guarantees 3, 9)
- [x] Task 3.4: Implement the Claude Code descriptor fields: `id`, `displayName`,
      `agentsDir` `.claude/agents`, `conductorPath`
      `.claude/skills/sdd-conductor/SKILL.md`, `wrapperFormat` `markdown-yaml`,
      `roleFileName` → `` `${id}.md` `` — `src/generators/claude-code.ts` (G6)
- [x] Task 3.5: Implement `mapModel` — `most-capable`→`opus`, `mid`→`sonnet`,
      `cheapest`→`haiku`, `override` returned verbatim —
      `src/generators/claude-code.ts` (G6, guarantee 10)
- [x] Task 3.6: Implement `mapCapabilities` per the contract's six-row token table,
      returning `tokens` (deduped, stable order) **and** `notes` for scoped and unknown
      capabilities — `src/generators/claude-code.ts` (G5, guarantee 8)
- [x] Task 3.7: Implement `renderRole` — frontmatter (`name`, `description` = purpose +
      invocation, `model`, `tools`), a YAML comment per capability note, the provenance
      line, then the canonical body **byte-for-byte**, ending in exactly one newline —
      `src/generators/claude-code.ts` (G6, G7, guarantees 1, 2, 19)
- [x] Task 3.8: Implement `renderConductor` — Skill-style `name`/`description`
      frontmatter, provenance, verbatim conductor body, then the delimited generated
      project-config block as the only location of configuration —
      `src/generators/claude-code.ts` (G6, guarantee 3)
- [x] Task 3.9: Implement the registry, `getGenerator`, and `availableToolIds()`
      returning exactly `['claude-code']` — `src/generators/index.ts` (G5, guarantee 18)

## Phase 4: Integration — prompts, writer, and the `init` pipeline

- [x] Task 4.1: Implement `assertContained` rejecting absolute paths and any path
      escaping `targetDir` after normalization — `src/writer.ts` (G8, guarantee 15)
- [x] Task 4.2: Implement `planWrites` — stable ordering, existing-path conflict
      collection — `src/writer.ts` (G8, guarantee 13)
- [x] Task 4.3: Implement `applyWrites` — conflict check strictly **before** the first
      write unless `force`, recursive parent-directory creation, returning the written
      paths — `src/writer.ts` (G8, guarantees 13, 16)
- [x] Task 4.3a **(NEW — audit AL-5)**: Implement the unimplemented Error Handling row
      "Filesystem error mid-write": catch the failure, report the paths already written
      before it, and re-throw so `main` still exits 1. Partial state must be **disclosed,
      never hidden** — that is the row's stated user impact — `src/writer.ts`
      (G8, Error Handling Contract)
- [x] Task 4.4: Implement the five `plan.md` §4 questions in order with the verified
      `@clack/prompts` widgets: tool `multiselect` (`required: true`, unimplemented
      tools hinted "generator not shipped yet"), role `multiselect` (all five default,
      message noting the conductor is always on), per-role tier `select` defaulting to
      the canonical tier plus a `custom…` → `text` path, gate `multiselect` (all three
      default), and the optional stack `text` — `src/prompts.ts` (G2)
- [x] Task 4.5: Route every `isCancel` result through `cancel()` and
      `HarnessError('CANCELLED')`; implement `confirmWrite`, skipped under `--yes`, with
      a declined answer also raising `CANCELLED` — `src/prompts.ts` (G2, Error Handling row)
- [x] Task 4.6: Implement `runInit` following the contract's 13-step sequence exactly,
      with `templatesRoot`, `overrides`, `configFile`, and `io` as injected seams —
      `src/init.ts` (G1, G8)
- [x] Task 4.7: Implement the reduced-gates warning naming the missing gates, and the
      per-tool "generator not shipped yet" skip warning — `src/init.ts` (G2, guarantee 9)
- [x] Task 4.7a **(NEW — audit AL-7)**: Implement the unimplemented Error Handling row
      "Canonical file carries an unknown capability token": `io.warn` **once** per run
      (not once per role, not silently) naming the token and the file it came from. The
      token is already preserved as `known: false` and already reaches output via
      `CapabilityMapping.notes`; only the warning is missing — `src/init.ts`
      (G5, guarantee 8, Error Handling Contract)
- [x] Task 4.8: Implement the `NO_GENERATOR` failure path: exit 4 listing
      `availableToolIds()` and write nothing when no selected tool has a generator, while
      succeeding with `skippedTools` when at least one does — `src/init.ts` (G5, guarantee 18)
- [x] Task 4.9: Implement the full `init` flag table (`[target]`, `--tools`, `--roles`,
      repeatable `--model`, `--gates`, `--stack`, `--config`, `-y/--yes`, `--dry-run`,
      `--force`) and translate flags into `PartialHarnessConfig` — `src/cli.ts` (G8)
- [x] Task 4.9a **(REWORK — AL-1/AL-3)**: Rewrite the flag→config translation
      (`buildRoleOverrides` and callers): `--roles` sets `roleIds` only, `--model` sets
      `roleOverrides` only. Remove the `ids = roleIds ?? [...assignments.keys()]`
      coupling that discarded out-of-list `--model` assignments, and stop emitting bare
      `RoleId` strings into a field typed for objects — `src/cli.ts` (G8, guarantee 22)
- [x] Task 4.9b **(REWORK — AL-1)**: Update `prompts.ts` preset consumption — question 2
      reads `preset.roleIds` (a `RoleId[]`), question 3 reads `preset.roleOverrides`;
      never call `.id` on a preset role element — `src/prompts.ts` (G2, guarantee 22)
- [x] Task 4.9c **(NEW — interactive-path gap in the AL-3 policy)**: Implement `runInit`
      **step 6** — after `runInitPrompts` returns, re-check every flag-supplied
      `roleOverride` against the final enabled-role set and `io.warn` for each role the
      user deselected at question 2, naming the role, the supplying flag, and that the
      override was not applied. **Warn, not error**: step 4's check necessarily runs
      before the prompts, so this contradiction can only appear afterwards, and aborting
      a completed interactive session would be hostile. Note this shifts the sequence
      from 12 steps to 13 — old steps 6–12 become 7–13 — `src/init.ts`
      (G8, guarantee 22, Error Handling Contract)
- [x] Task 4.10: Implement the interactivity resolution rule — `--yes` ⇒
      non-interactive; else `--config` ⇒ non-interactive; else no TTY on stdin ⇒ `USAGE`
      naming both escape hatches; else interactive with flag-answered questions skipped
      — `src/cli.ts` (G8, Error Handling row)
- [x] Task 4.11: Implement `HarnessError` → `ExitCode` mapping in `main`, returning the
      code and never calling `process.exit` — `src/cli.ts` (G1, guarantee 17)
- [x] Task 4.12: Wire `--dry-run` to print the full planned file list and return
      `written: []` without touching disk — `src/init.ts`, `src/cli.ts` (G8, guarantee 14)

## Phase 5: Validation, packaging & oracle comparison

- [x] Task 5.1: Run `init --yes --tools claude-code` into a temp directory with no TTY
      and confirm exit 0 and the exact twelve-file manifest: five
      `.claude/agents/sdd-*.md`, `.claude/skills/sdd-conductor/SKILL.md`, five
      `.sdd/spec-schema/*.md`, and `.sdd/harness.json` — `tests/e2e-init.test.ts` (G6, G9)
- [x] Task 5.2: Assert canonical fidelity — each of the five role bodies and the
      conductor body appears byte-for-byte as a substring of its generated file, and
      configuration appears only between the generated-block markers —
      `tests/canonical-fidelity.test.ts` (G7, guarantees 1, 3)
- [x] Task 5.3: Assert the auditor's scope text `audit.md only` is present in the
      generated `.claude/agents/sdd-auditor.md` —
      `tests/generators/claude-code.test.ts` (G5, guarantee 8)
- [x] Task 5.4: Assert tier defaults track canonical content — point `templatesRoot` at
      a fixture whose `cost_tier` is mutated and confirm the default follows it with no
      source change — `tests/config.test.ts`, `tests/fixtures/templates/**` (G4, guarantee 7)
- [x] Task 5.5: Assert determinism — two runs with identical config and templates
      produce byte-identical output — `tests/e2e-init.test.ts` (guarantee 16)
- [x] Task 5.6: Assert the safety paths — `--dry-run` writes nothing; a re-run without
      `--force` exits 3 and writes nothing; `--force` succeeds; non-TTY without
      `--yes`/`--config` exits 2 — `tests/e2e-init.test.ts`, `tests/cli.test.ts`
      (guarantees 13, 14; Error Handling rows)
- [x] Task 5.7: Assert packaging — `npm pack --dry-run` lists `bin/`, `dist/`, and all
      eleven `templates/**` files and lists nothing under `src/`, `tests/`, or `specs/`
      — `tests/packaging.test.ts` (G10, guarantee 20)
- [x] Task 5.8: Assert non-mutation and single-source — `git status --porcelain` shows no
      change under `templates/` or `.claude/`, and `src/` holds no canonical prose and no
      tier literal — `tests/canonical-fidelity.test.ts` (G3, guarantees 4, 5)
- [x] Task 5.9: Compare generated `.claude/agents/*.md` against the live files
      **structurally only** — frontmatter keys present, `model` value per role, provenance
      line present — and explicitly not byte-wise, since the live files retain
      `<example>` blocks and `color:` keys the canonical layer intentionally dropped —
      `tests/generators/claude-code.test.ts` (G6, Integration Points)
- [x] Task 5.10: Assert interface sufficiency — the five-target evidence table
      (`agentsDir`, `roleFileName` result, `wrapperFormat`, `conductorPath` for
      claude-code, cursor, kiro, github-copilot, codex) is expressible by `Generator`
      without interface changes — `tests/generators/registry.test.ts` (G5, guarantee 11)
- [x] Task 5.11: Confirm no runtime import cycles — `src/vocabulary.ts` imports nothing
      and no module pair imports each other at runtime — `tests/vocabulary.test.ts`
      (G1, guarantee 21)
- [x] Task 5.12: Naming-consistency sweep after the rename — no user-facing string, help
      text, generated marker, or provenance line mentions `create-sdd-harness`; markers
      read `harny:begin`/`harny:end`; `--help` reads `Usage: harny …`; the only surviving
      uses of "harness" are the two intentional internal paths `bin/harness.js` and
      `.sdd/harness.json` — `tests/cli.test.ts`, `tests/generators/claude-code.test.ts`
      (audit C18b)
- [x] Task 5.14 **(NEW — AL-6, replaces the weak half of T40)**: Assert the conductor's
      body reaches output **non-self-referentially** — read the raw text of
      `templates/conductor/sdd-conductor.md` directly (NOT via the parser) and assert the
      literal sentence `You are the **conductor** of the SDD pipeline, not a participant.`
      appears in the generated `.claude/skills/sdd-conductor/SKILL.md`. T40's existing
      conductor assertion compares generated output against the parser's own `body`, so it
      is structurally incapable of catching content the parser never extracted — which is
      exactly how AL-6 survived 106 green tests — `tests/canonical-fidelity.test.ts`
      (guarantee 23)
- [x] Task 5.15 **(NEW — AL-6)**: Assert the authoring blockquote is excluded from the
      generated Skill (the `> Canonical orchestration content…` note must NOT appear) while
      being retained on `authoringNote`, and assert a blockquote appearing later in a body
      is preserved — `tests/templates.test.ts` (rules 9, 10; guarantee 23)
- [x] Task 5.16 **(NEW — AL-2, replaces the weak T32)**: Assert `--roles` actually
      deselects, on the **emitted file set itself** and independently of the conductor
      block: `init --yes --tools claude-code --roles sdd-architect` writes exactly one
      `.claude/agents/sdd-*.md`. T32 currently passes for the wrong reason — its "partial"
      run varies gates *and* roles, so the gates change alone accounts for the diff —
      `tests/e2e-init.test.ts`, `tests/init.test.ts` (guarantee 22; intent SC added this round)
- [x] Task 5.17 **(NEW — AL-3)**: Assert `--roles sdd-architect --model sdd-auditor=x`
      exits 2 with a message naming the role and the enabled set, and writes nothing —
      replacing the shipped silent-drop behavior — `tests/cli.test.ts`
      (Error Handling Contract, guarantee 22)
- [x] Task 5.18 **(NEW — AL-4, closes T41's deliberately-unasserted clause)**: Assert the
      "no tier literal in `src/`" half of guarantee 4 that T41 documented as skipped —
      sweep `src/` for `'most-capable'|'mid'|'cheapest'` literals used as defaults and
      assert none remain. Its absence is precisely why AL-4 shipped —
      `tests/canonical-fidelity.test.ts` (G4, guarantees 4, 7)
- [x] Task 5.18a **(NEW — interactive-path gap in the AL-3 policy)**: Assert the
      interactive counterpart of Task 5.17 — with `--model sdd-auditor=x` supplied and the
      auditor deselected at question 2, the run **completes normally (exit 0) and emits a
      warning** naming the role and the unapplied override, rather than erroring or
      dropping it silently. Drive it through the injected `io.warn` seam so no TTY is
      needed — `tests/init.test.ts` (guarantee 22, Error Handling Contract)
- [x] Task 5.19 (was 5.13; renumbered to stay last): Run the full toolchain —
      `npm run typecheck` and `npm test` clean — and sweep for any dropped or unresolved
      item so the auditor can log it formally in `audit.md` (writing `audit.md` is the
      auditor's job, not the executor's) — no file (G1, all success criteria).
      **Reopened for the amendment round**: it passed on the pre-amendment code, so it
      must be re-run after Tasks 2.4a–5.18 land.

## Blocked Items

[None]

## Amendment round 1 — post-audit REJECTED verdict (2026-07-30)

The first audit returned **REJECTED**. Two findings needed architect decisions rather
than code fixes; the amendments are already applied to `contract.md` and the resulting
work is checklisted above as `(REWORK …)` / `(NEW …)` tasks. Nothing from the green
phase is discarded — 106/106 tests still pass and every other audit row passed.

**Contract amendments already applied (no executor action needed on the spec itself):**

- **AL-6 → parsing rules 1, 9, 10, 11** (`contract.md`). Rule 1's metadata block now ends
  at the first non-blank non-bullet line rather than at the next `## ` heading; new rule 9
  excludes a leading authoring blockquote **generally** (both entry points, not a
  conductor special case); rule 10 requires the exclusion be observable via
  `authoringNote`; rule 11 pins `body` and anchors it to literal expected text. Also
  added `authoringNote` to `RoleTemplate`/`ConductorTemplate` and Behavior Guarantee 23.
- **AL-1/AL-2/AL-3/AL-4 → `PartialHarnessConfig` split** (`contract.md`). `roleIds`
  (wholesale membership replacement, like `gates`) and `roleOverrides` (per-id tweaks,
  never membership) are now separate fields; `mergeConfig` takes a required `templates`
  parameter and a fixed merge order; a new Error Handling row makes an out-of-set
  `--model` a `USAGE` error; new Behavior Guarantee 22.
- **AL-8 → doc-comment only.** `assertContained`'s comment claimed it throws
  `HarnessError('UNEXPECTED'-mapped)`, which is unconstructible (`'UNEXPECTED'` is an
  `EXIT` key, not a `HarnessErrorCode`). The comment now says it throws a plain `Error`
  surfaced as exit 1. **The implementation was already correct — no code change.**

**Task ordering for the executor.** Do Tasks 2.8a → 2.8b → 2.8c → 2.9a before 4.9a/4.9b:
the config-layer split must exist before the CLI and prompt layers can be rewired to it,
or the intermediate state won't type-check. The parsing tasks (2.4a–2.4c) are independent
of the config tasks and can be done in either order. Task 5.19 is re-run last.

**Why the new Phase 5 tasks matter more than usual this round.** Three of the shipped
defects survived a full green test suite because the tests that should have caught them
were self-referential or varied two things at once. Tasks 5.14, 5.16 and 5.18 exist
specifically to close those blind spots — a passing test that cannot fail for the right
reason is worse than a missing one, because it buys false confidence at review time.

## Notes

**For the test writer.** The red-phase tests must be authored from `contract.md` before
Phase 1 implementation begins, per `AGENTS.md`'s red-first default. The seams designed
for exactly this purpose are `InitOptions.templatesRoot` (point it at
`tests/fixtures/templates/`), `InitOptions.io` (capture `log`/`warn` instead of writing
to the console), and `InitOptions.interactive: false` (so no test needs a TTY). Fixtures
should include at least three canonical trees: a well-formed minimal one, one with a
mutated `cost_tier` for Task 5.4, and one with a malformed metadata block for the
`TEMPLATE` error rows. Spec linkage belongs in each test's docstring/comment, not in the
test name.

**For the executor.** `templates/` and `.claude/` are read-only inputs. If a canonical
file appears wrong, that is a finding to report — not an edit. Likewise, do not
pre-emptively update `README.md`, `CHANGELOG.md`, or `AGENTS.md`: those belong to the
`sdd-documentation` role after the audit verdict is approved.

**Two prior-audit findings are closed by specific tasks here**, and should be verified as
such rather than assumed: AL-5 (dangling `spec-schema` references once a role is emitted
into a user's repo) by Task 2.11, and AL-7 (conductor metadata lacking `cost_tier`, and
the auditor's free-text capability scope) by Tasks 2.2 and 2.4.

**Rename applied at the spec-review gate** (human change request, 2026-07-30): the
product is `harny`, not `create-sdd-harness`. Package name `harny`, one `bin` entry
`harny`, invocation `npx harny init`. Two consequences the executor must not undo:
(1) `npm create harny` does **not** work — that shorthand requires a package literally
named `create-harny` — so `npx harny init` is the only documented invocation; and
(2) `src/cli.ts` must call `.name('harny')` explicitly, because commander otherwise
derives the help text from `argv[1]` and would print `Usage: harness.js …`. The paths
`bin/harness.js` and `.sdd/harness.json` intentionally keep the word "harness", which
survives as the generic noun for the generated pipeline (`plan.md`'s own title uses it
that way); they are internal and never typed by a user.

**Contract revision made during spec authoring** (disclosed rather than left implicit):
the vocabularies were moved out of `src/config.ts` into a new `src/vocabulary.ts`
because keeping them in `config.ts` created a `config.ts` ↔ `templates.ts` import cycle
that compiled only because one direction was type-only and therefore erased. Task 1.5
and guarantee 21 encode the fix. `intent.md` needed no revision.

**Known non-goal boundary worth restating**, because the interface makes crossing it
cheap: only the Claude Code generator ships. `availableToolIds()` returning exactly
`['claude-code']` is an asserted expectation (Task 3.9), so adding a second generator in
this feature would fail a test — deliberately.

## Executor completion notes (green phase, 2026-07-30)

All 55 tasks across Phases 1-5 implemented and checked off above. Final state:
`npm run typecheck` — 0 errors. `npx vitest run` — 104/106 passing (see "Known
red-phase test bug" below for the remaining 2). `templates/` and `.claude/` verified
byte-for-byte unchanged (`git status --porcelain -- templates .claude` is empty).
`npm pack --dry-run` includes `bin/`, `dist/`, all eleven `templates/**` files, and
nothing under `src/`, `tests/`, `specs/`.

**Known red-phase test bug (reported, not edited):** `tests/e2e-init.test.ts`'s local
`listFilesRecursively` helper computes `path.relative(root, full)` using the
per-recursion-level `root` parameter instead of the original top-level root, so every
nested file's directory prefix is dropped (e.g. `.claude/agents/sdd-architect.md`
collapses to `sdd-architect.md`). This flattens the file list before the two
assertions that depend on it, so:
- T36 ("exits 0 ... produces exactly the twelve contracted files") fails: it expects
  nested paths but receives flattened basenames.
- T39 ("determinism ... byte-identical output") fails downstream of the same bug:
  it tries to `fs.readFile(path.join(targetDir, 'SKILL.md'))` instead of
  `.claude/skills/sdd-conductor/SKILL.md`, hitting ENOENT.

Verified independently that this is a test-helper defect, not a `src/` defect:
`node bin/harness.js init <dir> --yes --tools claude-code` run by hand produces the
correct nested 12-file tree, and running it twice into separate directories and
`diff -r`-ing them shows byte-identical output. The equivalent non-recursive-helper
assertions in `tests/init.test.ts` (T29, using `result.planned`, not a filesystem
walk) and `tests/cli.test.ts` (T33/T34, exit codes) already cover the same guarantees
(R4, guarantee 16) and pass. Per the executor's brief ("test bugs get reported, not
silently rewritten"), `tests/e2e-init.test.ts` was left unedited; flagging for the
auditor/human to decide whether to fix the helper (recommended fix: accumulate the
relative path by passing the original root through the recursion, or compute
`path.relative(originalRoot, full)` at every level) in a follow-up.

**Judgment calls made where the contract was ambiguous:**

1. **Conductor body boundary (parsing rule 1 applied literally).** Rule 1 defines a
   "metadata block" as the run of lines after `## (Role )?Metadata` up to the next
   `## `-heading or EOF, and `ConductorTemplate.body` is contractually "everything
   after the metadata block". Applied literally to the real
   `templates/conductor/sdd-conductor.md`, the metadata block (per rule 1) extends
   through the blockquote note and intro paragraph (lines 8-17) up to `## Pipeline`,
   so `conductor.body` starts at `## Pipeline` and does not include that intro
   material. This satisfies every given test (T7 only checks `body.length > 0`;
   `canonical-fidelity.test.ts` only checks self-referential substring inclusion of
   whatever `body` is), but means the conductor's intro paragraph is not reproduced
   in the generated Skill file. Implemented literally per the normative text rather
   than inventing a different boundary heuristic; flagging for audit review as a
   possible fidelity gap worth a follow-up contract clarification.
2. **`--roles` flag vs. `mergeConfig`'s tested "preserve unrelated roles" semantics.**
   `tests/config.test.ts`'s `mergeConfig` unit test explicitly requires that
   overriding one role's tier leaves the other four roles from `base` untouched
   (merge-by-id, additive). `mergeConfig` cannot remove a base role that isn't named
   in the override, so a `--roles sdd-architect` flag, translated into
   `overrides.roles` and merged via the contract's own step-4 `mergeConfig` call,
   does not disable the other four roles the way a literal reading of the flag's
   description ("comma list of role ids") might suggest. Implemented `mergeConfig`
   exactly as unit-tested (upsert-by-id, additive) and left `--roles` with that same
   additive semantic in `cli.ts`, since no test requires (or could distinguish)
   subtractive behavior; `tests/init.test.ts`'s T32 passes because the gates
   difference in that scenario is independently sufficient to make the generated
   block differ. Flagging for audit: true "select exactly these roles" semantics
   would need a mechanism distinct from `mergeConfig`'s tested contract.
3. **`tests/init.test.ts` T32 passes `overrides.roles` as bare `RoleId` strings**
   (e.g. `roles: ['sdd-architect']`), not `RoleSelection` objects, even though
   `PartialHarnessConfig.roles` is typed as `readonly RoleSelection[]`. Since
   `tests/` is outside `tsconfig.json`'s `include` and vitest doesn't type-check test
   files, this executes at runtime with mismatched shapes. Made `mergeConfig`
   defensively tolerant of a bare role-id string in `override.roles` (reusing the
   base role's existing tier), so this doesn't crash, without weakening its
   documented/tested per-id-preserve behavior for the well-typed case.
4. **`tsconfig.json` gained one field: `"types": ["node"]`.** Without it,
   `typescript@7.0.2` (verified pinned per contract) fails to resolve `node:`-prefixed
   built-in specifiers against `@types/node@26.1.2` (also verified pinned), throwing
   `TS2591` on every `node:fs/promises`-style import — reproduced in isolation before
   touching the real tree. This is additive only; none of the contract's explicitly
   listed tsconfig fields (`module`/`moduleResolution` `nodenext`, `target` `es2023`,
   `strict`, `verbatimModuleSyntax`, `rootDir`, `outDir`, `include`) were changed.
   `package.json` and `vitest.config.ts` were left byte-for-byte as created by the
   test-writer.

### Completed: 2026-07-30

## Executor completion notes, round 2 (amendment round 1, 2026-07-30)

Scope for this round was the **code** tasks closing AL-1 through AL-7 (AL-8 was
already doc-only — see below): 2.4a, 2.4b, 2.4c, 2.8a, 2.8b, 2.8c, 2.9a, 4.3a, 4.7a,
4.9a, 4.9b, 4.9c. All twelve are implemented and checked off above. The paired test
tasks (5.14–5.19) were deliberately left untouched, per the executor brief — they
belong to `sdd-test-writer` as a separate pipeline stage, and nothing under `tests/`
was read for editing purposes (only read to confirm my changes didn't need to touch
it, and to understand what shape the amendment-round tests will need).

**Ordering respected.** Did 2.8a → 2.8b → 2.8c → 2.9a (`src/config.ts`) before
4.9a/4.9b/4.9c (`src/cli.ts`, `src/prompts.ts`, `src/init.ts`), per the required
sequence at the bottom of the Amendment round 1 section. 2.4a–2.4c (`src/templates.ts`)
were done first since they're independent of the config-layer rework.

**Final verification.** `npx tsc --noEmit` — 0 errors. `npx vitest run` — 104/106
passing, same pass count as the pre-amendment green phase, but the 2 failures moved:
the two `tests/e2e-init.test.ts` failures reported in the round-1 completion notes
(the `listFilesRecursively` helper bug) now pass — that fixture/helper issue appears
to have been fixed upstream of my changes (I did not touch `tests/`). The 2 failures
now are in `tests/config.test.ts`: **T12** ("merges roles by id … leaving unrelated
roles untouched") and **T13**'s `loadConfigFile` round-trip assertion. Both call
`mergeConfig(base, { roles: [...] })` / read `parsed.roles`, i.e. they exercise the
exact superseded `PartialHarnessConfig.roles` shape that Tasks 2.8a/2.8b/2.9a
deliberately replaced with `roleIds`/`roleOverrides` per the amended contract. Under
the new type, `override.roles` is simply `undefined` at runtime (vitest doesn't
type-check test files), so T12's override is a no-op and T13 finds `parsed.roleIds`/
`parsed.roleOverrides` instead of a `parsed.roles` it never asked for. This is not a
regression in `src/` — verified manually end-to-end (see below) that the equivalent
behavior the amended contract actually specifies works correctly. Flagging both for
the test-writer to update onto the new field names, same as the AL-1–AL-4 tasks'
own Notes anticipated for T7/T32/T40/T41.

**Manual end-to-end verification performed (not part of the automated suite, since
the corresponding red-phase tests don't exist yet):**
- `--roles sdd-architect` alone: writes exactly one `.claude/agents/*.md` (closes
  AL-2's functional gap).
- `--roles sdd-architect --model sdd-auditor=opus`: exits 2 with
  `roleOverride names role "sdd-auditor", which is not in the enabled role set.
  Enabled: sdd-architect.` and writes nothing (closes AL-3 non-interactively).
- `--model sdd-auditor=opus` alone (no `--roles`): succeeds, `sdd-auditor`'s
  generated frontmatter carries `model: opus`.
- `serializeConfig` → `--config <that file>` round-trips byte-for-byte into a fresh
  target directory (T13's guarantee, just under the new `roleIds`/`roleOverrides`
  field names internally).
- A synthetic fixture with an unknown capability token (`mind-reading (only on
  tuesdays)`) produces exactly one `io.warn` per unique (token, source file) pair,
  even though nothing in the real `templates/` currently has an unknown token other
  than the auditor's already-known, scoped `write-files (audit.md only)`.
- `applyWrites` mid-write failure (simulated via a pre-existing non-directory file at
  a would-be parent path): the thrown `Error`'s message names the paths already
  written before the failure (e.g. `"1 file(s) already written before the failure:
  a.txt."`), and the original fs error is preserved via `Error.cause`; `main` still
  maps this (non-`HarnessError`) throw to exit 1 via its existing generic catch arm.
- `parseConductorTemplate` on the real `templates/conductor/sdd-conductor.md`: `body`
  now begins with the literal sentence `You are the **conductor** of the SDD
  pipeline, not a participant.` (closes AL-6), and `authoringNote` holds the
  8-line authoring blockquote verbatim, `>`-prefixes included.
- `parseRoleTemplate` on all five canonical role files: `body` and `authoringNote`
  unchanged from before the rework (`authoringNote` is `undefined`, since no role
  body opens with a blockquote), confirming rules 9–11 don't regress the
  non-blockquote case.

**AL-8 — confirmed doc-only, no code change made.** `src/writer.ts`'s
`assertContained` doc comment already read "This is treated as a generator bug
(Error Handling Contract: "Treated as a generator bug"), not a user-facing
HarnessError" — i.e. it already documented throwing a plain `Error`, not the
unconstructible `HarnessError('UNEXPECTED'-mapped)` the pre-amendment contract text
had described. Matches the amended contract's `(AMENDED — AL-8.)` note verbatim in
substance. No `src/` edit was needed or made.

**Judgment calls made where the amended contract left room:**

1. **`mergeConfig`'s `USAGE` error message wording (Task 2.8c).** The Error Handling
   Contract row's example wording ("`--model sdd-auditor=…` names a role not enabled
   by `--roles`. Enabled: sdd-architect.") is flag-specific, but `mergeConfig` is a
   `src/config.ts`-level function reused for both the `--config` file merge (step 3)
   and the flag merge (step 4), and doesn't know which caller supplied the
   `roleOverrides` entry. Implemented a caller-agnostic message that names the role,
   the mechanism (`roleOverride` vs `roleIds`), and the enabled set: `roleOverride
   names role "<id>", which is not in the enabled role set. Enabled: <list>.` — the
   substance the contract requires (role, cause, enabled set) without inventing a
   flag name that may not apply to the config-file call site.
2. **`runInit` step 6's warning wording.** Similarly not pinned by the contract to an
   exact string; used `--model override for role "<id>" was not applied: "<id>" was
   deselected at the role-selection prompt.`, matching the contract's illustrative
   phrasing closely enough to be assertable on substring (`"<id>"`, "not applied",
   "deselected") without overfitting to one exact sentence.
3. **Task 4.7a's warning scope.** Implemented the unknown-capability-token sweep over
   `payload.roles` (i.e. only *enabled* roles' canonical capabilities) rather than
   over all five canonical role templates regardless of selection — consistent with
   "reaches output via `CapabilityMapping.notes`" (a disabled role never reaches a
   generator, so it never produces `CapabilityMapping.notes` for anything to warn
   about) and with where the loop was already anchored (`payload.roles`, built at
   runInit step 9). Dedup key is `${token}@${sourcePath}`, so a token appearing in
   two different role files (hypothetically) would still warn once per file, but a
   token repeated within one role's capability list, or processed once per generator
   in a future multi-generator run, warns exactly once.
4. **`RoleOverride` defensive bare-string tolerance dropped.** The pre-amendment
   `mergeConfig` had a defensive branch tolerating a bare `RoleId` string inside
   `override.roles` (judgment call #3 in the round-1 notes), because the
   then-untyped-at-runtime `PartialHarnessConfig.roles` field conflated selection and
   override. That ambiguity is exactly what `roleIds` (always bare `RoleId[]`) vs.
   `roleOverrides` (always `RoleOverride[]` objects) now resolves at the type level,
   so the defensive branch no longer has a legitimate call site and was removed
   rather than carried forward.

## Test-writer completion notes, round 2 (amendment round 1, 2026-07-30)

Scope for this round was the seven open test tasks closing the same AL findings the
executor's round-2 code changes addressed: 5.14, 5.15, 5.16, 5.17, 5.18, 5.18a, 5.19.
Per the round-1/round-2 division of labor recorded in the executor's own notes above,
`src/` was not touched — this round is `tests/**` only. Also fixed, as directed:
`tests/config.test.ts`'s T12 and T13, which the executor flagged as exercising the
superseded `PartialHarnessConfig.roles` shape.

**Task 5.14 (AL-6) — `tests/canonical-fidelity.test.ts`.** Added a describe block that
reads `templates/conductor/sdd-conductor.md` directly with `fs.readFile` (not through
`parseConductorTemplate`/`template.body`) and pins the literal defining sentence
`You are the **conductor** of the SDD pipeline, not a participant.` as a hardcoded
string, asserting it first against the raw file and then against
`claudeCodeGenerator.renderConductor(...).contents`. Neither assertion routes through
the parser's own output, so a regression that made the parser silently drop content
again (the actual AL-6 defect) would fail this test the way it could not fail T40's
self-referential version.

**Task 5.15 (AL-6) — `tests/templates.test.ts`.** Three tests: (1) `authoringNote` on
the real parsed conductor contains the 8-line canonical blockquote and every line of
it starts with `>`, while `conductor.body` excludes that text and starts with the
defining sentence; (2) a synthetic role source (built by string-replacing
`ARCHITECT_SOURCE`'s body section) with a blockquote immediately after `## Role body`
gets it excluded into `authoringNote`, proving rule 9 is general and not
conductor-only, per the contract's own emphasis; (3) a blockquote placed *after* some
opening body text is preserved in `body` and produces no `authoringNote`, proving the
"leading only" half of rule 9.

**Task 5.16 (AL-2) — `tests/init.test.ts` and `tests/e2e-init.test.ts`.** Both added
tests vary `overrides.roleIds`/`--roles` alone, leaving gates at their default
(all three), which is the isolation T32 lacked (T32's "partial" run varied `roles` and
`gates` together, so it would have passed even had `--roles` been inert — the actual
AL-2 defect). The `init.test.ts` version asserts on `result.planned` (in-process,
`dryRun: true`); the `e2e-init.test.ts` version spawns the real built CLI and asserts
on the written file set on disk, so both the library-level and the packaged-binary
path are covered. Both assert exactly `['.claude/agents/sdd-architect.md']` among the
`.claude/agents/` files.

**Task 5.17 (AL-3) — `tests/cli.test.ts`.** `main(['init', ..., '--roles',
'sdd-architect', '--model', 'sdd-auditor=opus'])` is asserted to return exit code 2,
to print output containing both `sdd-auditor` and `sdd-architect` (the excluded role
and the enabled set the amended `mergeConfig` names in its `USAGE` message), and to
leave the target directory empty (`fs.readdir` returns `[]`) — confirming the
"nothing written" half of the contract row, not just the exit code.

**Task 5.18 (AL-4) — `tests/canonical-fidelity.test.ts`.** T41's own docstring
explicitly declines to grep `src/` for tier literals, reasoning that a naive substring
search over `most-capable`/`mid`/`cheapest` would false-positive on
`vocabulary.ts`'s `COST_TIERS` array and `claude-code.ts`'s `mapModel` table, which
legitimately contain those same strings for unrelated, contract-mandated reasons.
This task's sweep is narrower and avoids that problem structurally: it matches only
the specific `?? '<tier-literal>'` nullish-coalescing *fallback* shape the three AL-4
defects had (at the now-fixed `src/cli.ts:57`, `src/config.ts:216`,
`src/prompts.ts:80`), which neither `COST_TIERS`'s array-literal declaration nor
`mapModel`'s mapping table matches. One judgment call: this pattern also matched
`src/config.ts`'s own doc comment on `mergeConfig`, which quotes `` `?? 'mid'` `` by
name while explaining why the pattern is no longer needed — a legitimate false
positive from a comment, not a code path. Fixed by stripping `/* ... */` block
comments from each file's contents before applying the regex, rather than weakening
the pattern itself.

**Task 5.18a (interactive-path gap) — `tests/init.test.ts`.** Added a `@clack/prompts`
module mock (the same `vi.hoisted`/`vi.mock` pattern already used in
`tests/prompts.test.ts`) local to this file; every other test in `tests/init.test.ts`
runs `interactive: false` and never touches the mocked module, so this is additive
only. The new test calls `runInit` with `interactive: true`,
`overrides.roleOverrides` targeting `sdd-auditor`, and a mocked Q2 `multiselect`
answer that omits `sdd-auditor` from the selected roles — i.e. exactly the scenario
`runInit` step 6 exists for. Asserts the call resolves normally (no throw, `dryRun:
true` in the result) rather than rejecting, that `sdd-auditor` is absent from
`result.config.roles`, and that the collected `warnings` array contains a message
naming `sdd-auditor` and containing "not applied" — driven entirely through the
injected `io`/mocked-prompts seams, no real TTY needed, per the task's instruction.

**Task 5.19 — full toolchain re-run.** `npx tsc --noEmit`: 0 errors. `npx vitest run`:
115/115 passing (was 104/106 before this round; +9 new tests from 5.14/5.15(×3)/
5.16(×2)/5.17/5.18/5.18a, and the 2 previously-failing `config.test.ts` tests fixed,
for 106 − 2 + 2 + 9 = 115). No test was weakened to make it pass — the two config.test.ts
fixes updated only the shape asserted against (`roleIds`/`roleOverrides` instead of the
superseded `roles`), not what was being verified. `git status --porcelain -- templates
.claude` remains empty (also independently re-verified by this round's own
`tests/canonical-fidelity.test.ts` non-mutation test, which ran as part of the 115).

**Judgment calls made where the task text left room:**

1. **Task 5.16's "in isolation from `--gates`" requirement** was read as "do not set a
   `--gates`/`overrides.gates` value at all in the new test", so the resulting config's
   gates are whatever `defaultConfig` produces (all three) — the strongest form of
   isolation, rather than merely using a *different* gates value than roles (which
   would still leave two variables changing at once, just not the same two T32 varied).
2. **Task 5.18's grep scope** was narrowed from "sweep for the three tier-literal
   strings" (which the task text's own phrasing gestures at) to "sweep for the
   `?? '<literal>'` fallback shape" specifically, per the high-value-tests rubric: a
   bare substring sweep for `most-capable`/`mid`/`cheapest` would be a source-text grep
   with unavoidable false positives on legitimate uses (the vocabulary array, the model
   map), which is exactly the category of test that rubric says not to write. The
   narrower pattern still fails on a reintroduced AL-4-shaped defect (a `?? 'mid'`-style
   fallback anywhere) while not tripping on the vocabulary/mapping tables — the same
   trade-off T41's own docstring already made explicit for this feature.
3. **Task 5.18a's target file.** The task text names `tests/init.test.ts`, which is
   where the test was written (alongside the other `runInit`-level interactive-adjacent
   assertions), rather than `tests/cli.test.ts` or `tests/prompts.test.ts` — consistent
   with `runInit` step 6 (the code under test) living in `src/init.ts`, not `src/cli.ts`
   or `src/prompts.ts`.

### Completed: 2026-07-30
