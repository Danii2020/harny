# Intent: canonical-role-templates

Shipped: 2026-07-26

## Problem Statement

The 5-role Specification-Driven Development (SDD) pipeline (architect → test-writer
→ executor → auditor, orchestrated by a conductor) only exists today as
**Claude-Code-specific** files, and in **two divergent copies**:

1. The **production source of truth** in `mr-engine-app/.claude/` — battle-tested,
   but with wording and pipeline order that predate later improvements (e.g.
   test-writer runs *after* the executor; contract IDs embedded in test names).
2. **This repo's `.claude/` draft** — started as a copy of (1), then had an
   unrelated project's specifics ("AI Radar": Python/uv/Bedrock/LangGraph) pasted
   in and later stripped back out. Along the way it also picked up genuine
   improvements (TDD red-first ordering, a `high-value-tests` rubric reference,
   docstring-based spec linkage) — but it is still shaped as Claude Code agents
   (YAML `tools:` lists, `model: opus/sonnet/haiku`, `<example>` blocks).

`create-sdd-harness` is meant to generate this pipeline for **five** coding-agent
tools (Claude Code, Cursor, Kiro, GitHub Copilot, Codex CLI), four of which use
Markdown+frontmatter and one (Codex) uses TOML. That is impossible while the only
"source" for each role is (a) duplicated, (b) drifted, and (c) welded to Claude
Code's own mechanics. Additionally, the pipeline's designed 5th role,
**sdd-documentation**, does not exist in either copy.

Whoever builds the CLI/generators next (and every downstream per-tool wrapper) is
blocked until there is exactly one **canonical, tool-agnostic** body of content per
role, per the conductor, and per the spec schema.

## Goals

1. Produce a single canonical `templates/` tree at repo root containing tool-agnostic
   content for the full **5-role** pipeline (`roles/`), the orchestration logic
   (`conductor/`), and the shared spec schema (`spec-schema/`).
2. Reconcile the two source copies into each canonical role: **preserve** the repo
   draft's genuine improvements (TDD red-first ordering, `high-value-tests`
   reference, docstring/comment-based spec linkage, generalized "Project Context")
   while **removing** anything still stack-specific or drifted from the production
   source.
3. Make the content **portable** — no Claude-Code-only mechanics baked in as the sole
   source of truth. Represent "what model quality this role needs" as an abstract
   **cost tier** and "what this role is allowed to do" as an abstract **capabilities**
   list, so a later per-tool wrapper can map both to each tool's own model IDs and
   tool names (4 Markdown adapters + 1 TOML adapter).
4. Design and author the new **sdd-documentation** role to the fixed requirements
   already agreed with the user (cheapest cost tier; automatic non-gated handoff after
   an approved audit; documents only what the auditor verified; updates
   README/CHANGELOG/ARCHITECTURE and stamps the spec in place).
5. Update the canonical **conductor** content to orchestrate all five roles, adding
   the documentation auto-flow handoff while leaving the three existing human gates
   (post-specs, post-red-tests, post-audit) unchanged.
6. Extract the spec-schema file templates (`intent/contract/roadmap/tasks/audit`),
   currently inlined inside the architect's prompt, into standalone reusable schema
   files under `spec-schema/`.
7. Apply the pipeline's own traceability discipline **reflexively** to this feature's
   specs: every contract item traces to a goal here; every task traces to a roadmap
   phase; every audit item traces to intent or contract.

## Success Criteria

- [ ] `templates/roles/` contains all five role files: `sdd-architect.md`,
      `sdd-test-writer.md`, `sdd-executor.md`, `sdd-auditor.md`, `sdd-documentation.md`.
- [ ] `templates/conductor/` contains canonical conductor content describing the
      5-role pipeline, the 3 unchanged human gates, and the documentation auto-flow
      (non-gated) handoff — with no dependency on "Claude Code Skill" as a format.
