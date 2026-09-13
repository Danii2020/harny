# Roadmap: templates-skill-library-parity

> Every phase names the `contract.md` guarantees (`Gu N`), decisions (`D1`–`D4`),
> supersessions (`S1`–`S6`) and `intent.md` goals (`G1`–`G12`) it discharges.

## Implementation Phases

### Phase 1: Canonical content — `templates/skills/`

**Goal**: Produce the eleven-file `templates/skills/` tree (Gu 4–8, Gu 12, Gu 13, Gu 30),
target-repo-neutral per the DC-1/DC-2/DC-3 divergence classes, with the divergence table
in `contract.md` § Data Models filled in row by row from what was actually written.
**Dependencies**: None — this phase touches no TypeScript.
**Estimated complexity**: Medium (judgment-heavy, mechanically simple)

1. Copy each `.agents/skills/harny-*/` directory to `templates/skills/harny-*/`, including
   the two bundled resources (`harny-sync/capability-template.md`,
   `harny-adr/adr-template.md`).
2. Neutralize `templates/skills/harny-standards/SKILL.md` under DC-1 — the heaviest edit.
   Its steps currently enumerate `S1` (TypeScript/ESM/`.js` specifiers) through `S6`
   (tests mirror `src/`, `Spec:`/`Covers:` header). Replace with the checklist *shape*
   plus an instruction to read the target repo's own conventions document, naming no
   language, no test runner and no standard id.
3. Neutralize `harny-document` and `harny-sync` under DC-2/DC-3: drop the dated in-repo
   ADR-registry anecdote from `harny-sync`, and state the archive hand-off without
   assuming harny's own `specs/current/` history.
4. Sweep the remaining five skills for DC-2 residue (harny-only paths, `src/generators/…`
   line citations, `AGENTS.md` § "Coding standards").
5. Write `templates/skills/README.md` from `.agents/skills/README.md`, rewriting
   "Adding a ninth skill" under DC-3: create a real directory in each root this run wrote
   to, never `ln -s` into `.claude/skills/`.
6. Verify by hand, before any code exists: six-key frontmatter only; folder name equals
   `name:`; `description` ≤1,024; `compatibility` ≤500; five body sections in order.
7. Fill in `contract.md`'s divergence table so every deviation has a declared class and a
   row — this is the input Phase 4's fidelity test asserts against.

**Discharges**: G1, G2 (content half), Gu 4, Gu 5, Gu 6, Gu 7, Gu 8, Gu 12, Gu 13, Gu 30,
D1 (the key is kept, uniformly), S6.

### Phase 2: Vocabulary, loading, and the `skillsDir` seam

**Goal**: Make the canonical tree reachable in typed form and give each generator its
root. No behavior change is observable yet.
**Dependencies**: Phase 1
**Estimated complexity**: Low

1. `src/vocabulary.ts`: add `CORE_SKILL_IDS`, `OPTIONAL_SKILL_IDS`, `SKILL_IDS`,
   `SkillId`/`CoreSkillId`/`OptionalSkillId`, `DEFAULT_OPTIONAL_SKILL_IDS`,
   `SKILLS_README_NAME`. Import nothing (Gu 28).
2. `src/templates.ts`: add `SkillResource`, `SkillTemplate`; extend `CanonicalTemplates`
   with `skills` and `skillsReadme`; load each `templates/skills/<id>/` that exists,
   reading `SKILL.md` plus every sibling regular file at that one level, **sorted by
   name**, as opaque bytes. Write no parser and no validator here (Gu 9).
3. `src/generators/types.ts`: add `readonly skillsDir: string` with the doc comment from
   `contract.md` § Public API (D3, S1).
4. Set the five values: `.claude/skills`, `.agents/skills`, `.kiro/skills`,
   `.agents/skills`, `.agents/skills` (Gu 2, D2). One added field per generator file and
   nothing else, preserving `tool-generators.md` invariant 3.

**Discharges**: G9, Gu 2, Gu 28, Gu 29, D2, D3, S1.

### Phase 3: Selection, planning, and emission

**Goal**: `npx harny init` writes skills, deduped by distinct root, selectable by flag and
prompt, through the existing write pipeline.
**Dependencies**: Phase 2
**Estimated complexity**: Medium

