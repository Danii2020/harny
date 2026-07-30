# harny

A portable **Specification-Driven Development (SDD)** subagent pipeline, currently
instantiated for **Claude Code**.

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

- `.claude/agents/sdd-architect.md` - explores the codebase and writes the 5 spec
  files, one at a time, with human approval between files.
- `.claude/agents/sdd-test-writer.md` - turns every contract guarantee and success
  criterion into tests (red phase: must fail for the right reason).
- `.claude/agents/sdd-executor.md` - implements `tasks.md` phase by phase; the
  contract is law, no scope creep.
- `.claude/agents/sdd-auditor.md` - the final quality gate: verifies compliance
  against all 5 specs, runs the toolchain, and issues a verdict (`APPROVED` /
  `APPROVED WITH RESERVATIONS` / `REJECTED`) in `audit.md`.
- `.claude/agents/sdd-documentation.md` - runs automatically right after a human
  approves the auditor's verdict (never on `REJECTED`, and never as a new blocking
  gate). It updates this repo's own docs to reflect what was actually verified, and
  stamps the shipped spec's `intent.md` with a `Shipped: <date>` header.
- `.claude/skills/sdd-conductor/SKILL.md` - orchestrates the five roles above,
  enforces the three human gates, and never self-approves on the human's behalf.

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

**Currently supported tools:**
- `claude-code` — generates `.claude/agents/<role>.md`, `.claude/skills/sdd-conductor/SKILL.md`

**Tools in progress (planned, not yet implemented):**
- `cursor`, `kiro`, `github-copilot`, `codex` — will generate in their respective directories;
  the CLI recognizes these IDs but reports them as "generator not shipped yet"

The `init` command generates exactly 12 files into the target repository:
- Five role agent files (`.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md`)
- One conductor Skill (`.claude/skills/sdd-conductor/SKILL.md`)
- Five spec-schema templates (`.sdd/spec-schema/{intent,contract,roadmap,tasks,audit}.md`)
- One resolved configuration (`.sdd/harness.json`)

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

```
.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md
.claude/skills/sdd-conductor/SKILL.md
specs/<feature-name>/{intent,contract,roadmap,tasks,audit}.md
templates/{roles,conductor,spec-schema}/
plan.md          # background/vision notes (workshop planning)
AGENTS.md        # tool-agnostic conventions for this repo
CLAUDE.md        # Claude-Code-specific notes; defers to AGENTS.md
```

See `AGENTS.md` for the full conventions this repo follows.
