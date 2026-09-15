# Roadmap: context7-mcp

> Traceability: every phase names the `contract.md` guarantees (`MC-n`) and
> `intent.md` goals (`G-n`) it delivers. Every task in `tasks.md` cites a phase here.

## Implementation Phases

### Phase 1: Foundation — shared facts, serializer support, interface surface

**Goal**: Establish the single source of the Context7 facts, give `toml.ts` the one
shape it cannot currently emit, and widen the two type surfaces every later phase
depends on — without any behavior change yet.
**Dependencies**: None
**Estimated complexity**: Low

1. Create `src/mcp.ts` with `MCP_SERVER_NAME` and `CONTEXT7_MCP_URL` and nothing else
   yet, plus the module doc comment stating its tool-neutrality and the 2026-09-15
   verification date (`MC-13`, `G7`).
2. Add `renderTomlTable(header, fields)` to `src/generators/toml.ts`, including the
   bare-key header validation that throws `HarnessError('TEMPLATE')` — the only `[`
   table-header literal in the codebase (`MC-12`, `TG-5`).
3. Add `McpConfigFormat` and `McpConfig` to `src/generators/types.ts`, and the
   `mcpConfig: McpConfig | undefined` member on `Generator`. This deliberately breaks
   compilation of all five generator files until Phase 3 — that break *is* `MC-2`/`SC13`
   demonstrated (`G2`).
4. Add the optional `merge?: true` field to `GeneratedFile` in the same file. No call
   site sets it yet, so nothing changes behaviorally.
5. Write the module-level rationale comments that `contract.md` requires to be findable
   in code: why `mcpConfig` is declarative (ADR 0011/0025) and not a method (ADR 0014),
   and why `merge` is `true | undefined` rather than `boolean`.

Deliverable: `npm run build` fails only on the five generator files' missing member —
a deliberate, expected break closed in Phase 3.

### Phase 2: Core Logic — the merge algorithms

**Goal**: Implement the two pure mergers and the one impure builder, so that "extend,
never destroy" is real and unit-testable in isolation, before anything is wired in.
**Dependencies**: Phase 1
**Estimated complexity**: Medium — this phase carries the feature's whole risk.

1. Implement `mergeJsonMcpConfig` in `src/mcp.ts` (`MC-1`, `MC-4`, `MC-5`, `MC-6`,
   `MC-9`, `MC-16`): absent-or-whitespace → fresh; parses to object → insert/replace
   under `rootKey` preserving every other key and order; `context7` present without
   `--force` → `unchanged`; parse failure, non-object root, or non-object `rootKey` →
   `skipped`. Serialize only via `renderJson`.
2. Implement `mergeTomlMcpConfig` in `src/mcp.ts` (`MC-1`, `MC-4`, `MC-9`, `MC-16`):
   absent-or-whitespace → provenance comments + `renderTomlTable`; existing
   `[mcp_servers.context7]` header found by line-start scan → `unchanged` (including
   under `--force`, `MC-9`); otherwise → existing bytes, newline-normalized to end in
   exactly one `\n`, a blank separator line, then the rendered table.
3. Write the warning strings once, in `src/mcp.ts`, as functions of the path and the
   rendered snippet — never re-literalled at a call site (`S5`). The `skipped` warning
   must carry the exact text the user should paste.
4. Implement `buildMcpFiles` (`MC-3`, `MC-14`, `MC-17`): iterate `generators` in order;
   skip any whose `mcpConfig` is `undefined`; read the existing file tolerantly
   (`ENOENT` → `undefined`; any other read error → `skipped` with a warning naming the
   reason, never treated as absent); dispatch on `format`; collect merge-marked
   `GeneratedFile`s and warnings in generator order.
5. Confirm purity by construction: the two mergers take `existing: string | undefined`
   and touch no `fs`, no `Date`, no `process.env` (`MC-14`).

Deliverable: `src/mcp.ts` complete and independently exercisable; still unreferenced by
`src/init.ts`.

