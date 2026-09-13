# Contract: templates-skill-library-parity

> Every item below traces to an `intent.md` goal (`G1`–`G12`). Facts are cited to a
> `specs/current/*.md` requirement id, a source file and line, or a first-party URL with
> its verification date, per this repo's provenance convention.

## Verified facts

Every row was fetched from the named first-party URL on **2026-09-09** for this feature.
Rows marked *(carried)* were verified by an earlier feature and are restated, not
re-fetched.

| # | Fact | Source | Binds |
|---|---|---|---|
| V1 | The portable Agent Skills spec defines exactly six frontmatter fields: `name` and `description` **required**; `license`, `compatibility`, `metadata`, `allowed-tools` optional. | https://agentskills.io/specification | Gu 4, Gu 5 |
| V2 | `name`: 1–64 chars, lowercase letters/digits/hyphens only, must not start or end with a hyphen, no consecutive hyphens, **must match the parent directory name**. | https://agentskills.io/specification | Gu 5 |
| V3 | `description`: 1–1,024 characters. `compatibility`: ≤500 characters. `metadata`: a map from string keys to string values. | https://agentskills.io/specification | Gu 6, Gu 7 |
| V4 | `allowed-tools` is a **space-separated string** and is marked *Experimental*: "Support for this field may vary between agent implementations." | https://agentskills.io/specification | D1, Gu 8 |
| V5 | A skill directory may contain files beyond `SKILL.md` (`scripts/`, `references/`, `assets/`, or any other file); references should be kept "one level deep from `SKILL.md`". | https://agentskills.io/specification | Gu 12 |
| V6 | Kiro discovers skills at `.kiro/skills/<name>/SKILL.md` (workspace) and `~/.kiro/skills/<name>/SKILL.md` (global); "When skills share the same name, workspace skills take priority over global skills." | https://kiro.dev/docs/skills/ | Gu 2 |
| V7 | Kiro requires `name` (must match folder name) and `description` (max 1024 chars); it documents `license`, `compatibility` and `metadata` as optional. **`allowed-tools` does not appear on the page**, and the page states no rule for unrecognized keys. | https://kiro.dev/docs/skills/ | D1, Gu 6 |
| V8 | Kiro's skill folder name constraint is "Lowercase letters, numbers, and hyphens only (max 64 chars)". | https://kiro.dev/docs/skills/ | Gu 5 |
| V9 | Cursor loads skills from `.agents/skills/` (project), `.cursor/skills/` (project), `~/.agents/skills/` and `~/.cursor/skills/` (user). | https://cursor.com/docs/skills | Gu 2 |
| V10 | GitHub Copilot project skills are "stored in your repository (`.github/skills`, `.claude/skills`, or `.agents/skills`)". | https://docs.github.com/en/copilot/concepts/agents/about-agent-skills | D2, Gu 2 |
| V11 | Claude Code discovers skills only from `.claude/skills/<name>/SKILL.md` shapes (enterprise, personal, project, nested, `--add-dir`, plugin). `.agents/skills/` is not among them. | https://code.claude.com/docs/en/skills | Gu 2 |
| V12 | For spec-compliant distribution, Claude Code rejects out-of-spec frontmatter keys with a hard error naming the allowlist: "Allowed properties are: allowed-tools, compatibility, description, license, metadata, name." | https://code.claude.com/docs/en/skills | D1 |
| V13 *(carried)* | Codex CLI discovers repo-scope skills under `.agents/skills/`, walked from cwd to the repo root; the directory is "not namespaced to one tool". | `specs/current/tool-generators.md` TG-9; `src/generators/codex.ts:148–149` (verified 2026-09-02) | Gu 2 |

**Measured, not assumed** (all eight `.agents/skills/harny-*/SKILL.md`, measured
2026-09-09): longest `description` is `harny-sync` at **735** characters (V3 budget 1,024);
longest `compatibility` is `harny-sync` at **231** (V3 budget 500); longest file is
`harny-sync` at **139 lines / 8,093 bytes**. `harny-standards` already declares only five
frontmatter keys, omitting `allowed-tools` entirely — proving V1's optionality in practice.

---

## Resolved design decisions

The four questions `intent.md` left open, closed here as binding text.

### D1 — `allowed-tools` is kept, in every copy, in every root (G1, G3, G4)

**Decision.** Every `templates/skills/harny-*/SKILL.md` that declares `allowed-tools`
keeps it, and the Kiro copy is **not** stripped. All copies of a given skill stay
byte-identical across all roots.

**Reasoning.** `allowed-tools` is a first-party field of the portable Agent Skills
specification (V1), not a Claude-Code-only key — Kiro's page (V7) publishes a *subset* of
the six fields and states no allowlist and no rejection rule, so "Kiro does not document
it" is not evidence that "Kiro rejects it." Claude Code's own spec-compliant validator
(V12) lists `allowed-tools` as *allowed*, which is direct evidence the field is
spec-legal rather than an extension. Stripping it for one root would fork a skill's
content per destination, destroying the whole-file identity that Gu 9 makes verifiable in
a single comparison and creating a second drift surface — the exact `canonical-role-templates`
AL-2 failure `intent.md` G2 exists to prevent.

**Pre-authorized remedy, no re-litigation required.** If `allowed-tools` is ever observed
to break Kiro skill loading, the fix is to remove the key from `templates/skills/`
**uniformly, for all roots**, not to special-case Kiro. This is already proven safe:
`allowed-tools` is optional (V1) and `harny-standards` ships without it today. The remedy
preserves Gu 9 and costs one edit per affected file.

**Reservation carried:** this is documentation-verified, not verified against a live Kiro
install — the same standing, human-gated limitation `tool-generators.md` AL-30 and
CG-1/O4 already carry. Recorded in `audit.md`; this feature does not claim to close it.

### D2 — `github-copilot` always resolves to `.agents/skills/`, unconditionally (G3)

**Decision.** `githubCopilotGenerator.skillsDir` is the constant `.agents/skills`. It is
never `.claude/skills`, and it never varies with which other tools are selected.

