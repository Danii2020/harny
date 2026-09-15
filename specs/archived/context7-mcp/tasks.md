# Tasks: context7-mcp

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

> Every task cites the `roadmap.md` phase step it belongs to and the `contract.md`
> guarantee (`MC-n`) or `intent.md` criterion (`SC-n`) it serves. Paths are real files
> in this repository. Language: TypeScript (ESM, `nodenext`, `.js` import specifiers,
> `node:` builtin prefixes — `S1`).

## Phase 1: Foundation — shared facts, serializer support, interface surface

- [x] Task 1.1: Create the module with its doc comment (tool-neutral, lives beside
      `src/feedback.ts`/`src/doctor.ts`, facts verified 2026-09-15) and export
      `MCP_SERVER_NAME = 'context7'` and
      `CONTEXT7_MCP_URL = 'https://mcp.context7.com/mcp'` — each literalled here and
      nowhere else in `src/` (Phase 1.1; `MC-13`, `SC15`) — `src/mcp.ts` — done; MCP_SERVER_NAME and CONTEXT7_MCP_URL added, literalled once.
- [x] Task 1.2: Add `renderTomlTable(header, fields)` emitting `[header]` then
      delegating to the existing `renderTomlKeyValues`; the only `[` table-header
      literal in the codebase (Phase 1.2; `MC-12`) — `src/generators/toml.ts` — done; renderTomlTable added, delegates to renderTomlKeyValues.
- [x] Task 1.3: Validate `header` against `/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/` and
      throw `HarnessError('TEMPLATE')` naming the header otherwise, mirroring
      `tomlMultilineLiteral`'s throw-rather-than-switch-forms discipline (Phase 1.2;
      `TG-7`, Error Handling Contract) — `src/generators/toml.ts` — done; bare-dotted-key validation throws HarnessError('TEMPLATE').
- [x] Task 1.4: Add the `McpConfigFormat` union (`'json' | 'toml'`) and the `McpConfig`
      interface (`path`, `format`, `rootKey`, `entry: Readonly<Record<string, string>>`)
      with the doc comment explaining the per-tool `rootKey` divergence (Phase 1.3;
      `MC-2`) — `src/generators/types.ts` — done; McpConfigFormat/McpConfig added to types.ts.
- [x] Task 1.5: Add `readonly mcpConfig: McpConfig | undefined` to `Generator`, required
      (not optional), with the comment stating it follows `skillsDir`/`guidancePath`
      (ADR 0011/0025) and deliberately not `renderHook` (ADR 0014) (Phase 1.3, 1.5;
      `MC-2`, `SC13`) — `src/generators/types.ts` — done; Generator.mcpConfig added as required member.
- [x] Task 1.6: Add `readonly merge?: true` to `GeneratedFile` with the comment
      explaining `true | undefined` over `boolean` (absent is the default for every
      pre-existing artifact) (Phase 1.4, 1.5; `MC-7`) — `src/generators/types.ts` — done; GeneratedFile.merge?: true added.
- [x] Task 1.7: Confirm the expected compile break — `tsc` fails on exactly the five
      generator files for the missing `mcpConfig` member and on nothing else; record
      the five error locations as the live demonstration of `SC13` (Phase 1.3) —
      `src/generators/{claude-code,cursor,kiro,github-copilot,codex}.ts` — confirmed: npm run build fails on exactly the five generator files (claude-code, codex, cursor, github-copilot, kiro), nothing else.

## Phase 2: Core Logic — the merge algorithms

- [x] Task 2.1: Declare `McpMergeOutcome` (`written` | `unchanged` | `skipped`),
      `McpMergeInput`, `McpBuildOptions` and `McpBuildResult` exactly as
      `contract.md` § "Public API — `src/mcp.ts`" specifies (Phase 2.1; `MC-5`, `MC-6`)
      — `src/mcp.ts` — done.
- [x] Task 2.2: Implement the whitespace-or-absent predicate used by both mergers so
      an empty file is treated as missing, in one place rather than twice (Phase 2.1,
      2.2; `MC-16`, `S5`) — `src/mcp.ts` — done.
