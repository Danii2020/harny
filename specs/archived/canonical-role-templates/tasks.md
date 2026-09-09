# Tasks: canonical-role-templates

> Granular checklist. Each task maps to a roadmap phase and, through it, to the
> contract items / intent goals that phase serves. Paths are the real target files
> under `templates/`.

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

## Phase 1: Scaffolding & spec-schema extraction
- [x] Task 1.1: Create the directory tree `templates/roles/`, `templates/conductor/`, `templates/spec-schema/` — `templates/`
- [x] Task 1.2: Extract the intent template (headings/placeholders) from the architect prompt, unchanged in shape — `templates/spec-schema/intent.md`
- [x] Task 1.3: Extract the contract template (interfaces, data models, error table, dependencies) — `templates/spec-schema/contract.md`
- [x] Task 1.4: Extract the roadmap template (phases, risk table, File Change Map) — `templates/spec-schema/roadmap.md`
- [x] Task 1.5: Extract the tasks template including the `[ ] [x] [~] [!]` legend — `templates/spec-schema/tasks.md`
- [x] Task 1.6: Extract the audit template (requirements checklist, contract compliance, test coverage, audit log, final verdict) — `templates/spec-schema/audit.md`
- [x] Task 1.7: Verify each schema file is non-empty and structurally identical to the architect's current inline block (C9) — `templates/spec-schema/`

## Phase 2: Reconcile the four existing roles
- [x] Task 2.1: Author sdd-architect — Role Metadata (most-capable; read/write/run-shell/web-search/docs-lookup/task-tracking), reconciled body, reference `spec-schema/` files instead of re-inlining, neutralize project-flavored examples — `templates/roles/sdd-architect.md`
- [x] Task 2.2: Add to sdd-architect the generalized "Project Context" + the Context7-before-pinning docs-lookup rule (R9) — `templates/roles/sdd-architect.md`
- [x] Task 2.3: Author sdd-test-writer — Role Metadata (mid; read/write/run-shell/docs-lookup); preserve red-first ordering, docstring/comment spec linkage, `high-value-tests` portable reference, Context7-before-asserting rule; offline-by-default — `templates/roles/sdd-test-writer.md`
- [x] Task 2.4: Strip test-writer of Vitest/Supabase/`Db`-mock/`CONVENTIONS`/`renderToStaticMarkup` specifics and the hardcoded `.claude/skills/high-value-tests/SKILL.md` path (→ portable reference) — `templates/roles/sdd-test-writer.md`
- [x] Task 2.5: Author sdd-executor — Role Metadata (mid; +web-search/task-tracking); preserve "contract is law"/no-scope-creep, TDD note, final checklist; add Context7 rule — `templates/roles/sdd-executor.md`
- [x] Task 2.6: Author sdd-auditor — Role Metadata (most-capable; read/run-shell/write-audit.md-only); preserve 7-step audit, verdict enum, severity ratings, "report, don't fix"; generalize dependency-diff/offline-test language — `templates/roles/sdd-auditor.md`
- [x] Task 2.7: Confirm all four bodies carry no Claude `tools:`/`model:`/`color:`/`<example>` mechanics and no stack residue (C10, C11) — `templates/roles/` (grep sweep clean; residual `CONVENTIONS` matches are the generic English word "conventions", not the `tests/CONVENTIONS.md` file)

## Phase 3: Author the new sdd-documentation role
- [x] Task 3.1: Write Role Metadata — cheapest tier + explicit `cost_rationale` (synthesis/writing, cheapest in pipeline); capabilities read/write/run-shell; handoff = auto after post-audit gate — `templates/roles/sdd-documentation.md`
- [x] Task 3.2: Write the trigger rule — automatic, non-gated, only on APPROVED / APPROVED WITH RESERVATIONS; does not run on REJECTED — `templates/roles/sdd-documentation.md`
- [x] Task 3.3: Write inputs (5 specs + final verdict + diff) and outputs (README; CHANGELOG in Keep a Changelog style; ARCHITECTURE/AGENTS section if present; in-place `Shipped: <date>` header on `intent.md`, no directory move) — `templates/roles/sdd-documentation.md`
- [x] Task 3.4: Write bootstrap rule (minimal CHANGELOG/ARCHITECTURE if missing), hard rule (only auditor-verified behavior), scope guard (never touch code comments/docstrings), and optional post-run change summary (C7, C14) — `templates/roles/sdd-documentation.md`

## Phase 4: Update the canonical conductor
- [x] Task 4.1: Rewrite the pipeline diagram/description to five roles with the three gates: `architect → [gate] → test-writer → [gate] → executor → auditor → [gate] → documentation` — `templates/conductor/sdd-conductor.md`
- [x] Task 4.2: Add the documentation auto-flow rule — non-gated handoff on approved verdict, then surface the change summary for optional review — `templates/conductor/sdd-conductor.md`
- [x] Task 4.3: Preserve all existing hard rules and the human-gates-vs-auto-flow split; keep post-audit as the third/final human gate (documentation runs after it) — `templates/conductor/sdd-conductor.md`
- [x] Task 4.4: Strip "Claude Code Skill"-only framing and any stack residue; keep the portable "why orchestration lives in the main thread" rationale (C8) — `templates/conductor/sdd-conductor.md`