### Phase 3: Integration — generators, writer, init, template doc

**Goal**: Wire the five tools, restore compilation, exempt the merge paths from the
conflict rule, and land the one prose retraction.
**Dependencies**: Phase 2
**Estimated complexity**: Medium

1. Declare `mcpConfig` on all five generators, each value copied from `contract.md`
   § "Verified per-tool MCP facts" with a source-and-date comment in the style
   `guidancePath` already uses (`MC-2`). Restores compilation.
2. Rewrite `src/generators/kiro.ts`'s `DOCS_LOOKUP_NOTE` (`MC-15`, `G8`): drop "harny
   does not write MCP configuration"; name `.kiro/settings/mcp.json`; state that Kiro
   still prompts per tool call because harny does not write `autoApprove`.
3. Exempt merge-marked files from conflict collection in `src/writer.ts`'s `planWrites`
   (`MC-7`). One condition; `assertContained` still runs for every file.
4. Call `buildMcpFiles` from `src/init.ts` step 11 and forward its warnings to `io.warn`
   (`MC-3`, `MC-17`). Do not add a step; do not change `InitOptions`/`InitResult`.
5. Write `templates/mcp/README.md` (`SC20`, `S7`): behavior first, tools as attributed
   examples; the five-row table; the trust posture (`G6`); the manual
   `CONTEXT7_API_KEY` upgrade (`G9`); `R-Cursor` and `R-Codex` with their workarounds.
6. Amend the packaging test's count assertion 30 → 31 (`CLI-10`) — the same one-line
   change `agent-feedback-controls` and `readiness-doctor` each made.

Deliverable: `npx harny init --dry-run` lists the five MCP paths; a real run in an empty
fixture writes them.

### Phase 4: Testing & Validation

**Goal**: Prove every guarantee, with the merge edge cases covered against real
temporary directories rather than mocks, and prove that the things this feature promised
*not* to do are absent.
**Dependencies**: Phase 3
**Estimated complexity**: Medium

1. `tests/mcp.test.ts` — the two pure mergers across the full outcome matrix: fresh,
   additive-into-existing, already-present (with and without `--force`), unparseable,
   non-object root, non-object `rootKey`, whitespace-only, TOML append, TOML
   already-present-with-`--force` (`MC-1`, `MC-4`, `MC-5`, `MC-6`, `MC-9`, `MC-16`).
   Assert byte-identity of the preserved regions, not just key presence.
2. `tests/generators/registry.test.ts` — a table-driven assertion of all five
   `mcpConfig` values against the contract table, with `servers` vs `mcpServers` called
   out explicitly (`MC-2`, `SC17`).
3. `tests/writer.test.ts` — a merge-marked file at an existing path stays out of
   `conflicts` while a non-merge file at an existing path still populates it and still
   makes `applyWrites` throw (`MC-7`, `SC8`).
4. `tests/init.test.ts` — end-to-end over temp dirs: all five files written from empty;
   subset selection writes only that subset (`MC-3`); a pre-seeded `.vscode/mcp.json`
   with two unrelated servers keeps both (`SC4`); a pre-seeded `.codex/config.toml` with
   unrelated settings keeps its bytes as a prefix (`SC5`); a second `runInit` leaves all
   five byte-identical (`MC-8`, `SC9`); a JSONC `.vscode/mcp.json` warns and the run
   still succeeds (`MC-6`, `SC7`); `--dry-run` writes nothing (`SC10`).
5. Absence tests — grep-style assertions over generated output and over `src/`: no
   credential token or `${…}` expansion (`MC-10`, `SC11`); no trust/approve key and no
   write to `.claude/settings.json`'s `enabledMcpjsonServers` (`MC-11`, `SC12`); no
   `[mcp_servers.` literal or hand-built JSON outside the two serializer modules
   (`MC-12`, `SC14`); each of the two constants literalled exactly once in `src/`
   (`MC-13`, `SC15`); `DOCS_LOOKUP_NOTE` free of the retracted sentence (`MC-15`,
   `SC16`).