- [x] Task 2.3: Implement `mergeJsonMcpConfig`'s fresh-file branch: build
      `{ [rootKey]: { [MCP_SERVER_NAME]: entry } }` and serialize with `renderJson`
      (Phase 2.1; `MC-1`) — `src/mcp.ts` — done.
- [x] Task 2.4: Implement `mergeJsonMcpConfig`'s additive branch: `JSON.parse`, create
      `rootKey` if missing, set only `<rootKey>.context7`, preserve every other
      top-level key and every other server, re-serialize via `renderJson` (Phase 2.1;
      `MC-4`) — `src/mcp.ts` — done.
- [x] Task 2.5: Implement `mergeJsonMcpConfig`'s `unchanged` branch when a `context7`
      key already exists under `rootKey` and `force` is false; and its `--force`
      variant replacing only that one entry (Phase 2.1; `MC-5`, `MC-9`) — `src/mcp.ts` — done.
- [x] Task 2.6: Implement `mergeJsonMcpConfig`'s `skipped` branch for a `JSON.parse`
      throw, a non-object root (array, string, number, `null`), and a `rootKey` whose
      value is not a plain object (Phase 2.1; `MC-6`) — `src/mcp.ts` — done.
- [x] Task 2.7: Implement `mergeTomlMcpConfig`'s fresh-file branch: two provenance
      comment lines via `renderTomlComments` (purpose, and "harny writes this entry
      only; approving the server stays Codex's own prompt"), then `renderTomlTable`
      with header `` `${rootKey}.${MCP_SERVER_NAME}` `` and `url` quoted via
      `tomlBasicString` (Phase 2.2; `MC-1`, `MC-12`) — `src/mcp.ts` — done.
- [x] Task 2.8: Implement the existing-table detector: a line-start scan tolerating
      leading whitespace, inner spaces around the dot and brackets, and a quoted or
      bare `context7` — biased toward detecting, since a false positive is a harmless
      `unchanged` while a false negative duplicates a table (Phase 2.2; `MC-9`,
      roadmap Risk 2) — `src/mcp.ts` — done.
- [x] Task 2.9: Implement `mergeTomlMcpConfig`'s append branch: normalize the existing
      bytes to end in exactly one `\n`, then a blank separator line, then the rendered
      table, so the original bytes are a prefix of the result (Phase 2.2; `MC-4`,
      `SC5`) — `src/mcp.ts` — done.
- [x] Task 2.10: Make `--force` a documented no-op on the TOML path — an existing
      `[mcp_servers.context7]` yields `unchanged` with or without it, and the warning
      says why (no TOML parser, `S4`) (Phase 2.2; `MC-9`) — `src/mcp.ts` — done.
- [x] Task 2.11: Write the three warning-message builders once, as functions of path
      (and, for `skipped`, the exact snippet to paste); never re-literal a message at a
      call site (Phase 2.3; `S5`, `MC-6`) — `src/mcp.ts` — done.
- [x] Task 2.12: Implement `buildMcpFiles`: iterate `generators` in order, skip
      `mcpConfig === undefined`, read tolerantly (`ENOENT` → `undefined`; any other
      read error → `skipped` with the reason in the warning, never treated as absent),
      dispatch on `format`, collect merge-marked `GeneratedFile`s and warnings in
      generator order (Phase 2.4; `MC-3`, `MC-17`, Error Handling Contract) —
      `src/mcp.ts` — done.
- [x] Task 2.13: Verify purity by inspection: neither merger references `fs`, `Date`,
      `Math.random` or `process.env`; `buildMcpFiles` reads and never writes
      (Phase 2.5; `MC-14`, `SC11`) — `src/mcp.ts` — done.

## Phase 3: Integration — generators, writer, init, template doc

- [x] Task 3.1: Declare `mcpConfig` — `.mcp.json` / `mcpServers` /
      `{ type: 'http', url: CONTEXT7_MCP_URL }` — importing the URL from `src/mcp.ts`,
      with a source-and-date comment in the style `guidancePath` already uses
      (Phase 3.1; `MC-2`, `MC-13`) — `src/generators/claude-code.ts` — done.
- [x] Task 3.2: Declare `mcpConfig` — `.cursor/mcp.json` / `mcpServers` /
      `{ url: CONTEXT7_MCP_URL }` (no `type` field), with a comment recording
      reservation `R-Cursor` (Phase 3.1; `MC-2`) — `src/generators/cursor.ts` — done.
- [x] Task 3.3: Declare `mcpConfig` — `.vscode/mcp.json` / **`servers`** /
      `{ type: 'http', url: CONTEXT7_MCP_URL }`, with a comment calling out that this
      root key differs from the other four and that the file is VS Code's, shared with
      every other MCP user of that editor (Phase 3.1; `MC-2`, `SC17`) —
      `src/generators/github-copilot.ts` — done.
- [x] Task 3.4: Declare `mcpConfig` — `.kiro/settings/mcp.json` / `mcpServers` /
      `{ url: CONTEXT7_MCP_URL }`, with a comment recording workspace-over-user
      precedence and that the user file is never written (Phase 3.1; `MC-2`, `SC19`) —
      `src/generators/kiro.ts` — done.
- [x] Task 3.5: Declare `mcpConfig` — `.codex/config.toml` / `mcp_servers` /
      `{ url: CONTEXT7_MCP_URL }`, with a comment recording project-trust gating,
      project-over-user precedence, reservation `R-Codex`, and why
      `~/.codex/config.toml` is not written (Phase 3.1; `MC-2`, `SC19`) —
      `src/generators/codex.ts` — done.
- [x] Task 3.6: Rewrite `DOCS_LOOKUP_NOTE` so it no longer contains "harny does not
      write MCP configuration"; the replacement names `.kiro/settings/mcp.json` and
      states that Kiro still prompts per tool call because harny does not write
      `autoApprove` (Phase 3.2; `MC-15`, `SC16`, `G8`) — `src/generators/kiro.ts` — done.
- [x] Task 3.7: In `planWrites`' loop, skip adding `file.path` to `conflicts` when
      `file.merge` is set; keep `assertContained` running for every file, merge-marked
      or not (Phase 3.3; `MC-7`) — `src/writer.ts` — done.
- [x] Task 3.8: In step 11, after `buildRuntimeSharedFiles`, `await buildMcpFiles(
      resolvedGenerators, { targetDir, force: options.force })`, push its files, and
      forward each warning to `io.warn` — with the comment stating this joins step 11
      and is not a fourteenth step, matching the three prior widenings (Phase 3.4;
      `MC-3`, `MC-17`, `CLI-1`) — `src/init.ts` — done.
- [x] Task 3.9: Confirm `InitOptions`, `InitResult`, `src/cli.ts` flags,
      `src/prompts.ts` questions, `src/config.ts` keys and `src/vocabulary.ts` are
      untouched — no new verb, flag, prompt, config key, or vocabulary member
      (Phase 3.4; `intent.md` § Non-Goals) — `src/init.ts`, `src/cli.ts` — confirmed unchanged (no diff to these files beyond the buildMcpFiles import/call in init.ts).
- [x] Task 3.10: Write the tool-neutral mechanism document: behavior first, tools as
      attributed examples (`S7`); the five-row fact table with sources and the
      2026-09-15 date; the trust posture (config file only, no auto-approve); the
      manual `CONTEXT7_API_KEY` upgrade path; `R-Cursor` and `R-Codex` with their
      workarounds, including Codex's "trust the project first" and user-global fallback
      (Phase 3.5; `SC20`, `G6`, `G9`) — `templates/mcp/README.md` — done.
- [x] Task 3.11: Update the `templates/**` count assertion and the file's
      `Spec:`/`Covers:` header from thirty to thirty-one (Phase 3.6; `CLI-10`, `SC20`)
      — `tests/packaging.test.ts` — already present in the red-phase test file; verified count and file list match.

## Phase 4: Testing & Validation

- [x] Task 4.1: New test file with a `Spec:`/`Covers:` header naming this feature and
      the ids it covers, no contract id in any test *name* (`S6`), offline by default —
      `tests/mcp.test.ts` — done.
- [x] Task 4.2: `mergeJsonMcpConfig` outcome matrix: fresh; additive into a file with
      two unrelated servers and two unrelated top-level keys (asserting the preserved
      regions are byte-identical, not merely present); already-present without
      `--force`; already-present with `--force`; unparseable; non-object root;
      non-object `rootKey`; whitespace-only (Phase 4.1; `MC-1`, `MC-4`, `MC-5`, `MC-6`,
      `MC-9`, `MC-16`) — `tests/mcp.test.ts` — done; all outcomes pass (28 mcp.test.ts merger/build tests green pre-Phase-3).
- [x] Task 4.3: `mergeTomlMcpConfig` outcome matrix: fresh (exact expected bytes);
      append onto a file with unrelated settings, asserting the original bytes are a
      prefix; existing table detected in bare, quoted, indented and inner-spaced forms;
      existing table with `--force` still `unchanged`; whitespace-only; a file not
      ending in a newline (Phase 4.1; `MC-4`, `MC-9`, `MC-16`) — `tests/mcp.test.ts` — done.
- [x] Task 4.4: `buildMcpFiles` ordering and skipping: files and warnings come back in
      generator order; a generator with `mcpConfig === undefined` contributes nothing;
      a read error that is not `ENOENT` yields `skipped`, never a fresh overwrite
      (Phase 4.1; `MC-3`, `MC-17`) — `tests/mcp.test.ts` — done.
- [x] Task 4.5: `renderTomlTable` output shape and the header-validation
      `HarnessError('TEMPLATE')` (Phase 4.1; `MC-12`, `TG-7`) —
      `tests/generators/toml.test.ts` — done.
- [x] Task 4.6: Table-driven assertion of all five generators' `mcpConfig` values
      against `contract.md` § "Verified per-tool MCP facts", with GitHub Copilot's
      `servers` root key asserted explicitly and separately (Phase 4.2; `MC-2`,
      `SC17`) — `tests/generators/registry.test.ts` — done.
- [x] Task 4.7: A merge-marked file at an existing path stays out of
      `WritePlan.conflicts`; a non-merge file at an existing path still populates it and
      still makes `applyWrites` throw `HarnessError('CONFLICT')` — both sides in one
      file so the exemption's narrowness is visible (Phase 4.3; `MC-7`, `SC8`) —
      `tests/writer.test.ts` — done.
- [x] Task 4.8: End-to-end from an empty temp dir with all five tools: exactly the five
      MCP paths appear in `InitResult.written`, each with the expected root key and URL
      (Phase 4.4; `MC-1`, `SC1`, `SC2`) — `tests/init.test.ts` — done.
- [x] Task 4.9: Subset selection writes only that subset's MCP files (Phase 4.4;
      `MC-3`, `SC3`) — `tests/init.test.ts` — done.
