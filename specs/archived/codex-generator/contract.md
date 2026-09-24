# Contract: codex-generator

> **How to read this file.** Every interface, mapping table and guarantee below cites the
> `intent.md` goal it serves (`G1`…`G10`). The section marked **VERIFIED** carries the
> source and date behind each pinned fact. `plan.md` §3 is **not** an accepted source for
> any of them: it was written Jul 2026, it marks two Codex cells "to confirm", and — as
> § "Discrepancies from `plan.md`" shows — a third cell is stale to the day. Where
> verification contradicts `plan.md`, the discrepancy is stated, never silently followed
> and never silently overridden.
>
> This feature adds **one** adapter (`src/generators/codex.ts`) plus **one** new shared
> wrapper module (`src/generators/toml.ts`). It does not restate
> `specs/cli-skeleton/contract.md` (guarantees 1–23) or
> `specs/cursor-kiro-copilot-generators/contract.md` (guarantees 1–14); both remain in
> force and this contract is additive except where a subsection is headed **SUPERSEDES**.
>
> **Verification-channel disclosure (G10).** Unlike the two audit passes on
> `specs/cursor-kiro-copilot-generators/`, which recorded open finding **AL-30** because
> no Context7 / WebFetch / WebSearch tool was available, live docs-lookup **was**
> available while this contract was written and **was** used. Every row below is
> first-party. What is still *not* verified is the other half of AL-30 — nobody has
> loaded these artifacts into a running Codex CLI. That gap is enumerated, not glossed,
> in § "Open items — explicitly NOT verified".

## Verified Codex facts (G3)

All rows verified **2026-08-30**. Primary channel: Context7 MCP library `/openai/codex`
(Codex CLI, source reputation High) — which returns the *implementation* (Rust source and
`config.schema.json`) rather than prose — corroborated against OpenAI's own documentation.
Note that the two `developers.openai.com/codex/...` URLs cited in `plan.md` §7 now answer
**308 Permanent Redirect** to `learn.chatgpt.com`; the redirect targets are the URLs
recorded here.

### Agent definitions (role artifacts)

| Fact | Verified value | Source |
|---|---|---|
| Agent file location (**project**) | `.codex/agents/` — **project scope exists** | https://learn.chatgpt.com/docs/agent-configuration/subagents |
| Agent file location (user) | `~/.codex/agents/` | same |
| Discovery mechanism | `<config_folder>/agents/` is scanned **recursively** for any `*.toml` file, once per config layer; results are sorted | Context7 `/openai/codex`, `codex-rs/core/src/config/agent_roles.rs` (`collect_agent_role_files`) |
| Format / extension | **TOML**, `.toml`. Docs note "the format may evolve" | https://learn.chatgpt.com/docs/agent-configuration/subagents |
| Required fields | `name` (string), `description` (string), `developer_instructions` (string) | same |
| Deserialization shape | `RawAgentRoleFileToml { name, description, nickname_candidates, #[serde(flatten)] config: ConfigToml }` with `#[serde(deny_unknown_fields)]` | Context7 `/openai/codex`, `codex-rs/agent-roles/src/agent_role_config.rs` |
| Additional accepted keys | any `config.toml` key, incl. `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config` | https://learn.chatgpt.com/docs/agent-configuration/subagents |
| **Role prose lives in a string, not a document body** | `developer_instructions` — "Core instructions that define the agent's behavior" | same |
| Multi-line strings | supported; the documented examples use TOML triple-quoted strings for `developer_instructions` | same (both verbatim examples below) |
| Tool / permission allowlist field | **None.** No `tools` or `allowed-tools` key for subagents. Subagents "use the tools available to the parent chat" and "inherit the permission mode selected beneath the composer" | same |
| `sandbox_mode` documented values | `"read-only"`, `"workspace-write"` | same |
| `model` accepted values | a model id string, e.g. `"gpt-5.3-codex-spark"`, `"gpt-5.6-terra"` | same (verbatim examples below) |
| `model_reasoning_effort` values | `ultra`, `max`, `xhigh`, `high`, `medium`, `low` | same |
| Per-agent config layering | an `[agents]` entry may carry `config_file` pointing at a role-specific config layer (incl. its own `[permissions]`) | Context7 `/openai/codex`, `codex-rs/core/config.schema.json` → `AgentRoleToml` |
| Invocation | the parent agent spawns subagents from natural-language delegation; there is no per-agent slash command | https://learn.chatgpt.com/docs/agent-configuration/subagents |

Verbatim documented example, quoted here because it is the normative shape this
generator imitates (`.codex/agents/reviewer.toml`):

```toml
name = "reviewer"
description = "PR reviewer focused on correctness, security, and missing tests."
model = "gpt-5.6-terra"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Review code like an owner.
Prioritize correctness, security, behavior regressions, and missing test coverage.
Lead with concrete findings, include reproduction steps when possible, and avoid style-only comments unless they hide a real bug.
"""
```

### Models

| Fact | Verified value | Source |
|---|---|---|
| Current Codex model family | `gpt-5.6-sol` — "for complex, open-ended work… ambiguous, difficult, or high-value tasks that need extra analysis, judgment, or polish"; `gpt-5.6-terra` — "the pragmatic all-rounder"/"everyday workhorse"; `gpt-5.6-luna` — "for clear, repeatable work", fast/lower-cost | https://developers.openai.com/codex/models |
| Default | `gpt-5.6-sol` at medium reasoning ("Power" preset) | same |
| **Retirement** | **GPT-5.4 and GPT-5.4 mini retire from Codex on 2026-08-31.** Docs instruct replacing `gpt-5.4` → `gpt-5.6-terra` and `gpt-5.4-mini` → `gpt-5.6-luna` "in saved configurations, **custom agents**, and scheduled tasks" | same |
| Project config override | `~/.codex/config.toml` for personal defaults; `.codex/config.toml` for project overrides | same |

### Skills (conductor artifact)

