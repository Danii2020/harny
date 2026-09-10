# Roadmap: sdd-skill-library

> **How to read this file.** Every phase cites the `contract.md` guarantees and `intent.md`
> goals it discharges. The repo default is test-first (`AGENTS.md` § "Working
> conventions"), so the one guard test is written red in Phase 1, before any of the
> structure it guards exists, and the post-red-tests human gate sits inside that phase.
>
> **Why five phases, not the schema's four.** The scaffold's "Core Logic" step is genuinely
> two independent bodies of work here — extracting five existing role bodies (Phase 2) and
> building a knowledge base that did not previously exist (Phase 3) — with different
> failure modes and different reviewers. Splitting them also creates a real rollback
> point: **after Phase 2 the pipeline still runs exactly as it does today**, because the
> agent files are not thinned until Phase 4. Given the workshop is 18 days out, that
> property is worth a phase boundary.
>
> **Ordering rationale.** Phase 1 proves the shape contract, the symlink bridge and the
> `.gitignore` change on **one** small skill before eight depend on them. Phase 4 — thinning
> the five agent files — is the only step that changes observable pipeline behavior, so it
> comes last and is preceded by everything it depends on.

## Implementation Phases

### Phase 1: Foundation — shape contract, bridge, durability

**Goal**: Prove, on a single skill, that the three mechanisms this whole feature rests on
actually work: the portable skill shape, the `.agents/` → `.claude/` symlink bridge, and
the `.gitignore` amendment that makes both survive a clone.
**Dependencies**: None.
**Estimated complexity**: Medium. The files are small; the risk is that a wrong
`.gitignore` ordering or a non-relative symlink silently produces a repo that looks
correct and has no working pipeline on a fresh clone.
**Discharges**: G2, G3, G6, G10; guarantees 1, 2, 3, 18, 19.

1. **Record pre-change evidence** (needed by Phases 3 and 5, and unrecoverable later):
   SHA-256 of all 20 files in the four shipped `specs/*/` directories; SHA-256 of the five
   `.claude/agents/sdd-*.md`, of `.claude/skills/sdd-conductor/SKILL.md`, and of every file
   under `templates/`, `src/`, `bin/`, plus `package.json` / `package-lock.json`. Store in
   `tasks.md` under a Baseline section.
2. Write `tests/helpers/frontmatter.ts` — `readFrontmatterKeys(source): Map<string,string>`,
   a minimal top-level key reader, the exact analogue of the existing hand-rolled
   `tests/helpers/toml-decode.ts`. **No YAML dependency.**
3. Write `tests/skill-library.test.ts` **red** (nothing it asserts exists yet): bridge
   bijection; every `.claude/skills/harny-*` is a symlink by `lstat` whose `realpath`
   equals the matching `.agents/skills/harny-*`; every link text is relative; every
   `.agents/skills/harny-*/SKILL.md` frontmatter uses only the six portable keys (V5) and
   no V6 key; every `description` is non-empty and ≤ 1,536 chars; no `harny-*` entry under
   `.claude/skills/` is a regular directory. Discover both sets by **glob**, never a
   hardcoded list.
4. **Human gate: post-red-tests.** Confirm each assertion fails for the right reason
   (missing structure), not a test bug.
5. Create `.agents/skills/README.md` — the `harny-*` shape contract from `contract.md`
   § "The `harny-*` skill shape contract", verbatim in substance: the six permitted
   frontmatter keys, the five required body sections, and the seven binding rules.
6. Add `## Coding standards` to `AGENTS.md` with S1–S7, each written as a rule plus the
   artifact that establishes it. This is additive; § "Working conventions" is not edited
   here (its `AGENTS.md:49–50` sentence is edited in Phase 4).
7. Create `.agents/skills/harny-standards/SKILL.md` — the pilot skill, deliberately the
   smallest. It is a **pointer plus the per-role checklist**, never a copy of S1–S7, and
   it names its target portably ("this project's conventions document — `AGENTS.md`,
   `CLAUDE.md`, or the project's equivalent"; `AGENTS.md` here).
8. Create the bridge symlink `.claude/skills/harny-standards` →
   `../../.agents/skills/harny-standards`, **relative**, created with `ln -s` from inside
   `.claude/skills/`.
9. Apply the `.gitignore` amendment exactly as pinned in `contract.md` § State Changes,
   **as corrected by § Amendment A2**: there is no `specs/` exclusion block at all — the
   whole `specs/` tree, including in-flight `specs/<feature>/` work, is tracked. Only the
   `.claude/` pattern set (still `.claude/*` + `!.claude/skills/` + `.claude/skills/*` +
   `!.claude/skills/harny-*`) is applied here; ordering within it is load-bearing (later
   patterns win).
10. **Verify the durability claim rather than assume it**: `git status --porcelain --ignored`
    must show `.claude/agents/`, `.claude/settings.local.json`,
    `.claude/skills/sdd-conductor/` and `.claude/skills/high-value-tests/` still ignored
    — **per § Amendment A2, in-flight `specs/<feature>/` is no longer expected to be
    ignored; it is tracked**; `git ls-files -s` must show `.claude/skills/harny-standards`
    at mode `120000`. This step is the security-adjacent check that the amendment did not
    start tracking local settings — that check (`.claude/settings.local.json` still
    ignored) is unchanged and still required.

### Phase 2: Extraction — the five role skills

**Goal**: Move all five role bodies into action-shaped skills with no semantic loss, and
account for every source line. The agent files are **not** touched in this phase, so the
pipeline continues to run exactly as it does today.
**Dependencies**: Phase 1.
**Estimated complexity**: Medium–High. The mechanics are simple; the difficulty is
discipline. Every prior audit in this repo found its worst issues in "faithful move"
work (`canonical-role-templates` AL-1, AL-3, AL-9 were all reconciliation defects).
**Discharges**: G1, G2; guarantees 1, 2, 3, 7.

1. Create `harny-propose` from `sdd-architect.md:8–255`, applying **X1** (below): the five
   inlined spec templates are replaced by a portable pointer to the project's spec-schema
   templates. Add **Step 0** — invoke `harny-sync` lookup and treat the brief as binding
   context; a draft contradicting a returned statement must say so and justify it in
   `intent.md`.
2. Create `harny-test` from `sdd-test-writer.md:8–105`, applying **X2**: the hardcoded
   `.claude/skills/high-value-tests/SKILL.md` becomes a reference to the
   `high-value-tests` skill **by name**.
3. Create `harny-implement` from `sdd-executor.md:16–84`, adding the `harny-standards`
   step (contract § "Two additions made during extraction").
4. Create `harny-audit` from `sdd-auditor.md:16–144`, adding the `harny-standards`
   compliance check as an audit step under the existing severity ratings.
5. Create `harny-document` from `sdd-documentation.md:16–58`, applying **X3**: the
   "Do NOT move, rename, or delete" sentence is superseded — the `Shipped:` stamp still
   happens **in place**, then the role hands off to `harny-sync` archive mode.
6. Create the five bridge symlinks in `.claude/skills/`.
7. Fill in the **reconciliation table** below for real, line by line, and confirm the
   accounting closes: every source line is placed, or carries an `X`-id and a
   justification. An unaccounted line is a Phase-2 failure, not a Phase-5 finding.
8. Re-run `tests/skill-library.test.ts`: six of eight skills now present; the bijection
   and shape assertions pass for those six.

### Phase 3: The knowledge base — migration, `harny-sync`, `harny-adr`

**Goal**: Move four shipped features into `specs/archived/` without losing a byte, stand up
a populated `specs/current/`, and ship the two skills that maintain it.
**Dependencies**: Phase 1 (`.gitignore`). Independent of Phase 2 except that
`harny-propose` Step 0 needs `harny-sync` to exist before Phase 4.
**Estimated complexity**: High. The migration is irreversible in feel (though not in fact,
given the checksums), and populating five capability docs with *real, cited* current truth
means re-reading roughly 5,000 lines of archived specs. This is the phase most likely to
be under-done by producing plausible-looking placeholders.
**Discharges**: G4, G5, G7, G8; guarantees 9, 10, 11, 12, 13, 14, 15, 16, 17, 18.

1. Create `specs/archived/README.md` carrying the single path-redirect rule verbatim from
   `contract.md`.
2. Move the four directories with `mv` (they are untracked today, so `git mv` does not
   apply), then **re-verify every one of the 20 SHA-256 values** from Phase 1.1. Any
   mismatch: restore and stop.
3. Assert history survived explicitly, not by assumption: `AUDIT PASS 2` still present in
   `specs/archived/cli-skeleton/audit.md`, `Final Verdict — pass 2` still present in
   `specs/archived/cursor-kiro-copilot-generators/audit.md`, and all four `Shipped:`
   headers intact in their original (inconsistent) formatting.
4. Create the five capability directories and write each `capability.md` against the
   contract's schema **(this per-capability-subfolder + `capability.md` shape was later
   flattened to `specs/current/<capability>.md` — see `contract.md` § Amendment A3,
   post-archive exception, human-authorized 2026-09-09)**. Every current-behavior
   statement gets a stable ID and a **provenance citation to an archived artifact**.
   Source material, by capability: `spec-workflow` and
   `pipeline-roles` from `canonical-role-templates/{contract,audit}.md`; `cli-init` from
   `cli-skeleton/contract.md` guarantees 1–23; `tool-generators` from `cli-skeleton` plus
   `cursor-kiro-copilot-generators` guarantees 1–14 plus `codex-generator`;
   `skill-library` from this feature's own contract.
5. Seed § "Open reservations" across the capability docs from the archived audits —
   at minimum AL-19, AL-20, AL-30 and CG-1, each with its severity and source file.
6. Write `specs/current/_index.md`: the five tables, ≤ 150 lines, with a
   § "Keyword lookup" of **at least 20 rows** drawn from the archived contracts'
   vocabulary. Verify the routing works by picking three real questions this spec had to
   answer during exploration and confirming the index routes each to the right capability
   in one read.
7. Create `.agents/skills/harny-sync/SKILL.md` — both modes, the three triggers, the
   4-file read bound, the archive preconditions, the merge-not-overwrite rule, and the
   restore-on-checksum-mismatch behavior.
8. Create `.agents/skills/harny-adr/SKILL.md` and its bundled `adr-template.md` — the four
   significance criteria, the 7-per-feature cap, global monotonic numbering by scanning
   `specs/archived/*/decisions/`, and the no-backfill rule.
9. Create the two remaining bridge symlinks. `tests/skill-library.test.ts` now goes fully
   green.

### Phase 4: Integration — thin the agents

**Goal**: Make the five agents thin, wire the `skills:` preloads, and land the two
supersession edits. This is the only phase that changes what a pipeline user observes.
**Dependencies**: Phases 2 and 3 (every referenced skill must already exist — a missing
skill is *skipped with a warning*, V9, so a wrong order here degrades silently).
**Estimated complexity**: Medium. Small diffs, high blast radius.
**Discharges**: G1, G6, G9, G11; guarantees 4, 5, 6, 13.

1. For each of the five agent files: keep `name`, `description`, `model`, `color` and
   `tools` **byte-identical**; add the `skills:` list from the contract's per-role table;
   replace the body with the ≤ 25-line pointer body.
2. Include the **mandatory "If a skill is missing" guard** in all five bodies. This is the
   only defense against V9's silent degradation; a file without it fails guarantee 4.
3. Diff each frontmatter against the Phase 1.1 baseline to prove rule 1 held. In
   particular `sdd-architect`'s `description` contains `<example>` blocks and
   `sdd-auditor`'s `tools` scopes writes — neither may be "tidied".
4. Edit `AGENTS.md:49–50` per contract § SUPERSEDES: the spec directory is stamped in
   place and then moved by `harny-sync` archive mode; never moved by any other means and
   never edited once archived. Add the pointer to the named
   `templates-skill-library-parity` follow-up so the `templates/` divergence is documented
   at the point a reader would notice it.
5. Confirm the conductor needs **no** change: `grep` `.claude/skills/sdd-conductor/SKILL.md`
   for the five agent names and verify each still resolves; verify the file is
   byte-identical to its Phase 1.1 hash.

### Phase 5: Validation

**Goal**: Prove the guarantees rather than assert them, and state precisely what could not
be proven in-session.
**Dependencies**: Phase 4.
**Estimated complexity**: Medium.
**Discharges**: G3, G8, G9, G10, G12; guarantees 5, 6, 8, 19, 20.

1. `tests/skill-library.test.ts` green: 8 skills, 8 symlinks, bijection, portable keys
   only, all descriptions within 1,536.
2. **Byte-identity sweep** against the Phase 1.1 baseline: `templates/**`, `src/**`,
   `bin/**`, `package.json`, `package-lock.json`, and
   `.claude/skills/{sdd-conductor,high-value-tests}/SKILL.md` all unchanged (guarantees 6, 8).
3. `npm run typecheck` and `npm test` clean, including `tests/packaging.test.ts` unchanged
   — `npm pack --dry-run` must still exclude `specs/` and show byte-identical dependency
   lists (guarantee 20).
4. Durability check (guarantee 19, **as corrected by § Amendment A2**): `git ls-files`
   includes **all** of `specs/**` — `specs/current/**`, `specs/archived/**` **and in-flight
   `specs/<feature>/**`** — plus `.agents/skills/**` and the eight mode-`120000` entries,
   and excludes `.claude/agents/**` (in-flight specs are no longer expected to be
   excluded; they are tracked).
5. Line-count check (SC1): each agent body ≤ 25 lines; the five files' combined length
   under 200 lines, down from 646.
6. Reconciliation closure (SC2/guarantee 7): the auditor re-derives the table
   independently rather than accepting it — every line of the five pre-change files
   (recoverable from the Phase 1.1 baseline) is placed or justified.
7. **[HUMAN, cannot be done in this session]** Live-discovery verification of V4: restart
   Claude Code in this repo and confirm `/harny-propose` … `/harny-standards` are listed
   and invocable via the symlinks, and that a subagent launch preloads its `skills:`
   without a warning. Documentation says this works (V4, V9); observing it requires a
   session restart. Record the outcome in `audit.md`; this is the feature's single
   un-closable-in-session check.
8. **Human gate: post-audit.**
9. On approval, the documentation hand-off runs — and in doing so becomes the first
   end-to-end exercise of the new lifecycle (G12): `harny-document` → `harny-sync` archive
   → `harny-adr` → `harny-sync` index regeneration. If that sequence cannot archive this
   feature, Phase 3 is not done.

## Extraction reconciliation table (guarantee 7, SC2)

Filled in for real during Phase 2.7. `→` means "moves to, unchanged in substance".

| Source | Lines | Destination | Notes |
|---|---|---|---|
| `sdd-architect.md` | 1–7 | agent frontmatter | byte-identical; `skills:` added |
| | 8 | agent body (identity paragraph) | |
| | 10–16 | `harny-propose` § Inputs | Project Context; reuse-existing-code; verify-via-Context7 |
| | 17–25 | `harny-propose` intro + § Steps 1 | mission; kebab-case name; read a written brief |
| | 27–39 | `harny-propose` § Steps 2 | exploration protocol |
| | 41–46, 244 | `harny-propose` § Steps 3 | emit five files into `specs/<feature>/` |
| | **47–243** | **dropped — see X1** | the five inlined spec templates |
| | 245–255 | `harny-propose` § Guardrails | one-at-a-time review; the three traceability rules; real-language rule |
| `sdd-test-writer.md` | 1–7 | agent frontmatter | |
| | 8–13 | `harny-test` intro + § Guardrails | "no unnecessary tests" rule |
| | 14–22 | `harny-test` § Inputs | |
| | 24–43 | `harny-test` § Steps | **X2** applies at :27 |
| | 44–86 | `harny-test` § Steps | test plan, principles, placement |
| | 87–105 | `harny-test` § Steps + Guardrails | audit tracking; red-phase verification |
| `sdd-executor.md` | 1–14 | agent frontmatter | byte-identical; `skills:` added |
| | 16 | agent body (identity paragraph) | |
| | 18–24 | `harny-implement` § Inputs | Project Context; + `harny-standards` invocation |
| | 26–57 | `harny-implement` intro + § Steps | Your Mission; Steps 1–3 (read specs, validate prerequisites, execute phase by phase) |
| | 58–75 | `harny-implement` § Guardrails + § Steps | Step 4 Adherence Rules (contract-is-law; no scope creep) folded into Guardrails; Step 5 Progress Reporting folded into Steps |
| | 76–84 | `harny-implement` § Steps (final checklist) | + S1–S6 checklist reference; timestamp instruction |
| `sdd-auditor.md` | 1–14 | agent frontmatter | byte-identical; `skills:` added |
| | 16 | agent body (identity paragraph) | |
| | 18–31 | `harny-audit` § Inputs | Your Mission; Step 1 Read All Spec Files |
| | 33–95 | `harny-audit` § Steps 1–6 (of this skill's 7) | Steps 2–7 source-numbered (Examine Implementation, Contract/Intent/Task/Test-Coverage audits, Produce Report header) + a `harny-standards` compliance step added |
| | 96–131 | `harny-audit` § Steps (report body) | report tables; Final Verdict template |
| | 132–144 | `harny-audit` § Guardrails | severity ratings; "report, don't fix" |
| `sdd-documentation.md` | 1–14 | agent frontmatter | byte-identical; `skills:` added |
| | 16 | agent body (identity paragraph) | |
| | 18–38 | `harny-document` § Inputs + Steps | trigger check; three inputs |
| | 39–44 | `harny-document` § Steps | **X3** applies at :44 |
| | 45–49 | `harny-document` § Steps | bootstrap rule |
| | 50–58 | `harny-document` § Guardrails + Steps | verified-only; never touch code; summary |

**Recorded deviations** (the only three permitted; anything else found in Phase 2 must be
added here before it is made):

- **X1 — the architect's five inlined spec templates (`sdd-architect.md:47–243`, 197 of its
  255 lines) are replaced by a portable pointer.** Justification: this is the exact
  duplication `intent.md` problem-statement item 2 exists to remove, and
  `specs/archived/canonical-role-templates/audit.md` AL-2/C9 already records that these
  two copies **had drifted** and needed a contract amendment to reconcile. The canonical
  `templates/roles/sdd-architect.md` already resolved this the same way under AL-5, which
  additionally requires that a *deployed* role keep the schema reachable — so the pointer
  must be phrased portably ("the project's spec-schema templates: `templates/spec-schema/`
  in this repo, `.sdd/spec-schema/` in a repo scaffolded by `npx harny init`"), never as a
  bare relative path. **Guard:** if the schema templates are unreachable, `harny-propose`
  STOPS and reports; it never improvises a spec format from memory. Without that guard
  this drop is not acceptable.
- **X2 — `sdd-test-writer.md:27`'s literal `.claude/skills/high-value-tests/SKILL.md`
  becomes a by-name reference.** Justification: shape rule 5; a file whose canonical home
  is the tool-neutral `.agents/skills/` must not hardcode one tool's directory. This is
  the regression class `canonical-role-templates` AL-4/AL-9 identified and fixed. Coverage
  is not lost: the agent additionally preloads `high-value-tests` via `skills:`.
- **X3 — `sdd-documentation.md:44`'s "Do NOT move, rename, or delete" is superseded**, per
  `contract.md` § SUPERSEDES, scoped to the live pipeline only. The `Shipped:` stamp still
  happens in place and before the move; only the subsequent hand-off is new.

**Post-audit correction (AL-S4, not a fourth deviation).** The docs-lookup instruction
carried by all three canonical `templates/roles/` counterparts (`sdd-architect.md:22`,
`sdd-executor.md:24`, `sdd-test-writer.md:37`) was omitted from `harny-test` and
`harny-implement` during Phase 2, and survived in `harny-propose` only without its
portability qualifier ("(or the target tool's equivalent docs-lookup MCP)") — an S7
violation (AL-S5), not a deliberate extraction choice. Both were Phase-2 omissions, now
corrected: the instruction is restored to `harny-test` § Steps 2 and `harny-implement`
§ Inputs **verbatim**, character-for-character identical to
`templates/roles/sdd-test-writer.md:37` and `sdd-executor.md:24` respectively — so this
does **not** qualify as a fourth deviation (X4) under this contract's "differs at all from
a pure verbatim move" test. `harny-propose:59`'s portability qualifier was restored in the
same edit that fixes AL-S5.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Claude Code does not, in practice, discover a symlinked project skill** — the single load-bearing claim (V4) | Low | **High** | Documented first-party and dated (V4). Cannot be observed without a session restart, so it is isolated as Phase 5.7, a named `tasks.md` item and an `audit.md` reservation — never presented as done. Fallback if it fails: make `.claude/skills/harny-*` regular directories and `.agents/skills/` the symlink, inverting the bridge; the shape contract and everything else is unaffected |
| **A thin agent runs with no instructions**, because a missing/disabled skill is skipped with only a warning (V9) | Med | **High** | Three independent defenses: the mandatory "If a skill is missing → STOP" guard in all five bodies (guarantee 4); the symlinks are git-tracked so a clone cannot lose them (V12, guarantee 19); `tests/skill-library.test.ts` fails on a dangling or non-symlink entry |
| **Extraction silently loses an instruction** — the failure mode every prior "faithful move" in this repo actually hit (AL-1, AL-3, AL-9) | **Med** | High | Line-range accounting in the reconciliation table with the source hashes captured in Phase 1.1; only three named deviations permitted; Phase 5.6 has the auditor re-derive the table independently rather than accept it |
| **X1's pointer does not resolve at run time**, so the architect emits malformed specs — the AL-5 hazard, realized | Low | High | The pointer is phrased portably for both this repo and a scaffolded one, and `harny-propose` must STOP rather than improvise. AL-5's own resolution text is the model |
| **Migration truncates or mangles audit history** | Low | High | SHA-256 of all 20 files captured before and re-verified after (guarantee 9); explicit content assertions for both pass-2 markers (Phase 3.3); restore-and-stop on mismatch |
| **The `.gitignore` amendment starts tracking something local** — e.g. `.claude/settings.local.json` | Low | Med | Pattern set executed in a sandbox before being pinned (V10–V12), and re-verified in the repo at Phase 1.10 with `git status --porcelain --ignored` before any commit |
| **Capability docs are populated with plausible placeholders instead of cited truth** — the quiet way Phase 3 fails | **Med** | Med | Guarantee 15 requires provenance on *every* statement, citing an archived artifact; SC12 forbids a placeholder doc; the auditor can spot-check any citation against the archive |
| **The knowledge base goes stale** — sync not run, or `_index.md` hand-edited | Med | Med | T3 makes archive automatic in the documentation hand-off; `_index.md` carries "Maintained by `harny-sync`; do not hand-edit" and a `Last synced` date; the error-handling contract makes the capability doc authoritative so a stale index cannot corrupt the detailed record |
| **The capability taxonomy misroutes lookups** | Med | Low–Med | ≥20-row keyword table; the honest "no current-truth coverage for X" failure path instead of a fabricated brief; the taxonomy is data, revisable without touching any skill |
| **ADR inflation**, turning the log into noise | Med | Low | Four objective significance criteria, a hard cap of seven per feature, and the explicit no-backfill decision for the four migrated features |
| **Scope creep into `templates/` or the generators**, which this restructure makes tempting | Med | Med | Explicit non-goal; guarantee 8 asserted by a byte-identity sweep against the Phase 1.1 baseline (Phase 5.2), not by intention |
| **The ~92 stale `specs/<feature>/…` citations mislead a future agent** | Med | Low | One redirect rule stated once in `specs/archived/README.md` and in `_index.md`; recorded as an accepted non-goal with a named follow-up rather than a 92-line mechanical diff |
| **Preloading several skills bloats each subagent's context** | Med | Low–Med | Each agent preloads at most three skills, and X1 removes 197 lines from the largest role — so the architect's startup context is *smaller* than today's monolith, not larger. Worth measuring in Phase 5 |
| **The `.gitignore` change breaks a test owned by an archived feature**, because that test used "no uncommitted state under `.claude/`" as a proxy for "nothing mutated `.claude/`" | **Realized in Phase 5.3** | Med | Resolved by `contract.md` § Amendment A1: the T41 check becomes a before/after differential, which is strictly *stronger* for `.claude/` than the assertion it replaces. Scope is one describe block plus a header line; the file's other eight blocks — spanning three archived features — stay byte-identical. Generalizable lesson for the parity follow-up: any assertion that leans on a path being gitignored is coupled to `.gitignore` and will break when the ignore set legitimately changes |
| **The workshop is 18 days out and Phase 4 changes live behavior** | Med | High | Phase 2 is a deliberate rollback point: skills exist, agents unchanged, pipeline runs as today. Phase 4 is small, gated, and reversible by restoring five files from the Phase 1.1 baseline |

## File Change Map

**Create — canonical skills (Phases 1–3)**
- `.agents/skills/README.md` — CREATE — the `harny-*` shape contract; the extension point.
- `.agents/skills/harny-standards/SKILL.md` — CREATE — pointer + per-role checklist (P1).
- `.agents/skills/harny-propose/SKILL.md` — CREATE — from `sdd-architect`, incl. Step 0 (P2).
- `.agents/skills/harny-test/SKILL.md` — CREATE — from `sdd-test-writer` (P2).
- `.agents/skills/harny-implement/SKILL.md` — CREATE — from `sdd-executor` (P2).
- `.agents/skills/harny-audit/SKILL.md` — CREATE — from `sdd-auditor` (P2).
- `.agents/skills/harny-document/SKILL.md` — CREATE — from `sdd-documentation` (P2).
- `.agents/skills/harny-sync/SKILL.md` — CREATE — lookup + archive (P3).
- `.agents/skills/harny-adr/SKILL.md` — CREATE — ADR authoring (P3).
- `.agents/skills/harny-adr/adr-template.md` — CREATE — bundled resource (P3).

**Create — bridge symlinks** (relative, `../../.agents/skills/<name>`)
- `.claude/skills/harny-standards` (P1); `harny-propose`, `harny-test`, `harny-implement`,
  `harny-audit`, `harny-document` (P2); `harny-sync`, `harny-adr` (P3) — 8 total.

**Create — knowledge base (Phase 3)** — *paths below are as originally shipped; the
per-capability-subfolder shape was flattened to `specs/current/<capability>.md` by
`contract.md` § Amendment A3 (post-archive exception, human-authorized 2026-09-09)*
- `specs/archived/README.md` — CREATE — the path-redirect rule.
- `specs/current/_index.md` — CREATE — five tables, ≤150 lines.
- `specs/current/spec-workflow/capability.md` — CREATE.
- `specs/current/pipeline-roles/capability.md` — CREATE.
- `specs/current/skill-library/capability.md` — CREATE.
- `specs/current/cli-init/capability.md` — CREATE.
- `specs/current/tool-generators/capability.md` — CREATE.

**Create — tests (Phase 1)**
- `tests/helpers/frontmatter.ts` — CREATE — `readFrontmatterKeys`; no dependency added.
- `tests/skill-library.test.ts` — CREATE — bridge + shape guard.

**Modify — tests (Phase 5, added by `contract.md` § Amendment A1)**
- `tests/canonical-fidelity.test.ts` — MODIFY — **only** the T41 `non-mutation:` describe
  block (lines 176–185): the absolute `git status --porcelain -- templates .claude` emptiness
  assertion becomes a before/after differential across the suite's `runInit` calls, plus one
  header-comment line recording the amendment round. The other eight describe blocks —
  including the `single-source:` block at line 153 that **also** carries the `(T41)` tag —
  are byte-identical.

**Move — 20 files, byte-identical (Phase 3.2)**
- `specs/canonical-role-templates/{intent,contract,roadmap,tasks,audit}.md` → `specs/archived/canonical-role-templates/`
- `specs/cli-skeleton/{…}` → `specs/archived/cli-skeleton/` — incl. `AUDIT PASS 2`
- `specs/cursor-kiro-copilot-generators/{…}` → `specs/archived/cursor-kiro-copilot-generators/` — incl. the pass-2 verdict
- `specs/codex-generator/{…}` → `specs/archived/codex-generator/`

**Modify**
- `.claude/agents/sdd-architect.md` — MODIFY — frontmatter byte-identical + `skills:`; body 247 → ≤25 lines (P4).
- `.claude/agents/sdd-test-writer.md` — MODIFY — same shape; body 97 → ≤25 (P4).
- `.claude/agents/sdd-executor.md` — MODIFY — same shape; body 68 → ≤25 (P4).
- `.claude/agents/sdd-auditor.md` — MODIFY — same shape; body 128 → ≤25 (P4).
- `.claude/agents/sdd-documentation.md` — MODIFY — same shape; body 42 → ≤25 (P4).
- `AGENTS.md` — MODIFY — add `## Coding standards` (S1–S7, P1.6); amend lines 49–50 per § SUPERSEDES and name the parity follow-up (P4.4).
- `.gitignore` — MODIFY — the V10/V11 pattern set; ordering load-bearing (P1.9).

**Explicitly NOT modified** (guarantees 6, 8 — asserted in Phase 5.2, not assumed)
- `templates/**` — read-only input, including `templates/roles/sdd-documentation.md`, which
  stays deliberately divergent per § SUPERSEDES.
- `src/**`, `bin/**`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`.
- `.claude/skills/sdd-conductor/SKILL.md` and `.claude/skills/high-value-tests/SKILL.md`.
- The 20 archived spec files' **contents** — moved, never edited, including their ~48
  internal `specs/<feature>/…` citations.
- `tests/**` other than the two new files **and the single amended block in
  `tests/canonical-fidelity.test.ts`** (`contract.md` § Amendment A1 — the T41 non-mutation
  check at lines 176–185, plus one header-comment line; its other **eight** describe blocks
  stay byte-identical). In particular `tests/packaging.test.ts`, whose `specs/` exclusion
  and dependency assertions must keep passing untouched.
- `plan.md` — a historical planning record; its §2 five-monolith table is corrected in
  `contract.md` § D4, not edited.
- `README.md`, `CHANGELOG.md` — see below.

**Deferred to `sdd-documentation` (post-audit, automatic — not this feature's work)**
- `README.md` § "What's actually running today" — the five agents are thin and delegate to
  eight `harny-*` skills; document `.agents/skills/` + the bridge, and the
  `specs/{current,archived}/` layout.
- `CHANGELOG.md` — a new `Added` entry for the skill library, the knowledge base and the
  migration; a `Changed` entry for the thinned agents and the `.gitignore` amendment.
- `AGENTS.md` — the narrative sections describing the live pipeline (distinct from this
  feature's own § "Coding standards" and § SUPERSEDES edits, which are Phase 1.6 and 4.4).
- `specs/sdd-skill-library/intent.md` — stamped with a `Shipped: <date>` header, in place,
  **before** `harny-sync` archives this directory.

## Deferred work (recorded, not scheduled)

- **`templates-skill-library-parity`** — the named follow-up from `contract.md`
  § SUPERSEDES. Propagate the skill-library shape and the archived/current lifecycle into
  `templates/` and the five generators, so a scaffolded pipeline gets thin agents too and
  `templates/roles/sdd-documentation.md` stops disagreeing with the live role. This is the
  largest deferred item and the reason the divergence is acceptable rather than permanent.
- **Rewriting the ~92 stale spec-path citations** in `tests/**`, `src/vocabulary.ts`,
  `src/templates.ts` and `CHANGELOG.md`. Deferred as a zero-behavior-change diff across 25
  files; handled meanwhile by the redirect rule.
- **Promoting `high-value-tests` into `.agents/skills/`** as a shared, tool-neutral skill.
  It is `harny-*`-shaped in everything but name; renaming it would break the canonical
  `templates/roles/sdd-test-writer.md` reference, so it belongs with the parity work.
- **Backfilling ADRs for the four archived features.** Deliberately not done here (contract
  § harny-adr); if ever done, it should be human-authored from the archived audit logs
  rather than agent-reconstructed.
- **A `harny sync` / `harny adr` CLI subcommand.** Explicit non-goal now; worth revisiting
  only if the skills prove useful outside an agent session.
- **Measuring subagent startup context size** before and after preloading, to confirm the
  expectation recorded in the risk table.