- [x] Task 4.10: Pre-seeded `.vscode/mcp.json` with two unrelated servers: both survive
      alongside `context7`, and no other top-level key is added, removed or reordered
      (Phase 4.4; `MC-4`, `SC4`) — `tests/init.test.ts` — done.
- [x] Task 4.11: Pre-seeded `.codex/config.toml` with unrelated settings: the original
      bytes are a prefix of the result and the table is appended once (Phase 4.4;
      `MC-4`, `SC5`) — `tests/init.test.ts` — done.
- [!] Task 4.12: Two consecutive `runInit` calls over the same target: all five MCP
      files byte-identical between runs, and run 2 emits five `unchanged` warnings
      (Phase 4.4; `MC-5`, `MC-8`, `SC6`, `SC9`) — `tests/init.test.ts` — BLOCKED: see Notes below — this red-phase test's second runInit call passes force:false for BOTH calls, which necessarily conflicts on the 80 non-MCP artifacts already written by call 1 (CLI-5, MC-7, unchanged); a manual CLI smoke run reproduced the identical CONFLICT/exit-3 behavior against the real dist build, confirming this is a test defect (needs force:true on the second call), not an implementation defect. Left failing and reported per "test bugs get reported, not silently rewritten."
- [x] Task 4.13: Pre-seeded JSONC `.vscode/mcp.json` (with comments): nothing written to
      that path, one warning carrying the exact snippet, and the run still returns
      successfully with every other artifact written (Phase 4.4; `MC-6`, `SC7`) —
      `tests/init.test.ts` — done.
