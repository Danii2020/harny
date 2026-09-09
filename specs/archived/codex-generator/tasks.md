# Tasks: codex-generator

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

Every task cites the `roadmap.md` phase it belongs to. Test tasks precede implementation
tasks within each phase (`AGENTS.md` "Working conventions": red before green). Paths are
real paths in this repo; `.ts` throughout — this is a TypeScript/ESM package and imports
use `.js` specifiers.

## Phase 1: The TOML wrapper layer

- [x] Task 1.1: Write the **test-local minimal TOML decoder** — top-level string keys,
      basic strings (`"…"` with escapes), multi-line literal strings (`'''…'''`), and `#`
      comment lines. Test-only plumbing, never in `src/`, never a package dependency
      (contract guarantee 3, `intent.md` Non-Goals) — `tests/generators/toml.test.ts`
      (extract to `tests/helpers/toml-decode.ts` only if Task 2.7 also needs it)
- [x] Task 1.2: Red tests for `tomlBasicString` — escapes `\` and `"`; newline → `\n`;
      tab → `\t`; other control chars → `\uXXXX`; result round-trips through the Task 1.1
      decoder — `tests/generators/toml.test.ts`
- [x] Task 1.3: Red tests for `canRenderAsTomlLiteral` — true for ordinary Markdown prose
      including backticks, quotes and backslashes; false for a value containing `'''`, a
      `\r`, or a control character other than `\n`/`\t` — `tests/generators/toml.test.ts`
- [x] Task 1.4: Red tests for `tomlMultilineLiteral` — emits `'''\n<value>\n'''` with
      **no escaping**; the value is a byte-for-byte substring of the output; the output
      decodes to `value + "\n"`; throws `HarnessError('TEMPLATE')` naming the `artifact`
      argument when `canRenderAsTomlLiteral` is false —
      `tests/generators/toml.test.ts`
- [x] Task 1.5: Red tests for `renderTomlKeyValues` (field order preserved, one
      `key = value` per line) and `renderTomlComments` (one `# ` prefix per line; an
      interior `\n` in a note starts a further `# ` line and cannot break out of comment
      syntax) — `tests/generators/toml.test.ts`
- [x] Task 1.6: **HUMAN GATE — post-red-tests.** Confirm the red suite fails for the right
      reasons before any implementation
- [x] Task 1.7: Implement the module to green: `tomlBasicString`, `TomlKeyValue`,
      `renderTomlKeyValues`, `renderTomlComments`, `canRenderAsTomlLiteral`,
      `tomlMultilineLiteral` — `src/generators/toml.ts`
- [x] Task 1.8: Add a scan test asserting the **real** canonical layer is literal-safe:
      no `'''`, no `"""`, no `\r`, no exotic control characters in any file under
      `templates/` (roadmap Phase 1.7) — `tests/generators/toml.test.ts`

## Phase 2: The Codex adapter

- [x] Task 2.1: Red tests for `mapModel` — `most-capable` → `gpt-5.6-sol`, `mid` →
      `gpt-5.6-terra`, `cheapest` → `gpt-5.6-luna`; `override` returned verbatim and
      untranslated; **plus a source scan asserting no `gpt-5.4` id appears anywhere under
      `src/`** (contract guarantee 10, discrepancy D2) —
      `tests/generators/codex.test.ts`
- [x] Task 2.2: Red tests for `codexSandboxMode` — `'read-only'` for a synthetic
      capability set declaring neither `write-files` nor `run-shell`; `undefined` for each
      of the five real roles; never returns `'workspace-write'` (guarantee 7) —
      `tests/generators/codex.test.ts`
- [x] Task 2.3: Red tests for `mapCapabilities` — `tokens` is always `[]`; one note per
      capability in input order, deduped; the real `sdd-auditor` produces a note
      containing `audit.md only`; an unknown token produces
      `unmapped capability: <name>`; the `harny note:` adapter caveat appears exactly once
      per role and only when the capability list is non-empty (guarantee 6) —
      `tests/generators/codex.test.ts`
