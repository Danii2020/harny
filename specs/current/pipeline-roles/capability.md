# Capability: pipeline-roles

> Last synced: 2026-09-08. Owned artifacts: `templates/roles/*.md`,
> `templates/conductor/sdd-conductor.md`, `.claude/agents/sdd-*.md`,
> `.claude/skills/sdd-conductor/SKILL.md`, the cost-tier and capability
> vocabularies, the three human gates.

## Purpose

The five SDD pipeline roles (architect, test-writer, executor, auditor,
documentation), their portable content contract, and the conductor that
sequences them behind three human gates.

## Current behavior

| ID | Statement | Provenance |
|---|---|---|
| PR-1 | The pipeline has five roles — `sdd-architect`, `sdd-test-writer`, `sdd-executor`, `sdd-auditor`, `sdd-documentation` — each with a `cost_tier` (`most-capable` \| `mid` \| `cheapest`) and a `capabilities` set drawn from a 6-token vocabulary: `read-files`, `write-files`, `run-shell`, `web-search`, `docs-lookup`, `task-tracking` | canonical-role-templates · contract.md § "Public API — the templates/ file manifest"; § "Data Model — controlled vocabularies" |
| PR-2 | `cost_tier` maps: architect and auditor → `most-capable`; test-writer and executor → `mid`; documentation → `cheapest` | canonical-role-templates · contract.md § "Per-role content contract"; audit.md C3 |
| PR-3 | No canonical role file names a Claude-Code `tools:` array, a concrete model id, or a Claude-only path as its sole source of truth — model need is expressed only as `cost_tier`, permissions only as `capabilities` | canonical-role-templates · contract.md Behavior Guarantee 1 ("Portability invariant") |
| PR-4 | A role that declares `docs-lookup` (architect, executor, test-writer) must instruct verifying library/API usage via Context7 (or the target tool's equivalent docs-lookup MCP) before pinning a signature, contract, or test against it — never trusting memory | canonical-role-templates · contract.md § "Docs-lookup content rule"; audit.md R9 |
| PR-5 | `sdd-documentation` runs as an automatic, non-gated hand-off immediately after a human approves the auditor's verdict (`APPROVED` or `APPROVED WITH RESERVATIONS`, never `REJECTED`); it updates `README.md`, `CHANGELOG.md` (Keep a Changelog style), and `ARCHITECTURE.md`/`AGENTS.md`, then stamps `Shipped: <date>` on `intent.md` | canonical-role-templates · contract.md § "sdd-documentation content contract — fixed design" |
| PR-6 | The conductor (`sdd-conductor`) enforces exactly three human gates — post-specs, post-red-tests, post-audit — and never self-approves an agent's output on the human's behalf | canonical-role-templates · contract.md § "Conductor content contract"; audit.md C13 |
| PR-7 | In tool-neutral content, no single tool's mechanic (e.g. a Claude-only tool name) may be the only possibility named — the behavior must be stated generically first, with the tool name kept only as an attributed example | canonical-role-templates · audit.md AL-9 (a regression that was introduced, caught, and fixed within the same feature) |
| PR-8 | **(this feature)** Each role's full instruction set has been extracted into an action-shaped `harny-*` skill (`harny-propose`, `harny-test`, `harny-implement`, `harny-audit`, `harny-document`); the five `.claude/agents/sdd-*.md` files are now frontmatter plus a ≤25-line pointer body naming the skill(s) they preload via `skills:` | sdd-skill-library · contract.md § "Thin agent file shape" |
| PR-9 | **(this feature)** The conductor is unaffected by the skill extraction: it still addresses the five roles by their unchanged `name:` values, keeps its three gates in the same positions, and is not itself moved, renamed, or converted into a `harny-*` skill | sdd-skill-library · contract.md Behavior Guarantee 6; Integration Points |

## Invariants

1. `cost_tier` and `capabilities` stay abstract vocabulary — a per-tool generator maps them to that tool's real model ids and permission names; no canonical role file may hardcode a tool-specific value as its only source of truth (breaking this reopens `canonical-role-templates` AL-9's regression class).
2. The three human gates' count and order are fixed; adding, removing, or relocating one is a pipeline-behavior change, not a content change.
3. A role's `name:` value is load-bearing — the conductor addresses subagents by name, so renaming one silently breaks orchestration.

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| AL-7 | Scoped write access (e.g. the auditor's `write-files (audit.md only)`) is expressed as a free-text parenthetical inside an otherwise pure capability token list, rather than a structured field a strict parser could rely on | LOW | canonical-role-templates · audit.md AL-7 |
| ask-human-token | The `capabilities` vocabulary has no token backing the conductor's most important behavior — pausing for a human at the three gates — while `docs-lookup` does have a token for its own concern | LOW | canonical-role-templates · audit.md Final Verdict "Recommendations" |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| canonical-role-templates | 2026-07-26 | The five roles' portable content contract, the cost-tier/capability vocabularies, the conductor's content contract |
| sdd-skill-library | (this feature) | Extraction of each role's instructions into a `harny-*` skill; the thinned agent-file shape |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| (none yet — see `skill-library/capability.md` for this feature's ADRs) | | |
