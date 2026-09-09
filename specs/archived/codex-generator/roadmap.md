# Roadmap: codex-generator

> **How to read this file.** Every phase cites the `contract.md` guarantees and
> `intent.md` goals it discharges. The repo default is **test-first** (`AGENTS.md`
> "Working conventions"): within each phase the red tests precede the implementation,
> and the post-red-tests human gate sits between them.
>
> This feature is **one adapter over one new wrapper module** — not three parallel
> adapters over an existing one. The phase shape is therefore deliberately different
> from `specs/cursor-kiro-copilot-generators/roadmap.md`: its Phase 2 was three
> independent, mutually unblocking files; here Phase 2 has exactly one file and the real
> sequencing risk sits in Phase 1 (the wrapper's escaping strategy, which everything
> downstream depends on) and Phase 3 (retiring a stub that four existing test files use
> as their fixture).

## Implementation Phases

### Phase 1: The TOML wrapper layer

**Goal**: `src/generators/toml.ts` — every TOML syntax literal in the codebase, in one
module, with the multi-line-literal strategy proven before anything depends on it.
**Dependencies**: None.
**Estimated complexity**: Medium. The code is small; the correctness question
(literal `'''` vs. basic `"""` strings, and what makes a value unrepresentable) is the
single decision the whole feature's fidelity guarantee rests on, and it is easier to get
subtly wrong than it looks.
**Discharges**: G2; guarantees 5, 11.

1. Write red tests for `tomlBasicString`: escaping of `\` and `"`, newline → `\n`, tab →
   `\t`, other control characters → `\uXXXX`, and round-tripping through the test-local
   decoder.
2. Write red tests for `canRenderAsTomlLiteral` and `tomlMultilineLiteral`: accepts
   ordinary Markdown prose; rejects `'''`, `\r`, and a control character other than
   `\n`/`\t` with `HarnessError('TEMPLATE')` naming the artifact; emits
   `'''\n<value>\n'''`; and the emitted literal decodes to `value + "\n"`.
3. Write red tests for `renderTomlKeyValues` (order preserved, one `key = value` per
   line) and `renderTomlComments` (one `# ` per line, and an interior newline in a note
   starts a further `# ` line rather than escaping comment syntax).
4. Build the **test-local minimal TOML decoder** used by guarantee 3 — top-level string
   keys, basic strings, multi-line literal strings, `#` comments. It lives in
   `tests/generators/toml.test.ts` (or a `tests/helpers/` module if `codex.test.ts` also
   needs it), never in `src/`, and never as a package dependency.
5. **Human gate: post-red-tests.**
6. Implement `src/generators/toml.ts` to green.
7. Confirm empirically, as a test, that the real `templates/**` contain no `'''`, no
   `"""`, no CR and no exotic control characters — so the Phase 1 strategy is known to
   hold for the actual canonical layer, not just in principle.

### Phase 2: The Codex adapter

**Goal**: `src/generators/codex.ts` — a faithful adapter of `contract.md`'s normative
tables, containing no TOML syntax of its own.
**Dependencies**: Phase 1.
**Estimated complexity**: Medium. Per-function logic is small and closely mirrors
`src/generators/cursor.ts`; the risk is in the two places Codex differs in *kind* rather
than syntax — the instruction payload's channel split, and the conductor being Markdown
while the roles are TOML.
**Discharges**: G1, G5, G6; guarantees 2, 3, 4, 6, 7, 8, 9, 10.

1. Red tests for `mapModel`: the three-row table (`gpt-5.6-sol` / `gpt-5.6-terra` /
   `gpt-5.6-luna`), `override` returned verbatim, and an assertion that **no `gpt-5.4`
   id appears anywhere in `src/`** (guarantee 10 — the retirement in D2 is the reason
   this is a test and not a comment).
2. Red tests for `codexSandboxMode`: `'read-only'` for a synthetic read-only capability
   set; `undefined` for each of the real five roles; **never** `'workspace-write'`
   (guarantee 7).
3. Red tests for `mapCapabilities`: `tokens` always `[]`; one note per capability;
   the scoped-capability note carries `audit.md only` for the real auditor; an unknown
   token yields `unmapped capability: <name>`; the adapter note appears exactly once
   (guarantee 6).
4. Red tests for `renderRole`: path `.codex/agents/<role>.toml`; comment header precedes
   the key/value lines; emitted key set; `sandbox_mode` absent for all five real roles;
   the spec-schema pointer block is **inside** `developer_instructions` and not in a
   comment (guarantee 9); the file parses via the test decoder and the decoded values
   match (guarantee 3); trailing single `\n`.
