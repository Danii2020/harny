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

These templates exist so that the same five roles can eventually be adapted to
other coding-agent tools without re-deriving the pipeline from scratch. That
adaptation work (a CLI, per-tool generators, a demo app) is not part of this repo
yet - `templates/` is the groundwork for it, not a finished product.

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