- [x] Task 2.4: Red tests for `renderRole` — path `.codex/agents/<role>.toml`; the
      comment header precedes the key/value lines; emitted key set is exactly
      `{name, description, model, developer_instructions}` for all five real roles
      (`sandbox_mode` absent); provenance renders as TOML `#` comments and **not** as an
      HTML comment; output ends in exactly one `\n` (guarantees 2, 15) —
      `tests/generators/codex.test.ts`
- [x] Task 2.5: Red tests for the **channel split** — the spec-schema pointer block with
      its `harny:begin`/`harny:end` markers appears **inside** the decoded
      `developer_instructions`, not in a TOML comment; the directory it names equals
      `SPEC_SCHEMA_DIR` imported from `src/engine.ts` rather than a literal in the
      generator (guarantee 9) — `tests/generators/codex.test.ts`
- [x] Task 2.6: Red tests for `renderConductor` — path
      `.agents/skills/sdd-conductor/SKILL.md`; Markdown + YAML frontmatter (not TOML);
      frontmatter keys exactly `name` and `description`, derived only from
      `ConductorMetadata`'s `id`/`purpose`; both `harny note:` caveats present; the
      `renderProjectConfigBlock` output present; renders successfully against the real
      `templates/conductor/sdd-conductor.md` (guarantee 8) —
      `tests/generators/codex.test.ts`
- [x] Task 2.7: Red tests for decoded-value correctness — every generated role artifact
      parses with the Task 1.1 decoder and its decoded `name`, `description` and `model`
      equal the contract's specified values (guarantee 3) —
      `tests/generators/codex.test.ts`
- [x] Task 2.8: **HUMAN GATE — post-red-tests**
- [x] Task 2.9: Implement `codexSandboxMode` and `codexGenerator` to green — importing
      `renderFrontmatter`, `renderProvenance`, `renderProjectConfigBlock` and
      `renderSpecSchemaPointerBlock` from `./markdown-yaml.js` and `SPEC_SCHEMA_DIR` from
      `../engine.js`, **adding nothing to either module** — `src/generators/codex.ts`
- [x] Task 2.10: Add the source-scan test asserting `src/generators/codex.ts` contains no
      `'''`, no `"""`, no hand-written `key = value` serialization and no `#`-comment
      serializer — all TOML syntax comes from `toml.ts` (guarantee 5) —
      `tests/generators/codex.test.ts`

## Phase 3: Registry integration and retiring the stub

- [x] Task 3.1: Register `codexGenerator`; update the module doc comment, which currently
      states codex "deliberately resolves to `undefined`", and `availableToolIds()`'s
      stated value — `src/generators/index.ts` **(the only production file modified in
      this phase)**
- [x] Task 3.2: Update the registry tests — all five ids resolve, none `undefined`;
      `availableToolIds()` equals the exact five-element array in `TOOL_IDS` order.
      **Keep** the five-target interface-sufficiency evidence table and additionally
      assert the real `codexGenerator` matches its `codex` row (`.codex/agents`,
      `'toml'`, `.codex/agents/sdd-architect.toml`, `conductorPath` not under
      `agentsDir`). Update the stale file header comment claiming codex "remains
      unimplemented after this feature" (guarantee 1) —
      `tests/generators/registry.test.ts`
- [x] Task 3.3: Re-point the two generator-availability tests (skip-and-warn; the
      `NO_GENERATOR` throw, ~lines 138–185) onto a synthetic registry via
      `vi.mock('../src/generators/index.js', …)`. **Do not** delete them, weaken them to
      `toContain`, or add an injection seam to `src/init.ts` (guarantee 13, contract
      § "SUPERSEDES — reachability") — `tests/init.test.ts`
- [x] Task 3.4: Re-point "maps no-available-generator to exit 4" (~lines 131–147) onto the
      same module-mock, preserving both the `HarnessError` → exit-4 assertion and the
      "target directory is empty" assertion — `tests/cli.test.ts`