5. Red tests for `renderConductor`: path `.agents/skills/sdd-conductor/SKILL.md`;
   Markdown+YAML frontmatter with exactly `name` and `description`; both `harny note:`
   caveats present; project-config block present; renders successfully from the real
   `templates/conductor/sdd-conductor.md` (guarantee 8).
6. **Human gate: post-red-tests.**
7. Implement `src/generators/codex.ts` to green, importing `renderFrontmatter`,
   `renderProvenance`, `renderProjectConfigBlock` and `renderSpecSchemaPointerBlock` from
   `markdown-yaml.js` and `SPEC_SCHEMA_DIR` from `../engine.js` — adding nothing to
   either module.
8. Add the source-scan test asserting `codex.ts` contains no `'''`, no `"""`, no
   hand-written `key = value` serialization and no `#`-comment serializer (guarantee 5).

### Phase 3: Registry integration and retiring the stub

**Goal**: Make `codex` genuinely selectable end to end, and re-point — never delete — the
coverage that currently uses `codex` as its "unimplemented tool" fixture.
**Dependencies**: Phase 2.
**Estimated complexity**: Medium. The production change is two lines. The risk is
entirely in the test fallout: four existing files depend on `codex` being unavailable,
and the tempting fix (delete the assertions, or loosen them to `toContain`) would
silently drop coverage of two documented `cli-skeleton` guarantees. This is the phase an
auditor should read most carefully.
**Discharges**: G8; guarantees 1, 13.

1. Register `codexGenerator` in `src/generators/index.ts`; update the module doc comment
   (which currently states codex "deliberately resolves to `undefined`") and
   `availableToolIds()`'s stated value.
2. `tests/generators/registry.test.ts`: assert all five ids resolve and
   `availableToolIds()` equals the exact five-element array in `TOOL_IDS` order. **Keep**
   the five-target interface-sufficiency evidence table, and additionally assert the real
   `codexGenerator` matches its `codex` row (`.codex/agents`, `'toml'`,
   `.codex/agents/sdd-architect.toml`, `conductorPath` not under `agentsDir`) — promoting
   that row from prediction to regression test. Update the file's header comment, which
   states codex "remains unimplemented after this feature".
3. `tests/init.test.ts`: re-point both generator-availability tests (the skip-and-warn
   case and the `NO_GENERATOR` throw) onto a synthetic registry via
   `vi.mock('../src/generators/index.js', …)`. Do **not** add an injection seam to
   `src/init.ts`.
4. `tests/cli.test.ts`: re-point "maps no-available-generator to exit 4" onto the same
   module-mock, preserving the `HarnessError` → exit-code assertion and the
   "nothing written" assertion.
5. `tests/prompts.test.ts`: re-point the hint assertion to a **partial** `available`
   array (an existing `PromptDefaults` parameter — no production change), and add an
   assertion that with the real `availableToolIds()` **no** tool option carries a hint.
6. `tests/e2e-init.test.ts`: the four-tool artifact-count test (24 tool artifacts)
   becomes a five-tool test (30), still asserting exactly one copy of each shared file.
7. Re-run the whole suite and confirm nothing else silently depended on
   `availableToolIds().length === 4`.

### Phase 4: Validation, fidelity and the un-closable check

**Goal**: Prove the guarantees rather than assert them, and record what could not be
proven here — precisely, and in all three of `contract.md`, `tasks.md` and `audit.md`.
**Dependencies**: Phase 3.
**Estimated complexity**: Medium.
**Discharges**: G3, G4, G7, G9, G10; guarantees 4, 12, 14, 15, 16.

1. Extend `tests/canonical-fidelity.test.ts` to the fifth generator: for all five roles
   and the conductor, the body sliced from the **raw** template file (`fs.readFile`,
   never via `parseRoleTemplate`/`parseConductorTemplate`) is a byte-for-byte contiguous
   substring of the Codex artifact — and additionally equals the corresponding prefix of
   the **decoded** `developer_instructions` (guarantee 4).
2. Extend the no-regression sweep: `git diff --exit-code` (or an equivalent in-test
   comparison) proving `templates/**`, `src/generators/types.ts`,
   `src/generators/markdown-yaml.ts` and the four shipped generator files are unchanged
   (guarantee 12).
3. Assert `package.json`'s `dependencies` and `devDependencies` are byte-identical and
   contain no TOML package (guarantee 16).