6. `tests/cli.test.ts` / existing import-cycle test — `CLI-11` still holds with
   `src/mcp.ts` present (`SC18`); `src/vocabulary.ts` still imports nothing.
7. `tests/packaging.test.ts` — thirty-one `templates/**` files (`SC20`).
8. `npm run build && npm test` green; then a manual smoke run of the built CLI against a
   scratch directory pre-seeded with a realistic `.codex/config.toml`, since
   `tests/e2e-init.test.ts` validates `dist/`, not `src/` (open reservation `AL-20`).

Deliverable: green suite, and a written note of which per-tool facts remain
documentation-verified only (`R-Cursor`, `R-Codex`, `AL-30`, `CG-1`).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Whole-file overwrite of a user's `.codex/config.toml` destroys unrelated Codex settings | Med (if the v1 simplification is taken) | **High** — silent data loss on `--force` | Rejected outright: TOML path is append-only and never rewrites (`MC-4`, `MC-9`). This risk is the primary reason `intent.md` OQ1 recommends merge-write. |
| Line-scan detection of `[mcp_servers.context7]` misses a quoted or whitespace variant (`[ mcp_servers . "context7" ]`), producing a duplicate TOML table | Low | Med — Codex may reject the file or take the second table | Match tolerantly at line start: optional leading whitespace, optional inner spaces, quoted or bare `context7`. Cover each variant in `tests/mcp.test.ts`. A false *positive* is harmless (`unchanged` + warning); only a false negative duplicates, so bias the matcher toward detecting. |
| `JSON.parse` round-trip silently reformats or reorders a user's config | High (certain, by design) | Low | Bounded and stated (`contract.md` § "The write model"): only *formatting* changes; key order is preserved by `JSON.parse`/`JSON.stringify` insertion-order semantics, and `MC-4` is asserted by byte-identity tests on the preserved regions. A commented file cannot reach this branch at all — it takes `skipped`. |
| The `CLI-5` exemption is written too broadly and quietly disables conflict detection elsewhere | Low | High | The exemption keys on a per-file flag that only `buildMcpFiles` sets, never on a path prefix or a tool id; `tests/writer.test.ts` asserts both sides of the condition in one test file (`MC-7`). |
| `R-Cursor`: MCP behind an off-by-default settings toggle in some Cursor installs | Low–Med | Med — correct file, inert tool (`AL-30` failure mode) | Ship with the reservation recorded and documented in `templates/mcp/README.md`; do not block. Same posture `cursor-kiro-copilot-generators` established. |
| `R-Codex`: Codex Desktop ignores project `.codex/config.toml` MCP servers (`openai/codex#13025`) | Med | Med — CLI surface works, Desktop does not | Document the user-global fallback as an explicit manual step. Writing `~/.codex/config.toml` is barred by containment (`SC19`) and is not a mitigation available to harny. |
| Codex project config requires the project to be trusted; an untrusted project silently ignores the file | Med | Med | This is `G6` working as designed — the native trust prompt is the intended gate. Documented in `templates/mcp/README.md` so a user who sees no Context7 tools knows to trust the project first. |
| Users gitignore `.vscode/`, so the Copilot wiring never reaches teammates | Med | Low | Documentation only (`intent.md` OQ5). harny does not edit `.gitignore`. |
| Determinism regression: MCP output varies between runs | Low | High (`CLI-4`, `S3`) | Mergers are pure by signature; `buildMcpFiles` is the sole reader and never writes; warning order is generator order (`MC-14`, `MC-17`); `MC-8` idempotence is tested directly. |
| Scope creep into `harny mcp add` | Med | Med | `intent.md` § Non-Goals is explicit: one server, no CLI verb, no prompt, no flag, no parser. The auditor checks against that list. |
| Adding a TOML parser to "do the merge properly" | Low | Med — breaks `S4` | Explicitly forbidden (`contract.md` § Dependencies). The cost is the `MC-9` asymmetry, which is documented rather than engineered away. |
| `templates/mcp/README.md` names one tool's mechanic as the only possibility | Low | Low | `S7` applies; Phase 3.5 writes behavior-first with tools as attributed examples, and the auditor checks S7 as a standing standard. |

