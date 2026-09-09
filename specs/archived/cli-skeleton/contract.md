# Contract: cli-skeleton

> **Language.** This deliverable is a Node.js + TypeScript CLI (stack fixed by the
> human in `plan.md` §4), so every interface below is real TypeScript, ESM, using
> `node:` builtins and the two sanctioned runtime dependencies. Paths use the real
> layout: `bin/harness.js`, `src/*.ts`, `src/generators/*.ts`, `tests/*.test.ts`.
>
> **Traceability.** Every item cites the `intent.md` goal it serves as `(Gn)`, where
> G1..G10 are the numbered goals in `intent.md`.
>
> **Verified APIs.** `commander@15.0.0` (`new Command()`, `.command()`, `.option()`,
> async `.action()`, `.parseAsync()`, `.exitOverride()`), `@clack/prompts@1.7.0`
> (`intro`, `outro`, `multiselect({ options: [{ value, label, hint }], initialValues,
> required })`, `select({ options, initialValue })`, `text({ message, placeholder,
> initialValue, validate })`, `confirm({ message })`, `isCancel`, `cancel`),
> `vitest@4.1.10` (`defineConfig` from `vitest/config`), `typescript@7.0.2`,
> `@types/node@26.1.2` — all checked against current docs/registry in Jul 2026, not
> from memory.

## Interfaces

### Module map (G1)

| Module | Responsibility |
|---|---|
| `bin/harness.js` | Executable ESM shim: shebang, imports `main` from `../dist/cli.js`, sets `process.exitCode`. No logic. |
| `src/cli.ts` | Command/flag surface (`commander`), flag → `PartialHarnessConfig` translation, error → exit-code mapping. |
| `src/init.ts` | Composition root for `init`: the ordered pipeline. All seams injectable. |
| `src/vocabulary.ts` | The closed vocabularies and their types (`ToolId`, `RoleId`, `GateId`, `CostTier`, `CapabilityName`) — the one module every other imports and which imports nothing. **Revision note (added while writing this contract):** originally these lived in `src/config.ts`, which created an import cycle — `config.ts` needs `CanonicalTemplates` for `defaultConfig`, while `templates.ts` needs the enums for validation. That cycle survives compilation only because one direction is type-only and gets erased. Extracting the vocabulary removes it structurally instead of relying on erasure. |
| `src/config.ts` | Config shape, defaults, validation, merge, (de)serialization, flag-list parsing. Re-exports nothing; consumers import vocabulary directly. |
| `src/templates.ts` | Canonical template location, loading, and parsing of the Role Metadata schema. |
| `src/prompts.ts` | The five interactive questions (`@clack/prompts`). |
| `src/engine.ts` | Turns `HarnessConfig` + `CanonicalTemplates` into `HarnessPayload`. |
| `src/generators/types.ts` | The `Generator` adapter interface — the contract all five per-tool generators implement. |
| `src/generators/markdown-yaml.ts` | Shared wrapper helpers for the four Markdown+YAML targets (`renderFrontmatter`, `yamlQuote`). |
| `src/generators/claude-code.ts` | The one reference generator. |
| `src/generators/index.ts` | Generator registry and availability lookup. |
| `src/writer.ts` | Write planning, conflict detection, path containment, application. |
| `src/errors.ts` | `HarnessError` + the exit-code table. |

### Public API — `src/errors.ts` (G1)

```ts
export const EXIT = {
  OK: 0,
  UNEXPECTED: 1,
  USAGE: 2,
  CONFLICT: 3,
  NO_GENERATOR: 4,
  TEMPLATE: 5,
  CANCELLED: 130,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export type HarnessErrorCode = 'USAGE' | 'CONFLICT' | 'NO_GENERATOR' | 'TEMPLATE' | 'CANCELLED';

/**
 * The only error type this CLI throws deliberately. Anything else escaping to
 * `main` is a bug and maps to EXIT.UNEXPECTED.
 */
export class HarnessError extends Error {
  readonly code: HarnessErrorCode;
  /** Extra lines printed under the message, e.g. the list of conflicting paths. */
  readonly details: readonly string[];

  constructor(code: HarnessErrorCode, message: string, details?: readonly string[]);

  get exitCode(): ExitCode;
}

export function isHarnessError(value: unknown): value is HarnessError;
```

### Public API — `src/vocabulary.ts` (G2, G3)

The closed vocabularies, fixed by `specs/canonical-role-templates/contract.md`. This
module has **no imports**, which is what keeps `config.ts` and `templates.ts` free of
a cycle.

```ts
export const TOOL_IDS = ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex'] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const ROLE_IDS = [
  'sdd-architect',
  'sdd-test-writer',
  'sdd-executor',
  'sdd-auditor',
  'sdd-documentation',
] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const GATE_IDS = ['post-specs', 'post-red-tests', 'post-audit'] as const;
export type GateId = (typeof GATE_IDS)[number];

export const COST_TIERS = ['most-capable', 'mid', 'cheapest'] as const;
export type CostTier = (typeof COST_TIERS)[number];

/** The capability vocabulary fixed by specs/canonical-role-templates/contract.md. */
export const CAPABILITY_NAMES = [
  'read-files',
  'write-files',
  'run-shell',
  'web-search',
  'docs-lookup',
  'task-tracking',
] as const;
export type CapabilityName = (typeof CAPABILITY_NAMES)[number];
```

### Public API — `src/config.ts` (G2, G8)