| Fact | Verified value | Source |
|---|---|---|
| Skill discovery roots | `.agents/skills` in cwd, in each directory up to the repo root, and at `$REPO_ROOT`; `$HOME/.agents/skills`; `/etc/codex/skills`; plus built-ins | https://learn.chatgpt.com/docs/build-skills |
| Repo-scope implementation | walks cwd → project root probing `<dir>/.agents/skills`, recursive discovery, `SkillScope::Repo` | Context7 `/openai/codex`, `codex-rs/core-skills/src/loader.rs` (`repo_agents_skill_roots`) |
| Entry point | `SKILL.md` — **Markdown with YAML frontmatter**, body = instructions loaded when the skill is used | https://learn.chatgpt.com/docs/build-skills |
| Required frontmatter | `name`, `description` | same |
| Optional frontmatter (secondary source) | `argument-hint`, `disable-model-invocation`, `user-invocable`, `allowed-tools`; `name` lowercase/digits/hyphens ≤ 64 chars | Context7 `/openai/codex`, `codex-rs/memories/write/templates/memories/consolidation.md` — a *template* inside the repo, so treated as secondary and relied on only for the permissive `name` charset |
| Invocation | `$<skill-name>` in Codex CLI / IDE extension; `/skills` lists them; also implicitly activated on description match | https://learn.chatgpt.com/docs/build-skills , Context7 `/openai/codex` `codex-rs/app-server/README.md`, `codex-rs/tui/assets/tooltips.txt` |
| Directory layout | `<skill-name>/SKILL.md` required; optional `scripts/`, `references/`, `assets/`, `agents/openai.yaml` | Context7 `/openai/codex`, `codex-rs/skills/src/assets/samples/skill-creator/SKILL.md` |
| Documented size limit on `description` | **none found** | — |

## Discrepancies from `plan.md` (G3)

| # | `plan.md` claim | Verified 2026-08-30 | Action taken |
|---|---|---|---|
| **D1** | §3: Codex scope "user (confirm whether project scope exists)", and §3/§7 flag "whether Codex CLI accepts a project-level `agents/` folder or only `~/.codex/agents/`" as a week-1 open question | **RESOLVED — project scope exists.** `.codex/agents/` is documented as the project-scoped location, and the loader scans an `agents/` directory per config layer, not only the user layer | `agentsDir` pins `.codex/agents`. Open item **closed** |
| **D2** | §3: Codex model field "per-agent model (e.g. GPT-5.4-mini for fast subagents)", flagged as an implementation detail to confirm | **RESOLVED, and the example is stale to the day.** The field is a plain top-level `model` string key — but **`gpt-5.4-mini` retires from Codex on 2026-08-31**, one day after this contract, and OpenAI explicitly instructs replacing it with `gpt-5.6-luna` *in custom agents* | `mapModel` pins the current `gpt-5.6-sol`/`gpt-5.6-terra`/`gpt-5.6-luna` triple. `plan.md`'s example id is **not** used anywhere. Open item **closed** |
| **D3** | §3 header row implies each tool's agent file is a document whose body is the role prose (true for the other four) | **FALSE for Codex.** There is no document body. The role prose is the value of the `developer_instructions` **string key** | Drives the whole design of `src/generators/toml.ts` and Behavior Guarantee 4 (fidelity *inside a string*) |
| **D4** | §3 implies the per-tool "Model field" is the only Codex-specific wrapper concern | Codex additionally exposes `model_reasoning_effort`, `sandbox_mode`, `mcp_servers` and `skills.config` in the same file, and `deny_unknown_fields` means an invented key is a hard parse error, not an ignored one | Only `model` and (conditionally) `sandbox_mode` are emitted; every other key is documented below as a deliberate omission. **No invented keys** |
| **D5** | §4's `generators/` tree comments `codex.ts # .codex/agents/*.toml`, and is silent on where Codex receives the conductor | Codex's repo-scope skill root is **`.agents/skills/`**, *not* `.codex/skills/`. The official discovery list does not include `.codex/skills` at all | `conductorPath` pins `.agents/skills/sdd-conductor/SKILL.md`. See § "Open items" O1 for the residual ambiguity, and Integration Points for the shared-namespace consequence |
| **D6** | §7 sources cite `https://developers.openai.com/codex/subagents` | That URL now answers **308** to `https://learn.chatgpt.com/docs/agent-configuration/subagents`; `…/codex/skills` likewise 308s to `…/docs/build-skills` | Sources updated in this contract |
| **D7** | §3 treats each tool as reading only its own folder — already corrected for Cursor as D7 of the prior contract, which noted Cursor loads `.codex/agents/` | Still true, and now it **bites in the other direction**: once harny writes real `.codex/agents/*.toml`, a Cursor user gets TOML files in a directory Cursor scans for Markdown agents | Recorded in Integration Points and as a `roadmap.md` risk; disclosed in the generated Codex conductor artifact |

## Interface sufficiency finding (G7)

**Finding: `src/generators/types.ts` is sufficient for the TOML target. No amendment is
proposed, and the file stays byte-identical.** Recorded as a finding rather than assumed,
because `intent.md` G7 requires a stated verdict either way. The four places it was most
likely to break, and why it does not:

1. **A non-Markdown wrapper.** `GeneratedFile.contents` is an opaque `string` and
   `wrapperFormat` already admits `'toml'` — both were added by `cli-skeleton`
   specifically for this target. `renderRole` returns the whole file, so nothing in the
   interface assumes frontmatter, a body, or Markdown.
2. **A role file with no capability field.** `CapabilityMapping.tokens` may be empty and
   `notes` is declared "MUST be surfaced in the rendered output, never dropped" — the
   exact path Cursor and GitHub Copilot already take. Codex is the third such target.
3. **A derived, non-token permission field (`sandbox_mode`).** `renderRole` receives the
   whole `RolePayload`, so the value is derived from
   `payload.template.metadata.capabilities` inside the generator. Exported as
   `codexSandboxMode` for testability and deliberately **not** added to `Generator`,
   following the `isReadonlyRole` precedent.