- [x] Task 4.14: `runInit` on a repo where all five MCP files already exist succeeds
      without `--force`, while a pre-existing `.claude/agents/sdd-architect.md` still
      raises `CONFLICT` (Phase 4.4; `MC-7`, `SC8`) — `tests/init.test.ts` — done.
- [x] Task 4.15: `--dry-run` writes nothing to any MCP path while listing the paths it
      would write (Phase 4.4; `SC10`) — `tests/init.test.ts` — done.
- [x] Task 4.16: Absence assertion over generated MCP output and over `src/`: no
      `Authorization`, `headers`, `bearer_token_env_var`, `http_headers`,
      `env_http_headers`, `env`, `${`, or `CONTEXT7_API_KEY`; no
      `process.env.CONTEXT7_API_KEY` read anywhere in `src/` (Phase 4.5; `MC-10`,
      `SC11`) — `tests/mcp.test.ts` — done.
- [x] Task 4.17: Absence assertion for trust/approve keys: no `enabledMcpjsonServers`,
      `disabledMcpjsonServers`, `autoApprove`, `disabledTools`, `trust_level` or
      `[projects]` in any generated artifact; `.claude/settings.json` still carries
      exactly the two hook registrations and is not read or written by this feature
      (Phase 4.5; `MC-11`, `SC12`) — `tests/mcp.test.ts` — done.