```ts
import type { CanonicalTemplates } from './templates.js';
import { COST_TIERS, GATE_IDS, ROLE_IDS, TOOL_IDS } from './vocabulary.js';
import type { CostTier, GateId, RoleId, ToolId } from './vocabulary.js';

export const CONFIG_VERSION = 1;

/**
 * A **resolved** enabled role: membership plus a settled tier. Appears only in a
 * complete `HarnessConfig`, never in a partial/flag-side one — see `RoleOverride`
 * for the partial counterpart. Keeping "resolved" and "partial" as distinct types is
 * the type-level half of the AL-1/AL-2 fix.
 */
export interface RoleSelection {
  readonly id: RoleId;
  /** Effective cost tier; always derived from the role's canonical `cost_tier`
   *  unless explicitly overridden. Never defaulted to a literal. */
  readonly tier: CostTier;
  /** A literal, tool-native model id that bypasses the generator's tier mapping. */
  readonly modelOverride?: string;
}

export interface HarnessConfig {
  readonly version: typeof CONFIG_VERSION;
  /** At least one. Deduped, in TOOL_IDS order. */
  readonly tools: readonly ToolId[];
  /** At least one. Deduped, in ROLE_IDS order. The conductor is never listed here. */
  readonly roles: readonly RoleSelection[];
  /** May be empty (see Behavior Guarantee 9). Deduped, in GATE_IDS order. */
  readonly gates: readonly GateId[];
  /** Captured only; nothing in this feature consumes it. Omitted when blank. */
  readonly stack?: string;
}

/** Per-role tweak. Adjusts a role that is already enabled; never grants membership. */
export interface RoleOverride {
  readonly id: RoleId;
  readonly tier?: CostTier;
  readonly modelOverride?: string;
}

/**
 * **(AMENDED — AL-1/AL-2/AL-3/AL-4)** Selection and override are now two distinct
 * fields, mirroring how `gates` already behaves.
 *
 * *Superseded shape:* `Partial<Omit<HarnessConfig, 'version'>>`, whose single
 * `roles: RoleSelection[]` field had to mean both "which roles are enabled" and
 * "tier/model tweaks for a role". Because `mergeConfig` merges that field by id and
 * never removes, selection through it was structurally impossible — so `--roles`
 * could not deselect (AL-2), `--roles A --model B=x` dropped B (AL-3), and `cli.ts`
 * emitted bare `RoleId` strings that crashed `prompts.ts` (AL-1).
 */
export interface PartialHarnessConfig {
  readonly tools?: readonly ToolId[];
  /** **Wholesale replaces** the enabled role set, exactly like `gates`. Set by
   *  `--roles`. Membership only — carries no tier or model information. */
  readonly roleIds?: readonly RoleId[];
  /** Per-id tweaks layered on top of the enabled set. Set by `--model`. Merged by
   *  id; never adds or removes membership. */
  readonly roleOverrides?: readonly RoleOverride[];
  /** Wholesale replaces the active gate set. */
  readonly gates?: readonly GateId[];
  readonly stack?: string;
}

/** Derives defaults from canonical content: every role enabled, every gate active,
 *  each role's tier read from its template's `cost_tier`. Never hardcodes tiers. */
export function defaultConfig(templates: CanonicalTemplates): HarnessConfig;

/**
 * Parses + fully validates `.sdd/harness.json`-shaped JSON. Throws HarnessError('USAGE').
 *
 * **(AMENDED — AL-2 consequence.)** The persisted file is a full `HarnessConfig`, so
 * it carries `roles: RoleSelection[]`, not the split flag-side fields. This function
 * translates: the listed ids become `roleIds` (a config file names exactly the roles
 * it wants — wholesale selection, consistent with `--roles`), and each entry's
 * already-resolved `tier`/`modelOverride` become `roleOverrides`. This keeps
 * `serializeConfig` → `loadConfigFile` a faithful round-trip (T13) while giving the
 * file the same replace-not-append semantics a user gets from the flag.
 */
export function loadConfigFile(contents: string, sourcePath: string): PartialHarnessConfig;

export function validateConfig(value: unknown, source: string): HarnessConfig;

/**
 * **(AMENDED — AL-2/AL-4)** Right-biased merge, applied in a fixed order:
 *   1. If `override.roleIds` is present, it **replaces** the enabled role set. Each
 *      newly-enabled role's base tier is read from `templates` (`cost_tier`); each
 *      role retained from `base` keeps its already-resolved tier and `modelOverride`.
 *   2. `override.roleOverrides` is then layered on by id, adjusting `tier` and/or
 *      `modelOverride` of roles in the resulting set.
 *   3. `tools`, `gates`, `stack` replace wholesale when present.
 *
 * `templates` is a **required** parameter, not a convenience: it is what makes a
 * literal tier fallback unnecessary anywhere in `src/`. A newly-enabled role's tier
 * is always derivable, so no code path needs `?? 'mid'` (Behavior Guarantee 4;
 * the three surviving literals were AL-4).
 *
 * Throws `HarnessError('USAGE')` when a `roleOverride` names a role that is not in
 * the resulting enabled set — see the Error Handling Contract.
 */
export function mergeConfig(
  base: HarnessConfig,
  override: PartialHarnessConfig,
  templates: CanonicalTemplates,
): HarnessConfig;

/** Stable JSON: keys in declaration order, 2-space indent, one trailing newline. */
export function serializeConfig(config: HarnessConfig): string;

/** `'all'` expands to TOOL_IDS; otherwise a comma-separated list. Throws on unknown ids. */
export function parseToolList(raw: string): readonly ToolId[];
/** `'all'` expands to ROLE_IDS. Throws on unknown ids. */
export function parseRoleList(raw: string): readonly RoleId[];
/** `'all'` expands to GATE_IDS; `'none'` yields `[]`. Throws on unknown ids. */
export function parseGateList(raw: string): readonly GateId[];
/** `--model <role>=<value>`; value is a CostTier, else a literal model override. */
export function parseModelAssignment(raw: string): { role: RoleId; tier?: CostTier; modelOverride?: string };
```

### Public API — `src/templates.ts` (G3, G4)

```ts
export interface Capability {
  /** Raw token as written in the canonical file, e.g. `read-files`. */
  readonly name: string;
  /** Free-text scope from a trailing parenthetical, e.g. `audit.md only`. */
  readonly scope?: string;
  /** True when `name` is in CAPABILITY_NAMES. Unknown tokens are kept, not dropped. */
  readonly known: boolean;
}

export interface RoleMetadata {
  readonly id: RoleId;
  readonly purpose: string;
  readonly costTier: CostTier;
  readonly costRationale: string;
  readonly capabilities: readonly Capability[];
  readonly invocation: string;
  readonly handoff: string;
}

export interface RoleTemplate {
  readonly metadata: RoleMetadata;
  /** Verbatim canonical body per parsing rule 11: everything after the
   *  `## Role body` heading line (and after any leading authoring blockquote,
   *  rule 9), with leading/trailing blank lines removed and nothing else altered. */
  readonly body: string;
  /** Leading authoring blockquote excluded by rule 9, verbatim, if any.
   *  Present so exclusion is observable rather than silent (rule 10). */
  readonly authoringNote?: string;
  /** Path relative to the templates root, e.g. `roles/sdd-architect.md`. */
  readonly sourcePath: string;
}