**Reasoning.** V10 gives Copilot three valid roots, so a choice is forced. Three
independent arguments select `.agents/skills`:

1. **Composability.** A `skillsDir` that depended on the rest of `config.tools` would
   make `--tools github-copilot` write different paths than `--tools claude-code,github-copilot`
   for the *same* tool. Output would remain deterministic (CLI-4), but the write plan
   would stop being explainable per tool, and every per-tool test would need the full
   selection as context. `agentsDir` and `conductorPath` are fixed per generator today
   (`src/generators/*.ts`); `skillsDir` matches them.
2. **No cross-namespace writes.** Choosing `.claude/skills` would make a `--tools
   github-copilot` run — with `claude-code` *not* selected — write into `.claude/`, a
   directory belonging to a tool the user did not ask for. It would also collide with a
   later `--tools claude-code` run's conflict detection (CLI-5) over files that run did
   not create.
3. **Majority root.** `.agents/skills/` is the root Cursor (V9), Codex (V13) and Copilot
   (V10) all read. Putting Copilot there means one written copy serves three of the five
   targets, which is what makes Gu 3's dedup worth having at all.

### D3 — The `Generator` interface gains exactly one member: `skillsDir` (G9)

**Decision.** `Generator` gains one readonly field, `skillsDir: string`. It gains **no**
`renderSkill` method. Skill file construction lives in `src/engine.ts`
(`buildSkillFiles`), alongside `buildSharedFiles`.

**Reasoning.** "Which directory does this tool read skills from" is per-tool knowledge,
and `tool-generators.md` TG-1's design intent is that all per-tool knowledge lives in that
tool's generator — the interface already carries `agentsDir` and `conductorPath` for
exactly this reason. Holding skill roots in a separate `ToolId → string` table would split
per-tool facts across two modules and is the option rejected here.

A `renderSkill` method is rejected for the opposite reason: a skill file has no
frontmatter harny generates, no model to map, no capabilities to map and no
`harny:begin`/`harny:end` block, so five `renderSkill` implementations would be five
byte-identical copies of "return the source contents" — precisely the hand-rolled
duplication `tool-generators.md` TG-5 forbids. Nothing per-tool happens during skill
emission except path selection, so path selection is the only thing the interface exposes.

**Amendment to `tool-generators.md` TG-1.** TG-1 states the interface is "deliberately
sufficient for all five targets without amendment." That claim was made about **role and
conductor artifacts**, the only artifact classes that existed when it was written
(`cli-skeleton`, `cursor-kiro-copilot-generators`, `codex-generator`). This feature
introduces a third artifact class. TG-1's sufficiency claim is hereby **narrowed to role
and conductor artifacts** and the interface gains one member for the new class. No
existing member changes type or meaning; TG-2 (five ids resolve) is unaffected.

### D4 — Skills get their own, stronger fidelity guarantees; TG-3/TG-4 are not stretched (G2, G11)

**Decision.** `tool-generators.md` TG-3 and TG-4 keep their current wording and scope
(role and conductor artifacts). Skills are governed by two new, parallel guarantees —
Gu 9 (whole-file identity to source) and Gu 10 (only the path differs between copies).

**Reasoning.** TG-3 guarantees the canonical body appears as a **contiguous substring** of
generated output, because a role artifact wraps that body in frontmatter and appends a
generated block. TG-4 permits five named per-tool differences (path, file name, wrapper,
model id, capability tokens). Neither shape fits a skill: a skill artifact has no wrapper
and no generated region, so source and output are *equal*, and of TG-4's five permitted
differences only `path` can ever occur. Extending TG-3's substring wording to skills would
therefore state something **weaker than the truth** and would license a future
implementation to append to a skill file while still passing. Stating equality directly is
both stronger and simpler to verify.

---

## SUPERSEDES

Each item below changes a statement that is currently true. Nothing here is implicit.

| # | Superseded statement | Replacement | Trace |
|---|---|---|---|
| S1 | `tool-generators.md` **TG-1**: the `Generator` interface is "deliberately sufficient for all five targets without amendment" | Sufficiency claim narrowed to role and conductor artifacts; interface gains `skillsDir` for the new skill artifact class (D3) | G9 |
| S2 | `tool-generators.md` **TG-6**'s Kiro row: role files at `.kiro/agents/<role>.md`, conductor via `.kiro/skills/`, `description` ≤1024 — verified 2026-08-12, **predating Kiro's Agent Skills support entirely** | Extended with V6, V7, V8: `.kiro/skills/<name>/SKILL.md` is a general skill root (workspace-priority over `~/.kiro/skills/`), folder name must equal `name:`, `name` ≤64 chars lowercase/digits/hyphens, required `name`+`description`, optional `license`/`compatibility`/`metadata`. TG-6's existing Kiro claims are **not** contradicted — only incomplete | G4, SC10 |
| S3 | `cli-init.md` **CLI-1** step 11: "render role + conductor artifacts per available generator, then the tool-neutral shared files exactly once" | Step 11 gains a third emission clause: selected skill files, once per unique skill root. **The 13-step count is unchanged** — this is a widening of one step, not a fourteenth | G7 |
| S4 | `cli-init.md` **CLI-10**: the tarball contains "all eleven `templates/**` files"; `tests/packaging.test.ts:20–32` enumerates them | Twenty-two `templates/**` files; the enumerated manifest gains the eleven `templates/skills/**` paths listed in § Data Models | G8, SC15 |
| S5 | `templates/roles/sdd-documentation.md:6, 19, 43` — "**Archive the spec in place** … Do NOT move, rename, or delete the `/specs/<feature-name>/` directory" | The stamp-then-archive lifecycle of `spec-workflow.md` **SW-7**: stamp `Shipped:` in place, then hand off to `harny-sync` archive mode. This closes the *other* half of the `templates-parity` reservation — a scaffolded repo now receives `harny-sync` (whose archive mode moves the directory) and must not also receive a role file forbidding the move | G10, SC17 |
| S6 | `skill-library.md` **SL-4**: `description` capped at 1,536 characters | Unchanged for `.agents/skills/`. A **tighter** 1,024-character cap governs `templates/skills/` only, per V3 and V7 (declared in `intent.md` § Problem Statement) | G1, SC3 |
| S7 | `specs/archived/codex-generator/contract.md` **Behavior Guarantee 12**'s zero-diff regression test (`tests/canonical-fidelity.test.ts`'s former "no regression: the four shipped generators, the shared interface/Markdown layer, templates/, and every module outside src/generators/ are byte-identical" block) — asserted `git status --porcelain` empty for `templates/`, the four pre-Codex generator files, and every `src/` module outside `src/generators/` | **Retired**, not merely superseded: S1 narrows TG-1's "no amendment" claim and D3 mandates `skillsDir` on the `Generator` interface and on all five generator files (Phase 2); Phase 1 adds eleven files under `templates/` and S5 edits `templates/roles/sdd-documentation.md`; Phase 3 modifies seven modules outside `src/generators/`. Every one of those is mandated by this contract and every one falsifies that test's assertions, so it is structurally unsatisfiable from this feature forward — `specs/archived/codex-generator/audit.md`'s own finding **CG-7** already named it "a *this-feature* gate, not a standing regression test," confirming the retirement is bookkeeping, not a unilateral test weakening. The `describe`/`it` block is deleted outright (not left as a permanent `it.skip`, which could never be un-skipped and would misrepresent live coverage) and replaced with a comment at its former location. The guarantees it recorded that remain load-bearing are re-asserted elsewhere: canonical body fidelity (`tests/canonical-fidelity.test.ts`'s own T40/T41 blocks, unaffected by this retirement and still running), the five pinned `skillsDir` values (`tests/generators/registry.test.ts`), and the `.agents/skills/` ↔ `templates/skills/` divergence fidelity (`tests/skills-fidelity.test.ts`) | G9, G11; D3; post-audit finding AL-P5 |