- [x] Task 4.18: Source-level assertion that no `[mcp_servers.` literal and no
      hand-built JSON string exists outside `src/generators/json.ts` and
      `src/generators/toml.ts` (Phase 4.5; `MC-12`, `SC14`) — `tests/mcp.test.ts` — done.
- [x] Task 4.19: Source-level assertion that `'context7'` and the endpoint URL are each
      literalled exactly once in `src/`, in `src/mcp.ts` (Phase 4.5; `MC-13`, `SC15`) —
      `tests/mcp.test.ts` — done.
- [x] Task 4.20: Assert `DOCS_LOOKUP_NOTE` no longer contains "harny does not write MCP
      configuration" and does name `.kiro/settings/mcp.json`, and that the note still
      reaches a rendered Kiro role file (`CLI-9`) (Phase 4.5; `MC-15`, `SC16`) —
      `tests/generators/kiro.test.ts` — done.
- [x] Task 4.21: Re-run the existing import-cycle and vocabulary checks with
      `src/mcp.ts` present (Phase 4.6; `CLI-11`, `SC18`) — `tests/cli.test.ts` — done (tests/cli.test.ts and tests/vocabulary.test.ts still green with src/mcp.ts present).
- [x] Task 4.22: `npm run build && npm test` green, with no `tsc` error and no new
      lint/type finding (Phase 4.8; `S1`, feedback gate) — 610/611 tests green (see Task 4.12); npm run build and npm run typecheck both clean, no new lint/type finding.
- [x] Task 4.23: Manual smoke run of the **built** CLI (`node bin/harness.js init`)
      against a scratch directory pre-seeded with a realistic `.codex/config.toml` and a
      `.vscode/mcp.json` holding one unrelated server, because the e2e suite validates
      `dist/`, not `src/` (open reservation `AL-20`); record the resulting file contents
      in `audit.md`'s audit log (Phase 4.8) — done; see audit.md Audit Log.
- [x] Task 4.24: Record in `audit.md` which per-tool facts remain documentation-verified
      only — `R-Cursor`, `R-Codex`, and their relation to the standing `AL-30` and
      `CG-1`/`O4` reservations (Phase 4.8; `intent.md` § Constraints) — done; see audit.md Carried Reservations / Audit Log.

## Blocked Items

None yet. Note that Phase 1 deliberately leaves the build red until Task 3.1–3.5; that
is an expected intermediate state, not a blocked item.

## Notes