/** The conductor is NOT a pipeline role: its metadata block legitimately carries
 *  only `id` and `purpose` (no cost_tier/capabilities/invocation/handoff). */
export interface ConductorMetadata {
  readonly id: string;
  readonly purpose: string;
}

export interface ConductorTemplate {
  readonly metadata: ConductorMetadata;
  /** Verbatim per parsing rule 11: everything after the metadata block and after the
   *  leading authoring blockquote (rule 9), blank-line-trimmed. For the real canonical
   *  conductor this MUST begin with `You are the **conductor** of the SDD pipeline`
   *  — the sentence AL-6 dropped. */
  readonly body: string;
  /** Leading authoring blockquote excluded by rule 9, verbatim, if any (rule 10). */
  readonly authoringNote?: string;
  readonly sourcePath: string;
}

export const SPEC_SCHEMA_NAMES = ['intent', 'contract', 'roadmap', 'tasks', 'audit'] as const;
export type SpecSchemaName = (typeof SPEC_SCHEMA_NAMES)[number];

export interface SpecSchemaTemplate {
  readonly name: SpecSchemaName;
  /** Byte-for-byte file contents. Never reformatted. */
  readonly contents: string;
  readonly sourcePath: string;
}

export interface CanonicalTemplates {
  /** Absolute path to the templates root actually loaded. */
  readonly root: string;
  readonly roles: ReadonlyMap<RoleId, RoleTemplate>;
  readonly conductor: ConductorTemplate;
  readonly specSchema: readonly SpecSchemaTemplate[];
}

/** Resolves `<package-root>/templates` from `import.meta.url`, independent of cwd.
 *  Correct from both `dist/templates.js` and `src/templates.ts` (both one level
 *  below the package root), so dev, test, and installed runs agree. */
export function resolveTemplatesRoot(): string;

export async function loadCanonicalTemplates(root?: string): Promise<CanonicalTemplates>;

export function parseRoleTemplate(source: string, sourcePath: string): RoleTemplate;
export function parseConductorTemplate(source: string, sourcePath: string): ConductorTemplate;
export function parseCapabilityList(raw: string): readonly Capability[];
```

**Parsing rules — normative (G3):**

1. **(AMENDED — AL-6)** A metadata block is the run of **contiguous `- key: value`
   bullets** after a heading matching `/^##\s+(Role )?Metadata\s*$/`. Blank lines
   between bullets are tolerated; the block ends at the first line that is neither
   blank nor a bullet, **or** at the next `## ` heading, whichever comes first.
   *Superseded wording:* "the run of lines … up to the next line starting with `## `".
   That definition swallowed every line between the last bullet and the next heading,
   which in the real `templates/conductor/sdd-conductor.md` is the authoring blockquote
   **and** the conductor's defining opening sentence — silently dropping the latter
   from all generated output.
2. Each entry matches `/^-\s+([a-z_]+):\s*(.*)$/`. The value is the remainder of the
   line, trimmed. Splitting is on the **first** `: ` only, so values containing colons
   survive intact.
3. Keys are snake_case in the file and camelCase in the type: `cost_tier` → `costTier`,
   `cost_rationale` → `costRationale`.
4. **Missing required keys are fatal**; unknown keys are **ignored**, not fatal. Roles
   require all seven keys; the conductor requires `id` and `purpose`. Rationale: the
   canonical layer may legitimately gain keys later (the prior audit recommends
   exactly that), and an installed CLI must not break when it does.
5. `cost_tier` **must** be one of `COST_TIERS`; any other value is fatal, because it
   drives model selection and cannot degrade safely.
6. `capabilities` is a comma-separated token list. A token of the form
   `name (scope text)` yields `{ name, scope: 'scope text' }`. Tokens outside
   `CAPABILITY_NAMES` yield `known: false` and are **preserved**, never discarded.
7. A role's `id` must equal `ROLE_IDS`-membership and must match the file's `# <h1>`;
   a mismatch is fatal.
8. Role body extraction keys off `/^##\s+Role body\s*$/`; its absence is fatal.
9. **(NEW — AL-6) Authoring-commentary rule, general and mechanical.** A Markdown
   blockquote (a run of `>`-prefixed lines) that appears **immediately after the
   body-start marker, before any other content**, is template authoring commentary
   addressed to maintainers of `templates/`, not content addressed to the agent. It is
   excluded from `body` and is not metadata. "Body-start marker" means the end of the
   metadata block for the conductor, and the `## Role body` heading for a role — so the
   rule is one mechanism applied at two entry points, **not** a conductor special case.
   Blank lines may separate the marker, the blockquote, and the body.
   - The rule fires **only** on a leading blockquote. A blockquote anywhere later in the
     body is ordinary content and is preserved.
   - Today only the conductor has such a blockquote; no role body currently begins with
     one (verified against all five canonical files). The rule is written generally so a
     role gaining one later behaves identically.
10. **(NEW — AL-6) Exclusion must be observable, never silent.** Any text removed by
    rule 9 is retained on the parsed template as `authoringNote`, and the count of
    excluded lines is available to callers. Rationale: AL-6 was a *silent* content loss
    that every existing test missed. Guarantee 8's "nothing is silently dropped"
    principle applies to parsing, not only to capability mapping — if a future
    canonical file makes rule 9 fire wrongly, the dropped text must be inspectable
    rather than invisible.
11. **(NEW — AL-6) `body` definition.** After rules 1, 8, 9 are applied, `body` is
    everything from the first non-blank, non-excluded-blockquote line through end of
    file, with leading and trailing blank lines removed and nothing else altered. For
    the real conductor this means `body` **must** begin with the literal text
    `You are the **conductor** of the SDD pipeline, not a participant.`

