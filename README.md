# harny

A portable **Specification-Driven Development (SDD)** subagent pipeline, with
generators for **Claude Code**, **Cursor**, **Kiro**, **GitHub Copilot**, and **Codex**.

Instead of asking a single agent to design, test, implement, and audit a feature in
one undifferentiated pass, this pipeline splits the work across five specialized
roles with explicit human review gates in between:

```
sdd-architect
     |
[HUMAN GATE: review the 5 specs]
     |
sdd-test-writer   (red phase - tests that must fail for the right reason)
     |
[HUMAN GATE: confirm the tests fail for the right reason]
     |
sdd-executor      (green phase - implements until tests pass)
     |
sdd-auditor       (verifies the contract + confirms the per-turn hook fired and CI is green)
     |
[HUMAN GATE: review the final verdict]
     |
sdd-documentation (automatic, non-gated - runs only on an approved verdict)
```

Each feature gets a 5-file spec under `specs/<feature-name>/`:

| File | Answers |
|---|---|
| `intent.md` | Why: problem, goals, success criteria, non-goals, constraints |
| `contract.md` | What: interfaces, data models, behavior guarantees, error handling |
| `roadmap.md` | How: implementation phases, dependencies, file-change map |
| `tasks.md` | Granular checklist per phase (`[ ]` `[x]` `[~]` `[!]`) |
| `audit.md` | Compliance checklist, audit log, final verdict |

Every item is traceable: each `contract.md` item cites the `intent.md` goal it
serves, each `tasks.md` item cites a `roadmap.md` phase, and each `audit.md` item
cites back to `intent.md` or `contract.md`.

## What's actually running today

On this repo, the pipeline is wired up as Claude Code subagents and a Skill:

- `.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md` — five thin
  specialized roles that run as Claude Code subagents. Each agent body is ≤ 25 lines;
  combined file size is 148 lines (down from 646) because shared instructions are now in
  ten reusable skills.
- `.claude/skills/sdd-conductor/SKILL.md` — orchestrates the five roles, enforces
  the three human gates, and never self-approves on the human's behalf.
- Ten `harny-*` skills bridged from `.agents/skills/` via git-tracked symlinks under
  `.claude/skills/harny-{propose,test,implement,audit,document,sync,feedback,doctor,adr,standards}/` —
  canonical instruction sets that the five agents delegate to and that can be reused
  or inspected independently.

The `npx harny init` CLI scaffolds this same pipeline into any target repository,
choosing which tool(s) to target. Each tool gets its own generator that reads the
portable role templates and adapts them to that tool's native format and capability
model.

Since `templates-skill-library-parity`, the scaffolder also writes the same ten
`harny-*` skills to the target repository as **real files** (never symlinks), one copy
per tool's skill-discovery root:
- `.claude/skills/harny-*/` for Claude Code
- `.kiro/skills/harny-*/` for Kiro  
- `.agents/skills/harny-*/` for Cursor, GitHub Copilot, and Codex (shared root)

Eight skills are always scaffolded (`harny-propose`, `harny-test`, `harny-implement`,
`harny-audit`, `harny-document`, `harny-sync`, `harny-feedback`, `harny-doctor`); two
are optional (`harny-adr` and `harny-standards`, selectable via the `--skills` flag).

### Knowledge base and documentation

- `specs/current/` — the fast-lookup picture of current behavior, live statements,
  invariants, open reservations, and keyword routing (five capability docs plus index).
- `specs/archived/` — byte-identical historical record of every shipped feature, with its
  rationale decisions published as Architecture Decision Records (ADRs).

## Building and installing locally

Since this package is not yet published to npm, you must build it locally before running the CLI:

```sh
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Then invoke the CLI in one of these ways:
# Option 1: Use npm link to add harny to your PATH
npm link
harny init /path/to/target-repo

# Option 2: Run directly from the repo
node bin/harness.js init /path/to/target-repo

# Option 3: Run within this repo's directory (npx reads local dist/)
npx harny init /path/to/target-repo
```

**Note:** The build step is required before running the CLI, as `bin/harness.js` loads TypeScript
output from `dist/`. If you make changes to `src/`, re-run `npm run build` before testing.

## Using harny to scaffold a new project

The `npx harny init` CLI scaffolds the SDD pipeline into any target repository,
interactively or non-interactively:

```sh
# Interactive mode — asks five questions: which tool(s), which roles,
# model per role, active gates, and project stack.
npx harny init /path/to/target-repo

# Non-interactive with defaults:
npx harny init /path/to/target-repo --yes

# Non-interactive with per-tool generator selection:
npx harny init /path/to/target-repo --yes --tools claude-code

# Deselect specific roles (generates only the auditor agent):
npx harny init /path/to/target-repo --yes --roles sdd-auditor

# Preview without writing:
npx harny init /path/to/target-repo --dry-run

# Using a saved configuration file:
npx harny init /path/to/target-repo --config ./harness-config.json
```

**Key flags:**
- `--tools <list>` — comma-separated tool ids or `all` (default: `claude-code`)
- `--roles <list>` — comma-separated role ids or `all` (default: all five; conductor always included)
- `--skills <list>` — optional skill ids to scaffold: `all`, `none`, or comma list of `harny-adr`/`harny-standards` (default: `harny-standards` only; the eight core skills are always included)
- `--model <role>=<value>` — repeatable; `<value>` is a cost tier or a literal model id
- `--gates <list>` — comma-separated gate ids, `all`, or `none` (default: all three)
- `--stack <name>` — project stack (captured only, for future MCP provisioning)
- `--config <path>` — read configuration from JSON file instead of prompting
- `--yes` — accept all defaults, skip prompts and final confirmation
- `--dry-run` — print planned file list; write nothing
- `--force` — overwrite existing files without prompting

**Shipped tools:**
- `claude-code` — generates `.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md` and `.claude/skills/sdd-conductor/SKILL.md`
- `cursor` — generates `.cursor/agents/sdd-*.md` and `.cursor/skills/sdd-conductor/SKILL.md`
- `kiro` — generates `.kiro/agents/sdd-*.md` and `.kiro/skills/sdd-conductor/SKILL.md`
- `github-copilot` — generates `.github/agents/sdd-*.agent.md` and `.github/skills/sdd-conductor/SKILL.md`
- `codex` — generates `.codex/agents/sdd-*.toml` (TOML format) and `.agents/skills/sdd-conductor/SKILL.md`

