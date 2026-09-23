# Audit: dogfood-quick-fixes

> Four independent items, four independent verification stories (intent.md G6,
> contract.md XC-5). Every row below is scoped to exactly one item, so the auditor can
> reach a per-item verdict. A FAIL in one item's rows does not implicate the other
> three.

> **Auditor's method note (2026-09-22).** Nothing in the executor's hand-off was taken
> on faith. Every numeric claim (`npm test` counts, `npm run typecheck`, `npm run
> build`), every byte-identity claim (the dogfood workflow, the two skill bullets, the
> generated block, the four untouched role templates), and every generated-output claim
> (the five MCP configs, the five-tool role artifacts) was re-derived independently in
> this session from a fresh build and fresh scratch `init` runs. The MO-2 stale-literal
> sweep was additionally proven **capable of failing** by injecting a probe file
> carrying the pre-departure literal under `templates/` and observing the test go red
> (probe removed immediately afterward; `git status` restored).

## Requirements Checklist

| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | SC1 — `CONTEXT7_MCP_URL` equals `'https://mcp.context7.com/mcp/oauth'` | intent.md | PASS | `src/mcp.ts` line 42. Single definition; type, name and export unchanged. |
| R2 | SC2 — the quoted new URL appears exactly once in `src/`, in `src/mcp.ts`; no generator re-literals it | intent.md | PASS | `tests/mcp.test.ts`'s single-literal check green at the new value. Auditor's own `git diff --stat -- src/generators/` is empty — no generator file was touched at all. |
| R3 | SC3 — all five tools' native MCP configs carry the new endpoint at their verified path, root key and entry shape | intent.md | PASS | Auditor ran `node bin/harness.js init <scratch> --tools claude-code,cursor,kiro,github-copilot,codex --stack typescript --yes` after a clean `npm run build` (85 files) and read all five files. Observed exactly: `.mcp.json` → `mcpServers.context7 = {"type":"http","url":"…/mcp/oauth"}`; `.cursor/mcp.json` → `mcpServers.context7 = {"url":…}`; `.vscode/mcp.json` → `servers.context7 = {"type":"http","url":…}`; `.kiro/settings/mcp.json` → `mcpServers.context7 = {"url":…}`; `.codex/config.toml` → `[mcp_servers.context7]` / `url = "https://mcp.context7.com/mcp/oauth"`. Matches MO-3 row for row. |
| R4 | SC4 — no shipped prose still calls the endpoint "unauthenticated"; `src/mcp.ts`'s doc comment and `templates/mcp/README.md` state what harny writes and why | intent.md | PASS | Auditor grep for `unauthenticated\|anonymous` across `src/` and `templates/` returns three hits, all three correctly describing the **non-OAuth** endpoint as the alternative, never the endpoint harny writes. The word "unauthenticated" survives nowhere. |
| R5 | SC5 — no credential, placeholder or env-var reference is written alongside the URL in any generated file | intent.md | PASS | Auditor swept the scratch output for `authorization`, `bearer`, `api[-_]key`, `CONTEXT7_API`, `"env"`, `"headers"`, `${` — zero matches in all five MCP artifacts. |
| R6 | SC6 — `templates/roles/sdd-documentation.md` § Step 5 carries a rule forbidding commit and push, naming `--no-verify`, saying what to do instead, naming no coding-agent tool | intent.md | PASS | Lines 54–61, appended after "No scope creep", **byte-verbatim** against contract.md's normative block (auditor `diff` of contract.md lines 130–137 vs the file's lines 54–61: no difference). Names only `git`, never a coding-agent tool (S7-clean; contract § "Four properties" item 3 pre-authorizes naming `git`). |
| R7 | SC7 — the same rule is in `templates/skills/harny-document/SKILL.md` and `.agents/skills/harny-document/SKILL.md` § Guardrails, byte-identical to each other | intent.md | PASS | Both tails md5 `b3737d12e84e79df180f2e89b67a3d10`; `diff` of the two eight-line blocks is empty. Also byte-verbatim against contract.md lines 160–167. |
| R8 | SC8 — the rule reaches all five tools' generated `sdd-documentation` artifacts verbatim, with no generator change | intent.md | PASS | Auditor counted `Never commit or push.` in all 25 generated role artifacts of a real five-tool scratch `init`: exactly 1 in each of the five `sdd-documentation` artifacts (including inside Codex's `developer_instructions = '''` string) and 0 in all twenty others. `src/generators/` diff is empty. |
| R9 | SC9 — only `sdd-documentation` gains the rule; the other four role templates are byte-unchanged | intent.md | PASS | `git status --porcelain templates/roles/` lists only `sdd-documentation.md`. The four others are byte-unchanged at the source, and the generated-artifact sweep above confirms the consequence. |
| R10 | SC10 — `src/feedback.ts`'s `CommandSpec.extensions` doc comment states amendment A1's rule in full | intent.md | PASS | Lines 51–57. All four no-filter cases, "valid entry = non-empty string", the mixed-list rule, and the "never match nothing" rationale are all present. |
| R11 | SC11 — the archived contract's § Interfaces copy says the same, with a dated correction note that does not rewrite A1's history | intent.md | PASS | Identical replacement text, `**(A1.)**`-marked. The correction note sits at lines 17–22, as its **own** blockquote, separated by a blank line **after** the A1 blockquote that ends at line 15 — outside it, exactly as DC-3 requires. |
| R12 | SC12 — item 3 changes zero behavior: no executable statement, identical suite pass/fail set, clean typecheck | intent.md | PASS | The `src/feedback.ts` diff is six comment lines in, one comment line out, inside a `/** … */`. `npm run typecheck` exits 0. Suite outcome unchanged (see R18). |
| R13 | SC13 — `templates/ci/harny-feedback.yml`'s `on:` declares `pull_request:` and a push trigger restricted to `main` | intent.md | PASS | Parsed with a real YAML parser: `on` → `{'pull_request': None, 'push': {'branches': ['main']}}`. Exactly one branch entry. |
| R14 | SC14 — the generated workflow carries both triggers for any stack and tool selection; `on:` stays outside the generated-block markers; no `src/engine.ts` change | intent.md | PASS | `tests/engine.test.ts` asserts both triggers for a resolved `typescript` profile and an unresolved stack. Auditor extracted the `harny:begin`/`harny:end` region from the pre-feature (`git show HEAD:`) and post-feature workflow and `diff`ed them: **empty** — the generated block is byte-identical. `git status src/engine.ts` is empty. |
| R15 | SC15 — a pull-request branch never double-runs: the push trigger's branch filter excludes every branch but `main` | intent.md | PASS | Verified structurally: the parsed `push.branches` list is exactly `['main']`, and the new `PUSH_TRIGGER` regex in `tests/engine.test.ts` anchors on `jobs:` immediately after `- main`, so a second branch entry would break the test. The behavioral half rests on GitHub's documented independent evaluation of `on.push.branches` and `on.<pull_request>` (contract § CI-3, re-fetched by the architect 2026-09-22) and is only *observable* post-merge — see carried reservation SC17. |
| R16 | SC16 — this repo's `.github/workflows/harny-feedback.yml` is byte-identical to a fresh `harny init --tools claude-code --stack typescript` output (FC-13) | intent.md | PASS | Auditor re-proved independently: `npm run build`, then a fresh `init` into a brand-new scratch directory (31 files), then `diff` against this repo's file — **empty**. |
| R17 | SC17 — a green `harny-feedback` run exists on a push to `main` after this feature lands (the evidence AL-5 could not produce) | intent.md | N/A (carried) | Confirmed as a carried reservation, not discovered. `gh run list` shows exactly one `harny-feedback` run in this repo's entire history: `34853159815`, 2026-09-14, event `pull_request`, conclusion `success`. No run exists for this feature or the four shipped since. That absence *is* the defect item 4 fixes. Expires on the first push to `main` after this feature lands. |
| R18 | SC18 — `npm test` reports exactly one failure, the pre-existing `tests/packaging.test.ts` vitest pin | intent.md | PASS | Auditor's own run: **634 tests, 633 passed, 1 failed**, 30 test files. The single failure is `tests/packaging.test.ts > adds no TOML parsing or serialization package…`, asserting `vitest: '4.1.10'` against `package.json`'s `^4.1.11` — the pre-existing, out-of-scope pin from commit `c8a3bd4`. 625 baseline + 9 new tests = 634; 624 + 9 = 633 passing, exactly as XC-3 predicts. |
| R19 | SC19 — no new runtime or dev dependency; `package.json` byte-unchanged | intent.md | PASS | `git status --porcelain package.json tests/packaging.test.ts` is empty. No lockfile change. |
| R20 | SC20 — each of the four items is verifiable on its own | intent.md | PASS | The four items' file sets are disjoint and partition the 16 modified files exactly: item 1 = 6 files, item 2 = 5, item 3 = 2, item 4 = 3. Every row above cites evidence drawn from one item's files only. |