1. `src/config.ts`: add `skills` to `HarnessConfig` and `optionalSkillIds` to
   `PartialHarnessConfig`; add `parseSkillList`; extend `defaultConfig` with
   `[...CORE_SKILL_IDS, ...DEFAULT_OPTIONAL_SKILL_IDS]`; extend `validateConfig` and
   `mergeConfig` so the core six are re-added unconditionally (Gu 14, Gu 16).
2. `src/config.ts`: extend `serializeConfig` (emit `skills` after `gates`) and
   `loadConfigFile` (translate a persisted `skills` array to `optionalSkillIds` by
   intersecting with `OPTIONAL_SKILL_IDS`), keeping `CONFIG_VERSION` at 1 (Gu 17).
3. `src/engine.ts`: add `skills`/`skillsReadme` to `HarnessPayload`; raise
   `HarnessError('TEMPLATE')` in `buildPayload` for a selected skill with no loaded
   template, worded like the existing role branch at `src/engine.ts:54–58`.
4. `src/engine.ts`: implement `skillRootsFor` (dedupe + sort resolved generators'
   `skillsDir`) and `buildSkillFiles` (per root: README, then each skill in `SKILL_IDS`
   order, then each file in `name` order; contents verbatim) — Gu 3, Gu 9, Gu 10, Gu 18.
5. `src/cli.ts`: add `--skills <list>`; map it to `overrides.optionalSkillIds`.
6. `src/prompts.ts`: insert Q3 (optional-skill multiselect, `required: false`,
   `initialValues` from `DEFAULT_OPTIONAL_SKILL_IDS`), shifting the old Q3–Q5 to Q4–Q6;
   reuse the preset-skip-and-report branch verbatim.
7. `src/init.ts`: widen step 11 with the third emission clause and extend step 6's
   interactive re-check to warn when a flag-supplied optional skill was deselected at the
   new prompt — the exact counterpart of the existing `roleOverrides` warning (Gu 15,
   Gu 21, S3).
8. Confirm nothing in `src/writer.ts` changes: skill artifacts are ordinary
   `GeneratedFile`s and inherit conflict detection, containment, `--dry-run` and `--force`
   for free (Gu 19, Gu 20).

**Discharges**: G3, G5, G7, Gu 3, Gu 14, Gu 15, Gu 16, Gu 17, Gu 18, Gu 19, Gu 20, Gu 21,
Gu 23, S3.

### Phase 4: Reconvergence, packaging, and validation

**Goal**: Close the archive-lifecycle contradiction, amend the closed manifests, and prove
every guarantee.
**Dependencies**: Phase 3
**Estimated complexity**: Medium

1. Edit `templates/roles/sdd-documentation.md` lines 6, 19 and 43 to the SW-7
   stamp-then-archive lifecycle (S5, Gu 25). This is the single permitted canonical-body
   content change (Amendment A1).
2. Update `tests/packaging.test.ts`'s `EXPECTED_TEMPLATE_FILES` from eleven entries to
   twenty-two (S4, Gu 26).
3. Update `tests/e2e-init.test.ts`'s exact expected path sets for the `claude-code`,
   `cursor`, `kiro`, `github-copilot`, `codex` and all-five cases to the counts in
   `contract.md` § Data Models — artifact counts (21 / 33 / 63 / 69 / 60).
4. Add the `templates/skills/` shape suite: six-key frontmatter, folder-name-equals-`name`,
   `description` ≤1,024, `compatibility` ≤500, five body sections in order (Gu 4–8).
5. Add the dedup suite: three roots for all five tools; one root for
   `cursor,codex,github-copilot`; the exact `.claude`/`.kiro` split (Gu 3, Gu 2).
6. Add the fidelity suite: every written skill artifact byte-equals its
   `templates/skills/` source; all copies of one file byte-equal each other; no artifact
   is a symlink (`lstat`) — Gu 8, Gu 9, Gu 10.
7. Add the divergence suite in the shape of `tests/canonical-fidelity.test.ts`: each
   `.agents/skills/harny-*` ↔ `templates/skills/harny-*` pair is byte-identical or has a
   declared row (Gu 11).