## Phase 5: Cross-check, portability & traceability sweep
- [x] Task 5.1: Manifest check — all 11 files exist and are non-empty (C15) — `templates/` (verified via `find . -type f` + `find . -type f -size 0`, 11 files, 0 empty)
- [x] Task 5.2: Portability grep sweep — no `opus|sonnet|haiku`, `tools:`, `color:`, `<example>`, `SKILL.md`, `.claude/skills/` as a source of truth (C10); confirm each docs-lookup role carries the Context7 rule (T8) — `templates/` (grep sweep clean; Context7 rule present in sdd-architect.md, sdd-executor.md, sdd-test-writer.md — the three docs-lookup roles)
- [x] Task 5.3: No-drift grep sweep — no `AI Radar|uv |Bedrock|LangGraph|Vitest|Supabase|mr-engine|renderToStaticMarkup|CONVENTIONS` (C11) — `templates/` (grep sweep clean for all drift terms; the case-insensitive `CONVENTIONS` pattern matches only the generic English word "conventions" in sdd-architect.md/sdd-executor.md/sdd-test-writer.md, never the literal `tests/CONVENTIONS.md` filename — confirmed via a separate literal-string grep)
- [x] Task 5.4: Improvement-preservation check — red-first ordering, docstring spec linkage, `high-value-tests` reference, generalized "Project Context" all present (C12) — `templates/roles/` (all four confirmed present in sdd-test-writer.md / sdd-architect.md / sdd-executor.md)
- [x] Task 5.5: Gate + documentation-fidelity check — 3 human gates intact; documentation's 8 requirements all encoded (C13, C14) — `templates/conductor/sdd-conductor.md`, `templates/roles/sdd-documentation.md` (conductor names exactly 3 `HUMAN GATE` markers plus explicit "documentation is not a fourth gate"; all 8 sdd-documentation requirements grep-confirmed)
- [x] Task 5.6: Role Metadata schema consistency check across all 5 role files (required keys, valid enum values) (C2, C3, C4) — `templates/roles/` (all 5 files carry exactly the 7 required keys; cost_tier enum values match the per-role table; capabilities drawn only from the controlled vocabulary)
- [x] Task 5.7: Identify/sweep for dropped Claude-only lines or unresolved items, for the auditor to log formally — `specs/canonical-role-templates/audit.md` (the sweep/identification itself is this role's job and is done: one accidental drop was found — the conductor's human-gates bullet initially lost the source's trailing `Use AskUserQuestion for these.` clause; see Notes below for the fix. The **formal log entry in `audit.md` itself is intentionally NOT written by this role** — `audit.md` is the auditor's file per this feature's own instructions restricting this role from writing to it — so this task is complete for this role's scope, with the finding handed to the auditor to log/confirm.)

## Blocked Items
[None yet]

## Notes
- Deliverable is content (Markdown), so Phase 5 "tests" are structural/grep verification
  checks, not executable unit tests — consistent with audit.md's Test Coverage section.
- The `high-value-tests` skill is intentionally NOT vendored into `templates/`; test-writer
  keeps a portable reference only (contract error-handling row).
- The MCP-provisioning table in contract.md Integration Points is a forward reference only;
  no MCP config files are produced by this feature.
- Do not modify the live `.claude/` instance or `mr-engine-app` — read-only inputs.
- Correction (post-audit, AL-1): an earlier version of this Notes entry claimed nothing
  was dropped during reconciliation. That was inaccurate. One clause WAS silently dropped
  and has since been restored: `templates/conductor/sdd-conductor.md`'s human-gates bullet
  ("Any decision only the human can make: ... or anything ambiguous in the request.")
  originally omitted the source `.claude/skills/sdd-conductor/SKILL.md:35` file's trailing
  clause `Use \`AskUserQuestion\` for these.` — `AskUserQuestion` is a generic tool-call
  convention (not Claude-specific), so the fix was to restore the clause verbatim rather
  than rephrase it. Aside from this one drop-and-restore, every other Claude-Code-only
  mechanic (`tools:`, `model:`, `color:`, `<example>` blocks, the hardcoded
  `.claude/skills/high-value-tests/SKILL.md` path) had a direct generic replacement
  (capabilities list, cost_tier, prose invocation, portable rubric reference) rather than
  being dropped outright. Formal logging of this finding in `audit.md` (if the auditor
  judges it worth a Log entry) remains the auditor's call, not this role's.
- `templates/spec-schema/audit.md` includes a "Final Verdict" section even though the
  architect's own inline `audit.md` template (Step 3d of the architect body) stops after
  "Audit Log" — this follows tasks.md's own Task 1.6 wording, which explicitly lists
  "final verdict" as part of the audit template to extract, and matches the complete
  shape real `audit.md` files take on (including this feature's own `audit.md`). Noted
  as a deliberate resolution of a minor tension between contract.md's "verbatim-in-shape"
  phrasing and tasks.md's explicit Task 1.6 content list — flagging for the auditor.

## Completed
All 5 phases (29 tasks) completed 2026-07-26. All 11 target files under `templates/`
created, non-empty, and passing every Phase 5 sweep (manifest, portability, no-drift,
improvement-preservation, gate + documentation-fidelity, Role Metadata consistency).