## Contract Compliance

### Item 1 — Context7 endpoint

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | MO-1 — one literal, new value, exactly once in `src/` | PASS | `tests/mcp.test.ts`'s single-literal check (now `/(['"])https:\/\/mcp\.context7\.com\/mcp\/oauth\1/g`) passes and additionally asserts the owning file is `src/mcp.ts`. Auditor confirmed `src/generators/` has a zero-line diff, so no generator re-literalled it. |
| C2 | MO-2 — the old quoted literal occurs zero times in `src/` and `templates/`, checked by a quoted-string or end-anchored pattern (never a bare substring) | PASS | The check is `/https:\/\/mcp\.context7\.com\/mcp(?![\/\w-])/g` swept over **every file, any extension** under `src/` and `templates/`. Auditor verified the pattern in isolation: it matches all five realistic old-literal forms (single-quoted, double-quoted, Markdown backtick, bare mid-line, at end of file) and matches the new URL **zero** times in both quoted and backtick form. Then proved it end-to-end by writing a probe file `templates/mcp/.__audit_probe.md` containing `` `https://mcp.context7.com/mcp` `` and running the test: it **failed** with "still contains the pre-departure /mcp endpoint literal" (`expected 1 to be 0`). Probe deleted; `git status templates/` restored. The prefix trap is genuinely avoided. Independent repo-wide grep confirms zero stale literals under `src/` or `templates/`. |
| C3 | MO-3 — all five tools get the new endpoint at their verified path/root key/entry shape | PASS | Real five-tool scratch `init` against a freshly built `dist/`; all five files read and matched against MO-3's table row for row. See R3. |
| C4 | MO-4 — merge semantics (unchanged/force/skipped/convergence) unchanged at the new value | PASS | `mergeJsonMcpConfig` / `mergeTomlMcpConfig` have a zero-line diff. Their whole test block in `tests/mcp.test.ts` (fresh write, additive merge, existing entry with/without `--force`, unparseable-root `skipped` with the by-hand snippet naming the new URL) is green. Auditor also re-ran `init --force` over an already-initialized scratch dir and `diff -r`'d against the original: **byte-identical convergence** (CLI-4). |
| C5 | MO-5 — an existing `/mcp` entry is not migrated; no detection, no upgrade warning | PASS | `src/mcp.ts`'s only non-comment change is the constant's value. No string comparison against the old endpoint, no migration branch, no new warning builder exists anywhere in the diff. |
| C6 | MO-6 — still no credential, header, `env` key or env-var reference in any generated config | PASS | Credential sweep over the real five-tool scratch output: zero matches for `authorization`, `bearer`, `api[-_]key`, `CONTEXT7_API`, `"env"`, `"headers"`, `${`. |
| C7 | MO-7 — prose matches the value at both sites (`src/mcp.ts` doc comment, `templates/mcp/README.md`) | PASS | `src/mcp.ts`'s doc comment carries every claim contract.md's normative "After" block requires (both endpoints named; the departure from per-client examples stated with its reason; ADR 0029 cited; the 2026-09-22 re-verification dated; the no-credential claim preserved *and* explained for the OAuth case). Re-wrapped to ≤88 columns, within the file's 90-column style. The module header gains the 2026-09-22 endpoint re-verification **alongside** the 2026-09-15 per-tool-facts date, which is not re-dated — exactly as the contract requires. `templates/mcp/README.md` corrected at all three sites (behavior item 6, the post-table endpoint sentence, § "Using an API key"). |
| C8 | MO-8 — `templates/mcp/README.md` keeps its behavior-first, tool-as-example shape; the five-file table is unchanged | PASS | The five-file table's five rows (paths, root keys, approval-gate column) have a zero-line diff. Every rewritten sentence leads with the behavior ("No credential is ever written", "Every entry points at…", "The endpoint harny writes handles authentication through…") and names tools only as attributed examples. S7-clean. |