### Amendment A1 — scoping `intent.md` G11 and SC18

`intent.md` **G11** says "Change nothing about the existing 30 tool artifacts" and
**SC18** requires a zero-skill run to be byte-identical to the pre-change build. S5 above
edits `templates/roles/sdd-documentation.md`, whose body is carried byte-for-byte into
five tool artifacts (TG-3). The two cannot both hold literally.

**Resolution:** G11 is scoped to **mechanism** — the renderers, the two wrapper
serializers, `mapModel`, `mapCapabilities`, `roleFileName`, `conductorPath`, `agentsDir`,
the `harny:begin`/`harny:end` blocks, and the byte-for-byte body-preservation guarantee
all stay unchanged, and the artifact *count* stays 30. Exactly one canonical body changes
content: `templates/roles/sdd-documentation.md`, as G10 requires. SC18 is amended to
"byte-identical except the five `sdd-documentation` role artifacts, whose diff is confined
to the archive-lifecycle prose named in S5." The other four role bodies and the conductor
body stay byte-identical.

---

## Interfaces

### Public API — `src/vocabulary.ts`

Closed vocabularies, consistent with `TOOL_IDS` / `ROLE_IDS` / `GATE_IDS`. This module
still imports nothing (`cli-init.md` CLI-11).

```ts
/** Skills always scaffolded, regardless of selection. Pipeline-role order, then sync. */
export const CORE_SKILL_IDS = [
  'harny-propose',
  'harny-test',
  'harny-implement',
  'harny-audit',
  'harny-document',
  'harny-sync',
] as const;

/** Skills the user opts into. Never implicitly enabled by a tool or role choice. */
export const OPTIONAL_SKILL_IDS = ['harny-adr', 'harny-standards'] as const;

/** Full closed set, in stable emission order: core first, then optional. */
export const SKILL_IDS = [...CORE_SKILL_IDS, ...OPTIONAL_SKILL_IDS] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export type CoreSkillId = (typeof CORE_SKILL_IDS)[number];
export type OptionalSkillId = (typeof OPTIONAL_SKILL_IDS)[number];

/** Default opt-in set. See § "Default optional-skill set" for the argument. */
export const DEFAULT_OPTIONAL_SKILL_IDS = ['harny-standards'] as const;

/** File name of the shape-contract document written beside the skills in each root. */
export const SKILLS_README_NAME = 'README.md';
```

### Public API — `src/templates.ts`

```ts
/** One file inside a skill directory: `SKILL.md` or a bundled resource (V5). */
export interface SkillResource {
  /** File name only, e.g. `SKILL.md`, `capability-template.md`. Never a path. */
  readonly name: string;
  /** Byte-for-byte file contents. Never reformatted, never parsed. */
  readonly contents: string;
  /** Path relative to the templates root, e.g. `skills/harny-sync/SKILL.md`. */
  readonly sourcePath: string;
}

export interface SkillTemplate {
  readonly id: SkillId;
  /** `SKILL.md` plus every sibling regular file, sorted by `name` (determinism). */
  readonly files: readonly SkillResource[];
  /** Path relative to the templates root, e.g. `skills/harny-sync`. */
  readonly sourcePath: string;
}

export interface CanonicalTemplates {
  readonly root: string;
  readonly roles: ReadonlyMap<RoleId, RoleTemplate>;
  readonly conductor: ConductorTemplate;
  readonly specSchema: readonly SpecSchemaTemplate[];
  /** Only the skill directories that exist under `templates/skills/`. A selected
   *  skill absent from this map is a TEMPLATE error raised by `buildPayload`. */
  readonly skills: ReadonlyMap<SkillId, SkillTemplate>;
  /** `templates/skills/README.md` — the shape contract. Absent only in fixtures. */
  readonly skillsReadme?: SkillResource;
}
```

Loading rules, all normative:

- Skill content is **never parsed**. There is no `parseSkillTemplate`. `templates.ts`
  reads bytes and nothing else — no frontmatter reader, no validator, no transform. This
  is what makes Gu 9 mechanically true rather than merely intended.
- For each `id` in `SKILL_IDS`, if `templates/skills/<id>/SKILL.md` exists, the directory
  is loaded; every other **regular file at that one level** is loaded as a
  `SkillResource` (V5). Subdirectories are not recursed.
