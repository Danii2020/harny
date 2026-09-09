# Contract: canonical-role-templates

> This feature's deliverable is **content**, not code: Markdown files and a
> directory layout under `templates/`. Accordingly, the "interfaces" below are the
> file manifest, the internal document schema each canonical file must follow, and
> the controlled vocabularies (cost tiers, capabilities) that make the content
> portable. Fenced blocks are Markdown / plain-text schema, because Markdown is the
> actual "language" of this deliverable.
>
> Traceability: each contract item cites the intent goal it serves as `(Gn)`, where
> G1..G7 are the numbered goals in `intent.md`.

## Interfaces

### Public API — the `templates/` file manifest (G1, G4, G5, G6)

The feature MUST produce exactly this tree at repo root (no more, no fewer files):

```
templates/
├── roles/
│   ├── sdd-architect.md
│   ├── sdd-test-writer.md
│   ├── sdd-executor.md
│   ├── sdd-auditor.md
│   └── sdd-documentation.md
├── conductor/
│   └── sdd-conductor.md
└── spec-schema/
    ├── intent.md
    ├── contract.md
    ├── roadmap.md
    ├── tasks.md
    └── audit.md
```

Notes bound by this contract:
- `conductor/` holds a single canonical file named `sdd-conductor.md`. It is plain
  portable content, NOT framed as a "Claude Code Skill" (no `SKILL.md` filename, no
  Skill-only frontmatter). (G5)
- `spec-schema/*.md` are schema/template files — the blank scaffolds the architect
  emits — extracted verbatim-in-shape from what is currently inlined in the
  architect prompt. (G6)

### Data Model — the canonical role-file document schema (G1, G3)

