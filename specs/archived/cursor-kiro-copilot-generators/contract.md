# Contract: cursor-kiro-copilot-generators

> **How to read this file.** Every interface, mapping table and guarantee below cites
> the `intent.md` goal it serves (`G1`…`G11`). Sections marked **VERIFIED** carry the
> documentation source and date behind each pinned fact — `plan.md` §3 is *not* an
> accepted source for any of them, because it was written Jul 2026 with two cells
> openly marked "to confirm" (G4). Where verification contradicts `plan.md`, the
> discrepancy is stated in § "Discrepancies from `plan.md`", never silently followed
> and never silently overridden.
>
> This feature adds three sibling implementations of an interface that already
> shipped. It does **not** restate `specs/cli-skeleton/contract.md`; that contract
> remains in force and this one is additive except where a subsection is explicitly
> headed **SUPERSEDES**.

## Verified per-tool facts (G4)

All rows verified **2026-08-12** via the Context7 MCP first (per this repo's standing
tool-use convention) and, where Context7 lacked coverage, by fetching the vendor's own
documentation. Context7 library ids used: `/websites/cursor` (Cursor),
`/github/awesome-copilot` (Copilot, corroborating only), `/kirodotdev/kiro` (**returned
no matching documentation** for subagent configuration — Kiro's rows below are
therefore sourced entirely from `kiro.dev` official docs, which is recorded here so a
reviewer knows the fallback was used deliberately rather than by oversight).

### Cursor

| Fact | Verified value | Source |
|---|---|---|
| Subagent file location (project) | `.cursor/agents/` | https://cursor.com/docs/subagents |
| Subagent file location (user) | `~/.cursor/agents/` | same |
| Compatibility locations also loaded | `.claude/agents/`, `.codex/agents/` (and their `~/` equivalents) | same |
| Format / extension | Markdown with YAML frontmatter, `.md` | same |
| Frontmatter fields | `name` (string, lowercase + hyphens), `description` (string), `model` (string), `readonly` (boolean), `is_background` (boolean) | same |
| Tool/permission allowlist field | **None.** The only permission control is `readonly: true`, which removes file edits and state-changing shell commands | same |
| `model` accepted values | `"inherit"` (default — same model as the parent agent), a specific model id (e.g. `"composer-2"`, `"gpt-5.6-sol"`), or an id with bracket parameters (e.g. `"claude-opus-5[effort=high,context=300k]"`) | same |
| Model ids available | frontier incl. `claude-opus-5`, `gpt-5.6-sol`, `grok-4.6`; mid incl. `claude-4.6-sonnet`, `composer-2.5`, `gpt-5.4`; fast/cost-efficient incl. `gpt-5.4-mini`, `gemini-3.5-flash`, `gpt-5-mini` | https://cursor.com/docs/models |
| Main-thread, user-invocable mechanism (conductor candidate) | **Skills** — `.cursor/skills/<skill-name>/SKILL.md`, frontmatter `name`, `description`, optional `paths`; invoked with `/<skill-name>` (execute) or `@<skill-name>` (attach as context); "skills run within the agent conversation itself" | https://cursor.com/docs/context/commands |

### Kiro

| Fact | Verified value | Source |
|---|---|---|
| Custom-agent file location (workspace) | `.kiro/agents/` | https://kiro.dev/docs/custom-agents/configuration-reference/ , https://kiro.dev/docs/custom-agents/creating/ |
| Custom-agent file location (user) | `~/.kiro/agents/` | same |
| Formats / extensions | Markdown with YAML frontmatter (`.md`, body = system prompt) **or** JSON (`.json`); identical field set | same |
| Frontmatter fields (relevant subset) | `name` (identifier; derived from filename if omitted), `description`, `model`, `prompt`, `tools`, `resources`, `permissions`, `mcpServers`, `welcomeMessage`, `toolAliases`, `allowedTools`, `toolsSettings`, `includeMcpJson`, `keyboardShortcut`, `hooks` | https://kiro.dev/docs/custom-agents/configuration-reference/ |
| `tools` syntax | Category tags `read`, `write`, `shell`, `web`, `@builtin`, `*`; specific built-ins by name; `@server_name` (all tools of an MCP server); `@server_name/tool_name` | same |
| `permissions` syntax | Objects `{ capability: shell\|fs_read\|fs_write\|web_fetch\|mcp\|subagent\|all, match: [glob], effect: allow\|ask\|deny, exclude?: [glob] }` | same |
| `model` accepted values | A model id from Kiro's model service (`/model` in chat lists them); falls back to the default if unavailable | same |
| Model ids available | frontier `claude-opus-5`, `gpt-5.6-sol`, `claude-opus-4.8`; mid `claude-sonnet-5`, `claude-sonnet-4.6`, `gpt-5.6-terra`; fast/cheap `claude-haiku-4.5`, `gpt-5.6-luna`, `qwen3-coder-next`; router `auto` | https://kiro.dev/docs/models/available-models/ |
| Main-thread mechanism (conductor candidate) | **Agent Skills** — `.kiro/skills/<skill-name>/SKILL.md` (workspace) or `~/.kiro/skills/<skill-name>/SKILL.md` (global); frontmatter `name` **required, must match the folder name**, lowercase/digits/hyphens, ≤ 64 chars; `description` **required, ≤ 1024 chars**; activated automatically by description match or manually via `/` slash command | https://kiro.dev/docs/skills/ |
| Skill visibility inside custom agents | Custom agents do **not** load skills by default; they must list them via `resources: ["skill://…"]` | same |