4. **A conductor in a different format from the roles.** This is the genuinely new one,
   and it is worth stating plainly: **Codex's conductor artifact is a Markdown+YAML
   `SKILL.md`, while its role artifacts are TOML.** `wrapperFormat` therefore describes
   the *role* wrapper only. That reading is already what `types.ts` documents —
   `wrapperFormat`'s comment enumerates the five *role-file* targets, and `conductorPath`
   carries an explicit comment that it is "deliberately NOT derived from `agentsDir`".
   No field needs to change; the asymmetry is recorded here so a future reader does not
   mistake `wrapperFormat: 'toml'` for a claim about every artifact this generator emits.

One adjacent observation, recorded because it would otherwise look like a layering
violation: `codex.ts` imports `renderFrontmatter`, `renderProvenance`,
`renderProjectConfigBlock` and `renderSpecSchemaPointerBlock` from
`src/generators/markdown-yaml.ts`. The last three are not YAML at all — they are
Markdown-comment-delimited prose blocks that happen to live in a module named for the
format four generators pair them with. Reusing them is correct (it is what keeps
`cli-skeleton` Behavior Guarantee 3's `harny:begin`/`harny:end` quarantine identical
across all five tools, and it is why the Codex conductor needs no new frontmatter code).
Renaming or splitting the module is **out of scope** (`intent.md` Non-Goals, G9) and is
recorded in `roadmap.md` as a candidate follow-up.

## Interfaces

### Public API — `src/generators/toml.ts` (NEW) (G2)

The TOML wrapper layer. Sibling of `markdown-yaml.ts`; owns every TOML syntax literal in
the codebase. Emits only the shapes this contract needs — it is deliberately not a
general TOML serializer (`intent.md` Non-Goals).

```ts
/**
 * TOML basic string (single-line): double-quoted, with `\` and `"` escaped and
 * newline/tab/other control characters emitted as TOML escape sequences (`\n`,
 * `\t`, `\uXXXX`). Total analogue of `yamlQuote` in `markdown-yaml.ts`.
 */
export function tomlBasicString(value: string): string;

export interface TomlKeyValue {
  readonly key: string;
  /** Already a complete TOML value literal (quoted string, `true`, …). */
  readonly value: string;
}

/** Renders `key = value` lines, one per field, in the given order. */
export function renderTomlKeyValues(fields: readonly TomlKeyValue[]): string;

/** Renders one `# <text>` line per entry. Any interior newline in `text` starts a
 *  further `# ` line, so a multi-line note can never break out of comment syntax. */
export function renderTomlComments(comments: readonly string[]): string;

/**
 * True when `value` can be carried verbatim in a TOML multi-line **literal**
 * string. False when it contains `'''`, a carriage return, or any control
 * character other than `\n` and `\t`.
 */
export function canRenderAsTomlLiteral(value: string): boolean;

/**
 * TOML multi-line literal string: `'''\n<value>\n'''`. Performs **no escaping** —
 * `value` appears in the file byte-for-byte, which is what lets
 * `tests/canonical-fidelity.test.ts` keep using a raw-substring oracle for the
 * fifth generator (guarantee 4) without decoding TOML.
 *
 * `artifact` is used only in the error message. Throws
 * `HarnessError('TEMPLATE')` when `canRenderAsTomlLiteral(value)` is false,
 * rather than silently switching to an escaping form.
 */