- `files` is sorted by `name` with a plain lexicographic comparison, so ordering is
  independent of filesystem enumeration order (`cli-init.md` CLI-4).
- A skill directory absent from `templates/skills/` is **tolerated at load time** and
  becomes a `TEMPLATE` error at payload-build time *only if selected* — the exact shape
  `src/engine.ts:54–58` already uses for an enabled role with no loaded template. This
  keeps test fixtures from having to carry all eight skill trees.
- `templates/` stays read-only (`cli-init.md` invariant 1).

### Public API — `src/generators/types.ts`

```ts
export interface Generator {
  readonly id: ToolId;
  readonly displayName: string;
  readonly agentsDir: string;
  readonly wrapperFormat: WrapperFormat;
  readonly conductorPath: string;
  /** **(NEW — this feature.)** This tool's own skill-discovery root, POSIX, relative to
   *  the target repo root. A fixed per-generator constant: it never varies with which
   *  other tools are selected (D2). Several generators deliberately share one value —
   *  `.agents/skills` is read by Cursor (V9), Codex (V13) and GitHub Copilot (V10) —
   *  which is what `buildSkillFiles`' dedup keys on. */
  readonly skillsDir: string;

  roleFileName(roleId: RoleId): string;
  mapModel(tier: CostTier, override?: string): string;
  mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping;
  renderRole(payload: RolePayload): GeneratedFile;
  renderConductor(payload: ConductorPayload): GeneratedFile;
}
```

Pinned values, one per generator, each traceable to a verified fact:

| Generator | `skillsDir` | Fact |
|---|---|---|
| `claudeCodeGenerator` | `.claude/skills` | V11 |
| `cursorGenerator` | `.agents/skills` | V9 |
| `kiroGenerator` | `.kiro/skills` | V6 |
| `githubCopilotGenerator` | `.agents/skills` | V10 + D2 |
| `codexGenerator` | `.agents/skills` | V13 |

### Public API — `src/engine.ts`

```ts
export interface HarnessPayload {
  readonly roles: readonly RolePayload[];
  readonly conductor: ConductorPayload;
  readonly specSchema: readonly SpecSchemaTemplate[];
  /** Selected skills, in SKILL_IDS order. Always a superset of CORE_SKILL_IDS. */
  readonly skills: readonly SkillTemplate[];
  readonly skillsReadme?: SkillResource;
  readonly config: HarnessConfig;
}

/**
 * One copy of every selected skill's files, plus the shape-contract README, under each
 * unique skill root. `roots` MUST already be deduped and sorted by the caller.
 *
 * This is the same single-write-per-run idea as `buildSharedFiles` (`cli-init.md`
 * CLI-8): `.sdd/spec-schema/*` is written once because its destination is a constant;
 * skills are written once per *distinct* destination. With all five tools selected the
 * three distinct roots are `.agents/skills`, `.claude/skills`, `.kiro/skills`.
 */
export function buildSkillFiles(
  payload: HarnessPayload,
  roots: readonly string[],
): readonly GeneratedFile[];

/** Deduped, sorted skill roots for the generators that actually resolved. */
export function skillRootsFor(generators: readonly Generator[]): readonly string[];
```

`buildSkillFiles` emission order is fixed and total: for each root in `roots` order, the
README (if loaded), then each skill in `SKILL_IDS` order, then each of that skill's
`files` in `name` order. Every emitted `contents` is the loaded `SkillResource.contents`
verbatim — no concatenation, no header, no provenance comment, no generated block.

### Public API — `src/config.ts`

```ts
export interface HarnessConfig {
  readonly version: typeof CONFIG_VERSION; // stays 1 — see § State Changes
  readonly tools: readonly ToolId[];
  readonly roles: readonly RoleSelection[];
  readonly gates: readonly GateId[];
  /** Deduped, in SKILL_IDS order. ALWAYS contains every CORE_SKILL_IDS member. */
  readonly skills: readonly SkillId[];
  readonly stack?: string;
}

export interface PartialHarnessConfig {
  readonly tools?: readonly ToolId[];
  readonly roleIds?: readonly RoleId[];
  readonly roleOverrides?: readonly RoleOverride[];
  readonly gates?: readonly GateId[];
  /** **Wholesale replaces the OPTIONAL portion** of the skill set, exactly as
   *  `roleIds` replaces role membership and `gates` replaces the gate set. The core
   *  six are re-added unconditionally by `mergeConfig`; naming one here is a USAGE
   *  error, never a silent no-op. Set by `--skills`. */
  readonly optionalSkillIds?: readonly OptionalSkillId[];
  readonly stack?: string;
}

/** `'all'` → both optional ids; `'none'` → `[]`; otherwise a comma list of OPTIONAL
 *  ids. Naming a core skill id throws USAGE naming the always-on set. Throws USAGE on
 *  any unknown id. */