### GitHub Copilot

| Fact | Verified value | Source |
|---|---|---|
| Custom-agent file location (repository) | `.github/agents/` | https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents |
| Extension | `.agent.md` for repository-level agents; the configuration reference notes both `.md` and `.agent.md` are accepted and that the filename minus extension is the dedup key | same + https://docs.github.com/en/copilot/reference/custom-agents-configuration |
| Filename charset | `.`, `-`, `_`, `a-z`, `A-Z`, `0-9` only | https://docs.github.com/en/copilot/reference/custom-agents-configuration |
| Other scopes | Organization-level and enterprise-level agent directories; lower levels override higher levels on a name collision | same |
| Required frontmatter | `description` (string) — the only required property | same |
| Optional frontmatter | `name` (display name; defaults to filename), `tools` (list or string; names/aliases/MCP tools; `["*"]` = all, `[]` = none; **omitted = access to all available tools**), `model` (string), `target` (`vscode` \| `github-copilot`; unset = both), `user-invocable` (default `true`), `disable-model-invocation` (default `false`), `mcp-servers`, `metadata` | same |
| `model` support | Honored when the agent profile runs in VS Code, JetBrains IDEs, Eclipse or Xcode; **not** applied on github.com | https://docs.github.com/en/copilot/how-tos/…/create-custom-agents |
| Model names available | `Claude Opus 5`, `Claude Sonnet 4.5`, `Claude Haiku 4.5`, `Claude Opus 4.7`, `GPT-5.6 Sol/Terra/Luna`, `GPT-5.4 mini`, `Gemini 3.1 Pro`, `Auto`, … | https://docs.github.com/en/copilot/reference/ai-models/supported-models |
| Body size limit | The agent prompt (Markdown body) is capped at **30,000 characters** | https://docs.github.com/en/copilot/reference/custom-agents-configuration |
| Main-thread mechanism (conductor candidate) | **Agent Skills** — `.github/skills/<skill-name>/SKILL.md`; frontmatter `name` (required, lowercase-hyphen) and `description` (required), optional `license`; **model-invoked** (Copilot decides when to load them); supported by the cloud agent, code review, Copilot CLI, the Copilot app, and VS Code agent mode | https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills |

### Discrepancies from `plan.md` (G4)