export function tomlMultilineLiteral(value: string, artifact: string): string;
```

**Why literal (`'''`) and not basic (`"""`) multi-line strings — normative rationale.**
A multi-line *basic* string would require escaping `\` and `"` throughout the canonical
body, which would (a) break `cli-skeleton` Behavior Guarantee 23 / this contract's
guarantee 4 as currently testable, forcing a TOML parser into the test suite to decode
the value back, and (b) visibly mangle prose the whole product promises is "verbatim".
A multi-line *literal* string performs no escaping at all, so the canonical body is
byte-identical and contiguous in the emitted file. The cost is that three sequences are
unrepresentable; that cost is paid by a loud `HarnessError('TEMPLATE')`, exactly as the
Kiro/Copilot size limits are. Confirmed against the canonical layer as it stands today:
`templates/` contains no `'''`, no `"""`, and no CR — all six files are LF-only UTF-8.

**Decoding semantics, stated exactly** (a TOML parser trims a newline immediately
following the opening delimiter): for a value `V` that does not end in `\n`, the emitted
literal `'''\nV\n'''` decodes to `V + "\n"`. The generator relies on this and the
contract asserts the decoded form, not just the raw substring.

### Public API — `src/generators/codex.ts` (NEW) (G1)

```ts
import type { Capability } from '../templates.js';
import type { ConductorPayload, RolePayload } from '../engine.js';
import type { CostTier, RoleId } from '../vocabulary.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

/**
 * The faithful Codex `sandbox_mode` for a capability set, or `undefined` when the
 * key must be **omitted** so the subagent inherits the permission mode selected in
 * the parent session.
 *
 * Returns `'read-only'` only when the role declares neither `write-files` nor
 * `run-shell` (base names, regardless of any scope qualifier). It never returns
 * `'workspace-write'`: emitting that would let harny *escalate* a subagent past the
 * mode the human chose in the composer, which no canonical `capabilities:` line ever
 * asked for. harny may narrow permissions, never widen them.
 *
 * Exported for testability; deliberately NOT part of `Generator` — see
 * "Interface sufficiency finding", and the `isReadonlyRole` precedent in
 * `src/generators/cursor.ts`.
 */
export function codexSandboxMode(capabilities: readonly Capability[]): 'read-only' | undefined;

export const codexGenerator: Generator;
```

**Normative mapping table (Codex CLI):**

| Property | Value |
|---|---|
| `id` | `'codex'` |
| `displayName` | `'Codex CLI'` |
| `agentsDir` | `.codex/agents` (D1) |
| `wrapperFormat` | `'toml'` — describes the **role** wrapper; the conductor is Markdown+YAML |
| `roleFileName(id)` | `` `${id}.toml` `` |
| `conductorPath` | `.agents/skills/sdd-conductor/SKILL.md` (D5, O1) |

`displayName` is `'Codex CLI'` — the product name used by `plan.md` §3, OpenAI's own
docs, and the `prompts.ts` tool list — not `'Codex'`.

**`mapModel` (G3, D2):**

| `cost_tier` | Codex model id | Vendor's own description |
|---|---|---|
| `most-capable` | `gpt-5.6-sol` | "complex, open-ended work… extra analysis, judgment, or polish" |
| `mid` | `gpt-5.6-terra` | "the pragmatic all-rounder" / "everyday workhorse" |
| `cheapest` | `gpt-5.6-luna` | "clear, repeatable work", faster and lower-cost |

`override`, when present, is returned **verbatim and untranslated** — the user's literal
model id always wins. The retiring `gpt-5.4` / `gpt-5.4-mini` ids appear nowhere in
`src/`; a user who still wants one supplies it via `--model <role>=gpt-5.4-mini` and owns
the consequence.

**`mapCapabilities` (G6):** Codex agent TOML has **no tool-allowlist field** (verified
above). Therefore `tokens` is **always `[]`** and every capability produces a note.
Notes, in input order, deduped:

| Capability shape | Note emitted |
|---|---|
| known, unscoped | `` `<name> (no Codex tool-allowlist field; a subagent uses the tools available to the parent chat; advisory only)` `` |
| known, scoped | the note above **plus** `` `<name> is scoped to <scope>` `` |
| unknown | `` `unmapped capability: <name>` `` (plus the scope note when scoped) |

Additionally, exactly once per role when the capability list is non-empty:

> `Codex expresses permissions through `sandbox_mode` and the permission mode selected in the parent session; the capability list above is documentation, not enforcement.`

This is an adapter-level caveat, not a per-capability mapping fact, so it renders as a
`# harny note:` comment rather than `# capability note:` — the same split
`src/generators/cursor.ts` already makes for `READONLY_ADVISORY_NOTE`.

**Keys emitted on a role artifact:**

| Key | Emitted | Value |
|---|---|---|
| `name` | always | `tomlBasicString(metadata.id)` |
| `description` | always | `tomlBasicString(`` `${metadata.purpose} ${metadata.invocation}` ``)` |
| `model` | always | `tomlBasicString(mapModel(tier, modelOverride))` |
| `sandbox_mode` | **only when** `codexSandboxMode(...) === 'read-only'` | `"read-only"` |
| `developer_instructions` | always | multi-line literal, see next section |

**Keys deliberately never emitted** — each is a real Codex key with a documented default
that matches what the pipeline wants, and none has a counterpart in the canonical
`cost_tier`/`capabilities` vocabulary. Emitting any of them would invent configuration
the canonical layer never expressed:

- `model_reasoning_effort` — no canonical concept maps to `ultra…low`. Codex's own
  default applies.
- `sandbox_mode` when the faithful value is not `read-only` — omitted so the subagent
  inherits the parent session's mode (see `codexSandboxMode`'s doc comment).
- `mcp_servers`, `skills.config` — MCP provisioning is a standing non-goal for all five
  generators.
- `nickname_candidates` — cosmetic; the pipeline refers to roles by their canonical ids.
- `[agents]` / `config_file` layering, `approval_policy`, `[permissions]` — harny does
  not write or edit `config.toml` (`intent.md` Non-Goals).

Because `RawAgentRoleFileToml` uses `#[serde(deny_unknown_fields)]`, an invented key is a
hard parse failure rather than an ignored one — which is the concrete reason this list is
a contract clause and not a style preference.

### Role artifact shape — normative (G1, G2, G4, G6)

```toml
# generated by harny from templates/roles/<role>.md — the developer_instructions
# body below is verbatim; edit the canonical template, not this file
# capability note: <note>
# …
# harny note: <adapter note>
name = "<role-id>"
description = "<purpose> <invocation>"
model = "<mapped model id>"
developer_instructions = '''
<canonical body, byte-for-byte>

<spec-schema pointer block>
'''
```

Ordering and channel rules, each load-bearing:

1. **The comment header comes first**, before the key/value lines. It is the TOML-native
   analogue of the YAML `#` comment run the other four generators place inside their
   frontmatter, and it occupies the same position relative to the data: immediately
   adjacent to the machine-readable header, ahead of the prose.
2. **Provenance renders as TOML comments**, not as the HTML comment `renderProvenance`
   produces. `codex.ts` derives the text from the same source path expression
   (`` `templates/${template.sourcePath}` ``) so the wording stays recognizable, but a
   `<!-- … -->` line is not comment syntax in TOML and would land inside the data.
3. **The spec-schema pointer block goes *inside* `developer_instructions`, not in the
   comment header.** This is the one place Codex genuinely differs in kind rather than in
   syntax: TOML comments are invisible to the model, and the pointer block exists to tell
   the *architect role* where `.sdd/spec-schema/` landed. Putting it in a comment would
   satisfy a file-content grep while silently defeating the purpose AL-5 was raised for.
   It is produced by the existing `renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR)`, so its
   `harny:begin`/`harny:end` markers and `cli-skeleton` Behavior Guarantee 3's
   configuration quarantine are unchanged.
4. **The canonical body is byte-for-byte and contiguous** inside the literal string
   (guarantee 4).

### Conductor artifact shape — normative (G5)

`cli-skeleton` guarantee 6 requires every available generator to emit a conductor
artifact unconditionally. The conductor must run in the **main conversation**, pause, and
ask the human at three gates. A Codex **subagent** structurally cannot do that: it is
spawned by the parent agent into its own thread and returns a result. A Codex **Skill**
can — its body is loaded into the ongoing conversation. Hence:

| Aspect | Value |
|---|---|
| Path | `.agents/skills/sdd-conductor/SKILL.md` |
| Format | Markdown + YAML frontmatter (**not** TOML) |
| Frontmatter | `name`, `description` only — both required by Codex, and the only two fields `ConductorMetadata` carries (AL-7, G6) |
| `name` value | `sdd-conductor` — lowercase/digits/hyphens, 13 chars, within the ≤ 64 documented cap |
| Renderer | the existing `renderFrontmatter` from `markdown-yaml.ts`; **no new frontmatter code** |
| Body | `renderProvenance` line, blank line, canonical conductor body byte-for-byte, blank line, `renderProjectConfigBlock(payload.project)` — identical to the other four generators |
| Human invocation | `$sdd-conductor` in Codex CLI / IDE extension; `/skills` lists it; also activated implicitly on description match |

Two caveats **disclosed as `# harny note:` frontmatter comments inside the generated
artifact**, so a user reading the file learns them without reading this spec:

- `Codex discovers repo skills under .agents/skills/ (not .codex/skills/). Start the pipeline with $sdd-conductor, or run /skills to confirm Codex has loaded it; restart Codex after this file is first written.`
- `.agents/skills/ is a shared, tool-neutral directory — unlike .claude/, .cursor/, .kiro/ and .github/, it is not namespaced to one tool. Another agent tool that adopts the same convention will read this file too.`

### SUPERSEDES — `src/generators/index.ts` (G8)

```ts
export const generators: ReadonlyMap<ToolId, Generator>; // all five TOOL_IDS
export function getGenerator(id: ToolId): Generator | undefined; // now never undefined for a valid ToolId
/** Tool ids that actually have a generator today.
 *  After this feature: every id in TOOL_IDS. */
export function availableToolIds(): readonly ToolId[];
```

Supersedes `specs/cursor-kiro-copilot-generators/contract.md` § "SUPERSEDES —
`src/generators/index.ts`" and its guarantee 1. Registry insertion order is `TOOL_IDS`
order, so `availableToolIds()` is deterministic and reads
`['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']`.

`getGenerator`'s return type stays `Generator | undefined`. It is now total over `ToolId`
in practice, but the optional return is the type-level guard that keeps `init.ts` step 10's
skip-and-warn branch honest; narrowing the signature would delete a defensive path for a
property that only holds until a sixth `ToolId` is added.

### SUPERSEDES — reachability of the unavailable-generator paths (G8)

`src/init.ts` step 10 has two behaviors that **no legal `--tools` value can trigger any
more**: the per-tool `io.warn('Skipped <id>: generator not shipped yet.')` +
`skippedTools` entry, and `HarnessError('NO_GENERATOR')` (exit 4) when nothing resolves.
`src/prompts.ts:62`'s `generator not shipped yet` hint is likewise never rendered for any
real tool.

**Normative requirements:**

1. `src/init.ts`, `src/prompts.ts` and `src/errors.ts` are **not changed**. The branches,
   the `NO_GENERATOR` code, and the `skippedTools` field on `InitResult` all stay.
2. Their test coverage is **re-pointed, never deleted and never weakened**. Specifically:
   - `tests/init.test.ts` (skip-and-warn, and the `NO_GENERATOR` throw) drives `runInit`
     with `vi.mock('../src/generators/index.js', …)` supplying a synthetic registry, so
     both branches are still exercised. No injection seam is added to `init.ts`.
   - `tests/cli.test.ts`'s "maps no-available-generator to exit 4" uses the same
     module-mock, keeping the `HarnessError` → exit-code mapping under test.
   - `tests/prompts.test.ts`'s hint assertion passes a **partial** `available` array to
     `runInitPrompts` — an existing parameter of `PromptDefaults`, so no production change
     — and additionally asserts that with the real `availableToolIds()` **no** option
     carries a hint.
3. `tests/generators/registry.test.ts`'s five-target interface-sufficiency evidence table
   is **retained**. It proves the `Generator` shape independently of which tools are
   registered, and its `codex` row (`.codex/agents`, `'toml'`,
   `.codex/agents/sdd-architect.toml`) is asserted to match the real `codexGenerator`,
   turning that row from a prediction into a regression test.

### Data Models

**No new data model.** `RolePayload`, `ConductorPayload`, `ProjectConfigSummary`,
`RoleTemplate`, `ConductorTemplate`, `Capability`, `CapabilityMapping`, `GeneratedFile`
and `Generator` are consumed exactly as shipped. The only new exported symbols are
`codexGenerator`, `codexSandboxMode`, and the six `toml.ts` helpers (`TomlKeyValue` is a
new exported interface local to that module).

### State Changes

- **Created in this repo:** `src/generators/toml.ts`, `src/generators/codex.ts`,
  `tests/generators/toml.test.ts`, `tests/generators/codex.test.ts`.
- **Modified in this repo:** `src/generators/index.ts` (one import + one map entry) and
  the test files enumerated in `roadmap.md`'s File Change Map.
- **Read-only, must stay byte-identical:** `templates/**`, `.claude/**`,
  `src/generators/types.ts`, `src/generators/markdown-yaml.ts`, the four shipped
  generator files, and every module outside `src/generators/`.
- **Written into a target repo by `init --tools codex`:** `.codex/agents/sdd-*.toml` (one
  per enabled role), `.agents/skills/sdd-conductor/SKILL.md`, plus the tool-neutral
  `.sdd/spec-schema/*.md` and `.sdd/harness.json` written exactly once regardless of how
  many tools are selected.

### Illustrative output — Codex auditor role (shape, not a byte fixture)

```toml
# generated by harny from templates/roles/sdd-auditor.md — the developer_instructions
# body below is verbatim; edit the canonical template, not this file
# capability note: read-files (no Codex tool-allowlist field; a subagent uses the tools available to the parent chat; advisory only)
# capability note: run-shell (no Codex tool-allowlist field; a subagent uses the tools available to the parent chat; advisory only)
# capability note: write-files (no Codex tool-allowlist field; a subagent uses the tools available to the parent chat; advisory only)
# capability note: write-files is scoped to audit.md only
# harny note: Codex expresses permissions through `sandbox_mode` and the permission mode selected in the parent session; the capability list above is documentation, not enforcement.
name = "sdd-auditor"
description = "Validate that an implementation matches its specifications … Invoke this role as the final step …"
model = "gpt-5.6-sol"
developer_instructions = '''
<canonical body, byte-for-byte>

<!-- harny:begin generated project configuration -->
…spec-schema pointer block…
<!-- harny:end generated project configuration -->
'''
```

Note what is **absent**: no `sandbox_mode` (the auditor declares `write-files` and
`run-shell`, so the faithful value is not the restrictive one and the key is omitted so
the parent session's mode is inherited), and no `model_reasoning_effort`.

### Illustrative output — Codex conductor skill (shape)

```md
---
name: "sdd-conductor"
description: "Orchestrate the five-role SDD pipeline — sequencing the `sdd-*` roles, enforcing the human review gates, and verifying each role's work, without doing that work itself."
# harny note: Codex discovers repo skills under .agents/skills/ (not .codex/skills/). Start the pipeline with $sdd-conductor, or run /skills to confirm Codex has loaded it; restart Codex after this file is first written.
# harny note: .agents/skills/ is a shared, tool-neutral directory — unlike .claude/, .cursor/, .kiro/ and .github/, it is not namespaced to one tool. Another agent tool that adopts the same convention will read this file too.
---
<!-- generated by harny from templates/conductor/sdd-conductor.md — … -->

<canonical conductor body, byte-for-byte>

<!-- harny:begin generated project configuration -->
…project configuration block…
<!-- harny:end generated project configuration -->
```

## Behavior Guarantees

`specs/cli-skeleton/contract.md` guarantees 1–23 and
`specs/cursor-kiro-copilot-generators/contract.md` guarantees 1–14 remain in force and now
apply across **five** generators. The following are additional and feature-local.

1. **The Codex generator is registered and resolvable.** `getGenerator('codex')` returns a
   `Generator`; `availableToolIds()` is exactly
   `['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']`; no `ToolId` resolves to
   `undefined`. (G1, G8)
2. **Verified paths, extension and keys.** `agentsDir` = `.codex/agents`,
   `roleFileName(id)` = `` `${id}.toml` ``, `conductorPath` =
   `.agents/skills/sdd-conductor/SKILL.md`, and the emitted key set is a subset of
   `{name, description, model, sandbox_mode, developer_instructions}` — every one of them
   from § "Verified Codex facts", each carrying a source and the date 2026-08-30. No value
   in this contract derives from `plan.md` alone. (G3)
3. **Valid, parseable TOML with the canonical values intact.** Every generated
   `.codex/agents/*.toml` parses as TOML, and the decoded `name`, `description`, `model`
   and `developer_instructions` equal the values this contract specifies. Verified in
   tests by a **test-local** minimal decoder (`tests/generators/toml.test.ts`), because
   `intent.md` Non-Goals forbid adding a TOML package to `devDependencies`; the decoder is
   test-only plumbing under `tests/`, exempt from the "no canonical prose in `src/`"
   constraint the same way `tests/helpers/paths.ts` is. (G1, G2)
4. **Canonical fidelity survives the string embedding.** For all five roles, the canonical
   body sliced from the **raw** template file (`fs.readFile`, never via
   `parseRoleTemplate`) appears **byte-for-byte as a contiguous substring** of the
   generated `.toml` file — no escaping, no re-indentation, no line-ending change — and
   also equals the corresponding prefix of the decoded `developer_instructions`. The same
   holds for the conductor body inside the generated `SKILL.md`. This extends
   `cli-skeleton` guarantee 23 and `cursor-kiro-copilot-generators` guarantee 12 to the
   fifth generator using the same non-self-referential oracle. (G4)
5. **No TOML syntax literal outside `toml.ts`.** `src/generators/codex.ts` contains no
   `'''`, no `"""`, no hand-written `key = value` serialization and no `#`-comment
   serializer; all of it comes from `src/generators/toml.ts`. Asserted by a source scan,
   mirroring the existing "no `---` in a generator" rule. (G2)
