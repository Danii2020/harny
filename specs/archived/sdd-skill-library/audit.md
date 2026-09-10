# Audit: sdd-skill-library

> **Audited 2026-09-08 / 2026-09-09 by `sdd-auditor`.** Rows below carry real status and
> evidence. Traceability is reflexive: every `Rn` cites an `intent.md` goal or success
> criterion, every `Cn` cites a `contract.md` guarantee or interface section, every `Tn`
> cites the contract item it verifies.
>
> **This feature's deliverable is content and layout** — Markdown, YAML frontmatter,
> symlinks, a directory structure, a `.gitignore` amendment — with exactly one executable
> test file. The Test Coverage section therefore mixes **executable tests** (T1–T6, from
> `tests/skill-library.test.ts`) with **structural verification checks** (T7–T19), the
> same split `specs/archived/canonical-role-templates/audit.md` used for a content feature.
>
> **Auditor's verification channel.** Every toolchain result below was produced by the
> auditor running the command directly, not read from `tasks.md`. Every hash was
> recomputed. The Phase-2 reconciliation table was re-derived independently (see T10 and
> AL-S6), not accepted from Task 2.7. Two defects were confirmed by **mutation-style
> checks** — deliberately breaking the thing the guard is supposed to catch and observing
> whether the guard fires.

## Carried reservations

| ID | Reservation | Severity | Status |
|---|---|---|---|
| CR-1 | **Live discovery of symlinked skills (V4) and warning-free `skills:` preloading (V9).** Originally carried as fully unverifiable in-session. | **LOW** (was MEDIUM) — **substantially closed 2026-09-08/09; a narrow residue remains** | See § "CR-1 — what is now confirmed" below. Discovery **and** warning-free preloading through the symlink are now confirmed by direct in-session observation. What remains open is coverage breadth (2 of 8 skills, 1 of 5 roles observed) and fresh-clone behavior, not the mechanism itself. |
| CR-2 | **The `.agents/skills/` canonical location is not read by Claude Code at all (V3).** The entire live pipeline depends on the symlink bridge; if the bridge is lost, the repo looks complete and has no working pipeline. | LOW | **Still carried, unchanged.** Mitigated by three independent defenses (tracked symlinks per Gu 19 — auditor confirmed all eight stage at mode `120000`; the mandatory missing-skill guard per Gu 4 — present in all five agent bodies; and T1/T2). Recorded so a future reader understands the structural dependency. |

### CR-1 — what is now confirmed, and what remains open

**Confirmed by direct observation, in-session, with no restart:**

1. **Discovery (V4).** The conductor observed all eight `harny-*` skills appearing in this
   session's own list of available skills, surfaced automatically, with descriptions
   matching the actual `.agents/skills/harny-*/SKILL.md` content — in the same session that
   created the symlinks, with no restart.
2. **Warning-free `skills:` preloading (V9) — the half CR-1 was written to protect.** This
   audit itself is the test. The auditor ran as an `sdd-auditor` subagent launched from
   `.claude/agents/sdd-auditor.md`, whose frontmatter declares `skills: [harny-audit,
   harny-standards]`. Both skills' **full bodies were preloaded into the subagent's context
   at startup**, and **no "skill not found" warning was emitted**. The preload announced its
   own base directory as `/Users/danielerazo/python/harny/.claude/skills/harny-audit` and
   `.../harny-standards` — i.e. the **symlink** paths, not the `.agents/` paths.
3. **The preloaded content is the `.agents/` file, not a stale cache.** The preloaded bodies
   are identical to `.agents/skills/harny-audit/SKILL.md` lines 23–124 and
   `.agents/skills/harny-standards/SKILL.md` lines 22–75, including strings that exist
   nowhere else in the repo — e.g. harny-standards' *"including S7 — no tool-specific
   mechanic named as the only possibility in tool-neutral content"* and harny-audit's
   *"**Do NOT fix issues yourself. Report them.** `harny-implement` fixes them."*
4. **Resolution is byte-identical through the bridge.** For all eight skills,
   `shasum -a 256 .claude/skills/<n>/SKILL.md` equals `shasum -a 256
   .agents/skills/<n>/SKILL.md`. All eight link texts are relative
   (`../../.agents/skills/<n>`).

Together, (2) and (3) are strictly stronger than what `tasks.md` § Blocked Items assumed was
checkable only after a restart: they close its ordered checks (1) *and* (2) *and* (3)
("the preloaded content is the `.agents/` file, verified by a string unique to it").

**What genuinely remains open, stated precisely rather than rounded up:**

- **Breadth, not mechanism.** Only 2 of the 8 skills (`harny-audit`, `harny-standards`) and
  1 of the 5 roles (`sdd-auditor`) were observed preloading. The other six skills and four
  roles are inferred by symmetry — they use the identical mechanism and the identical
  symlink shape, but were not individually observed.
- **The auditor could not widen this itself.** This audit environment grants
  `Glob, Grep, Read, Write, Edit, Bash` — there is **no `Agent`/`Task` tool**, so the
  auditor cannot launch a subagent to exercise the other four roles. This is an environment
  limit, stated rather than worked around.
- **Fresh-clone / restart durability is verified structurally, not observed.** All eight
  symlinks stage at git mode `120000` (auditor confirmed via a throwaway index; V12), so a
  clone with `core.symlinks` true will reconstruct them — but no actual fresh clone was
  performed, and no restarted session was observed.

**Recommended `tasks.md` status change (NOT applied by the auditor — see AL-S9).** Task 5.7
should move from `[!]` (blocked, cannot be performed in this session) to `[~]` (in progress
— materially verified in-session), with its residual scope narrowed to: *observe the
remaining four roles launch warning-free, and confirm the bridge after a genuine fresh
clone.* The fallback (invert the bridge) is now very unlikely to be needed.

## Requirements Checklist

| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | Each of the five `.claude/agents/sdd-*.md` bodies is ≤ 25 lines, and their combined length is under 200 (from 646) | intent.md G1 / SC1 | **PASS** | Auditor-measured bodies (total lines minus frontmatter close): architect 15, auditor 15, documentation 16, executor 15, test-writer 15 — all ≤ 25. Combined file length `cat .claude/agents/sdd-*.md \| wc -l` = **148**, down from 646. |
| R2 | A line-level reconciliation table accounts for every instruction in the five pre-change agent files: placed in exactly one skill, or a justified drop. Only X1/X2/X3 are permitted deviations | intent.md G1 / SC2 | **PARTIAL** | Re-derived independently (T10). Arithmetic closes perfectly: 0 duplicated lines, 0 out-of-range lines, endpoints match B2's counts exactly; 11 single unaccounted lines, all corroborated as blank/`---` separators. **But** the pre-change *content* is unrecoverable (AL-S1), so a true line-by-line content re-derivation is impossible from B2 as recorded, and a probable **fourth, undeclared deviation** was found (AL-S4). |
| R3 | All eight skills exist and satisfy the shape contract: `harny-{propose,test,implement,audit,document,sync,adr,standards}` | intent.md G1, G2 / SC3 | **PASS** | All eight `.agents/skills/harny-*/SKILL.md` exist. Each carries the five required body sections in order (`# <Title>` → `## When to use this` → `## Inputs` → `## Steps` → `## Guardrails`), verified by reading all eight in full. |
| R4 | Every `harny-*/SKILL.md` frontmatter uses only the six portable Agent Skills keys; no Claude-Code-only key appears; every `description` is within 1,536 characters | intent.md G2 / SC4 | **PASS** | Enforced executably (T4, T5) and re-measured by the auditor: descriptions are 491–735 chars (propose 491, audit 525, standards 532, implement 546, test 557, adr 621, document 639, sync 735) — max 735, well under 1,536. No `disable-model-invocation`, `context`, `agent`, `paths`, `model`, `when_to_use` anywhere. |
| R5 | Content lives only at `.agents/skills/harny-*/SKILL.md`; every `.claude/skills/harny-*` is a symlink to its namesake; `sdd-conductor` and `high-value-tests` remain unchanged regular directories | intent.md G3 / SC5 | **PASS** | All 8 `.claude/skills/harny-*` are symlinks (`lstat`), all link texts relative `../../.agents/skills/<n>`, all resolve to their namesake, all read byte-identical through the bridge. `sdd-conductor` and `high-value-tests` are regular directories, both SKILL.md hashes matching B3. |
| R6 | `contract.md` § "Verified facts" carries a first-party source and the date `2026-09-08` for every pinned path, key, limit and behavior | intent.md G3 / SC6 | **PASS** | 15 rows V1–V15, every one carrying a Source cell and `2026-09-08`. V10–V12 correctly disclosed as sandbox-executed observations rather than doc citations. V14/V15 independently re-checked against `src/generators/codex.ts` — accurate. |
| R7 | `harny-sync` documents both modes and all three triggers, and the wiring is present in the artifacts that fire it (propose Step 0; the documentation hand-off; direct human invocation) | intent.md G4 / SC7 | **PASS** | `harny-sync/SKILL.md` documents both modes with full procedures and all three triggers under § "When to use this". Wiring confirmed at both ends: `harny-propose/SKILL.md` Step 0 invokes lookup and binds its brief; `harny-document/SKILL.md` Step 3 invokes archive; both name direct human invocation. |
| R8 | After an archive run: `specs/<feature>/` is gone, `specs/archived/<feature>/` holds all five files, and every touched capability doc names the feature with its `Shipped:` date | intent.md G4 / SC8 | **PARTIAL** | True for all four migrated features: no `specs/canonical-role-templates/` etc. remain; each `specs/archived/<f>/` holds exactly five files; every capability doc's § Contributing features names them with the correct `Shipped:` dates (2026-07-26 / 2026-07-30 / 2026-08-30 / 2026-09-02). **But** the move was performed by `mv` in Phase 3.2, not *by* `harny-sync`; the skill-driven path is unexercised until Task 5.9. |
| R9 | `harny-adr` produces at least one conforming ADR at the pinned location and registers each in the index | intent.md G5 / SC9 | **PARTIAL** | The skill and its bundled `adr-template.md` conform exactly to the contract's template (all 6 header fields, 4 body sections in order), and `_index.md` has the § Decisions registry table ready. But `find specs -type d -name decisions` returns nothing — **no ADR has been produced yet**. Deferred to Task 5.9; correctly so (ADRs are written after the archive move), but SC9 is not yet demonstrated. |
| R10 | Exactly one conventions source of truth; no second copy of its rules under `.agents/skills/` or `.claude/agents/`; it covers all six conventions from intent problem-statement item 5; referenced by both executor and auditor | intent.md G6 / SC10 | **PARTIAL** | `AGENTS.md` § "Coding standards" exists and covers S1–S7 (a superset of the six named conventions), each as a rule plus its establishing artifact. Referenced by both roles via `skills:` preload. **But** `harny-standards/SKILL.md:52–58` glosses S1–S6 with one-line paraphrases — a partial second copy, and exactly the drift vector G6 exists to close (AL-S5). |
| R11 | `specs/current/_index.md` exists, is ≤ 150 lines, lists every capability with path and contributing features, and has a keyword→capability section; `contract.md` records why this taxonomy | intent.md G7 / SC11 | **PASS** | 103 lines ≤ 150. All five required tables present. § Keyword lookup has **38 rows**, ≥ 20 required. `contract.md` § "The capability taxonomy, and why this one" records the derivation, the three cross-checks, and three named rejected alternatives. |
| R12 | Every capability doc is populated with real, cited current-truth statements; none is a placeholder | intent.md G7 / SC12 | **PASS** | All five docs follow the schema exactly (Purpose / Current behavior / Invariants / Open reservations / Contributing features / Related ADRs). 50 statements total (SW-1..9, PR-1..9, SL-1..10, CLI-1..11, TG-1..11), every one carrying provenance. `grep -rn "TODO\|TBD\|placeholder\|<fill\|XXX" specs/current/` → none. Spot-checked citations resolve (T15); one sub-citation is wrong (AL-S7). |
| R13 | All 20 migrated files are byte-identical across the move; both multi-pass audit markers survive | intent.md G8 / SC13 | **PASS** | Auditor recomputed SHA-256 for all 20 files against B1: **20 checked, 0 mismatches**. `AUDIT PASS 2` present in `specs/archived/cli-skeleton/audit.md`; `Final Verdict — pass 2` present in `specs/archived/cursor-kiro-copilot-generators/audit.md`. All four `Shipped:` headers intact in their original inconsistent formatting (`Shipped: 2026-07-26` bare vs `**Shipped: …**` bolded) — correctly not normalized. |
| R14 | `.claude/skills/sdd-conductor/SKILL.md` byte-identical; the five agents' `name:` unchanged; `templates/`, `src/`, `bin/`, `package.json` unmodified | intent.md G9 / SC14 | **PASS** | Conductor SHA-256 `839824dc…fe766` == B3. B3 combined 34-file manifest hash `a813df6f…ae497` == B3 exactly. `git diff --stat package.json package-lock.json` empty. All five `name:` values unchanged (`sdd-architect`, `sdd-test-writer`, `sdd-executor`, `sdd-auditor`, `sdd-documentation`). |
| R15 | A version-control decision is stated in `contract.md` and applied; a fresh clone yields a working pipeline with no bootstrap step | intent.md G10 / SC15 | **PARTIAL** | Decision stated (§ State Changes) and applied exactly: `.gitignore` diff matches the pinned pattern set verbatim. Tracked: `specs/current/` (6), `specs/archived/` (21), `.agents/skills/` (10), 8 symlinks at mode `120000`. Ignored: in-flight specs, `.claude/agents/`, `.claude/settings.local.json`, both untouched skills, `plan.md`, `CLAUDE.md`. **But** `.claude/agents/*.md` stay untracked, so a fresh clone gets the skill library and no subagents — the contract's "yields a working pipeline with **no bootstrap step**" is overstated (AL-S8). |
| R16 | `contract.md` carries a **SUPERSEDES** section naming the three superseded artifacts, scoping the supersession to the live pipeline, and naming the reconvergence follow-up | intent.md G11 / SC16 | **PASS** | § SUPERSEDES present with the four-row in-scope/out-of-scope table, explicit live-pipeline-only scoping, the accepted consequence, and the named follow-up `templates-skill-library-parity`. Applied in `AGENTS.md` (hunk at line 49) which states the rule and names the follow-up at the point a reader notices the divergence. `templates/roles/sdd-documentation.md` correctly left divergent (inside the byte-identical B3 manifest). |
| R17 | `npm run typecheck` and `npm test` pass, including `tests/packaging.test.ts` unchanged | intent.md G9 / SC17 | **PASS** | Auditor-run: `npm run typecheck` → exit 0, 0 errors. `npm test` → **21/21 files, 275/275 tests passing**, offline. `npm pack --dry-run` → 0 entries matching `specs/` or `.agents/`. `tests/packaging.test.ts` byte-identical (untouched in `git status`). |
| R18 | This feature's own five spec files satisfy the traceability rules and `specs/sdd-skill-library/` is archivable by `harny-sync` on approval | intent.md G12 / SC18 | **PARTIAL** | Traceability holds: `contract.md` cites `(Gn)` per section, `tasks.md` cites roadmap steps and `Gu n`, this `audit.md` cites intent/contract per row. Archive preconditions are otherwise satisfiable, but the `Shipped:` header does not yet exist and archivability is unexercised until Task 5.9 — and this audit's verdict (see below) blocks that step. |
| R19 | No non-goal was implemented: no `templates/` change, no generator change, no conductor rewrite, no `specifications/` directory, no new dependency, no CLI subcommand, no ADR backfill, no rewrite of the ~92 stale citations, no `high-value-tests` move | intent.md Non-Goals | **PASS** | `git status --porcelain` shows exactly three modified tracked files (`.gitignore`, `AGENTS.md`, `tests/canonical-fidelity.test.ts`) and the contracted new paths — nothing else. `templates/`, `src/`, `bin/`, `package.json`, `package-lock.json` inside the matching B3 manifest hash. No `specifications/` directory. No `decisions/` directory anywhere (no backfill). `high-value-tests` unmoved and byte-identical. Archived artifacts unedited (B1 all match). |
| R20 | The five contradictions surfaced in `intent.md` are each resolved as the human decided, not silently re-litigated | intent.md Constraints § Contradictions | **PASS** | (1) archive supersession → § SUPERSEDES + `AGENTS.md:49` edit; (2) un-ignore the knowledge base → `specs/*` + two `!` re-inclusions, verified live; (3) track the bridge → chosen over a bootstrap, all 8 symlinks stage at `120000`; (4) by-name skill reference → X2 applied, `harny-test` says "run the `high-value-tests` skill", no `.claude/skills/high-value-tests/SKILL.md` path anywhere under `.agents/skills/`; (5) extend `AGENTS.md` rather than add a rival → § "Coding standards" appended, no rival document created. |