### Public API — `src/engine.ts` (G3, G7)

```ts
export interface RolePayload {
  readonly template: RoleTemplate;
  /** Effective tier after config resolution. */
  readonly tier: CostTier;
  readonly modelOverride?: string;
}

/** Config facts a generator may render into a delimited generated block. */
export interface ProjectConfigSummary {
  readonly enabledRoles: readonly RoleId[];
  readonly gates: readonly GateId[];
  readonly stack?: string;
  /** POSIX path, relative to the target repo, where spec-schema templates land. */
  readonly specSchemaDir: string;
  /** True when fewer than all three gates are active. */
  readonly reducedGates: boolean;
}

export interface ConductorPayload {
  readonly template: ConductorTemplate;
  readonly project: ProjectConfigSummary;
}

export interface HarnessPayload {
  /** Enabled roles only, in ROLE_IDS order. */
  readonly roles: readonly RolePayload[];
  /** Always present — the conductor is always on. */
  readonly conductor: ConductorPayload;
  readonly specSchema: readonly SpecSchemaTemplate[];
  readonly config: HarnessConfig;
}

export const SPEC_SCHEMA_DIR = '.sdd/spec-schema';
export const HARNESS_CONFIG_PATH = '.sdd/harness.json';

export function buildPayload(config: HarnessConfig, templates: CanonicalTemplates): HarnessPayload;

/** Tool-neutral files written once regardless of how many tools are selected:
 *  the five spec-schema templates plus the resolved config. Closes AL-5. */
export function buildSharedFiles(payload: HarnessPayload): readonly GeneratedFile[];
```

### Public API — `src/generators/types.ts` — the adapter interface (G5)

```ts
export type WrapperFormat = 'markdown-yaml' | 'toml';

export interface GeneratedFile {
  /** POSIX-style path relative to the target repo root. Never absolute, never `..`. */
  readonly path: string;
  /** Full file contents, ending in exactly one `\n`. */
  readonly contents: string;
}

export interface CapabilityMapping {
  /** Tool-native tool/permission names, deduped, in a stable order. */
  readonly tokens: readonly string[];
  /** Anything the target format cannot express natively — scoped capabilities and
   *  unknown tokens. MUST be surfaced in the rendered output, never dropped. */
  readonly notes: readonly string[];
}

/**
 * The contract every per-tool generator implements. Deliberately sufficient for all
 * five known targets: `.claude/agents/<role>.md`, `.cursor/agents/<role>.md`,
 * `.kiro/agents/<role>.md`, `.github/agents/<role>.agent.md` (markdown-yaml), and
 * `.codex/agents/<role>.toml` (toml).
 */
export interface Generator {
  readonly id: ToolId;
  readonly displayName: string;
  /** Target directory for role files, POSIX, relative to the target repo root. */
  readonly agentsDir: string;
  readonly wrapperFormat: WrapperFormat;
  /** Full path for the conductor artifact — deliberately NOT derived from
   *  `agentsDir`, because at least one target places it elsewhere entirely
   *  (Claude Code: `.claude/skills/sdd-conductor/SKILL.md`). */
  readonly conductorPath: string;

  /** File name only. Accommodates `<role>.md`, `<role>.agent.md`, `<role>.toml`. */
  roleFileName(roleId: RoleId): string;

  /** cost_tier → this tool's own model id. `override`, when present, is returned
   *  verbatim: the user's literal model id always wins over the tier mapping. */
  mapModel(tier: CostTier, override?: string): string;

  mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping;

  renderRole(payload: RolePayload): GeneratedFile;
  renderConductor(payload: ConductorPayload): GeneratedFile;
}
```

### Public API — `src/generators/markdown-yaml.ts` (G5)

Shared by the four Markdown+YAML targets so weeks 3–4 reuse rather than re-derive.

```ts
export interface FrontmatterField {
  readonly key: string;
  readonly value: string;
  /** When true, emit unquoted (e.g. `model: opus`). Default false → quoted. */
  readonly raw?: boolean;
}

/** Double-quoted YAML scalar: escapes `\` and `"`, encodes newlines as `\n`. */
export function yamlQuote(value: string): string;

/** Renders `---\n<fields>\n<# comments>\n---\n`. Comments are YAML `#` lines. */
export function renderFrontmatter(
  fields: readonly FrontmatterField[],
  comments?: readonly string[],
): string;

// These markers land in the user's own files and are what a human or script greps
// for, so they carry the product name (unlike the internal `bin/harness.js` path).
export const GENERATED_BLOCK_BEGIN = '<!-- harny:begin generated project configuration -->';
export const GENERATED_BLOCK_END = '<!-- harny:end generated project configuration -->';

/** The delimited, machine-marked block that carries config-derived content.
 *  This is the ONLY place configuration may appear in a rendered artifact. */
export function renderProjectConfigBlock(project: ProjectConfigSummary): string;

/** Provenance line emitted after the frontmatter of every generated artifact. */
export function renderProvenance(sourcePath: string): string;
```

### Public API — `src/generators/claude-code.ts` and `index.ts` (G6)

```ts
export const claudeCodeGenerator: Generator;

// src/generators/index.ts
export const generators: ReadonlyMap<ToolId, Generator>;
export function getGenerator(id: ToolId): Generator | undefined;
/** Tool ids that actually have a generator today. In this feature: ['claude-code']. */
export function availableToolIds(): readonly ToolId[];
```

**Claude Code mapping tables — normative, derived from this repo's live `.claude/`
files as the empirical oracle (G6):**

| Property | Value |
|---|---|
| `id` | `'claude-code'` |
| `agentsDir` | `.claude/agents` |
| `conductorPath` | `.claude/skills/sdd-conductor/SKILL.md` |
| `wrapperFormat` | `'markdown-yaml'` |
| `roleFileName(id)` | `` `${id}.md` `` |

`mapModel`: `most-capable` → `opus`, `mid` → `sonnet`, `cheapest` → `haiku`;
`override` returned verbatim.

`mapCapabilities` token table:

| Capability | Claude Code tokens |
|---|---|
| `read-files` | `Read`, `Glob`, `Grep`, `LS` |
| `write-files` | `Write`, `Edit` |
| `run-shell` | `Bash` |
| `web-search` | `WebSearch`, `WebFetch` |
| `docs-lookup` | `mcp__context7__resolve-library-id`, `mcp__context7__query-docs` |
| `task-tracking` | `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate` |

`notes` entries: for a scoped capability, `` `<name> is scoped to <scope>` ``; for an
unknown token, `` `unmapped capability: <name>` ``.

`renderRole` output shape:

```md
---
name: sdd-auditor
description: "<purpose> <invocation>"
model: opus
tools: "Read, Glob, Grep, LS, Bash, Write, Edit"
# capability note: write-files is scoped to audit.md only
---
<!-- generated by harny from templates/roles/sdd-auditor.md — canonical body below is verbatim; edit the canonical template, not this file -->

