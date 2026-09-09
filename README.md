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
sdd-auditor       (verifies the contract + runs the toolchain)
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
  eight reusable skills.
- `.claude/skills/sdd-conductor/SKILL.md` — orchestrates the five roles, enforces
  the three human gates, and never self-approves on the human's behalf.
- Eight `harny-*` skills bridged from `.agents/skills/` via git-tracked symlinks under
  `.claude/skills/harny-{propose,test,implement,audit,document,sync,adr,standards}/` —
  canonical instruction sets that the five agents delegate to and that can be reused
  or inspected independently.

The `npx harny init` CLI scaffolds this same pipeline into any target repository,
choosing which tool(s) to target. Each tool gets its own generator that reads the
portable role templates and adapts them to that tool's native format and capability
model.

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
- For a single tool: 6 tool-specific files (5 roles + conductor artifact) + 6 shared files (5 spec schema templates + configuration) = 12 files total
- For multiple tools: 6 files per selected tool, plus 6 shared files written exactly once. Example: `--tools claude-code,cursor,kiro,github-copilot,codex` generates 30 tool-specific files + 6 shared = 36 files total

## Portable templates

`templates/` at the repo root holds a **canonical, tool-agnostic** version of the
same five roles, the conductor, and the spec schema:

```
templates/
├── roles/         # sdd-architect, sdd-test-writer, sdd-executor, sdd-auditor,
│                  # sdd-documentation - portable role bodies, no Claude-Code-only
│                  # tools:/model:/frontmatter mechanics baked in as the source of
│                  # truth. Each role instead declares an abstract cost_tier
│                  # (most-capable / mid / cheapest) and a capabilities list.
├── conductor/     # sdd-conductor.md - the same 5-role, 3-gate orchestration logic,
│                  # described without assuming any single tool's Skill format.
└── spec-schema/   # intent/contract/roadmap/tasks/audit.md - the blank scaffolds
                   # the architect emits, extracted as standalone template files.
```

These templates are the canonical source that `npx harny init` reads from when
generating configuration for a target repository. The CLI treats `templates/` as
read-only input — the per-tool generators adapt this content without modifying it.

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