4. End-to-end: `init --tools codex` writes 6 tool artifacts + 6 shared files; the
   five-tool run writes 30 + 6; two identical runs are byte-identical; every path is
   relative and inside the target dir; every artifact ends in exactly one `\n`
   (guarantees 14, 15).
5. Run `npm run typecheck` and `npm test`; both clean.
6. **[HUMAN, cannot be done in-session]** Live-install verification (O4): scaffold into a
   scratch repo, open Codex CLI there, confirm it lists the five agents from
   `.codex/agents/` and that `$sdd-conductor` / `/skills` finds the conductor from
   `.agents/skills/`. Check O2 (hyphenated agent `name`) and O1 (whether `.codex/skills/`
   is also read) at the same time — all three are answered by the same five-minute
   session. Record the outcome in `audit.md`.
7. **Human gate: post-audit.**

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Artifacts land where Codex never looks, failing silently at exit 0** — the AL-30 failure mode, for the fifth tool | Low | **High** | Every path is first-party-verified and dated (contract § "Verified Codex facts"), including against the CLI's own source via Context7. The residual is isolated as O4 and carried as a named Phase 4.6 task and an `audit.md` reservation — not left implicit |
| **`.agents/skills/` is the wrong or an incomplete conductor location** (O1) | Low–Med | Med | Pinned to the only first-party-documented repo-scope root. harny writes one location, not a speculative second copy. If a live check shows `.codex/skills/` also works, the current behavior is still correct — merely not the only correct option. Both caveats are disclosed inside the generated artifact |
| **`.agents/skills/` is not tool-namespaced**, so the conductor is visible to any other tool adopting the `.agents/` convention, and a pre-existing file there is more likely than under `.claude/` etc. | Med | Low–Med | Existing `writer.ts` collision policy applies unchanged (`--force` / interactive confirm). Disclosed as a `harny note:` in the artifact. Recorded here rather than discovered by a user |
| **Escaping strategy chosen wrong**, so the canonical body is mangled or a TOML parser becomes necessary in tests | Low | High | Phase 1 settles it before anything depends on it, with the rationale pinned normatively in `contract.md`. Multi-line **literal** strings do no escaping at all, which is what keeps the existing raw-substring fidelity oracle usable |
| **Canonical content later grows a `'''`, a CR, or an exotic control char**, silently breaking generated TOML | Low | Med | Guarantee 11: `HarnessError('TEMPLATE')` at render time, plus the Phase 1.7 test that scans the real templates. Fails a test run rather than shipping an unparseable file |
| **Test fallout from retiring the stub is "fixed" by deleting assertions**, quietly dropping `NO_GENERATOR` and skip-warning coverage | **Med** | Med | Contract § "SUPERSEDES — reachability" makes re-pointing normative and names the exact mechanism per file (module-mock / partial `available`). Guarantee 13 is the auditable form. Called out here as the phase to read most carefully |
| **Codex rejects hyphenated agent `name` values** (O2) | Low | Med | Only two documented examples exist and neither is decisive. Consistency with the other four tools wins by default; if wrong, the fix is confined to `roleFileName`/`name` and touches no canonical content. Bundled into the same Phase 4.6 live check |
| **`deny_unknown_fields` turns an invented key into a hard parse error** | Low | High | Contract pins an exact emitted-key set and an explicit never-emitted list, with `deny_unknown_fields` cited as the reason. Guarantee 2 asserts the key set |
| **Pinned model ids drift** — `gpt-5.4`/`gpt-5.4-mini` retire 2026-08-31, one day after this spec | **High** (for the retired ids), Low (for the pinned ones) | Med | The retired family is excluded by a test (Phase 2.1), not merely by review. Generation-time validation is impossible offline; the `--model <role>=<literal>` escape hatch remains, as does the Error Handling row saying so |
| **Cursor scans `.codex/agents/` and now finds TOML there** (D7, bidirectional) | Med | Low | Cursor's behavior is undocumented; harny neither suppresses nor merges. Already disclosed in the shipped Cursor conductor artifact; no Cursor behavior changes in this feature |
| **Scope creep into `.codex/config.toml` MCP provisioning**, since this feature introduces the TOML emitter that would make it easy | Med | Med | Explicit `intent.md` Non-Goal; `mcp_servers` is on the contract's never-emitted key list; recorded below as the natural follow-up instead |

## File Change Map