export function parseSkillList(raw: string): readonly OptionalSkillId[];
```

`mergeConfig` gains one step, placed after the existing role steps and before `stack`:
if `override.optionalSkillIds` is present it replaces the optional portion; the result is
always `orderedUnique([...CORE_SKILL_IDS, ...optional], SKILL_IDS)`. Core membership is
therefore not expressible as absent at any point in the merge — it is a structural
property of the function, not a validation that could be bypassed.

### Public API — `src/cli.ts`

One new flag on `init`, sitting beside `--roles` and `--gates`:

```ts
.option('--skills <list>', 'Comma list of optional skill ids, "all", or "none"')
```

`buildOverrides` maps it to `overrides.optionalSkillIds` via `parseSkillList`, in the same
shape as `--gates` → `overrides.gates`.

### Public API — `src/prompts.ts`

The interactive sequence grows from five questions to **six**. The new question is Q3,
placed directly after role selection because it is the same family of choice; the former
Q3–Q5 shift to Q4–Q6.

```ts
// Q3: which optional skills? (the six core skills are always scaffolded)
let optionalSkillIds: readonly OptionalSkillId[];
if (preset.optionalSkillIds !== undefined) {
  optionalSkillIds = preset.optionalSkillIds;
  io.log(`Optional skills already set by a flag: ${
    optionalSkillIds.length > 0 ? optionalSkillIds.join(', ') : '(none)'}`);
} else {
  const answer = await multiselect<OptionalSkillId>({
    message: 'Which optional skills should be scaffolded? (the six core skills are always on)',
    options: OPTIONAL_SKILL_IDS.map((id) => ({ value: id, label: id })),
    initialValues: [...DEFAULT_OPTIONAL_SKILL_IDS],
    required: false,
  });
  optionalSkillIds = unwrapOrCancel(answer);
}
```

`required: false` mirrors Q4 (gates), which likewise permits an empty selection. The
preset-skip-and-report branch is byte-for-byte the pattern the other five questions use.

### Data Models — the `templates/skills/` file manifest

Eleven files, closed set. This is the manifest `cli-init.md` CLI-10 must enumerate (S4).

```text
templates/skills/README.md                          # the shape contract (G1)
templates/skills/harny-propose/SKILL.md
templates/skills/harny-test/SKILL.md
templates/skills/harny-implement/SKILL.md
templates/skills/harny-audit/SKILL.md
templates/skills/harny-document/SKILL.md
templates/skills/harny-sync/SKILL.md
templates/skills/harny-sync/capability-template.md  # bundled resource (V5)
templates/skills/harny-adr/SKILL.md
templates/skills/harny-adr/adr-template.md          # bundled resource (V5)
templates/skills/harny-standards/SKILL.md
```

`templates/**` goes from 11 files to 22.

### Data Models — the `.agents/skills/` ↔ `templates/skills/` divergence table (G2, SC5)

Each pair is either byte-identical or diverges only in a declared class. **Any divergence
outside a declared class is a defect**, caught by the fidelity test in Gu 11.

Permitted divergence classes, and only these:

- **DC-1 — harny-stack conventions.** Text naming harny's own language, test runner, or
  standard ids (`S1`–`S7`, TypeScript, ESM, `.js` specifiers, vitest, `src/`) is replaced
  by a stack-neutral equivalent, because a scaffolded repo may be any language
  (`pipeline-roles.md` PR-3, PR-7; standard S7).
- **DC-2 — harny-repo paths and incident anecdotes.** References to harny's own
  `AGENTS.md` § "Coding standards", `src/generators/…` line numbers, or a dated
  in-repo incident are replaced by the target-repo-neutral form the skill already uses
  elsewhere ("this project's conventions document").
- **DC-3 — dogfood-only mechanics.** The `.claude/skills/` symlink-bridge instructions
  (`skill-library.md` SL-2, ADR 0001) are replaced by the copy model this feature ships
  (G3), because a scaffolded repo has no bridge.

| Skill | Relationship | Divergence class and reason |
|---|---|---|
| `harny-propose` | Near-identical | None expected. Its Step 3 already names both `templates/spec-schema/*.md` and `.sdd/spec-schema/*.md`, so it is already deployment-portable (`spec-workflow.md` SW-6). |
| `harny-test` | Near-identical | DC-2 only if it names a harny-specific path. |
| `harny-implement` | **Diverges** | DC-1 (corrected post-audit, AL-P1): its Step-4/Final-checklist references to `S1`–`S6` are harny's own standard ids, the exact DC-1 material named above. Replaced with "every standard that document marks as binding," naming no count and no ids. |
| `harny-audit` | **Diverges** | DC-1 (corrected post-audit, AL-P1): its `harny-standards` compliance-check step named "all seven standards (S1–S7)" — harny's own standard ids and count, DC-1 material, not a DC-2 path reference. Replaced with "every standard that project's conventions document declares." |
| `harny-document` | **Diverges** | DC-3: names the archive hand-off without assuming harny's own `specs/current/` history. |
| `harny-sync` | **Diverges** | DC-2: drops the dated 2026-09-09 in-repo ADR-registry incident anecdote, which is harny history, not instruction. |
| `harny-adr` | Near-identical | DC-2 only (the "four features migrated before this one get no backfill" clause is harny history). |
| `harny-standards` | **Diverges most** | DC-1: `.agents/skills/harny-standards/SKILL.md:53–61` enumerates `S1` (TypeScript/ESM/`.js` specifiers) through `S6` (tests mirror `src/`, `Spec:`/`Covers:` header) — harny's own stack. The shipped copy states the *checklist shape* and instructs the caller to read the target repo's own conventions document, naming no language. |
| `README.md` | **Diverges** | DC-3: the "Adding a ninth skill" procedure describes creating a real directory in each root this run wrote to, not `ln -s` into `.claude/skills/`. |

### Data Models — artifact counts

| Selection | Distinct skill roots | Skill artifacts | Tool artifacts | Shared | Total |
|---|---|---|---|---|---|
| default (`claude-code`, default skills) | 1 (`.claude/skills`) | 9 | 6 | 6 | **21** |
| `--tools cursor,codex,github-copilot` (default skills) | 1 (`.agents/skills`) | 9 | 18 | 6 | **33** |
| `--tools all` (default skills) | 3 | 27 | 30 | 6 | **63** |
| `--tools all --skills all` | 3 | 33 | 30 | 6 | **69** |
| `--tools all --skills none` | 3 | 24 | 30 | 6 | **60** |

Per-root file count: one README + one `SKILL.md` per selected skill + each selected
skill's bundled resources. With the default skill set (six core + `harny-standards`) that
is 1 + 7 + 1 (`capability-template.md`) = **9**; with `--skills all` it is 1 + 8 + 2 =
**11**; with `--skills none` it is 1 + 6 + 1 = **8**.

### Data Models — the default optional-skill set

`DEFAULT_OPTIONAL_SKILL_IDS = ['harny-standards']`. Both defaults are argued from the
skills' own declared preconditions, not from preference:

- **`harny-standards` defaults ON.** Both `harny-implement` and `harny-audit` declare it
  in their `compatibility` field ("ideally, a `harny-standards` skill in the same skill
  set"), and `skill-library.md` SL-9 makes it the mechanism by which executor and auditor
  check the *same* conventions instead of separately re-deriving them. Scaffolding
  implement and audit without it ships a pipeline whose two most consequential roles are
  documented to disagree. Its own precondition — "this project's conventions document
  exists" — is satisfiable on day one in any repo, and it degrades explicitly when not
  (its Guardrails require reporting the fallback).
- **`harny-adr` defaults OFF.** Its `compatibility` field states it "Requires the target
  feature to already be archived at `specs/archived/<feature>/` … and
  `specs/current/_index.md` to exist." A freshly scaffolded repo has neither, so the skill
  cannot run until the repo has shipped and archived at least one feature. This is exactly
  the property that distinguishes it from `harny-sync`, which the human fixed as always-on:
  `harny-sync` lookup degrades gracefully by contract (`skill-library.md` SL-6 — "report
  'no knowledge base' and return an empty brief"), while `harny-adr` has no such branch.
  Shipping an unrunnable skill by default trains users to ignore skill descriptions.

### Data Models — the `templates/roles/sdd-*.md` decision (G6, SC13)

**Decision.** All five `templates/roles/sdd-*.md` continue to ship with their **full
instruction bodies**, for every tool, unchanged except for the S5 archive-lifecycle edit
to `sdd-documentation`. `templates/` gains **no** thinned-role layer. Scaffolded skills
are strictly **additive**.

**Reasoning.** `skill-library.md` SL-5 records that a missing or policy-disabled skill is
skipped with a *warning*, not an error. In harny's own repo the mitigation is a "STOP and
report" guard in a 26-line thin body, which works because a human maintains that repo and
can repair a broken symlink in seconds. A scaffolded repo has neither property, and harny
has no way to confirm the target tool actually discovered the root it wrote to — that is
the open, human-gated risk `tool-generators.md` AL-30 and CG-1/O4 already carry
("a generator writing to a directory a tool never reads fails silently with exit code 0").

Thinning the shipped role files would convert that *unverified discovery assumption* into
**total instruction loss**: the role file would say "your instructions live in
`harny-propose`" and, if discovery failed, the role would have nothing at all. Keeping the
full body makes the worst case *redundant instructions* and the best case *a composable
skill library* — which satisfies SC13's requirement that no scaffolded pipeline can reach
a state where a role's instructions exist in neither place.

**Accepted consequence:** a scaffolded repo carries each role's guidance twice, in
different shapes (role-file body and action-shaped skill). This is real duplication and it
is accepted deliberately, with a named follow-up — `templates-thin-roles` — to be opened
once skill discovery has been live-verified in at least one non-Claude tool, closing
AL-30/CG-1 first. Recorded in `audit.md` as an open reservation, not hidden.

### State Changes

- **New directory in the source tree:** `templates/skills/` (11 files). Read-only at
  runtime, like the rest of `templates/`.
- **New directories in a target repo:** up to three of `.agents/skills/`,
  `.claude/skills/`, `.kiro/skills/`, each populated with real regular files.
- **`.sdd/harness.json` gains a `skills` array.** `CONFIG_VERSION` stays **1**: the field
  is additive and a config file written before this feature simply omits it, in which case
  no `optionalSkillIds` override is produced and the defaults apply. `serializeConfig`
  emits `skills` after `gates` and before `stack`, preserving the declaration-order rule.
  `loadConfigFile` translates a persisted full `skills` array into `optionalSkillIds` by
  intersecting it with `OPTIONAL_SKILL_IDS` — the same "persisted full shape → partial
  flag shape" translation `roles` already performs (`src/config.ts:194–206`).
- **One canonical role body changes:** `templates/roles/sdd-documentation.md`, per S5.
- **No state is written outside `targetDir`.** No symlink is created by any code path.

## Behavior Guarantees

1. **Skills are copies, never symlinks.** Every skill artifact written by `runInit` is a
   regular file created by `fs.writeFile` through the existing `applyWrites`. No code path
   in `src/` calls `fs.symlink`, `fs.link`, or any equivalent. *(G3, SC8)*
2. **Placement follows each tool's verified discovery root.** `claude-code` →
   `.claude/skills/`; `kiro` → `.kiro/skills/`; `cursor`, `codex` and `github-copilot` →
   `.agents/skills/`. *(G3; V6, V9, V10, V11, V13; D2)*
3. **One copy per distinct root, per run.** Selected skills are written once for each
   distinct `skillsDir` among the *resolved* generators — never once per tool and never
   once per run globally. Selecting all five tools yields exactly three copies of each
   skill file; selecting any non-empty subset of `{cursor, codex, github-copilot}` yields
   exactly one. *(G3, SC6, SC7; extends `cli-init.md` CLI-8's pattern)*
4. **Only the six portable frontmatter keys appear.** Every
   `templates/skills/harny-*/SKILL.md` declares a subset of `name`, `description`,
   `license`, `compatibility`, `metadata`, `allowed-tools`, and no other key — in
   particular no `disable-model-invocation`, `context`, `paths`, `model`, or `when_to_use`.
   *(G1, SC2; V1, V12; `skill-library.md` SL-3)*
5. **Folder name equals `name:`, and both are spec-legal.** For every skill, the directory
   name equals its `name:` field, is 1–64 characters of lowercase letters, digits and
   hyphens, does not start or end with a hyphen, and contains no consecutive hyphens.
   *(G1, SC4; V2, V8)*
6. **Description fits the portable and Kiro caps.** Every `description` is non-empty and
   at most **1,024** characters — strictly tighter than `skill-library.md` SL-4's 1,536.
   *(G1, SC3; V3, V7; S6)*
7. **Compatibility fits its cap.** Every `compatibility`, where present, is at most **500**
   characters. *(G1, SC3; V3)*
8. **The five required body sections are present, in order.** Every shipped `SKILL.md`
   carries `# <Title>`, then `## When to use this`, `## Inputs`, `## Steps`,
   `## Guardrails`. *(G1, SC2; `.agents/skills/README.md` § Body)*