<canonical body, byte-for-byte>
```

`renderConductor` output shape: Skill frontmatter (`name`, `description` from
`ConductorMetadata`), the provenance line, the verbatim canonical body, then the
delimited generated project-configuration block.

### Public API — `src/prompts.ts` (G2)

```ts
export interface PromptDefaults {
  /** Already fully resolved: role membership settled, tiers derived from canonical
   *  `cost_tier`, overrides applied. Prompts read tiers from here — they never
   *  re-derive a tier and never need a literal fallback (AL-4). */
  readonly config: HarnessConfig;
  /** Tool ids that have a generator, shown with a distinguishing hint. */
  readonly available: readonly ToolId[];
  /**
   * Questions already answered by a flag; these are skipped and reported.
   *
   * **(AMENDED — AL-1.)** Question 2 (role selection) is preset by `preset.roleIds`,
   * a `readonly RoleId[]` — *not* by a list of `RoleSelection` objects. The previous
   * shape invited exactly the crash that shipped: `cli.ts` wrote bare `RoleId`
   * strings into the single `roles` field while `prompts.ts` read `role.id` off each
   * element, yielding `[undefined]` and an empty role set. Question 3 (per-role model)
   * is preset by `preset.roleOverrides`.
   */
  readonly preset: PartialHarnessConfig;
}

/** Asks exactly the five plan.md §4 questions, in order. Throws
 *  HarnessError('CANCELLED') when the user aborts (clack `isCancel`). */
export async function runInitPrompts(defaults: PromptDefaults, io: InitIO): Promise<HarnessConfig>;

/** Final "write these files?" confirmation. Skipped under `--yes`. */
export async function confirmWrite(plan: WritePlan, io: InitIO): Promise<boolean>;
```

**Question order and widgets — normative (G2):**

| # | plan.md §4 question | Widget | Default |
|---|---|---|---|
| 1 | Which agent tool(s)? | `multiselect`, `required: true` | `['claude-code']`; the four unimplemented tools are offered with hint `generator not shipped yet` |
| 2 | Which roles to enable? | `multiselect`, `required: true` | all five; message states the conductor is always on |
| 3 | Model per role? | one `select` per enabled role: the three tiers plus `custom…`; `custom…` opens a `text` | that role's canonical `cost_tier`, labelled as the production-proven default |
| 4 | Which human gates are active? | `multiselect`, `required: false` | all three |
| 5 | Project stack? | `text`, empty allowed | empty; hint states it is captured only |

### Public API — `src/writer.ts` (G8)

```ts
export interface WritePlan {
  readonly targetDir: string;
  readonly files: readonly GeneratedFile[];
  /** Relative paths that already exist on disk. */
  readonly conflicts: readonly string[];
}

export async function planWrites(
  files: readonly GeneratedFile[],
  targetDir: string,
): Promise<WritePlan>;

/** Writes every file, creating parent directories. Throws HarnessError('CONFLICT')
 *  before writing anything when `plan.conflicts` is non-empty and `force` is false. */
export async function applyWrites(
  plan: WritePlan,
  options: { readonly force: boolean },
): Promise<readonly string[]>;

/**
 * Throws a plain `Error` (not a `HarnessError`) if a generated path is absolute or
 * escapes `targetDir` after normalization; `main` surfaces it as exit 1.
 *
 * **(AMENDED — AL-8.)** Previously documented as throwing
 * `HarnessError('UNEXPECTED'-mapped)`, which is unconstructible: `'UNEXPECTED'` is an
 * `EXIT` key, not a `HarnessErrorCode` member. A containment failure means a
 * generator produced a malformed path — a bug, not user misconfiguration — so a plain
 * `Error` mapped to exit 1 is the correct signal and matches both the implementation
 * and the Error Handling Contract row.
 */
export function assertContained(relativePath: string, targetDir: string): void;
```

### Public API — `src/init.ts` (G1, G8)

```ts
export interface InitIO {
  readonly log: (message: string) => void;
  readonly warn: (message: string) => void;
}

export interface InitOptions {
  /** Absolute path to the repo being scaffolded. */
  readonly targetDir: string;
  /** Injected seam; defaults to `resolveTemplatesRoot()`. Tests point it at fixtures. */
  readonly templatesRoot?: string;
  /** Values already supplied by flags. */
  readonly overrides?: PartialHarnessConfig;
  /** Absolute path to a `--config` file, if any. */
  readonly configFile?: string;
  readonly interactive: boolean;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly io: InitIO;
}

export interface InitResult {
  readonly config: HarnessConfig;
  /** Relative paths the run planned to write, in stable order. */
  readonly planned: readonly string[];
  /** Relative paths actually written. Empty when `dryRun`. */
  readonly written: readonly string[];
  /** Selected tools that have no generator yet. */
  readonly skippedTools: readonly ToolId[];
  readonly dryRun: boolean;
}