## Contract Compliance

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | Guarantee 1 — Canonical-single-source: every skill body exists exactly once, at `.agents/skills/<name>/SKILL.md`; no copy under `.claude/skills/` | **PASS** | `find .agents/skills -type f` → exactly 10 files (README + 8 SKILL.md + adr-template). `ls -la .claude/skills/` shows 8 symlinks and 2 unrelated regular directories; no `harny-*` regular directory, no duplicated body. Note the *executable* guard for this (T3) is a tautology — see AL-S2 — so this row rests on auditor inspection plus T2, not on T3. |
| C2 | Guarantee 2 — Bridge bijection: the two sets are equal; every symlink is relative and resolves to its namesake | **PASS** | Both sets are `{adr, audit, document, implement, propose, standards, sync, test}`. `readlink` on each → `../../.agents/skills/<n>` (relative). `realpath` equality confirmed for all 8, plus SHA-256 equality of `SKILL.md` read through each path. |
| C3 | Guarantee 3 — Portable frontmatter: only the six V5 keys; every `description` non-empty and ≤ 1,536 chars | **PASS** | Executable (T4, T5, green) plus auditor re-measurement: max description 735 chars (`harny-sync`); every skill declares only `name`/`description`/`license`/`compatibility`/`allowed-tools`/`metadata` (`harny-standards` omits `allowed-tools`, which is permitted). |
| C4 | Guarantee 4 — Thin agents: body ≤ 25 lines, a `skills:` list, and the mandatory "If a skill is missing" guard in **all five** | **PASS** | Bodies 15/15/16/15/15. `grep -c "^skills:"` = 1 in all five. `grep -c "If a skill is missing"` = 1 in all five, each followed by the STOP-and-report instruction. Per-role `skills:` lists match the contract's table exactly, including `sdd-test-writer` → `[harny-test, high-value-tests]` and `sdd-documentation` → `[harny-document, harny-sync, harny-adr]`. |
| C5 | Guarantee 5 — Name stability: `name`, `model`, `color`, `tools` byte-identical to baseline B2 | **PARTIAL** | Values are structurally intact and plainly un-tidied: `sdd-architect`'s `description` retains both `<example>` blocks with escaped `\n`; `sdd-auditor`'s `tools` retains `"Glob, Grep, LS, Read, Write, Edit, Bash"`; models `opus/sonnet/sonnet/opus/haiku` and colors `cyan/yellow/green/red/blue` are all present. **But byte-identity against B2 is not provable**: B2 records only whole-file hashes and line counts, and the pre-change files are unrecoverable (AL-S1). The strongest available check — that each file's old frontmatter close equals the current close minus the added `skills:` lines (architect 10−3=7, test-writer 10−3=7, executor 17−3=14, auditor 17−3=14, documentation 18−4=14) — matches the reconciliation table's own frontmatter ranges exactly, which is corroborating but not proof. |
| C6 | Guarantee 6 — Conductor untouched: byte-identical, not renamed, moved, or preloaded | **PASS** | SHA-256 `839824dc2b6e5860660430c48a75b703dc28a3df79ee6aac44ebe409e28fe766` == B3. Still at `.claude/skills/sdd-conductor/`, still named `sdd-conductor`, absent from all five `skills:` lists. |
| C7 | Guarantee 7 — Extraction completeness: every source line placed or justified | **PARTIAL** | See T10 / AL-S6 for the full re-derivation. Arithmetic closes; contract-named load-bearing instructions all survive; but content-level proof is impossible (AL-S1) and a fourth undeclared deviation was found (AL-S4). |
| C8 | Guarantee 8 — No template/source drift: `templates/**`, `src/**`, `bin/**`, `package.json`, `package-lock.json` byte-identical | **PASS** | Recomputed B3 combined 34-file manifest hash → `a813df6f785926f0d22868730dab3ee8d7bc3597723688a69551fed1841ae497`, exact match. `git diff --stat` on `package.json`/`package-lock.json` empty. |
| C9 | Guarantee 9 — Archive integrity: SHA-256 before == after for all 20 files; no archived artifact edited afterwards | **PASS** | Auditor recomputed all 20 against B1's recorded values: **20 checked, 0 mismatches**. No archived file appears as modified in `git status`. |
| C10 | Guarantee 10 — Audit history preserved: every pass of every multi-pass audit survives | **PASS** | `AUDIT PASS 2` present in `specs/archived/cli-skeleton/audit.md`; `Final Verdict — pass 2` present in `specs/archived/cursor-kiro-copilot-generators/audit.md`. Implied in any case by the 20/20 hash match — a truncation would have changed a hash. |
| C11 | Guarantee 11 — Lookup is read-only and reads at most four files | **PASS** | `harny-sync/SKILL.md` § Steps mode `lookup` step 5 states the 4-file bound explicitly (`_index.md` + ≤3 capability docs) and "never globs `specs/archived/**`"; step 7 states "Writes nothing, ever"; the Guardrails restate the no-glob rule. `metadata.harny-writes` reads `"lookup: none. archive: specs/**"`. |
| C12 | Guarantee 12 — Archive is precondition-gated and atomic; checksum mismatch restores and aborts | **PASS** | All six contracted preconditions are present verbatim in the skill, prefaced by "on any failure, refuse and report which one failed, without moving anything". Procedure steps 1–3 encode record-hash → move → re-hash → restore-and-abort-on-mismatch; the Guardrails restate it as "Archive is atomic or it didn't happen." |
| C13 | Guarantee 13 — Sync is additive: `sdd-documentation` retains every README/CHANGELOG/AGENTS/`Shipped:` duty; the stamp still precedes the move | **PASS** | `harny-document/SKILL.md` Step 2 retains all four duties (README, CHANGELOG, ARCHITECTURE/AGENTS, `Shipped:` stamp "in place, first"); Step 3 adds the hand-off; a Guardrail states "The `Shipped:` stamp always precedes the move." The contracted six-step ordering is fully encoded (2.4 → 3.1 → 3.2 → 3.3 → 4). |
| C14 | Guarantee 14 — Merge, never overwrite: a statement the incoming feature does not mention is left untouched | **PASS** | Archive step 5 states "**merging, never overwriting**: a statement not mentioned by this feature is left untouched"; restated as a Guardrail. |
| C15 | Guarantee 15 — Provenance completeness: every current-behavior statement cites an archived artifact | **PARTIAL** | All 50 statements across the five capability docs carry a Provenance cell; no placeholders. Spot-checks resolve to real archived text (T15). **One sub-citation is wrong**: SW-6 cites "cli-skeleton · contract.md Behavior Guarantee 8" for the `SPEC_SCHEMA_DIR` single-sourcing rule, but cli-skeleton's guarantee 8 is *"Nothing is silently dropped"* (capability tokens). See AL-S7. |
| C16 | Guarantee 16 — Stable statement IDs: never reused or renumbered; retirement by marking | **PASS** | Every capability doc's § Current behavior carries the blockquote "Stable IDs — never renumbered; retired statements are struck, not deleted." IDs are contiguous and unique per capability (SW-1..9, PR-1..9, SL-1..10, CLI-1..11, TG-1..11); no reuse. `harny-adr` carries the parallel rule for ADR numbers. |
| C17 | Guarantee 17 — ADR discipline: named significance criterion, conforming template, globally unique monotonic number, registered, ≤ 7 per feature | **PARTIAL** | The skill encodes all of it: four criteria (a)–(d), the 7-per-feature cap, global monotonic numbering by scanning `specs/archived/*/decisions/*.md`, registry update, and the no-backfill rule (also enforced by there being zero `decisions/` directories). Unexercised — no ADR exists yet (see R9). |
| C18 | Guarantee 18 — Reserved names: no feature named `current`/`archived`; no skill named `synced` | **PASS** | `specs/*/` contains only `archived/`, `current/`, `sdd-skill-library/`. No `.agents/skills/synced` and no `sdd-*` name collision. Rule is stated in `.agents/skills/README.md` binding rule 4, `harny-sync` archive preconditions, and `spec-workflow` invariant 3. |
| C19 | Guarantee 19 — Durability: `git ls-files` includes the knowledge base, `.agents/skills/**` and the eight mode-`120000` entries; excludes in-flight specs and `.claude/agents/` | **PASS** | Verified with a **throwaway index** (`GIT_INDEX_FILE` pointed at a scratch file, real index untouched): all 8 bridge entries stage at mode `120000`; `specs/current/` 6 files, `specs/archived/` 21 files, `.agents/skills/` 10 files. `specs/sdd-skill-library/` → 0, `.claude/agents/` → 0. Security-adjacent case re-checked: `git check-ignore` confirms `.claude/settings.local.json`, `.claude/agents/*`, both untouched skills, `plan.md` and `CLAUDE.md` all still ignored. |
| C20 | Guarantee 20 — Toolchain neutrality: typecheck and tests pass; `dependencies`/`devDependencies` unchanged | **PASS** | Auditor-run: typecheck exit 0; `npm test` 275/275 across 21/21 files; `npm pack --dry-run` excludes `specs/` and `.agents/`; `git diff` on `package.json`/`package-lock.json` empty. |
| C21 | Interface — file manifest: the exact counts bind (9 files under `.agents/skills/`, 8 symlinks, 5 modified agents, 6 new under `specs/current/`, 1 under `specs/archived/`, 20 moved, 2 test-tier, 2 modified root files). No other file created or modified | **PASS** | Every count matches the binding tree: 8 symlinks ✓, 5 modified agents ✓, 6 new under `specs/current/` ✓, 1 new under `specs/archived/` ✓, 20 moved ✓, 2 new test-tier files ✓, 2 modified root files (`.gitignore`, `AGENTS.md`) ✓, 1 modified test file per Amendment A1 ✓. Nothing outside the manifest. **Note:** the prose count says "**9** files under `.agents/skills/`"; the actual (and tree-specified) number is **10** — README + 8 `SKILL.md` + `adr-template.md`. The implementation matches the tree; the summary line's arithmetic is off by one (AL-S10, spec-side, LOW). |
| C22 | Interface — the `harny-*` shape contract is published at `.agents/skills/README.md` with the six keys, five required body sections, and seven binding rules | **PASS** | Present, 94 lines: the six-key annotated YAML block, the five-section body skeleton, all seven binding rules verbatim in substance, plus an "Adding a ninth skill" 4-step procedure that makes the extension point actionable from this one page. |
| C23 | Interface — `harny-sync` encodes the trigger matrix (T1/T2/T3), both mode procedures, and the six-step hand-off ordering | **PARTIAL** | Trigger matrix ✓ (all three triggers under § "When to use this"), both mode procedures ✓ (complete, in contract order). The **six-step hand-off ordering is encoded in `harny-document/SKILL.md` Steps 2.4–4, not in `harny-sync`** — arguably the right home, since `harny-document` owns the hand-off, but a literal reading of C23 places it here. Non-blocking (AL-S11, LOW). |
| C24 | Interface — `harny-adr` encodes the storage decision, global monotonic numbering, the four significance criteria, the 7-per-feature cap, the no-backfill rule, and the bundled template | **PASS** | All six present. `adr-template.md` matches the contract's template byte-for-byte in shape: Status / Date / Feature / Capability / Source / Trigger header bullets, then Context, Decision, Alternatives considered (2-column table), Consequences (Positive / Accepted costs), Follow-ups. |
| C25 | Interface — `harny-standards` is a pointer plus checklist, never a copy; names its target portably; `AGENTS.md` § "Coding standards" covers S1–S7 | **PARTIAL** | Portability ✓ — names the target as "`AGENTS.md`, `CLAUDE.md`, or the project's equivalent" with `AGENTS.md` as this repo's concrete answer, exactly the AL-4 phrasing pattern; a Guardrail repeats it. `AGENTS.md` § "Coding standards" ✓ covers S1–S7, each a rule plus its establishing artifact. **But** "never a copy" is not fully honored: the skill glosses S1–S6 inline (AL-S5). |
| C26 | Data model — `_index.md` carries all five tables with ≥ 20 keyword rows and the reservations seeded from the archived audits (AL-19, AL-20, AL-30, CG-1) | **PASS** | All five tables present; § Keyword lookup has 38 rows; § Open reservations carries AL-19, AL-20, AL-30, CG-1/O4 plus CR-1 and CR-2, each with severity and source file. Each of the four seeded IDs was traced back to real text in the cited archived audit. 103 lines ≤ 150. |
| C27 | Data model — every `capability.md` follows the schema (purpose, ID'd statements with provenance, invariants, reservations, contributing features, related ADRs) | **PASS** | All five docs carry the `> Last synced: 2026-09-08. Owned artifacts: …` header and exactly the six required sections in the contracted order. Verified by heading extraction across all five. *(Note: this per-capability-subfolder `capability.md` shape and its ID+Statement+Provenance table were later superseded by a flat `specs/current/<capability>.md` file in an OpenSpec-derived Requirement/Scenario format — see `contract.md` § Amendment A3, post-archive exception, human-authorized 2026-09-09.)* |
| C28 | `specs/archived/README.md` states the single path-redirect rule | **PASS** | Present; states the rule as a blockquote naming all four features and the archive date, extends it to "any feature archived by `harny-sync` afterwards", and closes with "Archived artifacts are historical records and are not rewritten." |
| C29 | § SUPERSEDES is present, scoped to the live pipeline, and names the follow-up; `templates/roles/sdd-documentation.md` is deliberately left divergent | **PASS** | § SUPERSEDES present with the in-scope/out-of-scope table and the `templates-skill-library-parity` follow-up. `templates/roles/sdd-documentation.md` unchanged (inside the matching B3 manifest) and its divergence is called out in `AGENTS.md` at the point of the edit. |
| C30 | Error Handling Contract — each of the 14 rows is honored by the shipped artifacts | **PASS** | Row-by-row: missing/dangling symlink → guard in all 5 agent bodies + T1/T2 ✓; `core.symlinks` false → `lstat` check with a naming message ✓; rogue key / oversize description → T4/T5 with file-and-key messages ✓; lookup no-match → `harny-sync` lookup step 6 ✓; `_index.md` absent → step 1 "never fabricate", no archive glob ✓; index-vs-doc disagreement → "the capability doc wins" Guardrail ✓; archive precondition failure → "refuse and report which one failed" ✓; archive dir exists → precondition 5 ✓; checksum mismatch → step 3 restore-and-abort ✓; reserved feature name → precondition 6 + propose-time invariant ✓; ADR number taken → step 4 rescan ✓; no significant decision → "do not write filler ADRs" ✓; >7 candidates → step 3 cap-and-list ✓; conventions doc missing → `harny-standards` Guardrail 1 fallback-and-say-so ✓. |
| C31 | § "Verified facts" V1–V15 each carry a source and `2026-09-08`; § "Discrepancies" D1–D4 are stated | **PASS** | 15 rows, each with a Source and `2026-09-08`. D1–D4 all present and substantive. V14/V15 independently re-checked against shipped code and test text — accurate. |
| C32 | Deviations X1, X2, X3 are recorded in `roadmap.md` with justifications, and **X1's STOP guard is actually present** in `harny-propose` | **PASS** | X1/X2/X3 all recorded with justifications. **X1's guard is present and correctly phrased** — `harny-propose/SKILL.md` Guardrails: "**If the spec-schema templates are unreachable** (neither `templates/spec-schema/` nor `.sdd/spec-schema/` nor an equivalent the target repo names exists), **STOP and report it.** Never improvise a spec file format from memory". Step 3 names both this repo's and a scaffolded repo's path, per AL-5. X2 verified: no `.claude/skills/high-value-tests/SKILL.md` path anywhere under `.agents/skills/`. X3 verified in `harny-document`. |
| C33 | Guarantee 21 / § Amendment A1 — the T41 non-mutation check is a before/after differential that still fails on a real `runInit` leak into `templates/` or `.claude/`; only that block (lines 176–185) plus one header-comment line changed; the other **eight** describe blocks are byte-identical | **FAIL** | **Second half PASSES, first half FAILS.** Scope ✓: `git diff -U0` shows exactly three hunks — the header comment (2 lines at :11) and two inside the `non-mutation:` block (:180–203). The `single-source:` block at :153, which also carries `(T41)`, was correctly **not** touched; all eight other describe blocks are byte-identical. **Guarantee ✗:** the check no longer fails on a real leak. Both `git status` snapshots are taken back-to-back inside the same `it()` with **no `runInit` between them** — `grep -n runInit tests/canonical-fidelity.test.ts` returns only line 179 (the test's title) and line 187 (a comment); the file never calls it. Auditor mutation check: with a real leaked file present in `templates/`, the test **passed**; the pre-amendment absolute assertion would have failed. See AL-S3. |

## Test Coverage

> T1–T5 are executable (`tests/skill-library.test.ts`, run by the project's own runner,
> offline). T6–T19 are structural/verification checks the auditor executed directly.
> Per `.claude/skills/high-value-tests/SKILL.md`, the executable set deliberately asserts
> **structure and resolution only, never skill prose**.

| ID | Test / Verification Description | Status | Test File / Evidence |
|---|---|---|---|
| T1 | Bridge bijection: `.claude/skills/harny-*` and `.agents/skills/harny-*` sets are equal, both discovered by glob (C2) | **PASS** | `tests/skill-library.test.ts:105–114`. Green. Discovery is by `readdirSync` + prefix filter, never a hardcoded list, and carries an explicit non-empty precondition so an empty/empty vacuous pass is impossible. |
| T2 | Every `.claude/skills/harny-*` is a symlink by `lstat`, with **relative** link text, whose `realpath` equals its namesake (C2) | **PASS** | `tests/skill-library.test.ts:116–148`. Green. This test is also what actually enforces C1 in practice, since T3 cannot fail (T3 row below). |
| T3 | No `harny-*` entry under `.claude/skills/` is a regular directory (C1) | **FAIL** | `tests/skill-library.test.ts:150–162`. The assertion is `expect(stat.isSymbolicLink() && stat.isDirectory()).toBe(false)`. Under `lstat` a symlink reports `isDirectory() === false` and a real directory reports `isSymbolicLink() === false`, so the conjunction is **unconditionally false** and the test can never fail. Auditor confirmed empirically on both a real directory (`.claude/skills/sdd-conductor` → `false && true`) and a symlink (`.claude/skills/harny-audit` → `true && false`). A tautology — precisely what the `high-value-tests` rubric this feature invokes forbids. See AL-S2. |
| T4 | Every `harny-*/SKILL.md` frontmatter uses only the six V5 keys and no V6 key (C3) | **PASS** | `tests/skill-library.test.ts:174–206` + `tests/helpers/frontmatter.ts`. Green. Two complementary assertions (whitelist membership and explicit Claude-only-key rejection). |
| T5 | Every `description` is non-empty and ≤ 1,536 characters (C3) | **PASS** | `tests/skill-library.test.ts:208–224`. Green. The helper's own boundary behavior is unit-tested at :275–284 (an exactly-1536 folded scalar), so the measurement is itself guarded. |
| T6 | Red-phase confirmation: T1–T5 failed for the right reason (missing structure, not a test bug) before Phase 1.5 | **PARTIAL** | `tasks.md` Task 1.8 records the executor's evidence — 10 failures, all `expected 0 to be greater than 0` discovery-precondition failures, plus 5 passing `readFrontmatterKeys` unit tests. The design is sound (each discovery is asserted non-empty *before* any shape assertion, so "vacuously true because nothing exists" cannot pass). The human gate itself is still unticked (`[ ]`), correctly not self-approved. |
| T7 | Agent body line counts: each ≤ 25, combined < 200 (C4, R1) | **PASS** | Auditor-measured: 15/15/16/15/15 bodies; 148 combined file lines vs 646 before. |
| T8 | Missing-skill guard present in all five agent bodies (C4) | **PASS** | `grep -c "If a skill is missing"` = 1 in all five, each with the STOP-and-report instruction and the V9 rationale. |
| T9 | Frontmatter byte-identity against baseline B2 for all five agents (C5) | **PARTIAL** | Not provable — B2 recorded whole-file hashes and line counts only, and the pre-change files are unrecoverable (AL-S1). Best available evidence: `<example>` blocks and the auditor's write-scoping `tools` string are visibly intact and un-tidied, and each file's old frontmatter close (current close minus added `skills:` lines) equals the reconciliation table's frontmatter range for that file, in all five cases. |
| T10 | Reconciliation closure re-derived independently from B2 (C7, R2) | **PARTIAL** | **Re-derived by the auditor, not accepted from Task 2.7.** Range arithmetic recomputed from scratch: 0 duplicated lines, 0 out-of-range lines, every file's maximum equals B2's recorded count exactly (255/105/84/144/58). Unaccounted: 11 single lines — architect 9, 26, 40; test-writer 23; executor 15, 17, 25; auditor 15, 17, 32; documentation 15, 17 — each isolated and adjacent to a section boundary, consistent with blank separators and frontmatter closers, and corroborated by the current files' own frontmatter offsets. Contract-named load-bearing instructions all confirmed present in their destination skills. **Downgraded from PASS by two things:** content-level re-derivation is impossible (AL-S1), and a probable fourth undeclared deviation was found (AL-S4). |
| T11 | 20-file SHA-256 before/after equality, plus both pass-2 content markers and all four `Shipped:` headers (C9, C10) | **PASS** | Auditor recomputed all 20 against B1: 20 checked, 0 mismatches. `AUDIT PASS 2` ✓, `Final Verdict — pass 2` ✓, all four `Shipped:` headers present in original inconsistent formatting ✓. |
| T12 | Byte-identity sweep of the must-not-change set, including both untouched skills (C6, C8) | **PASS** | Combined 34-file manifest hash recomputed → `a813df6f785926f0d22868730dab3ee8d7bc3597723688a69551fed1841ae497`, exact B3 match. Conductor `839824dc…fe766` ✓, high-value-tests `eef6c856…b3897` ✓. |
| T13 | `git ls-files` / `git status --porcelain --ignored` prove the intended tracked-vs-ignored split, including that `.claude/settings.local.json` is still ignored (C19) | **PASS** | Run with a throwaway `GIT_INDEX_FILE` so nothing was staged in the real index. 8 symlinks at mode `120000`; knowledge base and `.agents/skills/` tracked; in-flight specs and `.claude/agents/` excluded. `git check-ignore` confirms `.claude/settings.local.json` still ignored — the security-adjacent case holds. |
| T14 | `npm run typecheck` and `npm test` clean; `npm pack --dry-run` still excludes `specs/`; dependency lists byte-identical (C20) | **PASS** | Auditor-run: typecheck exit 0; 275/275 tests across 21/21 files; pack output has 0 entries matching `specs/` or `.agents/`; dependency manifest and lockfile byte-identical. |
| T15 | Provenance spot-check: sample current-behavior statements across all five capability docs and confirm each citation resolves to real archived text (C15, R12) | **PARTIAL** | Sampled and traced: SW-3 → `canonical-role-templates/contract.md:176` § "Spec-schema content contract" + `audit.md` C9/AL-2 ✓; SW-4 → `canonical-role-templates/audit.md:70,77` AL-5, quoting its resolution text ✓; SW-5 → `cli-skeleton` guarantee 12 (`:830`) ✓; CLI-9 → `cli-skeleton` guarantee 8 ✓; TG-2 → codex guarantee 1 ✓; TG-7 → ckc guarantee 10 + codex guarantee 11 ✓; TG-11 → `codex-generator/audit.md:135` CG-11 ✓; AL-19/AL-20/AL-30/CG-1 all traced to real audit rows ✓. **One miss:** SW-6's "cli-skeleton · contract.md Behavior Guarantee 8" does not support the `SPEC_SCHEMA_DIR` claim (AL-S7). Its other two citations (ckc guarantee 8 at `:511`, codex guarantee 9 at `:539`) are correct. |
| T16 | `_index.md` routing check: three real questions each route to the correct capability in one read (C26) | **PASS** | Task 3.11's three questions are recorded in `_index.md` § Notes with their routing terms and outcomes. Auditor re-walked all three against the actual keyword table: `spec-schema` → spec-workflow ✓; `frontmatter (portable keys)` → skill-library ✓; `.agents/skills` → tool-generators, skill-library ✓. Each resolves in one read. |
| T17 | Scope-creep sweep: no file outside the manifest was created or modified; every non-goal respected (C21, R19) | **PASS** | `git status --porcelain`: exactly `M .gitignore`, `M AGENTS.md`, `M tests/canonical-fidelity.test.ts`, plus untracked `.agents/`, `.claude/`, `specs/`, `tests/helpers/frontmatter.ts`, `tests/skill-library.test.ts`. `AGENTS.md` has exactly two hunks (the SUPERSEDES edit at :49, § Coding standards appended at :140). `.gitignore` matches the pinned pattern set verbatim. Nothing outside the File Change Map. |
| T18 | X1 guard present: `harny-propose` STOPs and reports when the spec-schema templates are unreachable, and its pointer is phrased for both this repo and a scaffolded one (C32) | **PASS** | Guard present verbatim in `harny-propose/SKILL.md` § Guardrails; the pointer in Step 3 names `templates/spec-schema/*.md` for this repo and `.sdd/spec-schema/*.md` for a scaffolded one, plus "an equivalent the target repo names". AL-5 is closed, not reopened. |
| T19 | Amended T41 check is still load-bearing: it **fails** when a write into `templates/` or `.claude/` is simulated, and the eight other describe blocks diff clean against their pre-amendment state (C33) | **FAIL** | **Mutation check performed by the auditor.** Created a real leaked file `templates/__audit_probe_leak.tmp`, confirmed `git status --porcelain -- templates .claude` reported `?? templates/__audit_probe_leak.tmp`, then ran the amended test in isolation: **1 passed**. The guard did not fire on a real mutation. The pre-amendment absolute assertion (`expect(stdout.trim()).toBe('')`) would have failed on the same state. Probe removed; tree restored. The eight-block half **does** pass (diff confined to :11–12 and :180–203). Per this row's own standing instruction — *"A fix that merely makes the suite green without preserving the guard is a FAIL"* — this is a FAIL. See AL-S3. |

## Audit Log

| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-09 | sdd-auditor | **AL-S3 — The amended T41 non-mutation check is defanged; guarantee 21 is broken.** Amendment A1 specifies "snapshot … *before* the suite's `runInit` calls execute, snapshot it again after". As implemented (`tests/canonical-fidelity.test.ts:189–201`), both `execFileAsync('git', ['status', …])` calls sit back-to-back inside the same `it()` with **nothing between them**; `grep -n runInit` on the file returns only the test title (:179) and a comment (:187) — the file never calls `runInit`. Auditor mutation check: with a real leaked file in `templates/`, the test **passed**. The pre-amendment absolute assertion would have **failed** on that same state, so this is a net *reduction* in detection power for exactly the failure mode guarantee 21 names, and Amendment A1's own weakening-analysis rows 1–2 ("runInit writes a new file into `templates/`/`.claude/` → caught (snapshot differs)"; "modifies a tracked file in `templates/` → caught") are false as built. Task 5.3b's self-report is true only in its literal framing — a write injected *between the two adjacent calls* does fail it — but nothing in the real suite does that, and a *persisted* leak is invisible to a differential because both snapshots observe it equally. | **CRITICAL** | Make the differential span actual work: invoke the suite's `runInit` path (or await the init-exercising tests) between the two snapshots, so the "after" snapshot can differ from the "before". Alternatively keep an absolute assertion but filter the known-contracted paths. Re-run the same mutation check as the acceptance criterion: with a file touched in `templates/`, the test must **fail**. Blocks approval. |
| 2026-09-09 | sdd-auditor | **AL-S2 — `tests/skill-library.test.ts:150–162` is a tautology that can never fail.** The assertion `expect(stat.isSymbolicLink() && stat.isDirectory()).toBe(false)` is unconditionally satisfied under `lstat`: a symlink yields `true && false`, a real directory yields `false && true`. Confirmed empirically against both `.claude/skills/harny-audit` (symlink) and `.claude/skills/sdd-conductor` (real directory). The test contributes zero detection power to guarantee 1, and is itself the "tautology" category the `high-value-tests` rubric — which this very feature's `harny-test` skill restates — tells authors not to write. Practical coverage loss is limited (T2's `lstat().isSymbolicLink()` check catches a real directory for any name present under `.agents/skills/`, and T1's bijection catches an orphan `.claude/skills/harny-*`), but the row claiming to cover C1 does not. | **HIGH** | Assert the correct predicate — `expect(stat.isDirectory()).toBe(false)` (a bridge entry must never be a real directory under `lstat`), or `expect(stat.isSymbolicLink()).toBe(true)`. Verify by mutation: temporarily replace one symlink with a real directory and confirm the test fails. |
| 2026-09-09 | sdd-auditor | **AL-S4 — A probable fourth, undeclared extraction deviation: the docs-lookup instruction was dropped from `harny-test` and `harny-implement`, and de-portabilized in `harny-propose`.** The canonical portable counterparts of the same three role bodies each carry it, in the S7-correct form: `templates/roles/sdd-architect.md:22`, `sdd-executor.md:24`, `sdd-test-writer.md:37` — all reading "Verify … via Context7 **(or the target tool's equivalent docs-lookup MCP)** … do not trust memory for library APIs." After extraction, `grep -rn "Context7\|docs-lookup" .agents/skills/` matches **exactly one line**: `harny-propose/SKILL.md:59`, and it has lost the portability qualifier. `harny-test` and `harny-implement` carry no docs-lookup instruction at all. Corroborating: `sdd-test-writer` and `sdd-executor` both still declare `mcp__context7__query-docs` and `mcp__context7__resolve-library-id` in `tools:` — declared capability with no instruction to use it. Corroborating further, the feature's own knowledge base records the opposite as current truth: `specs/current/pipeline-roles/capability.md` **PR-4** states "A role that declares `docs-lookup` (architect, executor, test-writer) must instruct verify…". Only X1/X2/X3 are permitted deviations; this is not among them and is not in the reconciliation table. Not provable against B2 (see AL-S1), but the convergent evidence is strong. | **MEDIUM** | Restore the docs-lookup instruction to `harny-test` and `harny-implement`, and restore the "(or the target tool's equivalent docs-lookup MCP)" qualifier in `harny-propose:59` — or, if the drop was deliberate, add it to `roadmap.md`'s reconciliation table as **X4** with a justification, and retire/amend PR-4 so the knowledge base stops asserting something untrue. |
| 2026-09-09 | sdd-auditor | **AL-S5 — S7 violation inside the tool-neutral canonical layer.** `.agents/skills/harny-propose/SKILL.md:59` reads "**Verify library APIs via Context7** before pinning signatures in a contract". `AGENTS.md` S7 — authored by this feature — forbids naming one tool's mechanic as the only possibility in tool-neutral content, and `specs/current/pipeline-roles/capability.md` **PR-7** restates it as current truth. `.agents/skills/` is by this contract's own D1/V14 the tool-neutral canonical home. The `templates/` layer already models the correct phrasing (AL-S4). Secondary, lesser instance: `.agents/skills/README.md:21` says "Claude selects on this" where "the harness selects on this" would be tool-neutral. | **MEDIUM** | Re-phrase `harny-propose:59` to name the behavior first and the tool as an attributed example, matching `templates/roles/sdd-architect.md:22` verbatim. Adjust README.md:21 similarly. Reported, not fixed. |
| 2026-09-09 | sdd-auditor | **AL-S6 — Reconciliation table re-derived independently (Task 5.6 discharged, with a stated limit).** Recomputed all 30 line ranges from scratch rather than accepting Task 2.7: **0 duplicated lines, 0 out-of-range lines**, and each file's maximum covered line equals B2's recorded count exactly (255 / 105 / 84 / 144 / 58). Eleven single lines are unaccounted — architect 9, 26, 40; test-writer 23; executor 15, 17, 25; auditor 15, 17, 32; documentation 15, 17 — every one isolated and adjacent to a section boundary, consistent with blank separators and frontmatter closers. Independently corroborated: each file's pre-change frontmatter close, derived as (current close − added `skills:` lines), equals the table's own frontmatter range in all five cases (architect 10−3=7 vs "1–7"; test-writer 10−3=7 vs "1–7"; executor 17−3=14 vs "1–14"; auditor 17−3=14 vs "1–14"; documentation 18−4=14 vs "1–14"). Every contract-named load-bearing instruction was confirmed present in its destination skill: architect's one-file-at-a-time review and never-a-placeholder-language rule; test-writer's red-first ordering, docstring-not-test-name linkage and offline-by-default rule; executor's contract-is-law / no-scope-creep and make-red-tests-pass-without-editing-them; auditor's 7 steps, verdict enum, 4 severity ratings and report-don't-fix; documentation's document-only-what-the-auditor-verified and never-touch-code-comments. | **INFO** (with the MEDIUM AL-S4 and the MEDIUM AL-S1 arising from it) | No action on the arithmetic — it closes. Actions are carried by AL-S1 and AL-S4. |
| 2026-09-09 | sdd-auditor | **AL-S1 — Baseline B2 cannot support the content-level verification three separate contract items depend on.** `tasks.md` § Notes tells the executor "B2 is the only recoverable record of the pre-thinning agent bodies once Phase 4 runs" — but B2 as recorded holds **whole-file SHA-256 hashes and line counts only**, from which no content can be reconstructed. The files themselves are gone: `.claude/agents/` was gitignored before this feature and remains so, `git log -- .claude/agents/` is empty, `git ls-files .claude` is empty, `git stash list` is empty, and no backup copy exists in the tree. Consequences: guarantee 5's "byte-identical to their pre-change values" (C5) is unprovable; guarantee 7's line-by-line extraction proof (C7/R2/T10) can only be verified arithmetically and semantically, not by content diff; and the documented Phase-4 rollback ("reversible by restoring five files from the Phase 1.1 baseline", `roadmap.md` risk table) **is not actually executable**. | **MEDIUM** | Process finding, not a code defect. For this feature: no remedy is available after the fact; record the limitation rather than let C5/C7 read as fully proven. For future features: a baseline that a later phase must verify *content* against must capture content (a `git stash create` blob, a copy under a non-ignored scratch path, or a bundle), not just a digest. Worth an ADR under criterion (d) when `harny-adr` runs. |
| 2026-09-09 | sdd-auditor | **AL-S7 — One provenance citation does not support its statement.** `specs/current/spec-workflow/capability.md` **SW-6** (the `SPEC_SCHEMA_DIR`-not-re-literalled rule) cites three sources; the first, "cli-skeleton · contract.md Behavior Guarantee 8", is wrong — that guarantee is *"**Nothing is silently dropped.** Every capability token in a canonical file is either mapped to at least one tool-native token or surfaced in `CapabilityMapping.notes`"* (`specs/archived/cli-skeleton/contract.md:814`). cli-skeleton mentions `SPEC_SCHEMA_DIR` only once, in § Interfaces at `:407`. The other two citations are correct (ckc guarantee 8 at `:511`, codex guarantee 9 at `:539`). Isolated rather than systemic — the same document cites cli-skeleton guarantee 8 correctly at CLI-9, and eight other sampled citations all resolved. | **MEDIUM** | Correct SW-6's first citation to `cli-skeleton · contract.md § Interfaces (`SPEC_SCHEMA_DIR`, :407)`, or drop it and keep the two accurate ones. This is exactly the class T15 exists to catch, so it is worth fixing rather than accepting. |
| 2026-09-09 | sdd-auditor | **AL-S8 — "A fresh `git clone` yields a working pipeline with no bootstrap step" is overstated.** `contract.md` § State Changes makes that claim, and it holds for the skill library and knowledge base — but the same section also records that `.claude/agents/**` stays ignored. A fresh clone therefore arrives with eight canonical skills and eight working bridge symlinks and **zero subagents**, so the Claude Code pipeline does not run without recreating the five agent files. SC15's actual bar ("a fresh clone either contains the knowledge base or has a documented one-command bootstrap") is met; the stronger prose sentence is not. | **LOW** | Soften the sentence to scope it to the skill library and knowledge base, and state plainly that agent files remain local — or bring `.claude/agents/` into the tracked set in the parity follow-up. |
| 2026-09-09 | sdd-auditor | **AL-S9 — CR-1 materially closed by direct in-session evidence; Task 5.7's `[!]` is now inaccurate.** This audit ran as an `sdd-auditor` subagent launched from `.claude/agents/sdd-auditor.md` with `skills: [harny-audit, harny-standards]`. Both skill bodies were preloaded at startup **with no "skill not found" warning**, announcing base directories under `.claude/skills/` (the symlink paths), and the preloaded text matches the `.agents/` files including strings unique to them. Combined with the conductor's own observation that all eight `harny-*` skills appeared in this session's skill list with no restart, this closes all three of `tasks.md` § Blocked Items' ordered human checks for the observed subset. Residual open scope is breadth (2 of 8 skills, 1 of 5 roles) and fresh-clone durability — not the mechanism. The auditor could not widen it: this environment provides no `Agent`/`Task` tool, so no further subagent could be launched. | **LOW** (down from MEDIUM) | The auditor does **not** edit `tasks.md` — per the `harny-audit` write scope (`specs/<feature>/audit.md` only) and the AL-6 lesson about ticking another role's tasks. Recommend the executor/human move Task 5.7 from `[!]` to `[~]`, narrow its remaining scope to the four unobserved roles plus a fresh-clone check, and update § Blocked Items accordingly. CR-1 is recorded above as LOW / substantially closed. |
| 2026-09-09 | sdd-auditor | **AL-S5b — `harny-standards` partially restates the rules it exists not to restate.** `contract.md` § harny-standards says the skill "MUST NOT restate the rules"; `.agents/skills/harny-standards/SKILL.md:52–58` glosses each of S1–S6 inline ("S1 (TypeScript/ESM/`.js` specifiers/`node:` prefix), S2 (`HarnessError`-only deliberate errors, exit-code mapping owned by one module), …"). The glosses are currently accurate and are far short of a full copy, but they are a second surface that can drift from `AGENTS.md` — the precise failure G6 exists to prevent, and the reason SC10 asks for a `grep` finding no second copy. | **LOW** | Reduce the checklist to bare ids ("executor — S1–S6 before marking a task done; auditor — all seven"), exactly as `contract.md` § harny-standards words it, and let the reader get the content from `AGENTS.md`. |
| 2026-09-09 | sdd-auditor | **AL-S10 — `contract.md` § Interfaces' own count line is off by one.** It states "**9** files under `.agents/skills/`"; the binding tree immediately above it lists 10 (README.md + 8 `SKILL.md` + `adr-template.md`), and the implementation has 10. The implementation matches the tree, so C21 passes; only the summary arithmetic is wrong. | **LOW** | Spec-side one-character fix: 9 → 10. |
| 2026-09-09 | sdd-auditor | **AL-S11 — Two small placement/accuracy notes.** (a) C23 requires `harny-sync` to encode the six-step hand-off ordering; it is encoded in `harny-document/SKILL.md` Steps 2.4–4 instead. Arguably the better home — `harny-document` owns the hand-off — but the contract says otherwise. (b) `tasks.md` Task 4.8 reports "grep it for the five agent names and verify each still resolves"; the live `.claude/skills/sdd-conductor/SKILL.md` never mentions `sdd-documentation` at all (0 occurrences; the other four appear 2–3 times each). Guarantee 6 is unaffected — the conductor is byte-identical to B3 — and the documentation hand-off is specified in `AGENTS.md` instead, so this is a pre-existing conductor gap, not a regression. But Task 4.8's claim as written is not accurate. | **LOW** | (a) Add a one-line cross-reference in `harny-sync` § When to use this pointing at `harny-document`'s ordering, or amend C23 to name `harny-document` as the ordering's home. (b) Correct Task 4.8's note to say four of five names appear, and consider whether the conductor should name `sdd-documentation` (likely parity-follow-up scope, since `templates/conductor/` is a non-goal here). |
| 2026-09-09 | sdd-auditor | **AL-S12 — `harny-standards` S1–S7 compliance check on the executor's own work.** All seven checked. **S1 PASS** — both new TypeScript files use ESM with `node:` prefixes (`node:fs`, `node:path`) and `.js` specifiers on relative imports (`./helpers/paths.js`, `./helpers/frontmatter.js`). **S2 PASS** — `tests/helpers/frontmatter.ts` throws plain `Error`, matching its explicitly-cited precedent `tests/helpers/toml-decode.ts`; `src/` is untouched so the `HarnessError` surface is unchanged. **S3 PASS** — every new artifact under `.agents/`, `specs/current/`, `specs/archived/README.md` and both new test files ends in exactly one `\n`. **S4 PASS** — no dependency added; manifest and lockfile byte-identical. **S5 PASS** — `REPO_ROOT` imported from `tests/helpers/paths.js` rather than re-derived; the locally-declared `1536` and the six-key set have no owning module in `src/` (this feature adds no `src/` code), so there is nothing to re-literal. **S6 PARTIAL** — `Spec:`/`Covers:` headers present and correct in both new files, tests mirror the tree, default run offline; **but** the two `describe` titles in `tests/skill-library.test.ts` carry contract ids — `(Gu 1, Gu 2)` at :88 and `(Gu 3)` at :165 — and S6 says contract ids never appear in test names. Mitigating: the repo's pre-existing files do the same (`tests/canonical-fidelity.test.ts:61` etc.), so this is consistent with observed convention while contradicting the standard this feature just authored. **S7 FAIL** — see AL-S5. | **LOW** (S6) / **MEDIUM** (S7, carried by AL-S5) | S6: move the guarantee ids from the `describe` titles into the file's existing `Covers:` header, which already lists them; or, if the repo intends to keep ids in `describe` titles, amend S6 to permit it in a describe title while forbidding it in an `it` name. S7: see AL-S5. |
| 2026-09-09 | sdd-auditor | **AL-S13 — What went right, recorded so the verdict is not read as a referendum on the whole feature.** The migration is exact: 20/20 SHA-256 match B1, both multi-pass audit markers survive, all four `Shipped:` headers preserved in their original inconsistent formatting. The must-not-change set is exact: the 34-file B3 manifest hash reproduces to the character, as do both untouched skill files. The `.gitignore` amendment does precisely what V10–V13 predicted, including the security-adjacent case (`.claude/settings.local.json` still ignored) and all eight symlinks staging at mode `120000`. The thin agents are 148 lines against a 646-line baseline with the missing-skill guard in all five. The knowledge base is genuinely populated — 50 provenance-carrying statements across five schema-conforming capability docs, a 38-row keyword table, and reservations seeded from three separate archived audits — not the plausible placeholders the roadmap named as Phase 3's quiet failure mode. And the executor's handling of the T41 collision was exemplary: it stopped and reported rather than editing a protected test unilaterally, which is what produced Amendment A1. The defect is in the amendment's *implementation*, not in that judgment. | **INFO** | No action. |

## Final Verdict

**Status**: REJECTED

**Summary**: The feature is substantially and often exactingly correct — 20/20 archived
files byte-identical, the 34-file must-not-change manifest reproducing to the character,
eight portable skills behind a working git-tracked symlink bridge, five thin agents at 148
lines against a 646-line baseline, and a knowledge base of 50 genuinely cited statements —
but Amendment A1's own guarantee 21 is broken: the amended T41 non-mutation check no longer
fails on a real mutation, which the auditor demonstrated by leaking a file into `templates/`
and watching the test pass.

**Critical Issues** (must fix before merge):

- **AL-S3 — Guarantee 21 / C33 / T19: the amended T41 non-mutation check is defanged.**
  `tests/canonical-fidelity.test.ts:189–201` takes both `git status --porcelain -- templates
  .claude` snapshots back-to-back inside one `it()` with no `runInit` between them; the file
  never calls `runInit` at all. Mutation check: with a real leaked file in `templates/`, the
  test **passes**; the assertion it replaced would have **failed**. Amendment A1 promised a
  form "strictly stronger for `.claude/`", and the delivered form is weaker than what it
  replaced for the specific failure mode guarantee 21 names. Fix: make the differential span
  actual `runInit` work, then re-run the same mutation check as the acceptance criterion —
  a file touched in `templates/` must make the test fail.

**Warnings** (should fix, not blocking):

- **AL-S2 (HIGH)** — `tests/skill-library.test.ts:150–162` is a tautology: under `lstat`,
  `isSymbolicLink() && isDirectory()` is false for both symlinks and real directories, so the
  test can never fail. The C1 row it claims to cover is actually carried by T1 and T2. Assert
  `isDirectory() === false` instead, and verify by mutation.
- **AL-S4 (MEDIUM)** — a probable fourth, undeclared extraction deviation: the docs-lookup
  instruction present in all three canonical `templates/roles/` counterparts survives in only
  `harny-propose`, and there without its portability qualifier. Two roles still declare
  Context7 MCP tools with no instruction to use them, and the feature's own PR-4 asserts the
  opposite as current truth. Either restore it or record it as X4.
- **AL-S5 (MEDIUM)** — S7 violation in the tool-neutral canonical layer:
  `harny-propose/SKILL.md:59` names Context7 as the only docs-lookup mechanism, which
  `AGENTS.md` S7 and PR-7 — both authored by this feature — forbid.
- **AL-S1 (MEDIUM)** — baseline B2 records hashes and line counts but not content, and the
  pre-change agent files are unrecoverable. C5's byte-identity claim is unprovable, C7's
  proof is arithmetic-and-semantic only, and the documented Phase-4 rollback is not actually
  executable. A process fix for future baselines, not a code defect.
- **AL-S7 (MEDIUM)** — SW-6's first provenance citation points at a cli-skeleton guarantee
  that says something else. Isolated, but exactly the class T15 exists to catch.

**Recommendations** (nice to have):

- **AL-S9** — move `tasks.md` Task 5.7 from `[!]` to `[~]` and narrow its scope: CR-1's
  mechanism is now confirmed in-session (warning-free preload through the symlink, content
  verified as the `.agents/` file), leaving only breadth and fresh-clone durability. Not done
  by the auditor, whose write scope is this file.
- **AL-S5b** — trim `harny-standards`' inline S1–S6 glosses back to bare ids, per the
  contract's own wording.
- **AL-S12/S6** — move the `(Gu n)` ids out of `describe` titles into the existing `Covers:`
  header, or amend S6 to permit ids in describe titles.
- **AL-S8** — soften the "fresh clone yields a working pipeline with no bootstrap" sentence:
  `.claude/agents/` is still untracked, so a clone gets the skills and no subagents.
- **AL-S10** — fix the "9 files under `.agents/skills/`" count to 10.
- **AL-S11** — cross-reference the six-step hand-off ordering from `harny-sync`, and correct
  Task 4.8's note (the live conductor names four of the five roles, not five).
- Once fixed, re-audit is narrow: re-run the two mutation checks (AL-S3, AL-S2) and confirm
  the eight untouched describe blocks still diff clean. Everything else in this report can
  stand.

---
---

# AUDIT PASS 2 — re-audit after remediation rounds 1–2 and § Amendment A2 (2026-09-09)

> **Everything above this line is audit pass 1 and is preserved verbatim.** Nothing in it
> was deleted, edited, or restated. This pass is a **full re-run of the 7-step process**
> against the current tree — the whole Requirements Checklist (R1–R20), the whole Contract
> Compliance set (C1–C33), the whole Test Coverage set (T1–T19), the `harny-standards`
> S1–S7 check, and the toolchain — not a diff review of the executor's report.
>
> **Nothing was accepted on report.** Every pass-1 defect had its *original repro
> re-executed* by this auditor: AL-S3 and AL-S2 were re-tested by planting the same
> mutations and observing the guard fire, then restoring; AL-S4/AL-S5/AL-S7 were re-read at
> the cited lines in the files themselves. Every § Amendment A2 correction row (R15, C19,
> T13, packaging, `harny-sync`) was re-measured with fresh commands, because pass 1's
> evidence for those rows describes the **superseded** `specs/current`+`specs/archived`-only
> configuration and is stale.
>
> Rows and findings not restated below were re-verified this pass and **still hold at their
> pass-1 status**; the ones explicitly carried forward as "unaffected, still stands" are
> listed by id in § "Carried forward unchanged" so none is silently dropped.
>
> New findings continue the pass-1 numbering and start at **AL-S14**.

## Auditor's toolchain run — pass 2 (run directly by `sdd-auditor`, 2026-09-09)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, 0 errors |
| `npx vitest run` (full suite, offline) | **275 passed / 275**, 21/21 files, 0 skipped |
| `npx vitest run tests/skill-library.test.ts` | 15/15 |
| `npx vitest run tests/canonical-fidelity.test.ts` | 13/13 (all nine describe blocks) |
| `npx vitest run tests/packaging.test.ts` | 4/4, file byte-identical (`git status` clean for it) |
| `npm pack --dry-run --json` | **34** files; top-level entries exactly `AGENTS.md, CHANGELOG.md, README.md, bin, dist, package.json, templates`; **0** entries under `specs/`, `.agents/`, `.claude/`, `src/`, `tests/`. No `.npmignore` exists, so the allowlist `files` field is what governs — re-confirmed empirically, not assumed |
| `git diff --stat package.json package-lock.json` | empty |
| `git status --porcelain` | exactly `M .gitignore`, `M AGENTS.md`, `M tests/canonical-fidelity.test.ts` + the contracted untracked paths — identical before and after this audit |
| B3 combined 34-file manifest hash | `a813df6f785926f0d22868730dab3ee8d7bc3597723688a69551fed1841ae497` — exact match |
| B1 20-file archived hashes | 20 recomputed, **0 mismatches** |
| Conductor / rubric hashes | `839824dc…fe766` ✓, `eef6c856…b3897` ✓ |

## Mutation checks re-executed by this auditor (the AL-S3 / AL-S2 acceptance criteria)

| # | Mutation planted | Expected | Observed | Restored |
|---|---|---|---|---|
| M1 | `templates/__audit_probe_leak.tmp` created, then `npx vitest run tests/canonical-fidelity.test.ts -t non-mutation` | test **fails**, naming the leaked path | **FAILED** — `expected [ Array(1) ] to deeply equal []` with `"?? templates/__audit_probe_leak.tmp"` printed | probe removed → 13/13 green, `git status -- templates` empty |
| M2 | `.claude/skills/harny-adr` replaced by a **real directory** containing a copied `SKILL.md`, then `npx vitest run tests/skill-library.test.ts` | the ex-tautology **fails** | **3 tests FAILED**, including `no harny-* entry under .claude/skills/ is a regular directory` → `.claude/skills/harny-adr must not be a real directory …: expected true to be false` | relative symlink recreated (`readlink` → `../../.agents/skills/harny-adr`), SKILL.md hash equal through the bridge, 15/15 green |
| M3 | Eight bridge symlinks staged into a **throwaway `GIT_INDEX_FILE`**, then `.claude/skills/harny-adr` re-pointed at `harny-sync` (git reports `AM .claude/skills/harny-adr`) | per § Amendment A1 weakening table row 3, "caught" | **NOT caught — test passed.** See AL-S16 | symlink restored; real index never touched |
| M4 | Ninth bridge entry `.claude/skills/harny-ninth` created | no effect (the shape contract's own extension point) | **test FAILED** — `[ '?? .claude/skills/harny-ninth' ]`. See AL-S16 | entry removed |
| M5 | Stray file `.claude/skills/__audit_probe_stray.tmp` | not caught (pre-existing gitignored blind spot, A1 row 4) | not caught — as A1 already discloses; **not** a new defect | removed |

**Auditor hygiene note.** Every mutation above was reverted and the revert verified
(`readlink`, SHA-256 through the bridge, `git status`, B3 manifest hash, full suite). The
working tree after this audit is byte-identical to the tree before it, and the real git
index was never written — M3 used a copy of `.git/index` under the scratch directory.

## Requirements Checklist — pass 2 (changed rows only)

| ID | Pass-1 | Pass-2 | Notes |
|---|---|---|---|
| R2 | PARTIAL | **PARTIAL** (narrowed) | AL-S4's undeclared deviation is **closed**: the docs-lookup instruction is restored in `harny-test` § Steps 2 (`:68`) and `harny-implement` § Inputs (`:54`), matching `templates/roles/sdd-test-writer.md:37` and `sdd-executor.md:24` word-for-word (line-wrapped only), and `roadmap.md` records it as a corrected Phase-2 omission rather than a fourth deviation — correct, since nothing remains dropped. Still PARTIAL for AL-S1 alone: content-level re-derivation against B2 remains impossible. |
| R12 | PASS | **PASS** | Re-verified after the AL-S7 fix; see T15. |
| R15 | PARTIAL | **PARTIAL** (strengthened) | **Re-measured under § Amendment A2, not carried over.** `.gitignore` on disk now carries **no** `specs/` block; `git check-ignore -v` reports no match for `specs/sdd-skill-library/intent.md`, `specs/current/_index.md` or `specs/archived/cli-skeleton/intent.md`. With a throwaway index, `git ls-files specs` = **32** (6 current + 21 archived + **5 in-flight**), `.agents` = 10, all 8 bridge entries at mode `120000`. SC15's bar ("a fresh clone contains the knowledge base") is now met *more* strongly than the original split allowed. Still PARTIAL for AL-S8 only: `.claude/agents/**` is still 0 tracked files, so the § State Changes sentence "yields a working pipeline with **no bootstrap step**" remains overstated — A2 does not touch it and explicitly says so. |
| R17 | PASS | **PASS** | Re-run this pass: typecheck 0 errors; 275/275; `npm pack --dry-run` still excludes `specs/`; `tests/packaging.test.ts` untouched and 4/4. |
| R19 | PASS | **PASS** | Re-swept: still exactly three modified tracked files; `templates/`, `src/`, `bin/`, `package.json`, `package-lock.json` inside the matching B3 manifest hash; no `decisions/` directory anywhere; `specs/*/` still only `archived/`, `current/`, `sdd-skill-library/`. |
| R20 | PASS | **PASS** (row 2 re-stated) | Contradiction 2's resolution is now A2's option, not the original: all of `specs/` is tracked. `intent.md:356–358` carries the superseded-recommendation note, so the record of what was proposed at the time is preserved rather than rewritten. |

All other R rows (R1, R3–R11, R13, R14, R16, R18) were re-verified this pass and hold at
their pass-1 status and evidence: agent bodies 15/15/16/15/15 and 148 combined file lines;
eight skills each carrying the five required sections in order; descriptions 491–735 chars
with only the six portable keys (`harny-standards` omitting `allowed-tools`); 20/20 archive
hashes; both pass-2 markers; all four `Shipped:` headers in their original inconsistent
formatting; `_index.md` 103 lines with 37 keyword rows; five schema-conforming capability
docs with zero placeholders. R8/R9/R18 stay **PARTIAL** for the same unchanged reason — the
archive move and the ADR write are still unexercised until Task 5.9.

## Contract Compliance — pass 2 (changed rows only)

| ID | Pass-1 | Pass-2 | Verified By |
|---|---|---|---|
| C1 | PASS (resting on inspection + T2) | **PASS** | Now also carried executably: T3 is no longer a tautology (M2). `find .agents/skills -type f` → 10; `.claude/skills/` holds 8 symlinks + 2 unrelated regular directories. |
| C7 | PARTIAL | **PARTIAL** (narrowed) | As R2 — AL-S4 closed, AL-S1 limit remains. |
| C15 | PARTIAL | **PASS** | SW-6's first citation now reads `cli-skeleton · contract.md § Interfaces (`SPEC_SCHEMA_DIR`, :407)`; auditor opened `specs/archived/cli-skeleton/contract.md:407` and confirmed it is exactly `export const SPEC_SCHEMA_DIR = '.sdd/spec-schema';`. The other two citations were already correct. |
| C19 | PASS (old guarantee) | **PASS** (amended guarantee) | **Re-verified against the A2 text, not the pass-1 text.** Throwaway-index run: tracked = all of `specs/**` including `specs/sdd-skill-library/{intent,contract,roadmap,tasks,audit}.md`, plus `.agents/skills/**` (10) and the eight `120000` symlinks. Excluded, by `git check-ignore -v`: `.claude/settings.local.json` and `.claude/agents/sdd-auditor.md` (both via `.gitignore:2`), `.claude/skills/{sdd-conductor,high-value-tests}/SKILL.md` (via `:4`), `plan.md` (`:7`), `CLAUDE.md` (`:8`). The security-adjacent case holds. Pass-1's "excludes in-flight specs" evidence is **superseded**, not re-asserted. |
| C33 | FAIL | **PARTIAL** | **Guarantee 21's behavior now holds and was proven by mutation (M1): with a real leaked file in `templates/` the check FAILS naming the path; with the tree clean it passes.** The scope half still holds: `git diff -U0` shows hunks only at `:11` (header comment) and inside the `non-mutation:` block; the `single-source:` block at `:159` and all seven other blocks are byte-identical. **Not PASS**, because C33's own words pin the mechanism as "a before/after differential" and the shipped mechanism is a filtered absolute assertion (AL-S15), and because the filter is status-blind and hardcoded (AL-S16, M3/M4). |

All other C rows (C2–C6, C8–C14, C16–C18, C20–C32) were re-verified this pass — including a
full re-read of `harny-sync/SKILL.md` after Task R2.4's edit — and hold at their pass-1
status. **C23 and C25 remain PARTIAL** for their unchanged pass-1 reasons (AL-S11a, AL-S5b).
C12 was specifically re-read after the archive-mode edit: all six preconditions, the
record-hash → move → re-hash → restore-and-abort ordering, and the atomicity guardrail are
intact and the new `git mv`/`mv` branch sits inside step 2 without displacing any of them.

## Test Coverage — pass 2 (changed rows only)

| ID | Pass-1 | Pass-2 | Evidence |
|---|---|---|---|
| T3 | FAIL | **PASS** | `tests/skill-library.test.ts:150–162` now asserts `expect(stat.isDirectory(), …).toBe(false)`. Mutation M2: replacing `.claude/skills/harny-adr` with a real directory makes this exact `it()` fail with the path in the message; restoring the relative symlink returns the file to 15/15. The row genuinely covers C1 now. |
| T13 | PASS (old split) | **PASS** (new split) | Re-run from scratch with `GIT_INDEX_FILE` pointed at a scratch copy of `.git/index`: 32 tracked files under `specs/` (in-flight **included**), 10 under `.agents/`, 8 bridge entries at `120000`, 0 under `.claude/agents/`, `.claude/settings.local.json` absent from `git ls-files` and matched by `.gitignore:2`. |
| T15 | PARTIAL | **PASS** | The single miss (SW-6) is corrected and re-traced to the real archived line. |
| T19 | FAIL | **PASS** | Both halves verified this pass: M1 proves the check is load-bearing against a real `templates/` mutation, and the `git diff -U0` hunk ranges prove the eight other describe blocks are untouched. The residual concerns are about the *filter's precision* and *spec-text drift* (AL-S15, AL-S16), not about whether the guard fires. |

T1, T2, T4–T12, T14, T16–T18 re-verified and unchanged. **T6 remains PARTIAL** (the
post-red-tests human gate at Task 1.8 is still `[ ]`, correctly not self-approved) and
**T9/T10 remain PARTIAL** for AL-S1.

## `harny-standards` compliance re-check — pass 2

All seven checked against the files this remediation actually touched
(`tests/canonical-fidelity.test.ts`, `tests/skill-library.test.ts`, four `SKILL.md` files,
`.agents/skills/README.md`, one capability doc).

- **S1 PASS** — no import changes; `node:` prefixes and `.js` specifiers intact.
- **S2 PASS** — `src/` untouched (B3 manifest match); no new deliberate throw.
- **S3 PASS** — every edited file ends in exactly one `\n` (checked with `tail -c 2 | xxd`).
- **S4 PASS** — no dependency added; manifest and lockfile byte-identical; `tests/packaging.test.ts` 4/4.
- **S5 PARTIAL → see AL-S16** — the amended T41 block re-literals the eight `harny-*` skill
  names as a hardcoded set inside `tests/canonical-fidelity.test.ts`, in a repo where the
  same set is discovered by glob everywhere else (`tests/skill-library.test.ts`, per Task
  1.3's "never a hardcoded list"). Reported, not fixed.
- **S6 PARTIAL, unchanged** — `Spec:`/`Covers:` headers correct, tests mirror the tree,
  default run offline; the `(Gu 1, Gu 2)` / `(Gu 3)` ids are still in `describe` titles
  (AL-S12, carried forward). The amended `it()` description carries no ids.
- **S7 PASS (was FAIL)** — `grep -rn "Context7\|docs-lookup" .agents/` now returns three
  lines, all carrying "(or the target tool's equivalent docs-lookup MCP)". `grep -rn
  "Claude" .agents/` returns two lines in `README.md`, both attributed statements of fact
  about the bridge mechanism ("Claude Code specifically does not read …"), which is the
  behavior-first/tool-as-example form S7 requires. `README.md:21` now reads "the harness
  selects on this".

## Audit Log — pass 2

| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-09 | sdd-auditor | **AL-S3 — RESOLVED, independently mutation-verified.** Not accepted from the executor's report: this auditor planted `templates/__audit_probe_leak.tmp` and ran the block in isolation — it **failed**, printing `"?? templates/__audit_probe_leak.tmp"`; with the probe removed the file returns 13/13. The delivered fix is not the one Amendment A1 prescribes (it is a filtered absolute assertion, not a differential) but it is the alternative this audit's own AL-S3 resolution column offered, and it is the *stronger* choice: the executor's reasoning — that a differential structurally cannot see a leak that predates the "before" snapshot — is correct and is exactly the shape M1 exercises. Guarantee 21's operative clause is satisfied. | **RESOLVED** | None. The residuals it leaves are recorded separately as AL-S15 (contract text still describes the superseded mechanism) and AL-S16 (filter precision). |
| 2026-09-09 | sdd-auditor | **AL-S2 — RESOLVED, independently mutation-verified.** `tests/skill-library.test.ts:157–160` now asserts `stat.isDirectory()` is `false`. Mutation M2 (real directory in place of `.claude/skills/harny-adr`) makes three tests fail, including this one, with the offending path named; restore → 15/15. The predicate is no longer unconditionally satisfiable, and C1 is now executably covered rather than covered by inspection. | **RESOLVED** | None. |
| 2026-09-09 | sdd-auditor | **AL-S4 — RESOLVED.** Read at the cited locations rather than taken from the summary: `.agents/skills/harny-implement/SKILL.md:54` and `.agents/skills/harny-test/SKILL.md:68` now carry the instruction, and `.agents/skills/harny-propose/SKILL.md:59` carries the restored "(or the target tool's equivalent docs-lookup MCP)" qualifier. Each matches its canonical counterpart (`templates/roles/sdd-executor.md:24`, `sdd-test-writer.md:37`, `sdd-architect.md:22`) word-for-word, differing only in line wrapping. Classifying this as a corrected Phase-2 omission rather than a fourth deviation (X4) is right: a deviation is a *surviving* difference, and none survives. `specs/current/pipeline-roles/capability.md` PR-4 is true again as a result, so no statement retirement is needed. | **RESOLVED** | None. |
| 2026-09-09 | sdd-auditor | **AL-S5 — RESOLVED.** The S7 violation is gone from the tool-neutral canonical layer (see § `harny-standards` re-check, S7). | **RESOLVED** | None. |
| 2026-09-09 | sdd-auditor | **AL-S7 — RESOLVED.** SW-6's first citation now points at `cli-skeleton · contract.md § Interfaces (`SPEC_SCHEMA_DIR`, :407)`; the auditor opened that line in `specs/archived/cli-skeleton/contract.md` and it is the `SPEC_SCHEMA_DIR` export itself. | **RESOLVED** | None. |
| 2026-09-09 | sdd-auditor | **AL-S14 — The knowledge base asserts the superseded git-tracking split as current truth.** `specs/current/skill-library/capability.md` **SL-10** reads: "`.gitignore` tracks `specs/current/`, `specs/archived/` and `.claude/skills/harny-*` (via `specs/*` + `!specs/current/` + `!specs/archived/` …); **in-flight `specs/<feature>/` and `.claude/agents/` stay ignored, unchanged**". After § Amendment A2 the first half of that pattern set does not exist on disk and the in-flight clause is false — verified: `.gitignore` carries no `specs/` block, and `git check-ignore -v specs/sdd-skill-library/intent.md` reports no match. This is the one artifact in the repo whose entire job is to state what is *currently* true, and A2's own "corrections the executor and auditor must apply" table lists `roadmap.md`, `tasks.md` and `audit.md` but **omits the capability doc**, so the miss is a spec-side gap the executor inherited rather than carelessness. Same defect class as AL-S7, one level more consequential because a future `harny-propose` Step 0 lookup would return it verbatim as binding context. | **MEDIUM** | Modify SL-10 in place (guarantee 14 permits add/modify/retire; guarantee 16 forbids renumbering) to state the A2 configuration: all of `specs/` tracked including in-flight work, `.claude/` pattern set unchanged, `.claude/agents/` still ignored; cite `contract.md` § Amendment A2 alongside the existing V10–V13 provenance. Cheapest correct moment is Task 5.9's `harny-sync` capability-doc update, but it must not be deferred past that, and A2's correction table should gain a `specs/current/skill-library/capability.md` row so the omission is recorded. **(Path note: this file is now `specs/current/skill-library.md`, flattened by `contract.md` § Amendment A3, post-archive exception, human-authorized 2026-09-09; SL-10 has since been corrected in place per this finding's own remedy.)** |
| 2026-09-09 | sdd-auditor | **AL-S15 — `contract.md` § Amendment A1 still prescribes a mechanism that was not shipped.** A1 § "The permitted change" says "**Mechanism:** replace the absolute assertion with a **before/after differential**", prescribes a header comment naming a differential, and closes with a five-row weakening analysis whose rows describe the differential's properties. The shipped and now-verified implementation is a **filtered absolute assertion**. The correction is recorded in `tasks.md` Task R1.1 and in the test's own header comment, but the contract — "contract is law" — was never corrected in place, and neither were `roadmap.md`'s File Change Map (`:348–353`) or its risk-table row (`:313`, still claiming the differential is "strictly *stronger* for `.claude/`"), nor Task 5.3a's own body text (`tasks.md:142`, still instructing the differential and reporting it as done). § Amendment A2 shows the house style for exactly this situation — it corrected guarantee 19 in place and kept a "superseded clause, retained for traceability" note — and A1 should get the same treatment. Sub-point: A1 permits "**one** header-comment line"; the delivered header comment is six lines (`:11–16`). Accurate and useful lines, but outside what A1 literally authorizes. | **MEDIUM** | Correct § Amendment A1 in place, A2-style: state the delivered mechanism, retain the superseded differential clause as a dated record, and replace the weakening-analysis table with one describing the filtered-absolute form (row 3 must be corrected — see AL-S16). Update `roadmap.md:313` and `:348–353` and `tasks.md:142` to match. **This must happen before Task 5.9**, since an archived artifact is never edited afterwards. |
| 2026-09-09 | sdd-auditor | **AL-S16 — The new T41 filter is status-blind and hardcodes the eight skill names; two consequences, both proven by mutation.** (a) **A modification of a tracked bridge symlink is invisible.** The filter drops any porcelain line whose path is one of the eight, regardless of status code. With the symlinks staged in a throwaway index and `.claude/skills/harny-adr` re-pointed at `harny-sync`, `git status --porcelain -u all` reported `AM .claude/skills/harny-adr` and the test **passed** (M3). § Amendment A1's weakening table row 3 claims this case is "**caught** — those paths are now tracked"; as built it is not. Detection survives at all only by an accident of parsing: the filter computes `line.trim().slice(3)`, which is correct for two-character statuses (`??`, `AM`) but mis-slices leading-space statuses (`" M .claude/skills/harny-adr"` → `"claude/skills/harny-adr"`, which then fails to match and *is* reported). So whether a real mutation is caught depends on whether it happens to be staged. (b) **Adding a ninth `harny-*` skill breaks the check.** Creating `.claude/skills/harny-ninth` made it fail with `[ '?? .claude/skills/harny-ninth' ]` (M4) — a false positive against this feature's own advertised extension point (`.agents/skills/README.md` § "Adding a ninth skill"; intent G2/SC3), and against the discovery-by-glob discipline Task 1.3 imposes on the sibling guard test. Neither consequence weakens the check relative to its pre-amendment form, and neither is reachable by `runInit`, which writes only inside its temp target — which is why this is not a repeat of AL-S3. | **MEDIUM** | One-line class of fix: filter on `line.startsWith('?? ')` **and** a `.claude/skills/harny-` **prefix** (or discover the bridge set from `.agents/skills/` by glob, as `tests/skill-library.test.ts` does), and take the path from the **untrimmed** line's `slice(3)`. That restores row-3 detection, removes the ninth-skill false positive, and drops the hardcoded registry. Retest with M3 and M4 as the acceptance criteria. |
| 2026-09-09 | sdd-auditor | **AL-S17 — `harny-document` Step 3's internal cross-reference is off by one.** `.agents/skills/harny-document/SKILL.md` Step 3 reads "the `Shipped:` stamp must already exist on disk before **step 3.2**, because it moves the directory the stamp was just written into" — but the move is step **3.1** (`harny-sync` archive); 3.2 is `harny-adr`. The contracted ordering itself is correct and complete; only the pointer inside the parenthetical is wrong. | **LOW** | Change "3.2" to "3.1". |
| 2026-09-09 | sdd-auditor | **AL-S18 — What went right in this round, recorded so the verdict is read accurately.** Both blocking defects were fixed in the *stronger* of the two available ways rather than the cheaper one: the executor rejected "differential across real work" in favor of an absolute-with-filter precisely because a differential cannot see a pre-existing leak — which is the correct diagnosis and matches what M1 exercises — and it re-ran the auditor's own mutation as its acceptance criterion instead of re-running the suite and calling it green. The AL-S4 fix restored text *verbatim from the canonical `templates/roles/` counterparts* rather than paraphrasing it, and correctly reasoned that a fully restored omission is not a deviation needing an X4. Task R2.5 declined to edit this file's R15/C19/T13 rows and left them for re-verification instead of rewording stale evidence into apparent freshness — that restraint is why this pass could re-measure them cleanly. And A2's own § "Explicitly verified as unaffected" turned out to be accurate on the one point most likely to be wrong: `npm pack` still ships 34 files with zero `specs/` entries, because an allowlist `files` field outranks the `.gitignore` fallback. | **INFO** | No action. |

### Carried forward unchanged — "unaffected, still stands"

Each was re-checked for *staleness* this pass (does either remediation round change it?) and
none does. They are not restated in full; pass 1's text remains the record.

| ID | Sev | Status this pass |
|---|---|---|
| AL-S1 | MEDIUM | **Unaffected, still stands.** B2 still records only hashes and line counts; `git log -- .claude/agents/` still empty; the pre-thinning bodies remain unrecoverable, so C5/C7/T9/T10 keep their evidentiary ceiling and the Phase-4 rollback remains non-executable. Process fix for future baselines. |
| AL-S6 | INFO | **Unaffected, still stands.** The re-derivation's arithmetic is unchanged by either round; Task 5.6 is still `[ ]` and is discharged by AL-S6/this section, not by the executor. |
| AL-S8 | LOW | **Unaffected, still stands — explicitly re-checked because A2 touches the same sentence's neighborhood.** A2 changes only `specs/`; `.claude/agents/**` is still 0 tracked files (re-measured), so § State Changes' "working pipeline with no bootstrap step" is still overstated. A2's own note predicting this is correct. |
| AL-S9 | LOW | **Unaffected, still stands, and CR-1's in-session evidence was independently reproduced this pass.** This audit again ran as an `sdd-auditor` subagent whose `skills:` are `[harny-audit, harny-standards]`; both bodies were preloaded at startup **with no "skill not found" warning**, each announcing its base directory as `/Users/danielerazo/python/harny/.claude/skills/harny-{audit,standards}` — the symlink paths. Second independent observation of V4+V9 through the bridge, in a second session. Residual scope is unchanged: 2 of 8 skills, 1 of 5 roles, no fresh-clone check. Task 5.7 is still `[!]`; the AL-S9 recommendation to move it to `[~]` was not applied. |
| AL-S5b | LOW | **Unaffected, still stands.** `harny-standards/SKILL.md` Step 3 still glosses S1–S6 inline. |
| AL-S10 | LOW | **Unaffected, still stands.** `contract.md` § Interfaces still says "**9** files under `.agents/skills/`"; the tree and the implementation both hold 10. Related echo, same family: `tasks.md` Task 5.4's completion note says `.agents/skills/**` is "9 files"; `git ls-files .agents` returns **10**. |
| AL-S11 | LOW | **Unaffected, still stands.** (a) the six-step hand-off ordering still lives only in `harny-document`; `harny-sync` § "When to use this" names the hand-off but does not cross-reference the ordering. (b) re-measured: the live conductor mentions `sdd-architect` 2×, `sdd-test-writer` 3×, `sdd-executor` 3×, `sdd-auditor` 3×, `sdd-documentation` **0×**. Task 4.8's note is still inaccurate; guarantee 6 is unaffected (conductor hash matches B3). |
| AL-S12 | LOW | **Unaffected, still stands** for its S6 half — `(Gu 1, Gu 2)` at `:88` and `(Gu 3)` at `:165` are still `describe` titles. Its S7 half is **closed** by the AL-S5 fix. S5 gains the new AL-S16 instance. |
| AL-S13 | INFO | Stands as written. |
| CR-1 | LOW | Still carried, now with two independent in-session confirmations of the mechanism (see AL-S9). |
| CR-2 | LOW | Still carried, unchanged; all three mitigations re-verified this pass (8 symlinks at `120000`, the guard in all five agent bodies, T1/T2/T3 green and now non-tautological). |

## Final Verdict — pass 2

**Status**: APPROVED WITH RESERVATIONS

**Summary**: Both blocking pass-1 defects are genuinely fixed and were re-proven by this
auditor's own mutations rather than accepted on report — a leaked file in `templates/` now
makes the T41 non-mutation check fail by name, and replacing a bridge symlink with a real
directory now makes `tests/skill-library.test.ts` fail by name — and § Amendment A2's new
tracking decision is applied correctly and verified end-to-end: all 32 files under `specs/`
(in-flight included) stage as tracked, the eight bridge symlinks still stage at mode
`120000`, `.claude/settings.local.json` and `.claude/agents/**` are still ignored, and
`npm pack` still ships 34 files with zero `specs/`, `.agents/` or `.claude/` entries.
What remains is a cluster of accuracy defects rather than behavior defects: the contract
still describes the T41 mechanism that was *not* shipped, the shipped filter is status-blind
and hardcodes the eight skill names, and the knowledge base still states the superseded
git-tracking split as current truth.

**Critical Issues** (must fix before merge):

- **None.** AL-S3 (CRITICAL) and AL-S2 (HIGH) are closed and mutation-verified (M1, M2). No
  contract guarantee is broken, no interface is missing, no non-goal was breached: `npm run
  typecheck` is clean, the suite is 275/275 offline across 21 files, the B3 34-file manifest
  hash and all 20 archived-file hashes reproduce exactly, and the tree shows exactly the
  three contracted modified files.

**Warnings** (should fix, not blocking):

- **AL-S14 (MEDIUM)** — `specs/current/skill-library/capability.md` SL-10 still states the
  pre-Amendment-A2 split ("in-flight `specs/<feature>/` … stay ignored") as current truth. A
  `harny-propose` Step 0 lookup would hand a future architect a false binding statement.
  Fix SL-10 in place and add the capability doc to A2's correction table. **(This path is
  now `specs/current/skill-library.md`, and SL-10 has since been corrected in place to
  state the Amendment A2 configuration — see `contract.md` § Amendment A3, post-archive
  exception, human-authorized 2026-09-09.)**
- **AL-S15 (MEDIUM)** — `contract.md` § Amendment A1 (plus `roadmap.md:313`, `:348–353` and
  `tasks.md:142`) still prescribes and reports a before/after differential. Correct A1 in
  place in the same style A2 used for guarantee 19, **before Task 5.9 archives this feature**
  — an archived artifact is never edited afterwards, so this is the last opportunity.
- **AL-S16 (MEDIUM)** — the T41 filter drops any line whose path matches one of eight
  hardcoded names regardless of status, so a staged modification of a tracked bridge symlink
  goes undetected (M3, contradicting A1's own weakening-table row 3), and a ninth `harny-*`
  skill trips a false positive (M4) against this feature's advertised extension point. Filter
  on `?? ` + the `harny-` prefix, and slice the path from the untrimmed line.
- **AL-S1 (MEDIUM)** — unaffected, still stands: B2 cannot support content-level verification,
  so C5/C7 keep their evidentiary ceiling and the Phase-4 rollback is not executable. A
  process fix for future baselines, not a defect in this feature's output.

**Recommendations** (nice to have):

- **AL-S17 (LOW)** — `harny-document` Step 3's "before step 3.2" should read "3.1".
- **AL-S8, AL-S9, AL-S5b, AL-S10, AL-S11, AL-S12/S6 (all LOW)** — carried forward unchanged
  from pass 1; see § "Carried forward unchanged" for what each looks like today. AL-S10 now
  has a second instance in `tasks.md` Task 5.4's "9 files" note.
- **Order of operations for Task 5.9.** AL-S14 and AL-S15 are both edits to files that Task
  5.9 will move into `specs/archived/sdd-skill-library/`, where the never-edit-an-archived-
  artifact rule takes effect permanently. Apply them first, then archive. AL-S16 and AL-S17
  touch `tests/` and `.agents/` respectively and can be fixed on either side of the move.
- **ADR candidates surfaced by this pass**, for `harny-adr` at Task 5.9, under significance
  criterion (c)/(d): the A2 decision to track all of `specs/`, and the A1→AL-S3 arc (a guard
  that leaned on a path being gitignored, the differential that could not see a pre-existing
  leak, and the filtered-absolute form that replaced it). Both constrain future features and
  both record an accepted cost, which is exactly what the criteria ask for.
- **Still unexercised, unchanged from pass 1:** R8/R9/R18 and C17 remain PARTIAL because no
  `harny-sync` archive run and no ADR write has happened yet. Task 5.9 is the first end-to-end
  exercise (G12) and is now unblocked by this verdict; if that sequence cannot archive
  `specs/sdd-skill-library/`, Phase 3 is not done and this verdict should be revisited.

**Auditor hygiene note**: five mutations (M1–M5) were planted and reverted this pass; every
revert was verified (`readlink`, SHA-256 equality through the bridge, `git status`, the B3
manifest hash, and a final full 275/275 run). The real git index was never written — the
tracked/ignored measurements used a scratch copy of `.git/index` via `GIT_INDEX_FILE`. Per
the `harny-audit` write scope, this auditor edited **only** this file; no finding was fixed
in place, and no task in `tasks.md` was ticked on the executor's behalf.