- [ ] `templates/spec-schema/` contains `intent.md`, `contract.md`, `roadmap.md`,
      `tasks.md`, `audit.md` as standalone schema/template files, matching the
      structure the architect currently emits.
- [ ] No canonical file hardcodes a Claude-Code `tools:` list, a concrete model ID
      (`opus`/`sonnet`/`haiku`), or a Claude-only path (e.g.
      `.claude/skills/high-value-tests/SKILL.md`) as its only source of truth; each
      role instead declares an abstract cost tier and capability set.
- [ ] Every canonical role preserves the repo draft's verified improvements:
      test-writer red-first ordering, docstring/comment spec linkage (not contract IDs
      in test names), the `high-value-tests` rubric reference, and the generalized
      "Project Context" — with no "AI Radar"/Python-uv-Bedrock residue and no
      `mr-engine-app`/Vitest/Supabase residue.
- [ ] `sdd-documentation.md` encodes every fixed requirement: cheapest cost tier with
      a stated cost rationale; automatic post-audit handoff triggered only on APPROVED
      / APPROVED WITH RESERVATIONS; inputs = 5 specs + final verdict + the diff;
      outputs = README/CHANGELOG (Keep a Changelog)/ARCHITECTURE-or-AGENTS updates +
      in-place `Shipped: <date>` header on `intent.md`; bootstraps missing
      CHANGELOG/ARCHITECTURE; documents only auditor-verified behavior; never touches
      code comments/docstrings; presents a post-run change summary for optional review.
- [ ] The content is generic across stacks and tools — examples and phrasing name no
      specific product, language, package manager, or single agent tool as the only
      possibility.

## Non-Goals

- Building any CLI, `harness init` prompts, template/prompt engine, or per-tool
  generator code (`claude-code`, `cursor`, `kiro`, `github-copilot`, `codex`) — that
  is explicitly future work.
- Authoring the actual per-tool wrappers (YAML frontmatter, `.agent.md`, TOML) or
  resolving each tool's exact model-ID mapping / capability-name mapping.
- The `templates/agnostic-layer/` content (CI, git hooks, gitleaks) from plan v1.
- Modifying, deleting, or "fixing" this repo's live `.claude/` instance or the
  `mr-engine-app` source files — they are read-only inputs here.
- Building `sdd-harness-demo` or any demo application.
- Adding the `high-value-tests` skill itself to `templates/` (out of scope for this
  feature's target structure); only the canonical *reference* to it inside
  test-writer is in scope, expressed portably.

## Constraints

- Output is **pure content** — Markdown files under `templates/` only. No executable
  code, no build tooling.
- Must conform to the vocabulary and structure fixed in `plan.md` (role names, the
  5-file spec schema, the 3 human gates, the model/cost-tier strategy).
- The three existing human gates (post-specs, post-red-tests, post-audit) must remain
  exactly as they are; documentation is an **automatic** handoff, not a fourth gate.
- The `sdd-documentation` design is **fixed** (agreed with the user) and not open to
  redesign in this feature.
- Canonical content must not assume any one target tool's frontmatter keys, tool
  names, or model IDs are the universal representation.
- Traceability discipline applies to this feature's own specs (reflexive rule).

## Prior Art

- Production source of truth: `mr-engine-app/.claude/agents/sdd-architect.md`,
  `sdd-test-writer.md`, `sdd-executor.md`, `sdd-auditor.md`, and
  `.claude/skills/sdd-conductor/SKILL.md`.
- This repo's drifted-then-cleaned draft: `.claude/agents/sdd-*.md`,
  `.claude/skills/sdd-conductor/SKILL.md`, and `.claude/skills/high-value-tests/SKILL.md`.
- `plan.md` (repo root) — the project plan: the 5→6 role table, the pipeline/gates
  diagram, the spec-schema definition, the `sdd-documentation` proposal, and the
  per-tool portability matrix (Section 3) that this canonical layer must serve.