6. **Nothing is silently dropped.** For every capability of every enabled role, `tokens`
   is `[]` and the capability is surfaced in `CapabilityMapping.notes`, and every note
   reaches the rendered artifact as a `# capability note:` line. In particular the
   auditor's `write-files (audit.md only)` scope text appears in the generated Codex
   auditor artifact, and an unknown capability token appears as
   `unmapped capability: <name>`. (G6)
7. **Permissions are never widened.** `codexSandboxMode` returns `'read-only'` or
   `undefined` and never `'workspace-write'`; the `sandbox_mode` key is emitted only for
   the `'read-only'` case. With the canonical layer as it stands today all five roles
   declare `write-files`, so no role emits the key — the rule exists so a future read-only
   role renders correctly, and is tested against a synthetic capability list as well as
   against the real five. (G6)
8. **The conductor is emitted unconditionally, in a mechanism that can pause.** A
   `.agents/skills/sdd-conductor/SKILL.md` is produced on every Codex run; its frontmatter
   is exactly `name` + `description` derived from `ConductorMetadata`'s only two fields;
   `renderConductor` never reads `costTier`, `capabilities`, `invocation` or `handoff`;
   and both caveats from § "Conductor artifact shape" appear in the artifact. (G5)
9. **The role artifact points at the deployed spec schema, in the channel the model
   reads.** Every generated Codex role artifact contains the `harny:begin`/`harny:end`
   block naming `.sdd/spec-schema`, **inside `developer_instructions`** rather than in a
   TOML comment, and that string equals `SPEC_SCHEMA_DIR` imported from `src/engine.ts`
   rather than a literal duplicated in a generator. (G6)