**Generated files per `init` run:**
- For a single tool with the default skill set: 7 tool-specific files (5 roles + conductor + 1 MCP config) + 9 core/optional skills (8 core + 1 default `harny-standards`, one per tool's root) + 6 shared files (5 spec schema templates + configuration) = 22 files total
- For multiple tools with defaults: 7 files per selected tool (35 total for all five), plus 9 skills per unique root (8 core + 1 default `harny-standards` for three roots = 27 total), plus 6 shared files = 68 files total
- With `--skills all`: includes both optional skills (`harny-adr` and `harny-standards`) for 10 skills per root instead of 9
- Example: `--tools claude-code,cursor,kiro,github-copilot,codex --skills all` generates 35 tool artifacts + 50 skill artifacts (10 per root) + 6 shared = 91 files total

**Default MCP server wiring:** Each selected tool now gets a default Context7 MCP server entry written into its own native MCP configuration file (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `.kiro/settings/mcp.json`, `.codex/config.toml`), so the `docs-lookup` capability's canonical tool tokens (`mcp__context7__resolve-library-id` and `mcp__context7__query-docs` on Claude Code, `@context7` on Kiro) resolve to a real, connected server out of the box. These five files are repo-scoped configuration and are tracked in version control; they are never deleted or rewritten whole-file, only extended to add the Context7 entry if absent. The first time an agent calls a Context7 tool, that tool's own native first-use approval prompt remains the approval gate — harny writes the configuration only, never auto-approves or widens permissions.

## Checking whether a repository is ready

`npx harny doctor` runs the scaffolded readiness check against a target repository —
a feedforward, computational pre-check (see `AGENTS.md` § "Feedforward vs. feedback")
that confirms both that the harness is installed and coherent, and that the target
repository carries the baseline documentation an AI coding agent needs to work safely.
This runs before an agent starts work, rather than discovering gaps partway through a
session:

```sh
# Check the current directory:
npx harny doctor

# Check another repository, overriding the recorded stack:
npx harny doctor /path/to/target-repo --stack python

# Equivalent direct invocation (what CI or a hook would run):
node /path/to/target-repo/.sdd/doctor/run-doctor.mjs
```

It evaluates five check families in this fixed order:

1. **Environment** — Node.js version and runtime readiness
2. **Harness manifest** — base `.sdd/` scaffold files (the generator's own artifacts)
3. **Repo readiness** — repository documentation the agent needs: a `README.md` (must-have);
   an architecture/structure document (recommended); and per-tool guidance files
   (recommended, gated by tool selection in `.sdd/harness.json`)
4. **Spec state** — coherence of the `specs/` directory if harny specs are in use
5. **Test suite** — running the resolved stack's full test suite (stack-specific runner)

Two tiers govern each check:
- **Must-have** — an absent item fails the run and exits `6` (not ready)
- **Recommended** — an absent item warns (named in the report with remediation) but never
  changes the exit code

The summary line reports four counts: `ok`, `skipped`, `warned`, and `failed`. Exits `0`
when ready (no failures, possibly some warnings); exits `6` when at least one must-have
check failed (never confused with a CLI usage/internal error); exits `2` when the target
directory is missing, unreadable, or the runner could not complete. Writes nothing under
any flag combination: this is the one command that executes project tooling, and it never
mutates the repo it inspects.

For repositories with gaps, `harny-doctor` does more than report: it reads the present
guidance documents (README, conventions document, architecture document) and judges three
coherence elements:
- **Purpose** — does it state what this project is and what it is for?
- **Components** — does it name the top-level structure and what each main part does?
- **Validation** — does it name the commands that prove a change is good (tests, lint,
  type-check, build)?

All three are must-have for the conventions document and recommended for the README and
architecture document. When gaps are found, `harny-doctor` reports them to the human and
asks whether to delegate drafting to `harny-document`, which can bootstrap repo-level
guidance documents from observed evidence.

**Key flags:**
- `[target]` — directory to check (default: `.`)
- `--stack <name>` — override the stack recorded in `.sdd/harness.json`

## Portable templates

`templates/` at the repo root holds a **canonical, tool-agnostic** version of the
five roles, the conductor, the spec schema, and the skill library:

```
templates/
├── roles/         # sdd-architect, sdd-test-writer, sdd-executor, sdd-auditor,
│                  # sdd-documentation - portable role bodies, no Claude-Code-only
│                  # tools:/model:/frontmatter mechanics baked in as the source of
│                  # truth. Each role instead declares an abstract cost_tier
│                  # (most-capable / mid / cheapest) and a capabilities list.
├── conductor/     # sdd-conductor.md - the same 5-role, 3-gate orchestration logic,
│                  # described without assuming any single tool's Skill format.
├── spec-schema/   # intent/contract/roadmap/tasks/audit.md - the blank scaffolds
│                  # the architect emits, extracted as standalone template files.
└── skills/        # Ten harny-* skills plus bundled resources and a shape contract:
                   # harny-propose, harny-test, harny-implement, harny-audit,
                   # harny-document, harny-sync, harny-feedback, harny-doctor,
                   # harny-adr, harny-standards.
                   # Each skill carries six portable frontmatter keys and five body
                   # sections per the Agent Skills specification.
```

These templates are the canonical source that `npx harny init` reads from when
generating configuration for a target repository. The CLI treats `templates/` as
read-only input — the per-tool generators adapt this content without modifying it.
The ten skills are **copied as real files** to each tool's skill-discovery root,
never as symlinks, and never edited by the generators.

## Repository layout

This repo's own SDD pipeline (running on Claude Code):

```
.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md
.claude/skills/sdd-conductor/SKILL.md
```

Shared templates and specs:

```
specs/<feature-name>/{intent,contract,roadmap,tasks,audit}.md
templates/{roles,conductor,spec-schema}/
plan.md          # background/vision notes (workshop planning)
AGENTS.md        # tool-agnostic conventions for this repo
CLAUDE.md        # Claude-Code-specific notes; defers to AGENTS.md
```

When you run `npx harny init` in a target repository, it generates a pipeline for your
chosen tool(s) — e.g., `.cursor/agents/sdd-*.md` for Cursor, `.kiro/agents/sdd-*.md` for Kiro,
or `.github/agents/sdd-*.agent.md` for GitHub Copilot — plus shared `.sdd/spec-schema/` and
`.sdd/harness.json` files.

See `AGENTS.md` for the full conventions this repo follows.