- [x] Task 3.5: Re-point the `generator not shipped yet` hint assertion (~lines 73–78) to
      pass a **partial** `available` array to `runInitPrompts` (an existing
      `PromptDefaults` field — no production change); add an assertion that with the real
      `availableToolIds()` **no** tool option carries a hint —
      `tests/prompts.test.ts`
- [x] Task 3.6: Update the multi-tool artifact-count test (~lines 282–301) from four tools
      / 24 tool artifacts to five tools / 30, still asserting exactly one copy of each of
      the five spec-schema files and one `.sdd/harness.json` (guarantee 14) —
      `tests/e2e-init.test.ts`
- [x] Task 3.7: Run the full suite and confirm nothing else silently depended on
      `availableToolIds().length === 4` or on `codex` being unavailable —
      `npm test`

## Phase 4: Validation, fidelity and the un-closable check

- [x] Task 4.1: Extend the canonical-fidelity oracle to the fifth generator — for all five
      roles and the conductor, the body sliced from the **raw** template file
      (`fs.readFile`, never via `parseRoleTemplate`/`parseConductorTemplate`) is a
      byte-for-byte contiguous substring of the Codex artifact, **and** equals the
      corresponding prefix of the decoded `developer_instructions` (guarantee 4) —
      `tests/canonical-fidelity.test.ts`
- [x] Task 4.2: Assert the no-regression set is byte-identical: `templates/**`,
      `src/generators/types.ts`, `src/generators/markdown-yaml.ts`, `claude-code.ts`,
      `cursor.ts`, `kiro.ts`, `github-copilot.ts`, and every module outside
      `src/generators/` (guarantee 12) — `tests/canonical-fidelity.test.ts` or
      `tests/packaging.test.ts`, whichever already owns the sweep
- [x] Task 4.3: Assert `package.json`'s `dependencies` and `devDependencies` are
      byte-identical and contain no TOML package (guarantee 16) —
      `tests/packaging.test.ts`
- [x] Task 4.4: End-to-end assertions — `init --tools codex` writes 6 tool artifacts + 6
      shared files; two identical runs produce byte-identical trees; every generated path
      is relative and inside the target directory; every artifact (TOML and Markdown
      alike) ends in exactly one `\n` (guarantees 14, 15) — `tests/e2e-init.test.ts`
- [x] Task 4.5: Run `npm run typecheck` and `npm test`; both clean — no file
- [ ] Task 4.6: **[!] BLOCKED — HUMAN, cannot be performed in-session.** Live-install
      verification (contract § "Open items" O1, O2, O4). Procedure:
      1. `npx harny init --tools codex --yes` into a scratch repo.
      2. Open Codex CLI in that repo. Confirm it loads the five agents from
         `.codex/agents/` and refers to them as `sdd-architect` … `sdd-documentation`
         (**answers O2** — whether a hyphenated agent `name` is accepted).
      3. Run `/skills` and confirm `sdd-conductor` is listed; start it with
         `$sdd-conductor` (**confirms `.agents/skills/` is read**). Restart Codex first —
         skills metadata is loaded at startup.
      4. Optionally copy the same `SKILL.md` to `.codex/skills/sdd-conductor/SKILL.md` in
         a second scratch repo and check whether `/skills` also finds it there
         (**answers O1**).
      5. Record all outcomes in `audit.md`'s Audit Log. **Do not mark this task `[x]`
         without a recorded result** — that is exactly how AL-30 stayed open, and
         undetected, across two audit passes on the previous feature — no file
- [ ] Task 4.7: **HUMAN GATE — post-audit**

## Blocked Items

- **Task 4.6** — blocked on a human with a live Codex CLI install. Nothing in Phases 1–3
  depends on it; it is a verification task, not an implementation dependency, so it does
  not block shipping. It **does** block calling this feature *fully* verified, and
  `audit.md` must carry it as an explicit reservation rather than a silent gap.