10. **The model table is single-sourced, current, and overridable.** `codex.ts` declares
    exactly one `Record<CostTier, string>`; it contains `gpt-5.6-sol`, `gpt-5.6-terra` and
    `gpt-5.6-luna` and contains **no** `gpt-5.4` id; `mapModel` returns a `modelOverride`
    verbatim and untranslated. (G3)
11. **Unrepresentable content fails loudly, never silently.** If any value routed to
    `tomlMultilineLiteral` contains `'''`, a carriage return, or a control character other
    than `\n`/`\t`, the generator throws `HarnessError('TEMPLATE')` naming the artifact and
    the offending construct, before any write. With the canonical layer as it stands no
    template triggers it; the guard exists so canonical growth fails a test run instead of
    emitting a file Codex cannot parse. (G2)
12. **The interface and the shared Markdown layer are untouched.**
    `src/generators/types.ts` and `src/generators/markdown-yaml.ts` are byte-identical
    after this feature, as are `claude-code.ts`, `cursor.ts`, `kiro.ts`,
    `github-copilot.ts`, and `templates/**`, `engine.ts`, `templates.ts`, `writer.ts`,
    `prompts.ts`, `config.ts`, `cli.ts`, `init.ts`, `errors.ts`, `vocabulary.ts`. (G7, G9)