### Item 2 — never commit or push

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C9 | GR-1 — the rule exists in the canonical role body and forbids `git commit`, `git push`, `--no-verify` | PASS | `templates/roles/sdd-documentation.md` lines 54–61, inside § "Step 5: Hard Rules", appended as the fourth bullet after "No scope creep". All three prohibitions present by name. |
| C10 | GR-2 — the rule says what to do instead (leave the tree; report in the Step 6 summary) | PASS | "Leave every change in the working tree, staged or unstaged, exactly as this role left it, and list the changed files in the Step 6 change summary". Auditor confirmed § "Step 6: Present a Change Summary" really is the next heading in that file, so the cross-reference resolves. The skill copy's parallel reference to "the step 4 change summary" also resolves — `templates/skills/harny-document/SKILL.md` step 4 is "Present a change summary." |
| C11 | GR-3 — `git mv` is explicitly carved out, so `harny-sync` archive mode is not broken | PASS | Role body: "(The archive hand-off's own `git mv` is a move, not a commit, and stays allowed.)" Both skill copies: "(`harny-sync`'s own `git mv` during the archive move is a move, not a commit, and stays allowed.)" Present in **all three** landing sites. The rule is scoped to history-recording/publishing commands, never to "all git" — `harny-sync`'s documented `git mv` and `git ls-files` remain permitted. |
| C12 | GR-4 — exactly one role gains the rule; the other four templates byte-unchanged | PASS | `git status --porcelain templates/roles/` lists `sdd-documentation.md` and nothing else. Confirmed downstream against real generated output: the substring appears 1× in each of the five `sdd-documentation` artifacts and 0× in each of the twenty `sdd-architect` / `sdd-test-writer` / `sdd-executor` / `sdd-auditor` artifacts. |
| C13 | GR-5 — the rule reaches all five tools' generated artifacts verbatim, with no generator change | PASS | Same 25-artifact sweep over a real scratch `init`, including Codex's `developer_instructions = '''` block. `src/generators/` diff is empty, so the canonical-body mechanism carried it unassisted. |
| C14 | GR-6 — the rule is present in both skill roots, byte-identical, so the thinned live agent is covered | PASS | `diff` of the two appended blocks is empty; md5 of both tails is identical (`b3737d12e84e79df180f2e89b67a3d10`). A full `diff` of the two `SKILL.md` files shows **only** the pre-existing three-line step-3.3 divergence — nothing new. The scratch `init` also shows the rule reaching `.claude/skills/`, `.kiro/skills/` and `.agents/skills/` copies of the shipped skill. |
| C15 | GR-7 — no frontmatter, `capabilities:` or `allowed-tools` change | PASS | Each of the three files' diffs is a pure eight-line append at end-of-section. No frontmatter line, no `capabilities:` line, no `allowed-tools:` line appears in any hunk. |
| C16 | GR-8 — no `'''`, bare `\r` or control character; Copilot's 30,000-char body cap not approached | PASS | Auditor scanned `templates/roles/sdd-documentation.md`: zero `'''`, zero `\r`, zero `[\x00-\x08\x0B\x0C\x0E-\x1F]`. Role template is 5,740 bytes; the generated Copilot artifact is 6,073 bytes — 20% of the cap. Codex's generated `.toml` renders cleanly with the `'''` delimiter intact. `tests/generators/codex.test.ts` and `tests/generators/github-copilot.test.ts` are green. |
| C17 | GR-9 — `DIVERGENCE_TABLE` not edited; `tests/skills-fidelity.test.ts` green unchanged | PASS | `git diff -U0` on that file yields exactly two hunks, both pure insertions: `@@ -104,0 +105,18 @@` (header comment) and `@@ -510,0 +529,12 @@` (the new describe). `DIVERGENCE_TABLE` begins at line 216 and is untouched; its `'harny-document'` entry still reads `{ kind: 'diverges', requiredInTemplate: ['rather than assuming any prior history exists'] }`. The exhaustive sweep is green **without** the edit — which is itself the proof that the two new bullets are identical. |

### Item 3 — AL-11

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C18 | DC-1 — `src/feedback.ts` states all four no-filter cases, defines "valid entry", states mixed-list behavior | PASS | All four cases enumerated verbatim ("Absent, not an array, empty (`[]`), or an array with no valid entry (e.g. `[null, '']`, `[5]`)"); "A valid entry is a non-empty string"; the worked mixed-list example `[null, '', 5, '.py']` → `['.py']`; and the "never match nothing" rationale. |
| C19 | DC-2 — the archived contract's § Interfaces copy says the same, marked `**(A1.)**`, with a dated correction note naming AL-11 | PASS | The § Interfaces replacement is character-identical to the `src/feedback.ts` text and carries the `**(A1.)**` marker, matching that file's own post-audit convention. The note at lines 17–22 is byte-verbatim against contract.md's normative block, is dated, names `dogfood-quick-fixes`, states plainly that it is a text alignment only, says A1's record is left as written, and closes **AL-11** by name. |
| C20 | DC-3 — A1's own record, PH-6, the Error Handling rows and every audit-log row are byte-unchanged | PASS | The file's diff is exactly two hunks: `+7` (the note plus its blank separator) and `+6/-1` (the § Interfaces sentence) — 13 insertions, 1 deletion, matching the executor's claim. The correction note is a **separate** blockquote at lines 17–22, after a blank line following the A1 blockquote that ends at line 15; nothing was inserted inside A1's block. The only line in the whole diff mentioning `PH-6` is the note's own forward reference. No line touching the `## Post-audit amendment A1` section, PH-6's body, an Error Handling row, or an audit-log row appears in the diff. `git status specs/archived/feedback-path-hygiene/` lists `contract.md` alone — `intent.md`, `roadmap.md`, `tasks.md` and **`audit.md`** are all byte-unchanged. |
| C21 | DC-4 — zero behavior change: no executable statement, runners byte-unchanged, suite outcome identical, typecheck clean | PASS | Both `src/feedback.ts` hunk sides are `*`-prefixed lines inside a `/** … */`. `templates/hooks/run-feedback.mjs` and `.sdd/feedback/run-feedback.mjs` do not appear in `git status` at all. `npm run typecheck` exits 0; `npm run build` exits 0. Suite outcome is the 624+9 / 1-failure set XC-3 predicts. |
| C22 | DC-5 — the three sites make the same four claims | PASS | Auditor read all three side by side. `templates/hooks/run-feedback.mjs` `matchesExtensions` (lines 176–187): "(A1) Valid entries are non-empty strings. No filter (always true) when `extensions` is not an array or has no valid entry: absent, `[]`, and `[null, '']` all mean 'no filter'. Otherwise a case-sensitive suffix test against the valid entries only; invalid entries are ignored." — same four claims as `src/feedback.ts:51–57` and as the archived contract's § Interfaces copy, differing only in wrapping and voice, exactly as DC-5 permits. The implementation below that comment (filter to non-empty strings; `valid.length === 0 ⇒ true`; else `some(endsWith)`) is what all three describe. |

### Item 4 — CI push trigger

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C23 | CI-1 — `on:` declares `pull_request:` and `push:` with `branches:` exactly `main`, both in the canonical region | PASS | Real YAML parse of `templates/ci/harny-feedback.yml`: `{'pull_request': None, 'push': {'branches': ['main']}}`. The block sits at file lines 27–33, above `jobs:` and far above the `harny:begin` marker — canonical region. `.github/workflows/harny-feedback.yml` declares the identical block (auditor `diff`ed the two `on:` regions). |
| C24 | CI-2 — `main` is hardcoded, with the rationale recorded and the header comment naming the line to change | PASS | The branch name is a YAML literal, derived from nothing. The header gains the contract's normative paragraph verbatim, which names the alternatives (`master`, `trunk`, `develop`), says "change it here", and calls it "the one value in this file harny expects a project to adjust by hand". The full rationale (prompt vs. git-shell-out vs. hardcode, with the S3/CLI-4 determinism argument) is recorded in contract § CI-2 and earns ADR 0030. |
| C25 | CI-3 — no duplicate run on a PR branch; the two triggers are disjoint for a topic branch | PASS | Structural verification: `push.branches` is exactly `['main']`, and a topic branch backing a PR is by definition not `main`, so the two event filters cannot both match the same commit. The new `PUSH_TRIGGER` regex anchors on `jobs:` immediately after `- main`, so silently widening the branch list would turn the test red. The behavioral confirmation is only observable post-merge (see SC17). |
| C26 | CI-4 — no `src/` change; the generated block is byte-identical for the same config | PASS | `git status src/engine.ts` is empty — `renderCiWorkflow`, `spliceGeneratedYamlBlock`, `renderInstallGateChain`, `renderRunnerInvocation` and `buildFeedbackFiles` are all byte-unchanged. Auditor extracted the `harny:begin … harny:end generated project configuration` region from `git show HEAD:.github/workflows/harny-feedback.yml` and from the current file and `diff`ed them: **empty**. The `on:` change really did stay outside the markers. `tests/engine.test.ts` adds a declared regression guard asserting the generated block contains neither `push` nor `on:`, correctly labelled as already-green in the file's header per the A1.2 precedent. |
| C27 | CI-5 — still exactly one workflow, byte-identical across tool selections (FC-7) | PASS | Auditor `diff`ed the workflow from a one-tool (`claude-code`) scratch `init` against the one from the five-tool scratch `init`: **byte-identical**. Exactly one workflow file in each. |
| C28 | CI-6 — valid YAML; the generated-block markers stay at the same nesting depth | PASS | Parsed without error by a real YAML parser; top-level keys `name`, `on`, `jobs`; `pull_request` carries a null value as before, `push` carries a `branches` sequence. The markers remain at their original indentation inside `steps:` (unchanged region, proven by the empty generated-block diff), so `spliceGeneratedYamlBlock`'s indentation derivation is untouched. |

### Cross-cutting

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C29 | XC-1 — FC-13 byte-identity for this repo's own workflow; the other seven FC-13 paths unchanged | PASS | Re-proved independently, not taken from the executor's record: `npm run build`, fresh `node bin/harness.js init <new-scratch> --tools claude-code --stack typescript --yes` (31 files), then `diff` against this repo's `.github/workflows/harny-feedback.yml` → **empty**. The other seven FC-13 paths are all tracked (`git ls-files` confirms `.claude/settings.json`, `.sdd/feedback/run-feedback.mjs`, `.sdd/shared/probes.mjs`, `.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`, `.sdd/harness.json`, `.sdd/spec-schema/*.md`) and `git status --porcelain` over them is empty. |
| C30 | XC-2 — no new dependency; `package.json` and `tests/packaging.test.ts` byte-unchanged | PASS | `git status --porcelain package.json tests/packaging.test.ts` is empty. No lockfile appears in `git status`. No new `import` of an external package in any diff hunk. |
| C31 | XC-3 — exactly one pre-existing failure; every added test passes | PASS | 634 tests / 633 passing / 1 failing; the one failure is the `tests/packaging.test.ts` vitest pin from `c8a3bd4`, which this feature is forbidden to touch. All 9 tests this feature adds (3 in `canonical-fidelity`, 2 in `skills-fidelity`, 3 in `engine`, 1 in `mcp`) pass. |
| C32 | XC-4 — no allowlist entry added to `tests/canonical-fidelity.test.ts`'s `isContractedEntry` | PASS | `git diff -U0` yields exactly two hunks, both pure insertions: `@@ -33,0 +34,14 @@` (header comment) and `@@ -509,0 +524,57 @@` (the two new describes). `isContractedEntry` at lines 288–297 is byte-unchanged and still carries its eight pre-existing classes — `templates/ci/` by prefix, `templates/skills/` by prefix, `templates/roles/sdd-documentation.md` by exact match. No mask was added; the non-mutation sweep is green on its own merits. |
| C33 | XC-5 — four independent verification stories; disjoint file sets | PASS | The 16 modified files partition exactly, with no overlap: item 1 = `src/mcp.ts`, `templates/mcp/README.md`, `tests/mcp.test.ts`, `tests/init.test.ts`, `tests/generators/registry.test.ts`, `tests/generators/toml.test.ts`; item 2 = `templates/roles/sdd-documentation.md`, `templates/skills/harny-document/SKILL.md`, `.agents/skills/harny-document/SKILL.md`, `tests/canonical-fidelity.test.ts`, `tests/skills-fidelity.test.ts`; item 3 = `src/feedback.ts`, `specs/archived/feedback-path-hygiene/contract.md`; item 4 = `templates/ci/harny-feedback.yml`, `tests/engine.test.ts`, `.github/workflows/harny-feedback.yml`. 6 + 5 + 2 + 3 = 16. Every contract row above is supported by evidence from a single item's files. |
| C34 | XC-6 — every unamended capability statement still holds; packaged template count still thirty-one | PASS | `git ls-files templates/ \| wc -l` = **31** (CLI-10 holds; no template file created or deleted). CLI-4 re-proved by the byte-identical re-init convergence. CLI-5 holds — the five merge-marked MCP paths were not in the conflict set. TG-3/TG-4 re-proved by the 25-artifact sweep. FC-7's "exactly one workflow, byte-identical across selections" re-proved by C27 (its trigger sentence is amended by this feature, as declared). SL-1…SL-10 unaffected: the skill bijection and divergence sweeps are green with no table edit. `specs/current/` has a zero-line diff — the executor correctly left the amendments to the documentation role. |

## Test Coverage

| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | The quoted new endpoint URL appears exactly once in `src/`, in `src/mcp.ts` (MO-1) | PASS | `tests/mcp.test.ts` — `single-literal check: …` describe; also asserts the owning file path |
| T2 | The quoted **old** endpoint URL appears zero times in `src/` and in `templates/`, via a quoted-string or end-anchored pattern (MO-2) | PASS | `tests/mcp.test.ts` — `no stale /mcp literal survives item 1's endpoint departure (MO-2)`; **proven able to fail** by auditor probe injection, not merely observed green |
| T3 | Fresh JSON and TOML MCP output carries the new endpoint; the unparseable-file warning snippet carries it too (MO-3, MO-4) | PASS | `tests/mcp.test.ts` |
| T4 | A full five-tool `init` writes the new endpoint at all five paths with the correct root key and entry shape (MO-3) | PASS | `tests/init.test.ts` — corroborated by the auditor's own scratch run |
| T5 | Re-running `init` over an unmodified target converges byte-identically at the new value (MO-4, CLI-4) | PASS | `tests/init.test.ts` — corroborated by the auditor's own `diff -r` of a re-`init`ed scratch tree |
| T6 | Each generator's `mcpConfig.entry` carries the new endpoint (MO-3) | PASS | `tests/generators/registry.test.ts` |
| T7 | No generated MCP config contains a credential, `Authorization`, `headers`, `env` key or env-var reference (MO-6) | PASS | `tests/mcp.test.ts`, `tests/init.test.ts` — corroborated by the auditor's scratch-output sweep |
| T8 | The rule's distinctive substring appears in all five generators' `sdd-documentation` artifact, including Codex's decoded `developer_instructions` (GR-5) | PASS | `tests/canonical-fidelity.test.ts` |
| T9 | The same substring is absent from the other four roles' artifacts for the same generator (GR-4) | PASS | `tests/canonical-fidelity.test.ts` |
| T10 | The rule is present in both `.agents/skills/harny-document/SKILL.md` and `templates/skills/harny-document/SKILL.md` (GR-6) | PASS | `tests/skills-fidelity.test.ts` |
| T11 | The exhaustive declared-divergence sweep is green with `DIVERGENCE_TABLE` unedited (GR-9) | PASS | `tests/skills-fidelity.test.ts` |
| T12 | The lengthened role body passes Codex's TOML representability check and Copilot's body-length cap (GR-8) | PASS | `tests/generators/codex.test.ts`, `tests/generators/github-copilot.test.ts` |
| T13 | The rendered workflow declares `pull_request` and a `push` trigger filtered to exactly `main`, for a resolved profile and for an unresolved stack (CI-1) | PASS | `tests/engine.test.ts` |
| T14 | The generated block between the `harny:begin`/`harny:end` markers contains neither `push` nor `on:` (CI-4) | PASS | `tests/engine.test.ts` — correctly declared in the file header as an already-green regression guard, not presented as red-phase work |
| T15 | The workflow is still byte-identical whether one tool or all five are selected (CI-5) | PASS | `tests/engine.test.ts` (existing) |
| T16 | The non-mutation sweep over `templates/` and `.claude/` is green with no allowlist edit (XC-4) | PASS | `tests/canonical-fidelity.test.ts` (existing) |
| T17 | The end-to-end spawned CLI writes the new endpoint, run after `npm run build` (MO-3, `AL-20`) | PASS | `tests/e2e-init.test.ts` — green in the auditor's post-build full-suite run; see finding **DQ-3** on the executor's one non-reproducing failure |

### Manual verification (no automated test)

| ID | Description | Status | Evidence |
|---|---|---|---|
| M1 | Item 3: the three `extensions` sites read side by side make the same four claims (DC-5) | PASS | Auditor read all three (`src/feedback.ts:51–57`, `templates/hooks/run-feedback.mjs:176–180`, `specs/archived/feedback-path-hygiene/contract.md` § Interfaces). Same four claims, differing only in wrapping and voice. See C22. |
| M2 | Item 3: `git diff --stat` shows exactly two files, comment/prose lines only; the runners and the archived feature's other four files byte-unchanged (DC-3, DC-4) | PASS | `src/feedback.ts` +6/−1 (all comment lines), `specs/archived/feedback-path-hygiene/contract.md` +13/−1 (all prose). Neither runner appears in `git status`. The archived feature's `intent.md`, `roadmap.md`, `tasks.md`, `audit.md` are byte-unchanged. |
| M3 | Item 4: `diff` of this repo's regenerated workflow against a fresh scratch `harny init` output is empty (XC-1) | PASS | Re-run independently by the auditor after a clean `npm run build`, into a brand-new scratch directory: **empty diff**. |
| M4 | Item 4: the other seven FC-13 paths are byte-unchanged by this feature (XC-1) | PASS | All seven are tracked; `git status --porcelain` over them is empty. See C29. |
| M5 | Item 2: the two new skill-root bullets are character-for-character identical (GR-6) | PASS | `diff` of the two eight-line blocks is empty; both md5 `b3737d12e84e79df180f2e89b67a3d10`. The only remaining difference between the two files is the pre-existing, declared three-line step-3.3 divergence. |
| M6 | Item 2: `git diff --stat` shows the other four role templates untouched (GR-4) | PASS | `git status --porcelain templates/roles/` lists only `sdd-documentation.md`. |
| M7 | Item 1: the five config files written by a scratch five-tool `init`, read and recorded (MO-3) | PASS | Executor ran `node bin/harness.js init --tools claude-code,cursor,kiro,github-copilot,codex --stack typescript --yes` into a scratch dir on 2026-09-22 (post-`npm run build`). Observed: `.mcp.json` → `{"mcpServers":{"context7":{"type":"http","url":"https://mcp.context7.com/mcp/oauth"}}}`; `.cursor/mcp.json` → `{"mcpServers":{"context7":{"url":"https://mcp.context7.com/mcp/oauth"}}}`; `.vscode/mcp.json` → `{"servers":{"context7":{"type":"http","url":"https://mcp.context7.com/mcp/oauth"}}}`; `.kiro/settings/mcp.json` → `{"mcpServers":{"context7":{"url":"https://mcp.context7.com/mcp/oauth"}}}`; `.codex/config.toml` → `[mcp_servers.context7]\nurl = "https://mcp.context7.com/mcp/oauth"`. All five match contract.md MO-3 exactly. **Auditor re-performed this run independently (fresh build, fresh scratch dir, 85 files written) and reproduced all five observations byte for byte — not taken on faith.** |
| M8 | Cross: reverting any one phase's diff leaves the other three phases' tests green (XC-5) | PASS | Verified by file-set partition rather than by four revert runs: the four items' 16 files are disjoint (C33), each item's new tests read only its own item's files, and no shared module sits between them (`src/engine.ts` and `src/generators/*` — the only plausible couplers — are byte-unchanged). |
| M9 | Cross: `package.json`, `tests/packaging.test.ts`, `plan.md` and `CHANGELOG.md` byte-unchanged by the executor (XC-2) | PASS | `git status --porcelain` over `package.json`, `tests/packaging.test.ts`, `CHANGELOG.md`, `src/engine.ts`, `src/generators/`, `specs/current/`, `.claude/settings.json`, `.sdd/` is empty. `.claude/agents/sdd-documentation.md` is untouched (mtime 2026-09-08, and it carries zero occurrences of the rule) exactly as contract § "Questions resolved" item 1 settled. |
| M10 | Item 4 provenance: who applied the dogfood regeneration and under what authorization (Task 4.7) | PASS | Applied by the `sdd-executor` role (`harny-implement`) on 2026-09-22, under the Phase-4 authorization the human granted at the gate (contract.md § "Questions resolved" item 2, on `feedback-path-hygiene`'s terms). Procedure: `npm run build`, then `node bin/harness.js init --tools claude-code --stack typescript --yes <scratch-dir>` (run twice, into two separate scratch directories), then `cp <scratch>/.github/workflows/harny-feedback.yml .github/workflows/harny-feedback.yml` — never hand-edited. `diff` against both scratch runs after the copy showed zero difference (byte-identical); a second independent scratch `init` (a fresh directory, run after the copy) also diffed byte-identical against the copied repo file. The other seven FC-13 paths were confirmed byte-unchanged via `git status --porcelain`. **Auditor accepted the authorization as properly recorded and re-proved the byte-identity claim from a third, independent scratch `init` of its own.** |

## `harny-standards` compliance (S1–S7)

All seven checked against `AGENTS.md` § "Coding standards" (read live; not restated here).

| Standard | Result | Evidence |
|---|---|---|
| S1 — TypeScript/ESM, `nodenext`, `.js` specifiers, `node:` prefix | PASS | No import was added to `src/`. The new test code uses `.js`-suffixed dynamic imports (`'../src/engine.js'`, `'../src/feedback.js'`, `'../src/generators/codex.js'`, `'./helpers/toml-decode.js'`) and the already-`node:`-prefixed `fs`/`path` bindings at the top of each file. `npm run typecheck` and `npm run build` both exit 0. |
| S2 — `HarnessError` only; exit-code map owned by `src/errors.ts` | N/A | No error path is added, changed, or thrown anywhere in this feature. |
| S3 — determinism, path containment, single trailing newline | PASS | Re-`init` over an initialized scratch tree converges byte-identically (`diff -r` empty). All eight edited shipped/canonical files end in exactly one `\n`. No path logic changed. |
| S4 — no dependency without an explicit contract line | PASS | `package.json` byte-unchanged; no lockfile change; no new external import. |
| S5 — shared constants imported, never re-literalled | PASS | The endpoint is defined once in `src/mcp.ts` and imported by all five generators, unchanged. `tests/mcp.test.ts`'s single-literal check enforces it at the new value, and `src/generators/` has a zero-line diff. |
| S6 — vitest; `tests/` mirrors `src/`; `Spec:`/`Covers:` header; **contract ids never in test names**; offline default | **PARTIAL** | Headers: every one of the five touched test files gained a correct `Spec:` / `Covers:` block naming the feature, the contract ids, the roadmap steps and the tasks — exemplary, including honest red-state narration and an explicit "declared regression guard" label for the already-green CI-4 assertion. Offline default: preserved (no new network access). **Violation:** four new `describe` titles embed contract ids — `…(GR-5) (dogfood-quick-fixes)`, `…(GR-4) (dogfood-quick-fixes)`, `…(GR-6) (dogfood-quick-fixes)`, `…(CI-1) (dogfood-quick-fixes)` and `…departure (MO-2)`. See finding **DQ-1**. All new `it` titles are id-free, which is what `tasks.md` § Notes explicitly instructed. |
| S7 — tool-neutral content names behavior first, tools as attributed examples | PASS | The new role/skill bullet names no coding-agent tool; it names `git`, which contract § "Four properties" item 3 pre-authorizes as the version-control system the surrounding steps already assume (and which `templates/skills/harny-sync/SKILL.md` already names). `templates/mcp/README.md`'s rewritten passages all lead with behavior and name tools only afterward as attributed examples; the five-file table is unchanged. The CI header paragraph describes the trigger behavior and names GitHub only implicitly through the file's existing Actions context. |

## `harny-feedback` verification (audit step 6a)

- **Per-turn hook fired.** `.claude/settings.json` wires both halves: a `PostToolUse` matcher on `Edit|Write` invoking `run-feedback.mjs accumulate`, and a `Stop` hook invoking `run-feedback.mjs run` with the two mapped commands (`eslint`, `tsc`). `.sdd/feedback/.turns/` is empty apart from its `.gitignore`, which is the **expected post-run state** — the runner deletes each turn file after consuming it (`.sdd/feedback/run-feedback.mjs:300`), so an empty directory is evidence of completed turns, not of a hook that never fired. The directory's mtime is today. Not a gap.
- **Findings heeded.** The only mapped command that can run in this repo is `tsc` (there is no ESLint config, so the `eslint` probe correctly skips). `npm run typecheck` exits 0, so there is no outstanding hook finding to heed.
- **CI workflow present.** `.github/workflows/harny-feedback.yml` exists, is byte-identical to generator output, and is itself one of this feature's deliverables.
- **Latest CI run green, but stale — and that is the defect item 4 fixes.** `gh run list` returns exactly **one** `harny-feedback` run in this repository's entire history: `34853159815`, 2026-09-14, event `pull_request`, branch `ship/agent-feedback-controls`, conclusion **success**. Reading its log, the runner's trailing summary is `harny-feedback: 1 of 2 command(s) ran, 1 skipped.` — **N = 1**, so this is a genuine green, not a zero-run false green. However, that run predates this feature by four shipped features, and **no CI run covers this change**, because every one of those four shipped by a direct push to `main`, which the pre-feature `on: pull_request`-only trigger ignored. This is not a new finding: it is precisely `feedback-path-hygiene`'s **AL-5**, the motivating evidence for item 4, and it is carried as reservation **SC17 / R17** below. It resolves itself on the first push to `main` after this feature lands.

## Audit Log

| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-22 | `sdd-auditor` (`harny-audit`) | **DQ-1** — `AGENTS.md` S6 says "contract ids never appear in test names", but four new `describe` titles embed them: `(GR-5)` and `(GR-4)` in `tests/canonical-fidelity.test.ts`, `(GR-6)` in `tests/skills-fidelity.test.ts`, `(CI-1)` in `tests/engine.test.ts`, and `(MO-2)` in `tests/mcp.test.ts`. The new `it` titles are all id-free. | LOW | Not blocking. This is a continuation of the standing **AL-4** finding (`tasks.md` § Notes names it as such and instructed only that no *new* id-bearing `it` titles be introduced — an instruction the executor followed exactly). Ids also live correctly in each file's `Spec:`/`Covers:` header, so nothing is lost by stripping them from the `describe` titles. Recommend folding into whatever pass eventually closes AL-4 across the suite; fixing it here alone would leave the repo inconsistent. |
| 2026-09-22 | `sdd-auditor` (`harny-audit`) | **DQ-2** — one pre-departure `https://mcp.context7.com/mcp` literal remains under `tests/`, at `tests/mcp.test.ts:28`, inside the red-phase narration in that file's `Spec:`/`Covers:` header. `tasks.md` Task 1.9's stated aim was "no stale endpoint remains anywhere in `tests/`". | LOW | Not a guarantee violation: **MO-2** scopes its zero-occurrence requirement to `src/` and `templates/` only, and both are clean. The remaining occurrence is a historical statement ("`src/mcp.ts` still holds the pre-departure `…/mcp` value at red time") that is still true and is load-bearing for explaining why the red phase was genuinely red. Recorded only because a future maintainer grepping `tests/` for the old endpoint will hit it and must not mistake it for a live fixture. No action recommended. |
| 2026-09-22 | `sdd-auditor` (`harny-audit`) | **DQ-3** — the executor observed a single, non-reproducing `tests/e2e-init.test.ts` failure under full-suite parallelism, which passed in isolation and on two reruns. No existing reservation covers this: `cli-init.md` **AL-20** covers the *stale*-`dist/` coupling, not a race on it. | LOW | Not blocking, and not caused by this feature — item 1 changes one constant's value and adds no e2e test. The auditor's own full-suite run (634 tests) was green on `tests/e2e-init.test.ts`. A plausible mechanism, worth naming: `tests/e2e-init.test.ts` spawns `bin/harness.js`, which imports `dist/`; this feature's own `tasks.md` sequences `npm run build` (Tasks 1.10, 5.2) into the same working session, so a build overlapping a parallel e2e run can have the spawned CLI read a partially-written `dist/`. That is AL-20's coupling in its race form. Recommend recording as a new LOW reservation against `cli-init` (alongside AL-20) for the documentation role to pick up, rather than fixing here — the fix (a `pretest` build script, or serializing the e2e file) needs a `package.json` change this feature is forbidden to make. |
| 2026-09-22 | `sdd-auditor` (`harny-audit`) | **`R-OAuth` confirmed, carried** — `/mcp/oauth` is documented as gated on a client implementing the MCP OAuth specification, and the generated configuration was never loaded into a live install of any of the five tools. The auditor additionally could not re-fetch Context7's `docs/howto/oauth.mdx` / `docs/resources/all-clients.mdx` in this session (the Context7 MCP tools were not exposed to this audit thread), so the endpoint's documented gating rests on the architect's recorded 2026-09-22 verification rather than on an independent auditor re-fetch. | MEDIUM (human-gated) | Carry unchanged. This is the same class as the standing `AL-30` (Cursor/Kiro/Copilot) and `CG-1`/`O4` (Codex) per-tool-fact reservations this repo already carries, and the human took the trade-off knowingly on the strength of `/mcp` observably failing in practice. What *is* independently verified is everything harny controls: the value is correct, it reaches all five tools at their contracted paths and shapes, no credential accompanies it, and the remedy for a tool that cannot do OAuth is a one-line hand edit to `/mcp`. Register in `_index.md` § Open reservations as contract § Amendments directs. |
| 2026-09-22 | `sdd-auditor` (`harny-audit`) | **`SC17` / `R17` confirmed, carried** — no `harny-feedback` CI run covers this feature. The repository's only run ever is `34853159815` (2026-09-14, `pull_request`, `success`, `1 of 2 command(s) ran, 1 skipped`). | INFO (self-resolving) | Carry unchanged, exactly as contract § "Questions resolved" item 3 pre-declared. The absence of a run on `main` **is** the defect item 4 fixes, and is the evidence `feedback-path-hygiene`'s AL-5 could not produce. It resolves on the first push to `main` after this feature lands. The human should confirm that first run is green — if it is not, the failure will be about this repo's own mapped commands, not about the trigger, which is verified structurally here. |
| 2026-09-22 | `sdd-auditor` (`harny-audit`) | **No contract violation found in any of the four items.** All 34 contract rows PASS, all 20 requirement rows PASS or carried, all 17 test-coverage rows PASS, all 10 manual rows PASS. Three highest-risk traps the roadmap's own Risk Assessment named were each checked adversarially and each held: (1) the MO-2 stale-literal check was proven able to fail by probe injection, not merely observed green; (2) the `git mv` carve-out is present in all three landing sites, so `harny-sync` archive mode is intact; (3) neither `isContractedEntry` nor `DIVERGENCE_TABLE` was widened — both are byte-unchanged, and the sweeps are green on their own merits. | INFO | No action. |

## Final Verdict

**Status**: APPROVED WITH RESERVATIONS

**Summary**: All four items fully satisfy their contracts — every one of the 34 behavior
guarantees and 20 success criteria is met or is a pre-declared, confirmed carried
reservation, re-derived independently rather than accepted from the executor's record.
The two reservations (`R-OAuth`, `SC17`) are exactly the two the spec pre-declared and
the human already accepted at the gate; the three new findings are all LOW and none
touches a guarantee.

**Per-item verdicts** (each independent; a FAIL here does not implicate the others):

| Item | Verdict | Notes |
|---|---|---|
| 1 — Context7 `/mcp/oauth` | **APPROVED** (with `R-OAuth` carried) | MO-1…MO-8 all PASS. One literal, one edit, five tools — verified end to end against a real five-tool scratch `init` on a freshly built `dist/`. The prefix trap MO-2 warns about is genuinely avoided: the end-anchored sweep was proven capable of failing. No credential anywhere. `R-OAuth` carried unchanged. |
| 2 — never commit or push | **APPROVED** | GR-1…GR-9 all PASS. The bullet is byte-verbatim against the contract in the role body, and byte-identical between the two skill roots (md5-matched). The `git mv` carve-out is present in all three sites, so `harny-sync` archive mode is intact. Exactly one role gains it — confirmed at source *and* across all 25 generated role artifacts. `DIVERGENCE_TABLE` untouched. |
| 3 — AL-11 wording | **APPROVED** | DC-1…DC-5 all PASS. The correction note sits after A1's blockquote as its own block, never inside it; PH-6, the Error Handling rows, the `## Post-audit amendment A1` section and every audit-log row are byte-unchanged, and the archived feature's other four files do not appear in `git status` at all. Zero behavior change: both diffs are comment/prose only, both runners untouched, typecheck clean. **AL-11 is closed.** |
| 4 — CI push-to-`main` trigger | **APPROVED** (with `SC17` carried) | CI-1…CI-6 and XC-1 all PASS. `on:` parses to `{pull_request: null, push: {branches: ['main']}}`, sits in the canonical region, and the generated block is byte-identical to its pre-feature self — the change really did stay outside the markers, with `src/engine.ts` untouched. FC-13 byte-identity re-proved from a third, independent scratch `init`. `SC17` carried as pre-declared. |

**Critical Issues** (must fix before merge):

- None.

**Warnings** (should fix, not blocking):

- None at MEDIUM or above attributable to this feature. `R-OAuth` is MEDIUM but is a
  human-gated, knowingly-accepted trade-off, not a defect to fix.

**Recommendations** (nice to have):

- **DQ-1 (LOW, S6).** Strip the contract ids from the four new `describe` titles when
  the standing **AL-4** cleanup finally happens across the suite. Fixing them here
  alone would make this feature's test files the only inconsistent ones. The ids are
  already recorded correctly in each file's `Spec:`/`Covers:` header, so nothing is
  lost.
- **DQ-3 (LOW, new).** Record the non-reproducing `tests/e2e-init.test.ts`
  parallelism failure as a new LOW reservation against `cli-init`, adjacent to
  **AL-20** — the two share the `bin/harness.js` → `dist/` coupling, AL-20 in its
  staleness form and this in its race form. The real remedy (a `pretest` build script,
  or serializing that one file) needs a `package.json` change, which this feature is
  forbidden to make.
- **DQ-2 (LOW, informational only).** No action. The surviving old-endpoint literal in
  `tests/mcp.test.ts`'s header is a true historical statement, and MO-2 does not scope
  `tests/`.
- **Post-merge, for the human.** Watch the first `harny-feedback` run on the push to
  `main` that lands this feature. Its trailing `N of 2 command(s) ran` line should read
  `N = 1` (ESLint probe-skips in this repo, `tsc` runs), matching run `34853159815`'s
  shape. That single observation closes both `SC17` and `feedback-path-hygiene`'s
  long-open **AL-5**.

**Expected carried reservations** (pre-declared by the spec, for the auditor to confirm
or reject rather than discover) — **both CONFIRMED**:

- **`R-OAuth`** — MEDIUM (human-gated). **CONFIRMED, carried.** `/mcp/oauth` is
  documented as gated on a client implementing the MCP OAuth specification, and the
  generated configuration was never loaded into a live install of any of the five
  tools. Same class as the standing `AL-30` (Cursor/Kiro/Copilot) and `CG-1`/`O4`
  (Codex) reservations. The human took this trade-off knowingly, on the strength of
  `/mcp` observably not working in practice; the remedy for a tool that cannot do OAuth
  is a one-line hand edit of that tool's config back to `/mcp`. Auditor's added note:
  the Context7 documentation was not re-fetched in this audit session, so the
  vendor-side fact rests on the architect's recorded 2026-09-22 verification — which is
  itself part of what this reservation already covers. Everything on harny's own side
  of the boundary *is* independently verified.
- **SC17 / R17** — **CONFIRMED, carried.** The green `harny-feedback` run on a push to
  `main` can only be observed after this feature is pushed. Auditor confirmed the
  premise directly: the repository has exactly one `harny-feedback` run in its entire
  history (`34853159815`, 2026-09-14, `pull_request`, green, `1 of 2 command(s) ran`),
  and nothing since. It is the evidence `feedback-path-hygiene`'s AL-5 could not
  produce, and it is the reason item 4 exists.

**Closed by this feature**:

- `specs/archived/feedback-path-hygiene/audit.md` **AL-11** (LOW) — **CONFIRMED
  CLOSED** by item 3, per that audit's own recommended resolution ("Documentation/
  archive pass: align the wording with the amended PH-6"). All three `extensions` sites
  now make the same four claims, and A1's own record was not rewritten to do it.

**ADRs earned** (written by `harny-adr` after the archive move, not by the executor) —
both confirmed as correctly identified:

| ADR | Title | Capability | Triggers |
|---|---|---|---|
| 0029 | Context7 `/mcp/oauth` for all five tools, no per-tool fallback | cli-init | (a) named options; (c) diverges from `context7-mcp`'s shipped fact and Context7's per-client examples; (d) accepts an unverifiable claim |
| 0030 | Hardcode `main` in the canonical CI push trigger rather than deriving the default branch | feedback-controls | (a) hardcode vs derive vs prompt; (b) constrains every scaffolded repo |

**Candidates deliberately not promoted to ADRs** — the auditor agrees with both
exclusions: item 2's scoping to `sdd-documentation` alone (a scope decision, recorded
in intent.md § Non-Goals) and its two-layer placement (an application of ADR 0013's
already-recorded accepted cost, not a new decision); item 3 (a text correction
containing no decision).

## Executor's implementation notes (recorded per tasks.md's requirement to log results in audit.md)

- **Task 1.11 — MO-3 scratch verification.** See row M7 above.
- **Task 4.7 — Item 4 dogfood-regeneration provenance.** See row M10 above.
- **Task 5.8 — ADRs earned, for `harny-adr` (written after the archive move, not by the
  executor):**
  - **ADR 0029 — Context7 `/mcp/oauth` for all five tools.** Capability `cli-init`.
    Triggers: (a) a choice between two named viable options (`/mcp` vs `/mcp/oauth`, and
    per-tool fallback vs uniform); (c) diverges from `context7-mcp`'s shipped endpoint
    fact and from Context7's own per-client examples; (d) accepts a known unverifiable
    claim (no live tool was tested against the OAuth endpoint).
  - **ADR 0030 — Hardcode `main` in the CI push trigger.** Capability `feedback-controls`.
    Triggers: (a) hardcode vs derive-from-git vs prompt; (b) constrains every repo harny
    will ever scaffold.
  - **Deliberately not promoted:** item 2's scoping ("only `sdd-documentation`" — a scope
    decision already recorded in intent.md § Non-Goals; the two-layer placement applies
    ADR 0013's already-recorded accepted cost rather than making a new decision), and item
    3 (a text correction with no decision in it at all).
- **Task 5.9 — Carried reservations for the audit:**
  - **`R-OAuth`** (MEDIUM, human-gated) — `/mcp/oauth` is documented as gated on a client
    implementing the MCP OAuth specification and was never exercised against a live
    install of any of the five tools; same `AL-30` / `CG-1` class as this repo's other
    per-tool facts.
  - **SC17** — a green `harny-feedback` run on a push to `main` is a post-merge
    observation; it cannot exist before this feature is itself pushed, exactly as
    § "Questions resolved at the human gate" item 3 pre-declares.