## Notes

**For the executor**

- `src/generators/cursor.ts` is the closest structural model: a target with no
  tool-allowlist field, `tokens` always `[]`, and one permission control *derived* from
  the capability set and exported for testability outside the `Generator` interface.
  Read it before writing `codex.ts`.
- **The two places Codex differs in kind, not syntax** — get these wrong and every test
  still passes while the artifact is useless:
  1. The role prose is the **value of a `developer_instructions` key**, not a document
     body. The spec-schema pointer block must go *inside* that string; a TOML comment is
     invisible to the model (Task 2.5).
  2. The **conductor is Markdown+YAML** (`SKILL.md`) while the roles are TOML.
     `wrapperFormat: 'toml'` describes the role wrapper only.
- Codex's `RawAgentRoleFileToml` uses `#[serde(deny_unknown_fields)]`: an invented
  top-level key is a **hard parse error**, not an ignored one. Emit only the key set the
  contract pins.
- Never emit `sandbox_mode = "workspace-write"`. harny may narrow a subagent's
  permissions, never widen them past the mode the human selected in the parent session.
- Use multi-line **literal** (`'''`) strings, not basic (`"""`). The whole fidelity
  guarantee and the ability to keep a raw-substring test oracle depend on it; the
  rationale is normative in `contract.md`.

**For the test-writer**

- The two model rows most likely to need revisiting are the ones tied to a dated vendor
  catalogue: `gpt-5.6-sol` / `gpt-5.6-terra` / `gpt-5.6-luna`, verified 2026-08-30. The
  `gpt-5.4` family retires **2026-08-31** — one day after this spec was written — which
  is why Task 2.1 makes its absence a test rather than a review comment.
- Do not add a TOML package to `devDependencies` to make assertions easier. The
  test-local decoder (Task 1.1) is the sanctioned mechanism; a dependency would violate
  guarantee 16.

**For the auditor**

- **Phase 3 is the phase to read most carefully.** Four existing test files use `codex`
  as their "unimplemented tool" fixture. The tempting fix — deleting those assertions or
  loosening them to `toContain` — would silently drop coverage of two documented
  `cli-skeleton` guarantees while the suite stays green. Verify the coverage was
  *re-pointed*, not removed.
- `contract.md` § "Open items" O1–O4 are the claims verified against first-party
  documentation and source but **not** against a running Codex CLI. That is a strictly
  stronger position than the previous feature's AL-30 (which could not even re-run a docs
  review), but it is not an execution check. Carry O4 forward as an explicit reservation
  with the Task 4.6 procedure attached; do not let it lapse into an unremarked gap.

## Execution status

**Phases 1–4.5 completed: 2026-09-02.** All tasks in Phases 1, 2, 3 and Phase 4.1–4.5 are
marked `[x]`. `npm run typecheck` and `npm test` are both clean (260/260 tests passing,
20/20 test files). Task 4.6 (live-install verification) and Task 4.7 (post-audit human
gate) are deliberately left `[ ]` — both are explicitly out of this executor's scope per
the assigning instructions and remain blocked on a human with a live Codex CLI install
and on the auditor/human review that follows this execution pass, respectively.

One test-bug fix was made to an approved red-phase test, not to `src/`: see the note in
`tests/generators/codex.test.ts`'s "renders provenance as a TOML '#' comment ... never an
HTML comment" test, where the original whole-file `not.toContain('<!--')` assertion
contradicted contract.md's own guarantee 9 and its "Illustrative output — Codex auditor
role" example (the spec-schema pointer block, produced unchanged by the shared
`renderSpecSchemaPointerBlock`, is mandated to land *inside* `developer_instructions` using
its existing HTML-comment-shaped `harny:begin`/`harny:end` markers, for every role
including the auditor tested there). The assertion was narrowed to the comment-header
region only, matching the correctly-scoped sibling assertion a few lines below it in the
same test file. No other test file content was altered beyond the re-pointing this
feature's contract explicitly calls for.