8. Add selection tests: core skills undeselectable; `--skills` USAGE on a core id;
   interactive warn path; config round-trip including a pre-feature config with no
   `skills` key (Gu 14–17).
9. Add the neutrality sweep: no `templates/skills/**` file names harny's own language,
   test runner, or a hardcoded foreign tool directory (Gu 30); and no file under
   `templates/` still says "archive in place" / "Do NOT move" (Gu 25).
10. Full-suite regression: `npm run build`, `npm run typecheck`, `npm test`; confirm the
    30-tool-artifact count and the four unchanged role bodies (Gu 22, Gu 24, Gu 27,
    Gu 28, Gu 29).

**Discharges**: G2 (test half), G8, G10, G11, Gu 9, Gu 10, Gu 11, Gu 22, Gu 24, Gu 25,
Gu 26, Gu 27, S4, S5, Amendment A1.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Kiro rejects the `allowed-tools` key its docs do not enumerate (V7), breaking skill loading there | Low | Med | D1's pre-authorized remedy: remove the key **uniformly from all roots**, never per-tool. Proven safe — the field is optional (V1) and `harny-standards` already ships without it. Preserves Gu 9/Gu 10 either way. Carried as an open reservation alongside AL-30/CG-1 |
| `templates/skills/` and `.agents/skills/` drift apart over time — the `canonical-role-templates` AL-2 failure at double surface area | **High** if unguarded | High | Gu 11's divergence suite (Phase 4.7) fails on any deviation outside a declared class. This is the single most important test in the feature |
| Test fixtures under `tests/fixtures/templates/*` need skill trees, adding ~44 noise files | Med | Med | Deliberately avoided by contract: a missing skill directory is tolerated at load time and only errors at `buildPayload` **when selected**. Only fixtures actually driving a full `runInit` need a core skill stub set |
| The e2e expected-path lists are long and exact; a missed entry looks like a real regression | High | Low | Phase 4.3 enumerates every affected case up front from `contract.md`'s counts table rather than discovering them by running the suite |
| Writing into `.agents/skills/` collides with harny's own repo when scaffolding into itself | Med | Low | Correct behavior, not a bug: `CONFLICT` exit 3 (Gu 19). Worth an explicit test — it doubles as proof that conflict detection reaches the new paths |
| A scaffolded tool never actually reads the root harny wrote to, failing silently at exit 0 | Med | High | Standing, human-gated reservation (AL-30, CG-1/O4). Mitigated structurally by the full-body role files (`contract.md` § Data Models — the role decision): skills are additive, so discovery failure degrades to redundancy, never to instruction loss |
| Editing `templates/roles/sdd-documentation.md` breaks TG-3's byte-for-byte body assertions | Med | Low | TG-3 compares against the raw template read at runtime, so it re-derives automatically. Amendment A1 scopes SC18 so the change is expected, not a surprise |
| The new Q3 shifts prompt indices, breaking `tests/prompts.test.ts` ordering assumptions | Med | Low | Phase 3.6 renumbers deliberately; the preset-skip branch is copied verbatim from an existing question rather than rewritten |
| Adding `skills` to `.sdd/harness.json` breaks the round-trip test or forces a version bump | Low | Med | Gu 17 pins additive-at-version-1 semantics: an absent `skills` key resolves to defaults. Tested with a literal pre-feature config fixture |
| Scope creep into thinning `templates/roles/*.md` | Med | Med | Explicitly decided against in `contract.md` § Data Models, with the follow-up named (`templates-thin-roles`) and gated on AL-30/CG-1 closing first |

## File Change Map

**Canonical content — CREATE (11 files, Phase 1)**

- `templates/skills/README.md` — CREATE — shape contract, DC-3 rewrite of the ninth-skill procedure
- `templates/skills/harny-propose/SKILL.md` — CREATE — near-identical to the dogfood copy
- `templates/skills/harny-test/SKILL.md` — CREATE
- `templates/skills/harny-implement/SKILL.md` — CREATE
- `templates/skills/harny-audit/SKILL.md` — CREATE
- `templates/skills/harny-document/SKILL.md` — CREATE — DC-3 divergence
- `templates/skills/harny-sync/SKILL.md` — CREATE — DC-2 divergence
- `templates/skills/harny-sync/capability-template.md` — CREATE — bundled resource (V5)
- `templates/skills/harny-adr/SKILL.md` — CREATE — DC-2 divergence
- `templates/skills/harny-adr/adr-template.md` — CREATE — bundled resource (V5)
- `templates/skills/harny-standards/SKILL.md` — CREATE — DC-1, the heaviest divergence