13. **The retired stub's coverage survives.** `HarnessError('NO_GENERATOR')` → exit 4, the
    per-tool skip warning, and the `generator not shipped yet` prompt hint each still have
    a passing test, driven by a synthetic registry or a partial `available` list rather
    than by `--tools codex`. (G8)
14. **Five-tool runs stay shared-artifact correct.** With all five tools selected, one
    `init` emits 5 × (5 role artifacts + 1 conductor artifact) = 30 tool artifacts plus
    exactly one copy each of the five spec-schema files and `.sdd/harness.json`, and the
    spec-schema files remain byte-identical to `templates/spec-schema/*.md`. (G9)
15. **Determinism and containment hold for the TOML target too.** Two runs with identical
    inputs produce byte-identical trees; every generated path is relative and inside the
    target directory; every artifact — TOML and Markdown alike — ends in exactly one
    `\n`. (G9)
16. **No dependency drift.** `package.json`'s `dependencies` and `devDependencies` are
    byte-identical after this feature. In particular **no TOML parsing or serialization
    package is added**, in either list. (G9)

    > **Amendment, 2026-09-23, accepted by the human at `monorepo-mode`'s post-audit
    > gate (that feature's audit finding F6).** The guarantee's *rule* is unchanged;
    > its *enforcement* narrowed. `tests/packaging.test.ts` now asserts the **key set**
    > of both dependency lists rather than their exact version pins, so a package
    > appearing or disappearing is still detected but a version change is not. This is
    > how a pre-existing `vitest`-pin failure was closed. Consequence carried forward in
    > `specs/current/cli-init.md` (invariant 3, reservation MR-F6) and in `AGENTS.md`
    > § "Coding standards": standard S4 names this test as its enforcement evidence and
    > now has no mechanical version-drift detection anywhere.

## Error Handling Contract

All rows of `specs/cli-skeleton/contract.md` and
`specs/cursor-kiro-copilot-generators/contract.md` remain in force. This feature changes
the population of two rows and adds two:

| Error Condition | Behavior | Exit | User Impact |
|---|---|---|---|
| **(POPULATION CHANGE)** Selected tool has no generator yet, but another selected tool does | Mechanism unchanged and code retained; **no legal `--tools` value can trigger it** now that all five `TOOL_IDS` are registered. Covered by a synthetic-registry test, not deleted | 0 | Unreachable in practice; the branch remains for a future sixth `ToolId` |
| **(POPULATION CHANGE)** No selected tool has a generator | Mechanism unchanged and code retained; likewise unreachable via `--tools`. Covered by a synthetic-registry test | 4 | Unreachable in practice; `NO_GENERATOR` and its exit code stay defined and tested |
| **(NEW)** A value routed into a TOML multi-line literal contains `'''`, a CR, or a control character other than `\n`/`\t` | `HarnessError('TEMPLATE')` naming the artifact and the offending construct; thrown during render, before any write | 5 | Nothing written; the message says this is a canonical-content problem, not a user configuration problem |
| **(NEW)** A `--model` override for a Codex role is a retired or unknown model id | **Not an error.** The override is emitted verbatim; harny contacts no network service and cannot validate a vendor's model catalogue at generation time | 0 | Codex reports the bad model at use time. The remedy is the same `--model` flag |

Three non-rows, recorded so their absence is deliberate:

- **An unknown capability token is not an error.** `runInit` step 9's warn-once path
  already covers the operator signal and `notes` covers the artifact signal
  (`cli-skeleton` R24).
- **No `description` length guard is emitted for the Codex conductor skill**, unlike the
  1024-character guards for Kiro and GitHub Copilot. Reason: no character limit for
  Codex's `SKILL.md` `description` was found in any first-party source. Inventing a limit
  would be a fabricated constraint; the absence is recorded in § "Open items" (O3) rather
  than papered over with a guessed number.
- **`.agents/skills/sdd-conductor/SKILL.md` already existing is not a special case.** It
  is handled by the existing `writer.ts` collision policy (`--force` / interactive
  confirmation), like any other path — which matters more here than elsewhere, because
  the directory is not tool-namespaced.

## Open items — explicitly NOT verified (G10)

Recorded here, carried as a `tasks.md` item, and repeated as an `audit.md` reservation.
`specs/cursor-kiro-copilot-generators/audit.md` finding **AL-30** stayed open across two
audit passes precisely because this gap was described once and then not tracked; it is
tracked in all three places this time.

| # | Open item | Why it could not be closed here | What would close it |
|---|---|---|---|
| **O1** | Whether Codex *also* reads `.codex/skills/`, in addition to the `.agents/skills/` roots this contract pins | OpenAI's skill-discovery documentation enumerates `.agents/skills` (cwd → repo root), `$HOME/.agents/skills`, `/etc/codex/skills` and built-ins, and does **not** list `.codex/skills`. Several third-party 2026 write-ups claim `.codex/skills` works as a project-level location. Only the first-party enumeration is treated as verified; harny writes the verified location **only**, and does not write a second speculative copy | Confirm in a live install whether `/skills` lists a skill placed in each location. If `.codex/skills` is also read, this contract can be revisited — the current behavior is still correct, merely not the only correct option |
| **O2** | Whether Codex's agent `name` field accepts hyphens (`sdd-architect`) | Both documented examples use bare or underscored names (`reviewer`, `pr_explorer`). No charset restriction is documented for the *agent* `name`; the ≤ 64-char lowercase/digits/hyphens rule found for *skill* names comes from a secondary in-repo template. harny pins `sdd-architect` for consistency with the canonical role ids, the filenames, and all four shipped tools | Generate into a scratch repo and confirm Codex loads all five agents and refers to them by these names. If hyphens are rejected, the fix is confined to `roleFileName`/`name` and does not touch the canonical layer |
| **O3** | Whether Codex enforces any length limit on `description` or `developer_instructions` | No first-party source documents one. Canonical bodies are 4.8–7.2 kB, well under every comparable vendor's cap (Copilot's is 30 kB), so the risk is low — but "low" is not "verified" | A documented limit, or an observed rejection in a live install. A guard would then be added in the style of the existing Kiro/Copilot guards |
| **O4** | **The whole artifact set has never been loaded into a running Codex CLI.** This is AL-30's other half, for the fifth tool | No Codex CLI install and no way to observe its agent picker from this session. Everything above is verified against first-party *documentation and source*, dated 2026-08-30 — a strictly stronger position than AL-30's, which could not even re-run a docs review, but still not an execution check. A generator writing to a directory a tool never reads fails **silently with exit code 0** | `roadmap.md` Phase 4's manual-verification task: `npx harny init --tools codex` into a scratch repo, open Codex there, confirm it lists the five agents from `.codex/agents/` and `$sdd-conductor` from `.agents/skills/`, and record the outcome in `audit.md` |

