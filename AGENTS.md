# AGENTS.md

Tool-agnostic conventions for this repository. This file is the source of truth
for how this repo works; tool-specific files (e.g. `CLAUDE.md`) should point back
here and add only what's genuinely specific to that tool.

## What this repo is

This is `harny`: a Specification-Driven Development (SDD) pipeline for AI coding
agents, built and proven first on Claude Code, being generalized so the same five
roles can eventually run on other coding-agent tools.

Today, three things exist side by side:

1. A **live pipeline**, instantiated for Claude Code, that you can actually run
   against this or any project (see "The live pipeline" below).
2. A **portable template layer** under `templates/`, which holds the same five
   roles' content in a tool-agnostic form — the canonical source that generators
   read from.
3. A **CLI scaffolder**, `npx harny init`, that reads the portable templates and
   generates a configured pipeline into any target repository (see `README.md`
   for usage). Five per-tool generators ship here: Claude Code, Cursor, Kiro,
   GitHub Copilot, and Codex.

The repo does not yet include a demo application or any publishing/CI tooling.
Those are future work; do not assume they exist.

## The SDD spec schema

Every feature built through this pipeline gets a directory `specs/<feature-name>/`
containing exactly five files:

| File | Purpose |
|---|---|
| `intent.md` | The **why**: problem statement, goals, success criteria, non-goals, constraints |
| `contract.md` | The **what**: interfaces, data models, behavior guarantees, error-handling contract |
| `roadmap.md` | The **how**: implementation phases, dependencies, risk assessment, file-change map |
| `tasks.md` | A granular checklist per roadmap phase, using states `[ ]` not started, `[x]` completed, `[~]` in progress, `[!]` blocked |
| `audit.md` | Requirements checklist, contract-compliance table, test-coverage table, audit log, and a final verdict (`APPROVED` / `APPROVED WITH RESERVATIONS` / `REJECTED`) |

Traceability is mandatory and reflexive: every item in `contract.md` cites the
`intent.md` goal it serves; every item in `tasks.md` cites the `roadmap.md` phase
it belongs to; every item in `audit.md` cites back to `intent.md` or `contract.md`.
Nothing floats without a stated justification.

Once a feature's `audit.md` reaches a final verdict of `APPROVED` or
`APPROVED WITH RESERVATIONS` and a human signs off, the `sdd-documentation` role
runs automatically, updates this repo's docs, and stamps that feature's `intent.md`
with a `Shipped: <date>` header. The spec directory is never moved, renamed, or
deleted — it stays in place as a record of what shipped.

## The `templates/` structure

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

Each file in `templates/roles/` follows one shared, tool-agnostic document schema:

```
# <role-id>

## Role Metadata
- id:             <kebab-case role id>
- purpose:        <one-line description>
- cost_tier:      <most-capable | mid | cheapest>
- cost_rationale: <why this tier>
- capabilities:   <comma-separated subset of: read-files, write-files, run-shell,
                    web-search, docs-lookup, task-tracking>
- invocation:     <when this role should be invoked, in prose>
- handoff:        <what runs before / after this role>

## Role body
<the portable system-prompt instructions for the role>
```

`cost_tier` and `capabilities` are deliberately abstract: a future per-tool
generator is meant to map `cost_tier` to that tool's own model ids and
`capabilities` to that tool's own tool/permission names, rather than any canonical
file hardcoding a Claude Code `tools:` array, a concrete model id, or a
Claude-only path as its only source of truth.

`templates/conductor/sdd-conductor.md` describes the same 5-role, 3-gate pipeline
and the documentation auto-hand-off, without assuming any single tool's package
format (it is plain content, not framed as a Claude Code Skill).

`templates/spec-schema/*.md` are the blank scaffolds the architect role emits for
each of the five spec files, extracted so they exist as a single reusable source
rather than being duplicated inline in the architect's prompt.

## The live pipeline (Claude Code)

The pipeline that actually runs against this repo today lives under `.claude/`:

- `.claude/agents/sdd-architect.md`
- `.claude/agents/sdd-test-writer.md`
- `.claude/agents/sdd-executor.md`
- `.claude/agents/sdd-auditor.md`
- `.claude/agents/sdd-documentation.md`
- `.claude/skills/sdd-conductor/SKILL.md` — orchestrates the four subagents above
  plus documentation, enforcing three human gates (post-specs, post-red-tests,
  post-audit) and never self-approving on the human's behalf.

See `CLAUDE.md` for the Claude-Code-specific details this file deliberately keeps
generic (exact file locations, the fact that orchestration is a Skill rather than
a subagent).

## Working conventions

- Treat `contract.md` as law during implementation: no scope creep beyond what a
  feature's contract specifies.
- Default to test-first (red phase before green phase) unless a feature's roadmap
  says otherwise.
- The three human gates (post-specs, post-red-tests, post-audit) are not
  optional; the documentation hand-off after an approved audit is the one
  automatic, non-gated step in the pipeline.
- Read this file (or the target tool's equivalent conventions doc) before
  exploring a new codebase as part of any SDD role.