Every file in `templates/roles/` MUST follow one shared document structure so that a
later per-tool wrapper can parse it uniformly. The structure is a portable metadata
block (as a Markdown section, NOT any one tool's frontmatter) followed by the role
body:

```
# <role-id>            e.g. sdd-architect

## Role Metadata       (tool-agnostic; wrappers translate this per tool)
- id:            <kebab-case role id>
- purpose:       <one-line description of what the role does>
- cost_tier:     <most-capable | mid | cheapest>     # see enum below
- cost_rationale: <why this tier — the workshop cost argument>
- capabilities:  <comma-separated subset of the capability vocabulary below>
- invocation:    <when this role should be invoked, in prose — NOT <example> blocks>
- handoff:       <what runs before / after this role in the pipeline>

## <Role body>
<the actual system-prompt instructions for the role — portable, stack-agnostic>
```

- The metadata block is **descriptive data**, consumed by future generators; it
  deliberately avoids Claude Code's `tools:` array and `model:` id as the source of
  truth. (G3)
- The role body is the reconciled, generalized system prompt (Goal 2 rules apply). (G2)

### Data Model — controlled vocabularies (G3)

`cost_tier` enum (maps to a concrete model per tool inside a future generator):

```
most-capable  # deepest reasoning     — architect, auditor
mid           # balanced cost/quality — test-writer, executor
cheapest      # fast synthesis/writing — documentation
```

`capabilities` vocabulary (abstract; a future wrapper maps each token to the target
tool's real tool/permission names):

```
read-files        # read source, specs, docs
write-files        # create/edit files
run-shell          # run build / lint / type-check / test commands
web-search         # search the web
docs-lookup        # fetch library/API docs. Canonical/default provider: Context7 MCP
                   #   (library & API documentation lookup). A future per-tool wrapper
                   #   maps this to the tool's equivalent docs-lookup MCP; on Claude
                   #   Code it is the mcp__context7__resolve-library-id /
                   #   mcp__context7__query-docs pair the current drafts already list.
task-tracking      # create/update a task/todo list for pipeline stages
```

A role MUST declare only the capabilities it actually needs (least-privilege intent),
e.g. the auditor is read + run-shell (no unrestricted write beyond `audit.md`).

**Docs-lookup content rule (G3):** every role that declares `docs-lookup`
(sdd-architect, sdd-executor, sdd-test-writer) MUST instruct in its body: *verify
library/API usage via Context7 (or the target tool's equivalent docs-lookup MCP)
before pinning a signature, contract, or test against that library — do not trust
memory for library APIs.* The phrasing stays portable (names Context7 as the
canonical provider while allowing a per-tool equivalent), matching what the current
`.claude/agents/*.md` drafts already do.

### State Changes

This feature only creates files under `templates/` and `specs/canonical-role-templates/`.
It does not modify the live `.claude/` instance, `mr-engine-app`, or any runtime state.
(intent Non-Goals)

## Per-role content contract (G2, G4)

Each row states the mandatory content each canonical role MUST carry after
reconciliation. "Preserve" = keep from this repo's improved draft; "Strip" = remove
drift; "Neutralize" = replace project/tool-specific text with generic wording.

| Role | cost_tier | capabilities | Must preserve | Must strip / neutralize |
|---|---|---|---|---|
| sdd-architect | most-capable | read-files, write-files, run-shell, web-search, docs-lookup, task-tracking | generalized "Project Context" (read `CLAUDE.md` if present else derive; reuse existing code; **verify library APIs via Context7 docs-lookup before pinning a signature — don't trust memory**); "read a written brief if present"; one-at-a-time file emission with approval; reflexive traceability rules; "use the project's real language, never a placeholder" | Claude `tools:`/`model:`/`color:`/`<example>` frontmatter; project-flavored examples (curation/card-ranking, email/webhook) → generic |
| sdd-test-writer | mid | read-files, write-files, run-shell, docs-lookup | **red-first ordering** (runs BEFORE executor, tests must fail for the right reason); docstring/comment-based spec linkage (NOT contract IDs in test names); the `high-value-tests` rubric reference; offline-by-default / tag live tests; "mock the injected seam" phrasing; **verify a library's API via Context7 docs-lookup before asserting against it** | source's "runs AFTER executor" ordering; `tests/CONVENTIONS.md`, Vitest, Supabase, `Db` mock, `renderToStaticMarkup` specifics → generic; hardcoded `.claude/skills/high-value-tests/SKILL.md` path → portable reference |
| sdd-executor | mid | read-files, write-files, run-shell, docs-lookup, web-search, task-tracking | generalized "Project Context"; "contract is law / no scope creep"; TDD note (make red tests pass without editing them; report test bugs); **verify library APIs via Context7 docs-lookup before using them — don't trust memory**; final checklist incl. "test suite passes via project runner" | Claude frontmatter mechanics; any stack residue |
| sdd-auditor | most-capable | read-files, run-shell, write-files (audit.md only) | full 7-step audit; verdict enum APPROVED / APPROVED WITH RESERVATIONS / REJECTED; severity ratings; "report, don't fix"; generalized dependency-diff + offline test run | Claude frontmatter mechanics; any stack residue |
| sdd-documentation | cheapest | read-files, write-files, run-shell | the full fixed design in the section below | — (new file; nothing to strip) |

## sdd-documentation content contract (G4) — fixed design

The `sdd-documentation.md` body MUST encode, and the auditor MUST later verify, all of:

1. **Type / tier**: subagent, `cost_tier: cheapest`, with an explicit `cost_rationale`
   stating this is synthesis/writing (not deep reasoning) and is the cheapest tier in
   the pipeline (the workshop's 3-tier cost argument).
2. **Trigger**: runs automatically right after the final human gate (audit review) is
   approved, ONLY when the verdict is `APPROVED` or `APPROVED WITH RESERVATIONS`. On
   `REJECTED`, it does not run. This is an **automatic handoff** (like executor→auditor),
   NOT a new blocking human gate.
3. **Inputs**: the 5 specs for the shipped feature + `audit.md`'s final verdict + the
   actual diff of files changed during implementation.
4. **Outputs**:
   - update `README.md`;
   - update `CHANGELOG.md` in **Keep a Changelog** style;
   - update the relevant section of `ARCHITECTURE.md` / `AGENTS.md` **if present**;
   - archive the spec **in place** by adding a `Shipped: <date>` header to the top of
     that feature's `intent.md` (do NOT move the spec directory).
5. **Bootstrap**: if `CHANGELOG.md` or `ARCHITECTURE.md` do not exist, create minimal
   versions rather than skipping.
6. **Hard rule**: document ONLY what the auditor actually verified — no inventing,
   embellishing, or "improving" the implementation in docs.
7. **Scope guard**: NEVER touches inline code comments/docstrings (that is the
   executor's job).
8. **Post-run**: present a summary of what it changed for optional human review (review
   is optional; it does not block).

## Conductor content contract (G5)

`conductor/sdd-conductor.md` MUST:

1. Describe the pipeline as **five** roles:
   `architect → test-writer → executor → auditor → documentation`.
2. Keep the three existing human gates unchanged and in place: post-specs,
   post-red-tests, post-audit.
3. Add the **documentation auto-flow** rule: after the post-audit gate is approved and
   the verdict is APPROVED / APPROVED WITH RESERVATIONS, hand off to documentation
   automatically (non-gated), then surface its change summary for optional review.
4. Preserve the existing hard rules (never self-approve; default to TDD; failing tests
   are a gate; delegate change-requests back to the same subagent; verify-don't-trust;
   subagent-failure fallback; don't commit/push unless asked).
5. Be free of "Claude Code Skill"-only framing and any project/stack residue, while it
   MAY still explain *why* orchestration lives in the main thread (a portable rationale,
   not a Claude-only mechanic).

## Spec-schema content contract (G6)

`spec-schema/{intent,contract,roadmap,tasks,audit}.md` MUST each contain the blank
template body currently inlined in the architect prompt (headings, tables, legends,
placeholders), so the extracted schema and the architect's emitted output stay
identical in shape. The architect body MAY then reference these schema files instead of
re-inlining them, but MUST NOT contradict them.

**Amendment (C9 clarification):** `spec-schema/audit.md` MAY include a trailing "Final
Verdict" section as a sanctioned superset of the inline template — the canonical
`sdd-auditor` role formalizes verdict emission that the inline prompt only implied — and
this does not violate the "identical in shape" requirement.

## Behavior Guarantees

1. **Portability invariant** (G3): No canonical file names a Claude-Code `tools:` array,
   a concrete model id (`opus`/`sonnet`/`haiku`), or a Claude-only path as its single
   source of truth. Model need is expressed as `cost_tier`; permissions as `capabilities`.
2. **No-drift invariant** (G2): No canonical file contains "AI Radar" / Python-uv-
   Bedrock-LangGraph residue, nor `mr-engine-app` / Vitest / Supabase / `Db`-mock /
   `renderToStaticMarkup` residue.
3. **Improvement-preservation invariant** (G2): The four verified improvements
   (test-writer red-first, docstring spec linkage, `high-value-tests` reference,
   generalized "Project Context") are present in the canonical output.
4. **Gate invariant** (G5): The canonical conductor still enforces exactly the three
   original human gates; documentation is added strictly as a non-gated auto-handoff.
5. **Documentation-fidelity invariant** (G4): `sdd-documentation.md` encodes all 8 fixed
   requirements above and never authorizes touching code comments/docstrings.
6. **Manifest-completeness invariant** (G1): all 11 target files exist and are non-empty.
7. **Reflexive traceability** (G7): this feature's own contract items cite intent goals;
   tasks will cite roadmap phases; audit items will cite intent/contract.

## Error Handling Contract

| Condition | Behavior | Impact on downstream |
|---|---|---|
| A source copy conflicts (production vs. drifted draft) | Follow the Per-role table: preserve the repo draft's listed improvements, otherwise defer to the production source; neutralize project-specific text | Canonical content is unambiguous for the generator |
| A source line is stack/tool-specific with no generic equivalent | Rewrite it as a capability/tier/behavior statement; if truly Claude-only, drop it and note the drop in `audit.md` | No tool mechanics leak into canonical content |
| `high-value-tests` skill is out of `templates/` scope but referenced by test-writer | Keep a **portable reference** (describe the rubric + where a tool would place it), do not inline or vendor the skill file | Test-writer stays usable; skill packaging deferred |
| `sdd-documentation` requirement seems ambiguous | Treat the fixed design (8 points) as authoritative; do NOT redesign | Documentation role matches agreed spec |
| A target file would duplicate content (e.g. schema inlined AND extracted) | Extract to `spec-schema/`, reference it from the role; never keep two contradictory copies | Single source of truth per artifact |

## Dependencies

- Internal (read-only inputs): `plan.md`; `mr-engine-app/.claude/agents/sdd-*.md` and
  `.claude/skills/sdd-conductor/SKILL.md`; this repo's `.claude/agents/sdd-*.md`,
  `.claude/skills/sdd-conductor/SKILL.md`, `.claude/skills/high-value-tests/SKILL.md`.
- External packages: none (pure Markdown authoring).

## Integration Points

- **Future per-tool generators** (`claude-code`, `cursor`, `kiro`, `github-copilot`,
  `codex`) consume `templates/roles/*`, `templates/conductor/*`, and
  `templates/spec-schema/*`, translating `cost_tier` → model id and `capabilities` →
  tool/permission names, and wrapping the body in each tool's format (4× Markdown+YAML /
  `.agent.md`, 1× TOML). This contract's metadata schema is the interface they read.
- **Future `harness init` prompts** map "which roles to enable" and "model per role"
  onto the `roles/` set and the `cost_tier` field.
- **The `agnostic-layer/`** (CI/hooks/gitleaks) is a sibling under `templates/` added by
  a later feature; it does not interact with this feature's output.
- **MCP provisioning (forward reference — NOT implemented by this feature).** Because the
  `docs-lookup` capability defaults to Context7 MCP, a future per-tool generator will also
  need to write each tool's MCP config file so docs-lookup works out of the box without
  manual user setup. The confirmed facts below are recorded here (from live research) so
  that future work does not have to re-derive them. **Generating these 5 files is per-tool
  generator code and is explicitly out of scope for this feature** — same non-goal as the
  CLI itself; this table is informational/forward-reference only and adds no file to this
  feature's manifest.

  | Tool | MCP config file | Format | Root key |
  |---|---|---|---|
  | Claude Code | `.mcp.json` (repo root) | JSON | `mcpServers` |
  | Cursor | `.cursor/mcp.json` | JSON | `mcpServers` |
  | GitHub Copilot (VS Code) | `.vscode/mcp.json` | JSON | `servers` (NOT `mcpServers` — different key than the others, a common setup mistake) |
  | Kiro | `.kiro/settings/mcp.json` | JSON | `mcpServers` |
  | Codex CLI | `.codex/config.toml` (project-scoped, trusted) or `~/.codex/config.toml` | TOML | `[mcp_servers.<name>]` |