export async function runInit(options: InitOptions): Promise<InitResult>;
```

**`runInit` sequence — normative (G1, G3, G6, G7, G8, G9):**

1. Load canonical templates from `templatesRoot ?? resolveTemplatesRoot()`.
2. Compute `defaultConfig(templates)` — tiers read from canonical `cost_tier`.
3. If `configFile` is set, read and `loadConfigFile` it; `mergeConfig` it over defaults
   (passing `templates`, so any role the file newly enables gets its canonical tier).
4. `mergeConfig` `overrides` (flags) over that, again passing `templates`. Per the
   amended merge order, `roleIds` replaces membership first, then `roleOverrides`
   layer on — so `--roles A --model B=x` no longer discards `B` silently; it is now a
   `USAGE` error when `B` is outside the resulting set.
5. If `interactive`, run `runInitPrompts` (skipping preset questions); else use the
   merged config as final.
6. **(NEW — interactive-path gap in the AL-3 policy.)** If `interactive`, re-check every
   flag-supplied `roleOverride` against the **final** enabled-role set, and `io.warn`
   for each one whose role the user deselected at question 2 — naming the role, the
   flag that supplied the override, and the fact that the override was not applied.
   This is a **warning, not a `USAGE` error**: step 4's check runs before the prompts,
   so interactive deselection can invalidate an override after the fact, and aborting a
   completed interactive session would be hostile when the user made that choice
   knowingly. The non-negotiable half is that it is never *silent* — same policy as the
   step 4 error, different remedy for a different moment.
7. `validateConfig` the result.
8. If `config.gates.length < GATE_IDS.length`, `io.warn` naming the missing gates.
9. `buildPayload(config, templates)`.
10. For each selected tool, look up its generator; collect `skippedTools` for misses
    and `io.warn` per miss. If **no** selected tool has a generator, throw
    `HarnessError('NO_GENERATOR')` and write nothing.
11. Render: per available generator, `renderRole` for each enabled role plus
    `renderConductor`; then `buildSharedFiles(payload)` **once**.
12. `planWrites(files, targetDir)`.
13. If `dryRun`, log the plan and return with `written: []`. Else, if `interactive`,
    `confirmWrite` (a `false` answer throws `HarnessError('CANCELLED')`); then
    `applyWrites`.

### Public API — `src/cli.ts` (G1, G8)

```ts
/**
 * Builds the commander program. Exposed for tests; `io` defaults to console.
 *
 * MUST call `.name('harny')` explicitly. Commander otherwise derives the displayed
 * program name from `argv[1]`, which would render `Usage: harness.js [options]` —
 * leaking the internal file name into user-facing help. `--help` must read
 * `Usage: harny [options] [command]`.
 */
export function buildProgram(io?: InitIO): Command;

/** Parses argv, runs the command, maps errors to exit codes. Never calls
 *  `process.exit` — returns the code so it is unit-testable. */
export async function main(argv: readonly string[]): Promise<ExitCode>;
```

`init` command surface:

| Flag | Meaning |
|---|---|
| `[target]` | Positional target directory; default `.` |
| `--tools <list>` | Comma list of tool ids, or `all` |
| `--roles <list>` | Comma list of role ids, or `all`. **Replaces** the enabled set wholesale (so it can deselect), exactly like `--gates`. Sets `roleIds` only |
| `--model <role>=<value>` | Repeatable; `<value>` is a cost tier or a literal model id. Sets `roleOverrides` only — never grants a role membership. Naming a role outside the enabled set is a `USAGE` error |
| `--gates <list>` | Comma list of gate ids, `all`, or `none` |
| `--stack <name>` | Project stack (captured only) |
| `--config <path>` | JSON config file; implies non-interactive |
| `-y, --yes` | Accept defaults, skip all prompts and the final confirmation |
| `--dry-run` | Print the write plan; write nothing |
| `--force` | Overwrite existing files |

**Interactivity resolution — normative (G8):** `--yes` ⇒ non-interactive; else
`--config` ⇒ non-interactive; else no TTY on stdin ⇒ `HarnessError('USAGE')` naming
both `--yes` and `--config`; else interactive, with flag-answered questions skipped.

### Data Models — build and packaging (G1, G10)

`package.json` (shape fixed by this contract; exact dependency versions are the
verified ones from `intent.md`):

```jsonc
{
  "name": "harny",
  "version": "0.1.0",
  "type": "module",
  // Exactly one bin entry: the command users type. `bin/harness.js` is an internal
  // path (see intent.md Prior Art) and is never typed by a user.
  "bin": { "harny": "bin/harness.js" },
  "files": ["bin", "dist", "templates", "README.md", "CHANGELOG.md", "AGENTS.md"],
  "engines": { "node": ">=20.19.0" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepack": "npm run build"
  },
  "dependencies": { "commander": "15.0.0", "@clack/prompts": "1.7.0" },
  "devDependencies": { "typescript": "7.0.2", "vitest": "4.1.10", "@types/node": "26.1.2" }
}
```

`tsconfig.json`: `module`/`moduleResolution` `nodenext`, `target` `es2023`,
`strict: true`, `verbatimModuleSyntax: true`, `rootDir: src`, `outDir: dist`,
`include: ["src"]`. Relative imports therefore carry explicit `.js` extensions.

`vitest.config.ts`: `defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.ts'] } })`.

### State Changes

This feature has no runtime application state. Its state effects are:

- **Inside this repo (created):** `package.json`, `tsconfig.json`, `vitest.config.ts`,
  `bin/`, `src/`, `tests/`; `.gitignore` gains `node_modules/` and `dist/`.
- **Inside this repo (read-only):** `templates/**` and `.claude/**` are inputs only
  and MUST be byte-for-byte unchanged. (G3)
- **Inside a target repo (written by `init`):** the selected tools' agent/conductor
  files, `.sdd/spec-schema/*.md`, and `.sdd/harness.json` — and nothing else.

## Behavior Guarantees

1. **Canonical fidelity.** For every enabled role and every available generator, the
   role's canonical `body` appears byte-for-byte as a contiguous substring of the
   generated file. The same holds for the conductor body. (G7)
2. **Wrapper-only variation.** The only per-tool differences in output are: target
   path, file name, frontmatter/TOML wrapper, mapped model id, and mapped capability
   tokens. No generator rewrites, truncates, reflows, or re-headings canonical prose. (G5, G7)
3. **Configuration is quarantined.** Config-derived content (enabled roles, active
   gates, stack, spec-schema location) appears only between
   `GENERATED_BLOCK_BEGIN`/`GENERATED_BLOCK_END`, and never interleaved with
   canonical prose. Disabling a role or gate never edits canonical text. (G7)