## Dependencies

**Internal (read-only inputs):**
- `templates/roles/sdd-{architect,test-writer,executor,auditor,documentation}.md`,
  `templates/conductor/sdd-conductor.md`, `templates/spec-schema/*.md`.
- `src/generators/types.ts` — the adapter interface, consumed as shipped and unmodified.
- `src/generators/markdown-yaml.ts` — `renderFrontmatter` (conductor frontmatter),
  `renderProvenance` (wording source), `renderProjectConfigBlock`,
  `renderSpecSchemaPointerBlock`. Extended by **nothing**; imported only.
- `src/generators/cursor.ts` — the structural precedent for a no-allowlist target and for
  a derived permission field exported outside `Generator`.
- `src/engine.ts` — `RolePayload`, `ConductorPayload`, `ProjectConfigSummary` (types) and
  `SPEC_SCHEMA_DIR` (value).
- `src/vocabulary.ts`, `src/templates.ts`, `src/errors.ts` — types and `HarnessError`.
- `specs/cli-skeleton/contract.md`, `specs/cursor-kiro-copilot-generators/contract.md` and
  its `audit.md` (finding AL-30).

**External — runtime:** unchanged (`commander@15.0.0`, `@clack/prompts@1.7.0`). This
feature adds none.

**External — dev:** unchanged (`typescript@7.0.2`, `vitest@4.1.10`,
`@types/node@26.1.2`). **No TOML package is added**; `toml.ts` emits, and a test-local
decoder reads.

**Documentation sources (verification inputs, not build inputs):** Context7 library id
`/openai/codex`; `https://learn.chatgpt.com/docs/agent-configuration/subagents`;
`https://learn.chatgpt.com/docs/build-skills`; `https://developers.openai.com/codex/models`.
All consulted 2026-08-30.

## Integration Points

- **Completes the five-adapter set predicted by `cli-skeleton`.** That contract's
  Integration Points predicted each new generator would be "one file under
  `src/generators/` plus one registry entry, and requires **no** change to
  `templates.ts`, `engine.ts`, `writer.ts`, or `prompts.ts`". Guarantee 12 turns that
  into a testable obligation for the hardest case — the one target the prediction was
  least likely to survive. The additional `toml.ts` file is the TOML-side peer of the
  shared layer `cli-skeleton` created for exactly this purpose, not a per-tool leak.
- **Realizes the forward reference in `cursor-kiro-copilot-generators`.** That contract
  closed with "Codex needs only a sibling `src/generators/toml.ts` wrapper plus
  `src/generators/codex.ts`; nothing in this feature blocks or pre-empts it." This
  contract adopts exactly that decomposition and confirms the prediction held.
- **Cursor × Codex overlap, now bidirectional (D7).** Cursor loads `.codex/agents/` as a
  compatibility location. Before this feature that mattered only hypothetically; now
  `init --tools cursor,codex` puts five Markdown agents in `.cursor/agents/` and five
  **TOML** files in a directory Cursor also scans. Cursor's behavior on encountering
  `.toml` there is not documented. harny neither suppresses nor merges: the existing
  Cursor conductor artifact already discloses the overlap, and `roadmap.md` records the
  risk. No shipped Cursor behavior changes.
- **Shared, non-namespaced conductor directory.** `.agents/skills/` is the first path
  harny writes that is not owned by a single tool. Every other conductor lands under
  `.claude/`, `.cursor/`, `.kiro/` or `.github/`. Any future tool adopting the same
  `.agents/` convention will read the Codex conductor artifact. Disclosed in the artifact
  itself and recorded as a `roadmap.md` risk.
- **Discharges AL-5 and AL-7 for the fifth and final tool.** The spec-schema pointer block
  reaches the Codex architect (guarantee 9), the conductor renders from `id`/`purpose`
  only (guarantee 8), and the auditor's free-text scope survives as a note (guarantee 6).
  After this feature both findings are closed across every shipped generator.
- **Forward reference — MCP provisioning (NOT implemented here).** Codex is the one tool
  whose MCP configuration is TOML (`.codex/config.toml`, `[mcp_servers.<name>]`,
  `plan.md` §4), and this feature introduces the TOML emitter that a future
  `harny mcp add` would want. It is deliberately not used for that here: no
  `config.toml` is written or edited, and `mcp_servers` is on the never-emitted key list.
- **Documentation hand-off.** `README.md:120–127` lists four shipped tools and `codex`
  under "Tools in progress"; `README.md`'s file-count example says 24 + 6 for three tools;
  `AGENTS.md:23` says "Codex (TOML format) is planned future work"; `CHANGELOG.md:28` says
  `codex` "remains the sole" unshipped tool. All four statements become false with this
  feature. Updating them is `sdd-documentation`'s automatic post-audit step, listed in
  `roadmap.md` as such, not this feature's implementation work.