## File Change Map

- `src/mcp.ts` — **CREATE** — the Context7 facts (`MCP_SERVER_NAME`,
  `CONTEXT7_MCP_URL`), `McpMergeOutcome`/`McpMergeInput`/`McpBuildOptions`/
  `McpBuildResult`, the two pure mergers, the warning-message builders, and
  `buildMcpFiles`.
- `src/generators/types.ts` — **MODIFY** — add `McpConfigFormat`, `McpConfig`, the
  `Generator.mcpConfig` member, and `GeneratedFile.merge`.
- `src/generators/toml.ts` — **MODIFY** — add `renderTomlTable` with bare-key header
  validation.
- `src/generators/claude-code.ts` — **MODIFY** — declare `mcpConfig` (`.mcp.json`,
  `mcpServers`, `type: 'http'`).
- `src/generators/cursor.ts` — **MODIFY** — declare `mcpConfig` (`.cursor/mcp.json`,
  `mcpServers`, bare `url`).
- `src/generators/github-copilot.ts` — **MODIFY** — declare `mcpConfig`
  (`.vscode/mcp.json`, **`servers`**, `type: 'http'`).
- `src/generators/kiro.ts` — **MODIFY** — declare `mcpConfig`
  (`.kiro/settings/mcp.json`, `mcpServers`, bare `url`) **and** rewrite
  `DOCS_LOOKUP_NOTE` (`MC-15`).
- `src/generators/codex.ts` — **MODIFY** — declare `mcpConfig` (`.codex/config.toml`,
  `mcp_servers`, `url`).
- `src/writer.ts` — **MODIFY** — `planWrites` skips merge-marked paths when collecting
  conflicts.
- `src/init.ts` — **MODIFY** — step 11 awaits `buildMcpFiles` and forwards its warnings.
- `templates/mcp/README.md` — **CREATE** — tool-neutral mechanism document; packaged,
  not scaffolded.
- `tests/mcp.test.ts` — **CREATE** — merger outcome matrix and `buildMcpFiles` ordering.
- `tests/generators/registry.test.ts` — **MODIFY** — table-driven per-tool fact
  assertions.
- `tests/writer.test.ts` — **MODIFY** — merge-marked vs. ordinary conflict behavior.
- `tests/init.test.ts` — **MODIFY** — end-to-end merge, subset, idempotence, JSONC
  bail-out, `--dry-run`.
- `tests/packaging.test.ts` — **MODIFY** — `templates/**` count 30 → 31.
- `tests/generators/toml.test.ts` — **MODIFY** — `renderTomlTable` output and header
  validation error.
- `tests/generators/kiro.test.ts` — **MODIFY** — `DOCS_LOOKUP_NOTE` retraction assertion.

**Not modified** (asserted, not assumed): `src/doctor.ts`, `src/feedback.ts`,
`src/engine.ts`, `src/config.ts`, `src/cli.ts`, `src/prompts.ts`, `src/vocabulary.ts`,
`src/errors.ts`, `src/templates.ts`, `src/generators/index.ts`,
`src/generators/markdown-yaml.ts`, `src/generators/json.ts`, every file under
`templates/roles/`, `templates/skills/`, `templates/conductor/`, `templates/hooks/`,
`templates/ci/`, `templates/doctor/`, `templates/shared/`, and every
`.claude/skills/harny-*/SKILL.md`.

**Deferred to the documentation role, post-audit**: `README.md`, `AGENTS.md`,
`CHANGELOG.md`, and the `plan.md:138` future-scope paragraph whose first clause this
feature discharges.