4. **Single canonical source.** `src/` contains no copy, excerpt, or paraphrase of any
   `templates/` file; all role/conductor/schema content reaches output only by being
   read from `templates/` at runtime. Tier defaults come from parsed `cost_tier`,
   never from a literal in `src/`. (G3, G4)
5. **No canonical mutation.** No code path writes to, renames, or deletes anything
   under `templates/` or `.claude/`. (G3)
6. **Conductor is always on.** `HarnessPayload.conductor` is always populated, and
   every available generator always emits its conductor artifact, regardless of which
   roles were selected. `RoleSelection` can never name the conductor. (G2)
7. **Tier defaults track canonical content.** `defaultConfig(templates).roles[i].tier`
   equals `templates.roles.get(id).metadata.costTier` for every role. Changing a
   canonical `cost_tier` changes the default with no source change. (G4)
8. **Nothing is silently dropped.** Every capability token in a canonical file is
   either mapped to at least one tool-native token or surfaced in
   `CapabilityMapping.notes`, and every note appears in the rendered output. In
   particular the auditor's `write-files (audit.md only)` scope is present in
   `.claude/agents/sdd-auditor.md`. (G5)
9. **Gate configurability with a warning.** Fewer than three gates is permitted and
   produces a warning naming the missing gates; the generated project-config block
   states the reduced set explicitly. Zero gates is permitted and warned about; it is
   never presented as recommended. (G2)
10. **Model override precedence.** A `modelOverride` always wins over the tier
    mapping and is emitted verbatim, untranslated. (G2)
11. **Interface sufficiency.** `Generator` can express all five known targets:
    `roleFileName` covers `.md`, `.agent.md`, and `.toml`; `wrapperFormat` covers
    both Markdown+YAML and TOML; `conductorPath` is independent of `agentsDir`. A
    compile-time-checked table of the five targets' expected paths/formats exists in
    tests as evidence. (G5)
12. **Shared artifacts written once.** `.sdd/spec-schema/*` and `.sdd/harness.json`
    are emitted exactly once even when several tools are selected, and the schema
    files are byte-identical to `templates/spec-schema/*.md`. (G9)
13. **Non-destructive by default.** Nothing is written when any planned path already
    exists, unless `--force`; conflict detection completes before the first write. (G8)
14. **`--dry-run` writes nothing.** No file, directory, or `.sdd/` entry is created. (G8)
15. **Path containment.** Every written path resolves inside `targetDir`. (G8)
16. **Deterministic output.** Two runs with the same config and templates produce
    byte-identical files (stable ordering, no timestamps, no randomness). (G6, G8)
17. **No `process.exit` in library code.** Only `bin/harness.js` sets
    `process.exitCode`; `main` returns an `ExitCode`. (G1)
18. **All-or-nothing generator availability.** If at least one selected tool has a
    generator, the run succeeds and reports the rest as skipped; if none does, it
    exits `NO_GENERATOR` having written nothing. (G5)
19. **Trailing newline.** Every `GeneratedFile.contents` ends in exactly one `\n`. (G6)
20. **Packaging completeness.** The packed tarball contains `bin/`, `dist/`, and all
    eleven `templates/**` files, and no file under `src/`, `tests/`, or `specs/`. (G10)
21. **No runtime import cycles.** `src/vocabulary.ts` imports nothing; no module pair
    imports each other at runtime. Cycle-freedom does not depend on `import type`
    erasure. (G1)