**Canonical content — MODIFY**

- `templates/roles/sdd-documentation.md` — MODIFY — lines 6, 19, 43: archive-in-place → SW-7 stamp-then-archive (S5, Gu 25). The only canonical body whose content changes

**Source — MODIFY (Phases 2–3)**

- `src/vocabulary.ts` — MODIFY — add the four skill vocabularies + `SKILLS_README_NAME`; still imports nothing
- `src/templates.ts` — MODIFY — `SkillResource`, `SkillTemplate`, `CanonicalTemplates.skills`/`.skillsReadme`, byte-only loader
- `src/engine.ts` — MODIFY — payload fields, `skillRootsFor`, `buildSkillFiles`, selected-skill TEMPLATE guard
- `src/config.ts` — MODIFY — `skills`, `optionalSkillIds`, `parseSkillList`, default/validate/merge/serialize/load
- `src/cli.ts` — MODIFY — `--skills <list>` and its `buildOverrides` branch
- `src/prompts.ts` — MODIFY — new Q3, old Q3–Q5 renumbered to Q4–Q6
- `src/init.ts` — MODIFY — step 11 third emission clause; step 6 warn for a deselected optional skill
- `src/generators/types.ts` — MODIFY — `readonly skillsDir: string`
- `src/generators/claude-code.ts` — MODIFY — `skillsDir: '.claude/skills'` (one line)
- `src/generators/cursor.ts` — MODIFY — `skillsDir: '.agents/skills'` (one line)
- `src/generators/kiro.ts` — MODIFY — `skillsDir: '.kiro/skills'` (one line)
- `src/generators/github-copilot.ts` — MODIFY — `skillsDir: '.agents/skills'` (one line, D2)
- `src/generators/codex.ts` — MODIFY — `skillsDir: '.agents/skills'` (one line)
- `src/writer.ts` — UNCHANGED — stated explicitly; skill artifacts reuse it as-is

**Tests — CREATE (Phase 4)**

- `tests/skills-templates.test.ts` — CREATE — shape suite (Gu 4–8), neutrality sweep (Gu 30)
- `tests/skills-placement.test.ts` — CREATE — dedup and per-root placement (Gu 2, Gu 3), no-symlink and byte-identity (Gu 8–10)
- `tests/skills-fidelity.test.ts` — CREATE — `.agents/skills/` ↔ `templates/skills/` divergence suite (Gu 11)

**Tests — MODIFY (Phase 4)**

- `tests/packaging.test.ts` — MODIFY — `EXPECTED_TEMPLATE_FILES` 11 → 22 (Gu 26)
- `tests/e2e-init.test.ts` — MODIFY — every exact expected-path set and the artifact totals
- `tests/init.test.ts` — MODIFY — planned-path expectations, `--dry-run` listing, conflict cases
- `tests/config.test.ts` — MODIFY — `skills` defaults, `parseSkillList`, round-trip, pre-feature config
- `tests/prompts.test.ts` — MODIFY — six-question ordering and the new preset-skip branch
- `tests/engine.test.ts` — MODIFY — `skillRootsFor`, `buildSkillFiles`, selected-skill TEMPLATE guard
- `tests/templates.test.ts` — MODIFY — skill loading, sort order, tolerated-absence behavior
- `tests/generators/registry.test.ts` — MODIFY — every generator exposes a `skillsDir`; the five pinned values
- `tests/fixtures/templates/well-formed/skills/**` — CREATE — minimal core-skill stubs for the fixtures that drive a full `runInit`

**Docs — deferred to `harny-document`, not this feature's work**

- `README.md`, `CHANGELOG.md`, `AGENTS.md` — MODIFY — post-audit hand-off (`pipeline-roles.md` PR-5)