| # | `plan.md` claim | Verified today | Action taken |
|---|---|---|---|
| D1 | §3: Cursor `model: inherit/fast/<id>` | `inherit` and specific ids are real; **`fast` is not a standalone value**. "Fast" exists only as separate model ids (`claude-opus-5-fast`, `grok-4.6-fast`, …). Bracket parameters (`claude-opus-5[effort=high]`) are additionally supported and `plan.md` does not mention them | Contract pins `inherit`-or-id semantics and treats a `modelOverride` as an opaque string so bracket forms pass through untouched |
| D2 | §3: GitHub Copilot `.github/agents/<role>.agent.md` "(exact extension to confirm)" | **CONFIRMED**: `.agent.md` under `.github/agents/` for repository-level agents. The configuration reference additionally accepts plain `.md` | `github-copilot` pins `.agent.md` (the documented repository-level form, and the one `cli-skeleton`'s guarantee-11 evidence table already encodes). Open item closed |
| D3 | §3: Copilot model field "to confirm in week 1" | A `model` property exists and is **ignored on github.com**, honored in VS Code / JetBrains / Eclipse / Xcode | Emitted anyway (it is the pipeline's cost-tier story) with an adapter note in the file recording that github.com ignores it. Open item closed |
| D4 | §3: Copilot scope "repo or enterprise level" | Three levels: **repository, organization, enterprise**, with lower levels overriding higher ones | Recorded; harny writes repository level only |
| D5 | §3: Kiro "Markdown + frontmatter", "per-agent model selection" | Correct but under-specified: Kiro accepts `.md` **or** `.json` with an identical field set, and `tools` uses category tags (`read`/`write`/`shell`/`web`) plus `@server` MCP references | Kiro generator emits `.md`; the category-tag vocabulary is pinned in the mapping table below |
| D6 | §7 sources: Kiro subagents doc at `kiro.dev/docs/chat/subagents/` | That URL now redirects to `/docs/custom-agents/subagents/`; the authoritative field list lives at `/docs/custom-agents/configuration-reference/` | Sources updated in this contract |
| D7 | §3/§4 assume each tool reads only its own folder | Cursor **also** loads `.claude/agents/` and `.codex/agents/` as compatibility locations | Recorded as a real interaction (see Integration Points) and disclosed in the generated Cursor conductor artifact |
| D8 | §4 is silent on how non-Claude tools receive the conductor | All three tools have a `SKILL.md` mechanism that runs in the main conversation | Each generator targets it; per-tool paths fixed below (G7) |

## Interface sufficiency finding (G6)

**Finding: `src/generators/types.ts` is sufficient for all three tools as shipped. No
amendment is proposed.** This is recorded as a finding rather than assumed, because
`intent.md`'s Non-Goals require any insufficiency to be surfaced explicitly. The three
places it was most likely to break, and why it does not:

1. **A tool with no capability-allowlist field (Cursor).** `CapabilityMapping.tokens`
   is a `readonly string[]` and may legitimately be **empty**; every capability then
   travels in `notes`, which the interface already declares "MUST be surfaced in the
   rendered output, never dropped". No new field is needed.
2. **A tool needing a derived, non-token permission field (Cursor's `readonly`).**
   `renderRole` receives the whole `RolePayload`, so a generator can derive extra
   tool-native frontmatter from `payload.template.metadata.capabilities` directly. The
   derivation is exported per-generator for testability (`isReadonlyRole`) but is
   deliberately **not** added to `Generator`, since it is meaningful to exactly one
   target.
3. **A conductor that lives outside the agents directory (all three).**
   `conductorPath` is already an independent field, and `cli-skeleton` guarantee 11
   already proves it need not derive from `agentsDir`. All three conductor artifacts
   are `SKILL.md` files at a nested path.

One adjacent observation, recorded because it *would* have been an interface change if
handled differently: closing AL-5's residual half (G9) needs the deployed spec-schema
directory inside `renderRole`, which `RolePayload` does not carry. It is obtained by
importing the existing module constant `SPEC_SCHEMA_DIR` from `src/engine.ts` — a
value, not configuration — so neither `RolePayload` nor `Generator` changes, and
`cli-skeleton` guarantee 21 (no runtime import cycles) still holds because `engine.ts`
imports nothing from any generator at runtime.

## Interfaces

### Public API — `src/generators/markdown-yaml.ts` (additive) (G5, G9)

Both helpers land in the **shared** module, not in a per-tool file, per G5.

```ts
/** YAML flow sequence of double-quoted scalars: `["read", "write"]`. Emitted with
 *  `raw: true` as a `FrontmatterField` value. An empty input yields `[]`. */
export function yamlFlowSequence(values: readonly string[]): string;

/**
 * The delimited, machine-marked block appended to every generated **role** artifact,
 * naming the directory into which `buildSharedFiles` deployed
 * `templates/spec-schema/*.md`. Closes the residual half of audit finding AL-5: the
 * canonical architect body points at `templates/spec-schema/`, a path that exists only
 * inside the harny package, and delegates reachability to "a per-tool deployment of
 * this role" — this block is that deployment's half of the bargain.
 *
 * Uses the existing `GENERATED_BLOCK_BEGIN` / `GENERATED_BLOCK_END` markers, so
 * `cli-skeleton` Behavior Guarantee 3 (configuration quarantined between markers)
 * continues to hold unchanged.
 */
export function renderSpecSchemaPointerBlock(specSchemaDir: string): string;
```

`renderSpecSchemaPointerBlock` output shape — normative:

```md
<!-- harny:begin generated project configuration -->

Generated by harny from your `init` configuration. Do not hand-edit this block —
re-run `harny init` instead; edits here are overwritten on the next run.

- Spec schema directory: `.sdd/spec-schema`

The five blank spec scaffolds (`intent.md`, `contract.md`, `roadmap.md`, `tasks.md`,
`audit.md`) referenced by the role body above were deployed to that directory in this
repository by `harny init`. Read them from there; the canonical `templates/spec-schema/`
path named in the role body exists only inside the harny package.

<!-- harny:end generated project configuration -->
```

### SUPERSEDES — role artifact shape for **all four** generators (G9)

`specs/cli-skeleton/contract.md` illustrates `renderRole` output ending at the canonical
body. From this feature onward, every generator's role artifact is:

```
<frontmatter>
<provenance line>
<blank line>
<canonical body, byte-for-byte>
<blank line>
<spec-schema pointer block>
```

This is applied uniformly, **including to `src/generators/claude-code.ts`**, rather than
only to the three new generators. Rationale: the AL-5 residual gap is identical for
Claude Code (its architect subagent also reads only its own file), and letting three
newer generators behave better than the reference would leave exactly the asymmetry a
future auditor should flag. The change is additive, sits entirely inside the existing
generated-block markers, and leaves `cli-skeleton` guarantees 1, 2, 3, 19 intact. The
Claude Code tests that pin the old shape are updated, never weakened (see
`roadmap.md`'s File Change Map).

### Public API — `src/generators/cursor.ts` (G1)

```ts
import type { Capability } from '../templates.js';
import type { ConductorPayload, RolePayload } from '../engine.js';
import type { CostTier, RoleId } from '../vocabulary.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

/** True when a role declares neither `write-files` nor `run-shell` (base names,
 *  regardless of any scope qualifier), i.e. when Cursor's `readonly: true` is the
 *  faithful rendering of its capability set. Exported for testability; deliberately
 *  NOT part of `Generator` — see "Interface sufficiency finding". */
export function isReadonlyRole(capabilities: readonly Capability[]): boolean;

export const cursorGenerator: Generator;
```

**Normative mapping tables (Cursor):**

| Property | Value |
|---|---|
| `id` | `'cursor'` |
| `displayName` | `'Cursor'` |
| `agentsDir` | `.cursor/agents` |
| `wrapperFormat` | `'markdown-yaml'` |
| `roleFileName(id)` | `` `${id}.md` `` |
| `conductorPath` | `.cursor/skills/sdd-conductor/SKILL.md` |

`mapModel`: `most-capable` → `claude-opus-5`; `mid` → `claude-4.6-sonnet`;
`cheapest` → `gpt-5.4-mini`; `override` returned verbatim, untranslated (including
bracket-parameter forms such as `claude-opus-5[effort=high]` and the documented literal
`inherit`).

`mapCapabilities`: **Cursor has no tool-allowlist field.** Therefore, for every
capability: `tokens` is always `[]`, and each capability produces a note. Notes, in
input order, deduped:

| Capability shape | Note emitted |
|---|---|
| known, unscoped | `` `<name> (no Cursor tool-allowlist field; advisory only)` `` |
| known, scoped | the note above **plus** `` `<name> is scoped to <scope>` `` |
| unknown | `` `unmapped capability: <name>` `` (plus the scope note when scoped) |

Additionally, exactly once per role when `tokens` is empty and capabilities are
non-empty: `` `Cursor expresses permissions only via `readonly`; the capability list above is documentation, not enforcement.` ``

`readonly`: the frontmatter key is emitted as `readonly: true` **only when**
`isReadonlyRole(capabilities)` is true; otherwise the key is omitted (Cursor's default
is `false`). With the canonical layer as it stands today, all five roles declare
`write-files`, so no role emits the key — the rule exists so a future read-only role
renders correctly, and is tested against a synthetic capability list as well as the
real five.

`is_background`: never emitted. The pipeline's roles are all foreground work whose
output the human gates; backgrounding them would silently bypass the gate model.

### Public API — `src/generators/kiro.ts` (G2)

```ts
export const kiroGenerator: Generator;
```

**Normative mapping tables (Kiro):**

| Property | Value |
|---|---|
| `id` | `'kiro'` |
| `displayName` | `'Kiro'` |
| `agentsDir` | `.kiro/agents` |
| `wrapperFormat` | `'markdown-yaml'` |
| `roleFileName(id)` | `` `${id}.md` `` |
| `conductorPath` | `.kiro/skills/sdd-conductor/SKILL.md` |

`mapModel`: `most-capable` → `claude-opus-5`; `mid` → `claude-sonnet-4.6`;
`cheapest` → `claude-haiku-4.5`; `override` returned verbatim. (All three ids appear in
Kiro's own available-models list, in Kiro's own frontier / mid / fast groupings — which
is also why Kiro is the one target whose table mirrors the Claude Code
opus→sonnet→haiku shape exactly.)

`mapCapabilities` token table — Kiro category tags, deduped, emitted in this order:

| Capability | Kiro token(s) |
|---|---|
| `read-files` | `read` |
| `write-files` | `write` |
| `run-shell` | `shell` |
| `web-search` | `web` |
| `docs-lookup` | `@context7` |
| `task-tracking` | *(none — no Kiro-native equivalent)* |

Notes: `` `<name> is scoped to <scope>` `` for a scoped capability;
`` `unmapped capability: <name>` `` for an unknown token; and, whenever `task-tracking`
is present, `` `task-tracking has no Kiro-native tool category; the role body's own task discipline applies` ``; and, whenever `docs-lookup` is present,
`` `docs-lookup maps to the Context7 MCP server (@context7); harny does not write MCP configuration — see plan.md §4 "future scope"` ``.

The `@context7` entry names a server without configuring one. That is deliberate and
consistent with the shipped Claude Code generator, which already maps `docs-lookup` to
`mcp__context7__*` tool names under the same MCP non-goal. It costs nothing when the
server is absent (the tool is simply unavailable) and works immediately once the user
wires Context7 themselves.

`permissions`, `resources`, `mcpServers`, `hooks`, `allowedTools`, `keyboardShortcut`:
never emitted. `permissions` is the only one that could express the auditor's
`audit.md only` scope (`{capability: fs_write, match: ["**/audit.md"], effect: allow}`),
and it is deliberately **out of scope here**: emitting a deny-by-default permission set
for one role while the other four have none would be a security posture this feature
has no mandate to design. The scope survives as a note (guarantee 5) and is recorded in
`roadmap.md` as a candidate follow-up.

### Public API — `src/generators/github-copilot.ts` (G3)

```ts
export const githubCopilotGenerator: Generator;
```

**Normative mapping tables (GitHub Copilot):**

| Property | Value |
|---|---|
| `id` | `'github-copilot'` |
| `displayName` | `'GitHub Copilot'` |
| `agentsDir` | `.github/agents` |
| `wrapperFormat` | `'markdown-yaml'` |
| `roleFileName(id)` | `` `${id}.agent.md` `` |
| `conductorPath` | `.github/skills/sdd-conductor/SKILL.md` |

`mapModel`: `most-capable` → `Claude Opus 5`; `mid` → `Claude Sonnet 4.5`;
`cheapest` → `Claude Haiku 4.5`; `override` returned verbatim. These are the display
names listed by GitHub's supported-models reference; because they contain spaces, the
`model` field is always emitted **quoted** (see the shared quoting rule below).

`mapCapabilities`: `tokens` is always `[]` and the `tools` frontmatter key is
**deliberately not emitted**. Rationale, recorded because omission is a decision and
not an oversight:

- GitHub documents two divergent tool vocabularies — cloud-agent aliases
  (`read`, `edit`, `search`, `<mcp-server>/<tool>`) and the VS Code chat tool names
  (`codebase`, `search`, `usages`, `findTestFiles`, …) — while `target` defaults to
  *both* surfaces. A single list cannot be verified correct on both.
- `tools` is documented as **omitted ⇒ access to all available tools**, whereas a
  partially-correct allowlist would *remove* capabilities the pipeline depends on (the
  auditor must run the toolchain; the architect must reach Context7). A wrong allowlist
  fails silently and catastrophically; omission fails, at worst, permissively and
  visibly.

Every capability therefore produces a note, exactly as for Cursor:

| Capability shape | Note emitted |
|---|---|
| known, unscoped | `` `<name> (tools intentionally unset: Copilot grants all available tools; see contract.md)` `` |
| known, scoped | the note above **plus** `` `<name> is scoped to <scope>` `` |
| unknown | `` `unmapped capability: <name>` `` (plus the scope note when scoped) |

`target`, `user-invocable`, `disable-model-invocation`, `mcp-servers`, `metadata`:
never emitted; every one of them has a documented default that matches what the
pipeline wants (`target` unset = both surfaces; agents user-invocable; sub-agent
invocation enabled).

Adapter note (frontmatter comment) emitted on every Copilot **role** artifact:
`` `model is honored in VS Code / JetBrains / Eclipse / Xcode and ignored on github.com` ``
(D3).

### Conductor representation, per tool — normative (G7)

`cli-skeleton` guarantee 6 requires every available generator to emit a conductor
artifact unconditionally. Claude Code emits a Skill rather than a subagent because the
conductor must run in the main thread, pause, and ask the human. Each of the three new
tools has a mechanism with that same property, so **none of the three omits the
conductor**:

| Tool | Conductor artifact | Native mechanism | How the human starts it | Caveat disclosed in the artifact |
|---|---|---|---|---|
| Cursor | `.cursor/skills/sdd-conductor/SKILL.md` | Cursor Skill; "skills run within the agent conversation itself" | `/sdd-conductor` (execute) or `@sdd-conductor` (attach) | Cursor also loads `.claude/agents/` and `.codex/agents/`; selecting Claude Code *and* Cursor in one `init` puts the same five role names in two locations Cursor reads (D7) |
| Kiro | `.kiro/skills/sdd-conductor/SKILL.md` | Kiro Agent Skill; auto-activated by description match, or `/` slash command | `/sdd-conductor`, or by describing the pipeline task | Kiro custom agents do not load skills by default; run the conductor from the default agent, or add `resources: ["skill://.kiro/skills/*/SKILL.md"]` to the custom agent that should see it |
| GitHub Copilot | `.github/skills/sdd-conductor/SKILL.md` | Copilot Agent Skill; supported by the cloud agent, code review, Copilot CLI, the Copilot app and VS Code agent mode | **Model-invoked** — Copilot decides based on the description; ask it to "use the sdd-conductor skill" to force it | Skills are model-invoked, not user-invoked; there is no `/sdd-conductor` guarantee as there is in Cursor and Kiro |

Frontmatter emitted for all three conductor artifacts — `name` and `description` only,
read from `ConductorMetadata`, which by contract carries **only** `id` and `purpose`
(AL-7, G8). No generator may read `costTier`, `capabilities`, `invocation` or `handoff`
from a conductor template; the type does not carry them and the renderer must not
invent them. Kiro additionally requires `name` to equal the containing folder name —
satisfied because both derive from `metadata.id` (`sdd-conductor`).

### Shared rendering rules for all three new generators (G5)

1. **Frontmatter is emitted only through `renderFrontmatter`**, and quoting only
   through `yamlQuote`/`yamlFlowSequence`. No generator hand-rolls a `---` block, a
   quote, or an escape.
2. **`model` is always emitted quoted** (`raw: false`). This is a deliberate divergence
   from `claude-code.ts`, which emits `model: opus` unquoted: Copilot's values contain
   spaces and Cursor's may contain `[`/`]`/`,` bracket parameters, both of which are
   ambiguous or invalid as YAML plain scalars. Quoting is valid YAML for every value in
   every table above, and keeps a user-supplied `--model` literal safe by construction.
3. **`name` and `description` are emitted quoted**, as `claude-code.ts` already does.
   `description` is `` `${metadata.purpose} ${metadata.invocation}` `` for roles and
   `metadata.purpose` for conductors — identical to the reference generator, so the
   four tools describe the pipeline the same way.
4. **Every `CapabilityMapping.notes` entry is rendered** as a frontmatter YAML comment
   `# capability note: <note>`, exactly as `claude-code.ts` does. Adapter notes (the
   per-tool caveats tabulated above) render as `# harny note: <text>` in the same
   comment run, after the capability notes.
5. **`renderProvenance(`templates/${template.sourcePath}`)` follows the frontmatter**,
   then one blank line, then the canonical body byte-for-byte.
6. **Role artifacts append `renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR)`;
   conductor artifacts append `renderProjectConfigBlock(payload.project)`** — the
   conductor keeps carrying the full project configuration, as it does today.
7. **Every artifact ends in exactly one `\n`** (`cli-skeleton` guarantee 19).

### Illustrative output — Cursor auditor role (shape, not a byte fixture)

```md
---
name: "sdd-auditor"
description: "Validate that an implementation matches its specifications — the final quality gate before a feature is documented and shipped. Invoke this role as the final step in the SDD workflow, after both the executor and test-writer have completed their work, to validate the implementation against its specifications."
model: "claude-opus-5"
# capability note: read-files (no Cursor tool-allowlist field; advisory only)
# capability note: run-shell (no Cursor tool-allowlist field; advisory only)
# capability note: write-files (no Cursor tool-allowlist field; advisory only)
# capability note: write-files is scoped to audit.md only
# harny note: Cursor expresses permissions only via `readonly`; the capability list above is documentation, not enforcement.
---
<!-- generated by harny from templates/roles/sdd-auditor.md — canonical body below is verbatim; edit the canonical template, not this file -->

<canonical body, byte-for-byte>

<!-- harny:begin generated project configuration -->
…spec-schema pointer block…
<!-- harny:end generated project configuration -->
```

### Illustrative output — Kiro architect role (shape)

```md
---
name: "sdd-architect"
description: "…purpose… …invocation…"
model: "claude-opus-5"
tools: ["read", "write", "shell", "web", "@context7"]
# capability note: task-tracking has no Kiro-native tool category; the role body's own task discipline applies
# capability note: docs-lookup maps to the Context7 MCP server (@context7); harny does not write MCP configuration — see plan.md §4 "future scope"
---
```

### Illustrative output — GitHub Copilot conductor skill (shape)

```md
---
name: "sdd-conductor"
description: "Orchestrate the five-role SDD pipeline — sequencing the `sdd-*` roles, enforcing the human review gates, and verifying each role's work, without doing that work itself."
# harny note: Copilot skills are model-invoked; ask Copilot to "use the sdd-conductor skill" to start the pipeline explicitly.
---
<!-- generated by harny from templates/conductor/sdd-conductor.md — … -->

<canonical conductor body, byte-for-byte>

<!-- harny:begin generated project configuration -->
…project configuration block…
<!-- harny:end generated project configuration -->
```

### SUPERSEDES — `src/generators/index.ts` (G10)

```ts
export const generators: ReadonlyMap<ToolId, Generator>; // claude-code, cursor, kiro, github-copilot
export function getGenerator(id: ToolId): Generator | undefined; // 'codex' → undefined
/** Tool ids that actually have a generator today.
 *  After this feature: ['claude-code', 'cursor', 'kiro', 'github-copilot']. */
export function availableToolIds(): readonly ToolId[];
```

Supersedes `cli-skeleton` contract's "In this feature: `['claude-code']`" and its
compliance row C13. Registry order is `TOOL_IDS` order, so `availableToolIds()` is
deterministic and reads `['claude-code', 'cursor', 'kiro', 'github-copilot']`.

### Data Models

**No new data model.** `RolePayload`, `ConductorPayload`, `ProjectConfigSummary`,
`RoleTemplate`, `ConductorTemplate`, `Capability`, `CapabilityMapping`, `GeneratedFile`
and `Generator` are consumed exactly as `cli-skeleton` shipped them. The only new
exported symbols in this feature are the three generator constants, `isReadonlyRole`,
`yamlFlowSequence` and `renderSpecSchemaPointerBlock`.

### State Changes

- **Inside this repo (created):** `src/generators/{cursor,kiro,github-copilot}.ts` and
  their test files.
- **Inside this repo (modified):** `src/generators/index.ts`,
  `src/generators/markdown-yaml.ts`, `src/generators/claude-code.ts` (pointer block
  only), and the test files listed in `roadmap.md`'s File Change Map.
- **Inside this repo (read-only, must stay byte-identical):** `templates/**`,
  `.claude/**`, and every other module under `src/` (G5, G6).
- **Inside a target repo (written by `init`):** for each selected tool, its five role
  artifacts plus its conductor artifact; plus `.sdd/spec-schema/*.md` and
  `.sdd/harness.json` exactly once regardless of tool count.

## Behavior Guarantees

Guarantees 1–23 of `specs/cli-skeleton/contract.md` remain in force and now apply
across four generators rather than one. The following are additional and feature-local.

1. **Three new generators, registered and resolvable.** `getGenerator` returns a
   `Generator` for `cursor`, `kiro` and `github-copilot`; `availableToolIds()` is
   exactly `['claude-code', 'cursor', 'kiro', 'github-copilot']`; `codex` remains
   `undefined` and is the only tool `init` reports as skipped. (G1, G2, G3, G10)
2. **Verified paths, extensions and frontmatter keys.** Each generator's `agentsDir`,
   `roleFileName`, `conductorPath` and emitted frontmatter keys equal the values in
   § "Verified per-tool facts", each of which carries a source and the date 2026-08-12.
   No value in this contract derives from `plan.md` alone. (G4)
3. **Shared layer reuse, no per-tool YAML.** No generator file contains a `---`
   literal, a quoting routine, or a frontmatter serializer; all three obtain
   frontmatter, quoting, provenance, the project-config block and the spec-schema
   pointer block from `src/generators/markdown-yaml.ts`. (G5)
4. **The `Generator` interface is used as shipped.** `src/generators/types.ts` is
   byte-identical after this feature, and so are `templates.ts`, `engine.ts`,
   `writer.ts`, `prompts.ts`, `config.ts`, `cli.ts`, `init.ts`, `errors.ts` and
   `vocabulary.ts`. (G6)
5. **Nothing is silently dropped, on any of the three tools.** For every capability of
   every enabled role, the capability is either mapped to ≥ 1 tool-native token or
   surfaced in `CapabilityMapping.notes`; every note reaches the rendered artifact. In
   particular the auditor's `write-files (audit.md only)` scope text appears in the
   generated auditor artifact for Cursor, Kiro **and** GitHub Copilot, and an unknown
   capability token appears as `unmapped capability: <name>`. (G8)
6. **Conductor rendered from minimal metadata.** Each generator's `renderConductor`
   reads only `metadata.id` and `metadata.purpose` (plus `body`, `sourcePath` and the
   `ProjectConfigSummary`), never `cost_tier`/`capabilities`/`invocation`/`handoff`,
   and succeeds against the real `templates/conductor/sdd-conductor.md`. (G7, G8)
7. **Conductor placement is explicit and tool-native.** Each of the three
   `conductorPath` values is a `SKILL.md` under that tool's own skills directory, is
   independent of `agentsDir`, and is accompanied in the rendered artifact by the
   caveat tabulated in § "Conductor representation, per tool". No tool silently loses
   its conductor. (G7)
8. **Every role artifact points at the deployed spec schema.** For all four generators
   and all five roles, the artifact contains the `harny:begin`/`harny:end` block naming
   `.sdd/spec-schema`, and that string equals `SPEC_SCHEMA_DIR` from `src/engine.ts`
   rather than a literal duplicated inside a generator. (G9)
9. **Model tables are single-sourced and overridable.** Each generator declares exactly
   one `Record<CostTier, string>` table; a `modelOverride` is returned verbatim and
   untranslated by all three `mapModel` implementations, including values containing
   spaces or bracket parameters. (G4, G11)
10. **Vendor limits are enforced loudly, never silently exceeded.** If a rendered Kiro
    or GitHub Copilot skill `description` would exceed 1024 characters, or a rendered
    GitHub Copilot role body would exceed 30,000 characters, the generator throws
    `HarnessError('TEMPLATE')` naming the artifact, the measured size and the documented
    limit. With the canonical layer as it stands (bodies 3.5–6.6 kB, conductor purpose
    ≈ 0.2 kB) no limit is reached; the guards exist so canonical growth fails a test run
    instead of shipping a file the vendor rejects. (G11)
11. **Multi-tool runs stay shared-artifact correct.** With all four tools selected, one
    `init` emits 4 × (5 role artifacts + 1 conductor artifact) = 24 tool artifacts plus
    exactly one copy each of the five spec-schema files and `.sdd/harness.json`, and the
    spec-schema files remain byte-identical to `templates/spec-schema/*.md`. (G10)
12. **Canonical fidelity across four generators, verified non-self-referentially.** For
    every role and the conductor, the canonical body sliced from the **raw** template
    file (read with `fs.readFile`, never through `parseRoleTemplate`/
    `parseConductorTemplate`) appears byte-for-byte in each of the four generators'
    output. (G11; carries forward `cli-skeleton` guarantee 23 and audit AL-6/AL-23)
13. **Determinism and containment hold per tool.** Two runs with identical inputs
    produce byte-identical trees for all four tools; every generated path is relative
    and inside the target directory; every artifact ends in exactly one `\n`. (G11)
14. **No dependency drift.** `package.json`'s `dependencies` and `devDependencies` are
    byte-identical after this feature, and no generator imports anything outside
    `src/` other than existing `node:` builtins already in use. (G11)

## Error Handling Contract

All twenty-two rows of `specs/cli-skeleton/contract.md`'s Error Handling Contract remain
in force unchanged. This feature changes the *population* of two existing rows and adds
three:

| Error Condition | Behavior | Exit | User Impact |
|---|---|---|---|
| **(POPULATION CHANGE)** Selected tool has no generator yet, but another selected tool does | Unchanged mechanism; the only tool that can now trigger it is `codex` | 0 | "Skipped codex: generator not shipped yet" |
| **(POPULATION CHANGE)** No selected tool has a generator | Unchanged mechanism; now reachable only via `--tools codex` | 4 | `NO_GENERATOR`, listing four available ids; nothing written |
| **(NEW)** A rendered Kiro or GitHub Copilot skill `description` exceeds the vendor's documented 1024-character limit | `HarnessError('TEMPLATE')` naming the tool, the artifact path, the measured length and the limit; thrown during render, before any write | 5 | Nothing written; the message says this is a canonical-content problem, not a user configuration problem |
| **(NEW)** A rendered GitHub Copilot role body exceeds the documented 30,000-character prompt limit | `HarnessError('TEMPLATE')` naming the role, the measured length and the limit; thrown during render | 5 | Nothing written; same framing |
| **(NEW)** A capability maps to zero tool-native tokens for the selected tool (Cursor: always; Kiro: `task-tracking`; Copilot: always) | Not an error. A note is emitted for every such capability and rendered as a `# capability note:` line | 0 | The capability is visible in the artifact as documentation; the user can see exactly what the tool cannot enforce |

Two non-rows, recorded so their absence is deliberate:

- **An unknown capability token is not an error** for any of the three tools; the
  existing `io.warn`-once path in `runInit` step 9 already covers the operator signal,
  and each generator's `notes` covers the artifact signal (`cli-skeleton` R24).
- **A model id that the vendor has retired is not detectable at generation time.** No
  generator contacts a network service; a stale table renders a file the tool will fall
  back from (Kiro documents exactly this fallback) or reject at use time. The remedy is
  the existing `--model <role>=<literal>` escape hatch, and the mitigation is
  `roadmap.md`'s Phase 4 manual-verification task.

## Dependencies

**Internal (read-only inputs):**
- `templates/roles/sdd-{architect,test-writer,executor,auditor,documentation}.md`,
  `templates/conductor/sdd-conductor.md`, `templates/spec-schema/*.md`.
- `src/generators/types.ts` — the adapter interface, consumed as shipped.
- `src/generators/markdown-yaml.ts` — the shared wrapper layer (extended additively).
- `src/generators/claude-code.ts` — the reference implementation and structural model.
- `src/engine.ts` — `RolePayload`, `ConductorPayload`, `ProjectConfigSummary` (types)
  and `SPEC_SCHEMA_DIR` (value).
- `src/vocabulary.ts`, `src/templates.ts`, `src/errors.ts` — types and `HarnessError`.
- `specs/cli-skeleton/contract.md` and `audit.md` — the contract this one extends and
  the findings (AL-5, AL-7) it discharges.

**External — runtime:** unchanged (`commander@15.0.0`, `@clack/prompts@1.7.0`); this
feature adds none.

**External — dev:** unchanged (`typescript@7.0.2`, `vitest@4.1.10`,
`@types/node@26.1.2`).

**Documentation sources (verification inputs, not build inputs):** the URLs tabulated in
§ "Verified per-tool facts", plus Context7 library ids `/websites/cursor`,
`/github/awesome-copilot`, `/kirodotdev/kiro`.

## Integration Points

- **Realizes `cli-skeleton`'s Integration Points prediction.** That contract predicted
  each new generator would be "one file under `src/generators/` plus one registry entry,
  and requires **no** change to `templates.ts`, `engine.ts`, `writer.ts`, or
  `prompts.ts`". Guarantee 4 turns that prediction into a testable obligation. The two
  additions to `markdown-yaml.ts` are within the shared layer that same contract created
  for this purpose; the `claude-code.ts` edit is the disclosed AL-5 retrofit, not a
  per-tool leak.
- **Discharges audit finding AL-5 completely.** Deployment was already closed
  (`buildSharedFiles` → `.sdd/spec-schema/`, verified byte-identical in `cli-skeleton`
  audit AL-12). This feature closes the reachability half from inside a role artifact
  (guarantee 8) for all four generators. Nothing about the deployment mechanism changes,
  and no generator writes a second copy of the schema files.
- **Discharges audit finding AL-7 at the renderer, for three more tools.** The
  conductor's `id`/`purpose`-only metadata is honored by construction (the
  `ConductorMetadata` type carries nothing else), and the auditor's free-text
  `write-files (audit.md only)` scope reaches all three tools' output as a capability
  note (guarantees 5 and 6).
- **Cursor × Claude Code overlap (D7).** Cursor loads `.claude/agents/` as a
  compatibility location, so `init --tools claude-code,cursor` places five identically
  named agents in two directories Cursor reads. The behavior on collision is not
  documented by Cursor; harny neither suppresses nor merges the two — it discloses the
  overlap in the generated Cursor conductor artifact and leaves the user in control.
  Recorded as a risk in `roadmap.md`.
- **Sets up the Codex CLI generator.** After this feature, four Markdown+YAML targets
  share one wrapper module and the interface has been exercised by four real adapters
  with materially different capability models (full allowlist, category allowlist, no
  allowlist at all). Codex needs only a sibling `src/generators/toml.ts` wrapper plus
  `src/generators/codex.ts`; nothing in this feature blocks or pre-empts it.
- **Forward reference — MCP provisioning (NOT implemented here).** Kiro's `@context7`
  token and Claude Code's `mcp__context7__*` tokens both *name* a server that
  `harness mcp add` will one day configure. No MCP configuration file is written by this
  feature, for any tool.
- **Documentation hand-off.** `README.md`, `CHANGELOG.md` and `AGENTS.md` all state that
  only the Claude Code generator ships. Updating them is `sdd-documentation`'s automatic
  post-audit step, not this feature's work, and is listed in `roadmap.md` as such.