9. **Whole-file identity to source.** Every written skill artifact is byte-for-byte equal
   to its `templates/skills/**` source file — not a superset, not a substring container.
   Nothing is prepended, appended, wrapped, or reflowed. *(G2, G11, SC8; D4)*
10. **Only the path differs between copies.** For any skill file written to more than one
    root, all copies are byte-identical to each other; the destination path is the sole
    difference. *(G3, SC8; D4)*
11. **Declared-divergence fidelity.** For every `harny-*` name, the `.agents/skills/` and
    `templates/skills/` copies are byte-identical **or** differ only within a divergence
    class declared in § Data Models, and every declared divergence has a table row.
    *(G2, SC5)*
12. **Bundled resources travel with their skill.** Every non-`SKILL.md` file inside a
    selected skill's `templates/skills/<id>/` directory is written into the same directory
    in every root that skill is written to, so a bare-filename reference from `SKILL.md`
    resolves. *(G1; V5; closes the `canonical-role-templates` AL-5 failure shape for this
    artifact class)*
13. **The shape contract ships.** `templates/skills/README.md` is written once into every
    distinct root, so a scaffolded repo carries the document a user needs in order to add a
    ninth skill. *(G1; `skill-library.md` SL-1's extension-point promise)*
14. **Core skills cannot be deselected.** `config.skills` always contains all six
    `CORE_SKILL_IDS`. No flag, config file, or prompt answer can produce a resolved config
    without them; `--skills` addresses only `OPTIONAL_SKILL_IDS`. *(G5, SC11)*
15. **`--skills` follows CLI-3's established shape.** Naming a core skill id
    non-interactively is a `USAGE` error (exit 2) naming the always-on set; the same
    situation arising through an interactive answer produces an `io.warn`, never an abort.
    *(G5, SC11; mirrors `cli-init.md` CLI-3 and `runInit` step 6)*
16. **Defaults are exactly `CORE_SKILL_IDS` + `harny-standards`.** A flagless `npx harny
    init .` scaffolds seven skills; `harny-adr` is written only when explicitly requested.
    *(G5, SC12)*
17. **Config round-trip survives.** `serializeConfig` → `loadConfigFile` → `mergeConfig`
    reproduces the same `skills` array, and a config file written before this feature (no
    `skills` key) resolves to the defaults without error, at `CONFIG_VERSION` 1.
    *(G5, SC12)*
18. **Determinism, containment, trailing newline.** Two runs with identical config and
    templates produce byte-identical skill trees; every skill path is relative and resolves
    inside `targetDir`; every skill artifact ends in exactly one `\n`. Root order and
    within-skill file order are sorted, never filesystem-enumeration-dependent.
    *(G7, SC14; `cli-init.md` CLI-4)*
19. **Conflict detection covers skill paths.** A pre-existing planned skill path is a
    `CONFLICT` (exit 3) with nothing written unless `--force`; `--dry-run` writes nothing
    and lists every skill path it would have written. *(G7, SC14; `cli-init.md` CLI-5)*
20. **Skill roots derive from resolved generators only.** A tool skipped for want of a
    generator contributes no root, and a run in which every selected tool is skipped exits
    `NO_GENERATOR` (4) having written no skill. *(G7; `cli-init.md` CLI-7)*
21. **The 13-step `runInit` sequence is preserved.** Skill emission is a third clause of
    step 11, not a fourteenth step; steps 1–10 and 12–13 are unchanged in order and
    meaning. *(G7; S3; `cli-init.md` CLI-1)*
22. **Tool-artifact mechanism is untouched.** `roleFileName`, `mapModel`,
    `mapCapabilities`, `renderRole`, `renderConductor`, `agentsDir`, `conductorPath`,
    `wrapperFormat`, both wrapper serializers and the `harny:begin`/`harny:end` blocks are
    unchanged; a run still emits exactly 30 tool artifacts with all five tools selected.
    *(G11, SC18; `tool-generators.md` TG-3, TG-4, TG-5, TG-10; Amendment A1)*
23. **Skills carry no generated configuration block.** No `harny:begin`/`harny:end`
    markers, no provenance comment, and no config-derived text appear in any skill
    artifact — a direct consequence of Gu 9. Configuration continues to reach the user only
    through role artifacts, the conductor artifact, and `.sdd/harness.json`. *(G11)*
24. **`templates/` is never mutated.** No code path writes to, renames, or deletes
    anything under `templates/`, including the new `templates/skills/` subtree.
    *(G11; `cli-init.md` invariant 1)*
25. **The archive lifecycle is single-valued in `templates/`.** After this feature no file
    under `templates/` instructs a role to keep a spec directory in place, and the shipped
    `harny-document` / `harny-sync` skills and `templates/roles/sdd-documentation.md`
    describe one lifecycle: stamp `Shipped:` in place, then hand off to archive.
    *(G10, SC17; S5; `spec-workflow.md` SW-7)*
26. **Packaging manifest is closed and correct.** `npm pack --dry-run` contains `bin/`,
    `dist/` and all **twenty-two** `templates/**` files including the eleven under
    `templates/skills/`, and still contains nothing under `src/`, `tests/` or `specs/`.
    *(G8, SC15; S4; `cli-init.md` CLI-10)*
27. **No dependency drift.** `dependencies` and `devDependencies` stay byte-identical:
    `commander@15.0.0`, `@clack/prompts@1.7.0`, `typescript@7.0.2`, `vitest@4.1.10`,
    `@types/node@26.1.2`. *(G11; `cli-init.md` invariant 3; standard S4)*
28. **No import cycles; vocabulary still imports nothing.** `src/vocabulary.ts` gains
    `SKILL_IDS` and friends while importing nothing, and no module pair in `src/` imports
    each other at runtime. *(G11, SC19; `cli-init.md` CLI-11)*
29. **All five tool ids still resolve.** `availableToolIds()` remains exactly
    `['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']`, each to a real
    `Generator` now also carrying `skillsDir`. *(G9, SC16; `tool-generators.md` TG-2)*
30. **Portability of shipped skill content.** No `templates/skills/**` file names a single
    tool's mechanic as the only possibility, hardcodes another tool's directory as a path
    a reader must use, or states harny's own language or test runner as the target repo's.
    *(G1, G2; `pipeline-roles.md` PR-3, PR-7; standard S7; divergence classes DC-1..DC-3)*

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| `--skills` names an unknown id | `HarnessError('USAGE')` from `parseSkillList`, listing `OPTIONAL_SKILL_IDS` | Exit 2; message names the valid optional ids |
| `--skills` names a **core** skill id (e.g. `harny-propose`) | `HarnessError('USAGE')` naming the always-on set and stating that core skills are always scaffolded | Exit 2; the user learns the set is not deselectable rather than silently getting it anyway |
| A config file's `skills` array names a core id | Accepted and normalized — a persisted full config legitimately lists all selected skills, core included; only the **flag** rejects core ids | Round-trip succeeds, per Gu 17 |
| A config file's `skills` array names an unknown id | `HarnessError('USAGE')` via `validateIdList` against `SKILL_IDS` | Exit 2, consistent with `tools`/`gates` |
| A **selected** skill has no directory under `templates/skills/` | `HarnessError('TEMPLATE')` from `buildPayload`, naming the skill id and stating this is a packaging bug, not a configuration error | Exit 5; mirrors `src/engine.ts:54–58` for roles verbatim |
| `templates/skills/<id>/SKILL.md` is unreadable | `HarnessError('TEMPLATE')` from `readCanonicalFile`, naming the relative path and the resolved templates root | Exit 5; identical wording to every other canonical file |
| A planned skill path already exists, no `--force` | `HarnessError('CONFLICT')` from `applyWrites`, listing every conflicting path; **nothing is written** | Exit 3; skill and tool conflicts are reported together in one list |
| A generated skill path escapes `targetDir` or is absolute | Plain `Error` from `assertContained` — a generator/engine bug, not user-facing | Exit 1 with a stack; unchanged policy from `src/writer.ts:16–28` |
| Every selected tool lacks a generator | `HarnessError('NO_GENERATOR')` before any render; no skill root is computed | Exit 4, nothing written |
| Filesystem failure mid-write | Existing `applyWrites` disclosure: a plain `Error` naming the failing path and every path already written | Exit 1; partial state disclosed, never hidden |

No new `HarnessErrorCode` is introduced. `HarnessError` remains the only deliberately
thrown error type (`cli-init.md` CLI-2, standard S2).

## Dependencies

**Internal**

- `src/vocabulary.ts` — owns `SKILL_IDS`, `CORE_SKILL_IDS`, `OPTIONAL_SKILL_IDS`,
  `DEFAULT_OPTIONAL_SKILL_IDS`, `SKILLS_README_NAME`. Imports nothing (CLI-11).
- `src/templates.ts` — loads `templates/skills/**` as opaque bytes; no parser.
- `src/engine.ts` — `buildSkillFiles`, `skillRootsFor`; sibling of the existing
  `buildSharedFiles`. Continues to own `SPEC_SCHEMA_DIR` (SW-6, standard S5).
- `src/generators/types.ts` — the `skillsDir` member (D3).
- `src/generators/{claude-code,cursor,kiro,github-copilot,codex}.ts` — one added field
  each; no other line changes.
- `src/config.ts`, `src/cli.ts`, `src/prompts.ts`, `src/init.ts` — selection plumbing.
- `src/writer.ts` — unchanged. Skill artifacts are ordinary `GeneratedFile`s and flow
  through the existing `planWrites`/`applyWrites` unmodified.

**External**

- None added. `commander@15.0.0` and `@clack/prompts@1.7.0` cover the new flag and the new
  prompt; `typescript@7.0.2`, `vitest@4.1.10`, `@types/node@26.1.2` unchanged (Gu 27).

## Integration Points

- **Closes the `templates-parity` open reservation** recorded in
  `specs/current/skill-library.md` § Open reservations, which named this feature by name.
  Both halves close: the missing skill library (G1–G9) and the contradictory archive
  instruction (G10, S5).
- **Extends `cli-init.md` CLI-8's single-write-per-run pattern** from "one constant
  destination" to "one destination per distinct root," which is the smallest
  generalization that expresses the requirement (Gu 3).
- **Amends `tool-generators.md` TG-1** (S1) and **supersedes-and-extends TG-6's Kiro row**
  (S2). TG-2, TG-3, TG-4, TG-5, TG-7, TG-8, TG-9, TG-10, TG-11 are unaffected; TG-9 is
  *reinforced*, since `.agents/skills/` now carries eight more files harny writes.
- **Amends `cli-init.md` CLI-1 step 11** (S3) and **CLI-10's manifest** (S4). CLI-2,
  CLI-3, CLI-4, CLI-5, CLI-6, CLI-7, CLI-9, CLI-11 hold unchanged; CLI-3's error/warn
  policy is *reused* verbatim by Gu 15.
- **Reconverges `templates/` with `spec-workflow.md` SW-7**, retiring the "live pipeline
  only" scope the `sdd-skill-library` supersession carried.
- **Reuses, does not fork, `skill-library.md`'s shape contract.** SL-1's six frontmatter
  keys and five body sections govern the shipped skills identically; SL-2's symlink bridge
  is deliberately not reused (G3), and ADR 0001 stays scoped to harny's own repo.
- **Downstream of the human gate:** `harny-test` writes the red-phase suite from these
  guarantees; `harny-implement` treats this file as law; `harny-audit` verifies every
  `Gu N` and every `SC N`; `harny-document` updates `README.md`, `CHANGELOG.md` and
  `AGENTS.md`, then hands off to `harny-sync` archive and `harny-adr`.
- **Expected ADRs** for `harny-adr` to write from this contract: D1 (`allowed-tools` kept
  uniformly), D2 (Copilot resolves to `.agents/skills/`), D3 (`skillsDir` on the
  `Generator` interface), D4 (parallel skill-fidelity guarantees), and the
  full-body-role-files decision in § Data Models. Five decisions, within `harny-adr`'s
  seven-per-feature cap (`skill-library.md` SL-8).