22. **(NEW — AL-1/AL-2/AL-3/AL-4) Selection and override are separate and cannot be
    conflated.** `roleIds` replaces the enabled role set wholesale and carries no tier
    or model data; `roleOverrides` adjusts only roles already in that set and can
    neither add nor remove membership. `--roles sdd-architect` yields exactly one
    generated agent file. A newly-enabled role's tier is always derived from its
    canonical `cost_tier` at merge time, so no code path in `src/` requires a literal
    tier fallback. **A flag-supplied `roleOverride` is never silently discarded on any
    path**: non-interactively, naming a role outside the enabled set is a `USAGE` error
    (step 4); interactively, a role deselected at question 2 after the merge produces an
    `io.warn` (step 6). The remedy differs because the contradiction arises at a
    different moment; the no-silent-drop invariant does not. (G2, G8; restores
    G7/SC10's role half)
23. **(NEW — AL-6) Canonical bodies are complete, not merely contiguous.** Guarantee 1
    proves generated output *contains* the parsed body; this guarantee proves the
    parsed body is the *whole* body. For the real canonical conductor, generated
    output contains the literal sentence
    `You are the **conductor** of the SDD pipeline, not a participant.`
    **This must be verified non-self-referentially** — by reading the raw canonical
    file's text directly rather than comparing against the parser's own `body`. A
    test that compares generated output to `template.body` cannot detect content the
    parser never extracted, which is exactly how AL-6 passed 106 green tests. (G7)

## Error Handling Contract

| Error Condition | Behavior | Exit | User Impact |
|---|---|---|---|
| Unknown command or flag | `commander` usage error, help hint | 1 | Standard CLI usage output |
| Unknown tool/role/gate id in a flag or config file | `HarnessError('USAGE')` with the offending value and the full list of valid ids | 2 | "Unknown tool id `cursorr`. Valid: claude-code, cursor, kiro, github-copilot, codex" |
| `--model` value that is neither a cost tier nor parseable as `role=value` | `HarnessError('USAGE')` naming the expected form | 2 | Clear syntax reminder |
| **(NEW — AL-3)** `--model` (or a config file's `roleOverrides`) names a role that is not in the resulting enabled set — e.g. `--roles sdd-architect --model sdd-auditor=opus` | `HarnessError('USAGE')` naming the role, the flag pair that excluded it, and the enabled set; nothing written | 2 | "`--model sdd-auditor=…` names a role not enabled by `--roles`. Enabled: sdd-architect." Chosen by the human over silently dropping the override (the shipped AL-3 behavior) and over auto-enabling the role, so a contradictory command is never quietly reinterpreted |
| **(NEW — interactive counterpart of the row above)** `--model` names a role that the user then **deselects at question 2** in an interactive run, so the contradiction only exists after the prompts | `io.warn` naming the role, the supplying flag, and that the override was not applied; run continues and writes normally (`runInit` step 6) | 0 | "`--model sdd-auditor=…` was not applied: sdd-auditor was deselected." Warn rather than error because the step 4 check necessarily runs *before* the prompts, and aborting a finished interactive session over a choice the user made knowingly is hostile. The invariant preserved is the same one as above — the override is never *silently* dropped |
| `--config` file missing, unreadable, or invalid JSON | `HarnessError('USAGE')` with path and parse position | 2 | Nothing written |
| `--config` file structurally valid JSON but wrong shape/version | `HarnessError('USAGE')` naming the field and expectation | 2 | Nothing written |
| Non-TTY stdin without `--yes` or `--config` | `HarnessError('USAGE')` naming both escape hatches | 2 | No hang; actionable message |
| Empty tool or role selection | Rejected at prompt (`required: true`) or `HarnessError('USAGE')` non-interactively | 2 | Cannot produce an empty harness |
| Fewer than three gates selected | Allowed; `io.warn` names the missing gates; the generated block records the reduced set | 0 | Explicit, visible, never silent |
| User cancels a prompt (Ctrl-C) or declines the final confirmation | `clack` `cancel()` message, `HarnessError('CANCELLED')` | 130 | Nothing written |
| `templates/` root missing, or a canonical file missing | `HarnessError('TEMPLATE')` naming the resolved root and missing path, flagged as a packaging fault | 5 | "This is a packaging bug, not your configuration" |
| Canonical role file missing a required metadata key, or `## Role body` | `HarnessError('TEMPLATE')` naming file and key | 5 | Nothing written |
| Canonical `cost_tier` outside the enum | `HarnessError('TEMPLATE')` naming file, value, and valid enum | 5 | Nothing written |
| Canonical file carries an **unknown extra** metadata key | Ignored; run proceeds | 0 | Forward compatible by design |
| Canonical file carries an **unknown capability token** | Preserved as `known: false`; surfaced via `CapabilityMapping.notes` in output; `io.warn` once | 0 | Nothing silently lost |
| Selected tool has no generator yet, but another selected tool does | Tool reported in `skippedTools`, `io.warn` per tool, other tools generated | 0 | "Skipped cursor: generator not shipped yet" |
| No selected tool has a generator | `HarnessError('NO_GENERATOR')` listing `availableToolIds()` | 4 | Nothing written |
| A planned path already exists and `--force` absent | `HarnessError('CONFLICT')` listing every colliding path, suggesting `--force` | 3 | Nothing written; existing work safe |
| A generated path is absolute or escapes `targetDir` | Throw before any write | 1 | Treated as a generator bug |
| Target directory missing or not writable | `HarnessError('USAGE')` with the resolved absolute path | 2 | Nothing written |
| Filesystem error mid-write | Error propagates; already-written paths are reported | 1 | Partial state disclosed, never hidden |
| Any other unexpected throw | Message plus stack under `--dry-run`/verbose, generic otherwise | 1 | Bug, not misconfiguration |

## Dependencies

**Internal (read-only inputs):**
- `templates/roles/sdd-{architect,test-writer,executor,auditor,documentation}.md`
- `templates/conductor/sdd-conductor.md`
- `templates/spec-schema/{intent,contract,roadmap,tasks,audit}.md`
- `specs/canonical-role-templates/contract.md` — the authority for the Role Metadata
  schema, `cost_tier` enum, and `capabilities` vocabulary this feature parses.
- `.claude/agents/*.md`, `.claude/skills/sdd-conductor/SKILL.md` — the empirical
  oracle for the Claude Code wrapper. Compared against, never written to.
- `plan.md` §3 (per-tool matrix), §4 (the five questions, the `bin`/`src` sketch).

**External — runtime (exactly two, per the dependency budget):**
- `commander@15.0.0`
- `@clack/prompts@1.7.0`

**External — dev:**
- `typescript@7.0.2`, `vitest@4.1.10`, `@types/node@26.1.2`

**Node builtins:** `node:fs/promises`, `node:path`, `node:url`, `node:process`.

## Integration Points

- **Consumes the shipped canonical layer.** `templates/` is the sole content source.
  This is the first consumer the `canonical-role-templates` feature was built for; the
  Role Metadata schema is the wire format between the two features.
- **Closes prior audit finding AL-5.** `buildSharedFiles` deploys
  `templates/spec-schema/*` to `.sdd/spec-schema/` in the target repo, so the
  architect role's schema references resolve after generation. The conductor's
  generated block names that directory.
- **Closes prior audit finding AL-7.** `parseConductorTemplate` accepts a metadata
  block with only `id`/`purpose`, and `Capability.scope` gives the auditor's
  `write-files (audit.md only)` a structured home instead of a dropped parenthetical.
- **Opens the door for weeks 3–4.** The four remaining generators implement
  `Generator` and reuse `src/generators/markdown-yaml.ts`; each adds one file under
  `src/generators/` plus one registry entry, and requires **no** change to
  `templates.ts`, `engine.ts`, `writer.ts`, or `prompts.ts`. The Codex TOML generator
  needs only a sibling `src/generators/toml.ts` wrapper helper — a TOML serializer is
  deliberately not a dependency of this feature.
- **Forward reference — MCP provisioning (NOT implemented here).** `harness mcp add`
  will read back `.sdd/harness.json` to know which tools were configured, which is why
  the resolved config is persisted rather than discarded. No MCP config file is
  written by this feature.
- **Forward reference — the agnostic layer (NOT implemented here).** `config.stack` is
  captured and persisted for the future CI/hooks/gitleaks layer; nothing reads it now,
  by design (`intent.md` Non-Goals).
- **This repo's own pipeline.** The generated `.claude/` output is structurally
  equivalent to, but deliberately **not byte-identical** to, the live
  `.claude/agents/*.md`: the live files still carry `<example>` blocks and `color:`
  keys that the canonical layer intentionally stripped, and the generated `tools`
  lists are the normalized union implied by each role's `capabilities`. Any test using
  the live files as an oracle MUST compare structure (frontmatter keys present, model
  value, body provenance), not bytes.