**For the test writer.** The red phase should start with Task 4.2 and Task 4.3 — the two
merger matrices are the feature's whole risk surface and are pure functions, so they need
no fixtures beyond string literals. `tests/helpers/paths.ts` already provides the temp-dir
helpers Tasks 4.8–4.15 need. Per `S6`, no contract id appears in a test *name*; ids belong
in the file's `Spec:`/`Covers:` header and in comments.

**For the executor.**
- The contract is law: do not add a TOML parser, a CLI flag, a prompt, a second server, a
  doctor check, or an auto-approve key, however reasonable any of them looks mid-task.
  Each is an explicit non-goal.
- `S5` is heavily load-bearing here: `MCP_SERVER_NAME` and `CONTEXT7_MCP_URL` are
  imported everywhere and literalled once (Tasks 4.19 enforces this).
- The expected Phase 1 compile break (Task 1.7) is the feature's own proof of `SC13`.
  Do not work around it by making `mcpConfig` optional.
- Phase 2 before Phase 3, strictly: the mergers must be complete and independently
  reviewable before any generator or `init.ts` references them.

**For the auditor.** `intent.md` § Constraints declares amendments to five shipped
current-truth statements (`TG-1`, `TG-10`, `CLI-1`, `CLI-4`, `CLI-5`) plus `CLI-10`'s
count. Verify each amended form is actually delivered *and* that every unamended
statement in `specs/current/tool-generators.md` and `specs/current/cli-init.md` still
holds — `CLI-5`'s narrowness (Task 4.7) and `CLI-4`'s determinism (Task 4.12) are the two
most likely to have been widened by accident. Also check the six open questions in
`intent.md` § "What is deliberately *not* decided here" against what was actually built.

## Executor's notes (post-implementation)

- **Task 4.12 is a reported test bug, not an implementation gap.** The red-phase
  "idempotence across two consecutive runs" test in `tests/init.test.ts` calls
  `runInit` twice with `force: false` both times and expects both calls to succeed.
  The *first* call writes ~80 non-MCP artifacts (role files, skill files, hooks,
  etc.); the *second* call, still `force: false`, necessarily finds every one of
  those paths already on disk and raises `HarnessError('CONFLICT')` — exactly what
  `CLI-5`/`MC-7` (both explicitly "unchanged" by this feature) require, and exactly
  what a manual smoke run against the real built CLI reproduced byte-for-byte (see
  `audit.md` Audit Log). `MC-8`/`SC9` (the MCP-file idempotence guarantee this test
  is meant to cover) is otherwise independently proven: the "all five MCP files
  pre-existing" describe block a few tests earlier in the same file confirms all
  five take the `unchanged` branch and warn correctly when re-run without `--force`,
  and the manual smoke run additionally confirmed byte-identical MCP file contents
  across a `--force` re-run too (JSON replaced with identical content; TOML
  untouched per the `MC-9` asymmetry). Per this skill's own instruction ("make red
  tests pass without editing them... test bugs get reported, not silently
  rewritten"), this one test was left red and is reported here rather than edited.
  The fix, if the test is corrected in a follow-up, is `force: true` on the second
  `runInit` call.
- **Consequential test maintenance beyond the approved 55.** Implementing this
  feature's contracted `TG-10`/`CLI-10` amendments (one MCP artifact per resolved
  generator; `templates/**` 30 → 31) necessarily changed the exact file
  counts/lists three pre-existing, previously-green test files hard-code:
  `tests/e2e-init.test.ts` (six scenarios' expected file sets/counts),
  `tests/templates.test.ts` (the `templates/` root directory listing), and
  `tests/canonical-fidelity.test.ts` (the non-mutation allowlist, to admit the new
  `templates/mcp/README.md`). None of these three files was in the task's declared
  list of approved context7-mcp red-phase files. They were updated here, following
  the exact style of every prior feature's amendment to the same three files
  (visible in each file's own pre-existing amendment comments), because leaving
  them unmodified would have left `npm test` red for reasons that are a direct,
  mechanical consequence of the contract's own declared amendments rather than any
  ambiguity in what to build. Flagged here as a deviation worth a second look.

Completed: 2026-09-15.