**Create**
- `src/generators/toml.ts` — CREATE — the TOML wrapper layer: `tomlBasicString`,
  `TomlKeyValue`, `renderTomlKeyValues`, `renderTomlComments`,
  `canRenderAsTomlLiteral`, `tomlMultilineLiteral` (Phase 1).
- `src/generators/codex.ts` — CREATE — the Codex adapter: `codexSandboxMode`,
  `codexGenerator` (Phase 2).
- `tests/generators/toml.test.ts` — CREATE — the six helpers, the escaping/rejection
  rules, the templates-are-literal-safe scan, and the test-local minimal TOML decoder
  (Phase 1).
- `tests/generators/codex.test.ts` — CREATE — mapping tables, `codexSandboxMode`, notes,
  role and conductor render shapes, decoded-value assertions, the no-TOML-syntax source
  scan, and the no-`gpt-5.4` scan (Phases 2, 4).

**Modify**
- `src/generators/index.ts` — MODIFY — import and register `codexGenerator`; update the
  module doc comment (currently states codex "deliberately resolves to `undefined`") and
  `availableToolIds()`'s stated value (Phase 3.1). **The only production file modified.**
- `tests/generators/registry.test.ts` — MODIFY — five available ids, none `undefined`;
  keep the five-target evidence table and assert the real `codexGenerator` against its
  `codex` row; update the stale header comment (Phase 3.2).
- `tests/init.test.ts` — MODIFY — re-point the skip-and-warn and `NO_GENERATOR` tests
  (~lines 138–185) onto a `vi.mock` synthetic registry (Phase 3.3).
- `tests/cli.test.ts` — MODIFY — re-point the exit-4 test (~lines 131–147) onto the same
  module-mock (Phase 3.4).
- `tests/prompts.test.ts` — MODIFY — re-point the hint assertion (~lines 73–78) to a
  partial `available` array; add the "no hint with the real registry" assertion
  (Phase 3.5).
- `tests/e2e-init.test.ts` — MODIFY — the four-tool artifact-count test (~lines 282–301)
  becomes five-tool: 30 tool artifacts, still exactly one copy of each shared file
  (Phase 3.6).
- `tests/canonical-fidelity.test.ts` — MODIFY — extend the raw-slice oracle to the Codex
  artifact, plus the decoded-`developer_instructions` assertion (Phase 4.1).

**Explicitly NOT modified** (guarantee 12 — asserted, not assumed)
- `templates/**` — read-only input.
- `src/generators/types.ts` — the interface is sufficient (contract § "Interface
  sufficiency finding"); no amendment proposed.
- `src/generators/markdown-yaml.ts` — imported from, extended by nothing.
- `src/generators/claude-code.ts`, `cursor.ts`, `kiro.ts`, `github-copilot.ts`.
- `src/init.ts`, `src/prompts.ts`, `src/cli.ts`, `src/config.ts`, `src/engine.ts`,
  `src/templates.ts`, `src/writer.ts`, `src/errors.ts`, `src/vocabulary.ts`.
- `package.json` — no dependency added, in either list.
- `plan.md` — corrected in `contract.md`'s discrepancy table, not edited.

**Deferred to `sdd-documentation` (post-audit, automatic — not this feature's work)**
- `README.md` — move `codex` from "Tools in progress" to "Shipped tools" with its two
  paths; update the file-count example (three tools → 24 + 6) if it is refreshed.
- `AGENTS.md:23` — "Codex (TOML format) is planned future work" → five shipped
  generators.
- `CHANGELOG.md` — new entry; the existing line calling `codex` "the sole" unshipped tool
  becomes historical.
- `specs/codex-generator/intent.md` — stamped with a `Shipped: <date>` header.

## Candidate follow-ups (recorded, not scheduled)

- **`harny mcp add`** — Codex's MCP configuration is `.codex/config.toml`
  (`[mcp_servers.<name>]`), and this feature introduces the TOML emitter it would need.
  Still the standing non-goal for all five tools.
- **Renaming/splitting `markdown-yaml.ts`** — `renderProvenance`,
  `renderProjectConfigBlock` and `renderSpecSchemaPointerBlock` are format-neutral prose
  helpers now used by a TOML target too. Deferred because moving them would touch all
  five generators for zero behavior change.
- **Per-role Codex `[permissions]` profiles** via `config_file` layering — the only
  mechanism that could *enforce* the auditor's `write-files (audit.md only)` scope rather
  than document it. Deferred for the same reason Kiro's `permissions` was: designing a
  deny-by-default posture for one role is outside this feature's mandate.
