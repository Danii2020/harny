# Roadmap: canonical-role-templates

> Phases are ordered so shared artifacts exist before the files that reference them
> (spec-schema before the architect that points at it) and so the net-new,
> highest-risk role (documentation) and the conductor rewrite come after the
> mechanical reconciliations. Each phase cites the contract items / intent goals it
> satisfies.

## Implementation Phases

### Phase 1: Scaffolding & spec-schema extraction
**Goal**: Create the `templates/` tree and extract the five spec-schema templates that
currently live inlined inside the architect prompt, so later phases can reference a
single source. (Contract: file manifest, Spec-schema content contract; G1, G6)
**Dependencies**: None
**Estimated complexity**: Low

1. Create `templates/roles/`, `templates/conductor/`, `templates/spec-schema/`.
2. Extract the `intent.md` template body (headings/placeholders) from the architect
   prompt into `templates/spec-schema/intent.md`, unchanged in shape.
3. Do the same for `contract.md`, `roadmap.md`, `tasks.md`, `audit.md`.
4. Verify each schema file is non-empty and structurally identical to the architect's
   current inline block (headings, tables, the tasks legend `[ ] [x] [~] [!]`).

### Phase 2: Reconcile the four existing roles
**Goal**: Produce canonical, portable, drift-free bodies for architect, test-writer,
executor, auditor — preserving verified improvements, stripping tool/stack residue,
and adding the tool-agnostic Role Metadata block + Context7 docs-lookup rule.
(Contract: canonical role-file document schema, controlled vocabularies, per-role
content table, docs-lookup content rule; G2, G3)
**Dependencies**: Phase 1
**Estimated complexity**: Medium

1. Author `templates/roles/sdd-architect.md`: Role Metadata (most-capable; read/write/
   run-shell/web-search/docs-lookup/task-tracking), reconciled body, reference the
   `spec-schema/` files instead of re-inlining, neutralize project-flavored examples,
   add the Context7-before-pinning rule.
2. Author `templates/roles/sdd-test-writer.md`: Role Metadata (mid; read/write/
   run-shell/docs-lookup), preserve red-first ordering + docstring spec linkage +
   `high-value-tests` portable reference + Context7-before-asserting rule, strip
   Vitest/Supabase/`Db`/CONVENTIONS specifics.
3. Author `templates/roles/sdd-executor.md`: Role Metadata (mid; +web-search/
   task-tracking), preserve "contract is law"/TDD/final checklist, add Context7 rule.
4. Author `templates/roles/sdd-auditor.md`: Role Metadata (most-capable; read/run-shell/
   write-audit.md-only), preserve 7-step audit + verdict enum + severity + "report,
   don't fix", generalize dependency-diff/offline-test language.
5. Confirm no Claude `tools:`/`model:`/`color:`/`<example>` mechanics and no stack
   residue remain in any of the four.

### Phase 3: Author the new sdd-documentation role
**Goal**: Create `templates/roles/sdd-documentation.md` encoding all 8 fixed
requirements. (Contract: sdd-documentation content contract, Documentation-fidelity
invariant; G4)
**Dependencies**: Phase 1 (schema exists), Phase 2 (matches the other roles' shape)
**Estimated complexity**: Medium

1. Write Role Metadata: cheapest tier + explicit `cost_rationale` (synthesis/writing,
   cheapest tier in the pipeline — the 3-tier cost argument); capabilities read/write/
   run-shell; handoff = auto after post-audit gate.
2. Write the trigger rule: automatic, non-gated, only on APPROVED / APPROVED WITH
   RESERVATIONS; does not run on REJECTED.
3. Write inputs (5 specs + final verdict + diff) and outputs (README; CHANGELOG in Keep
   a Changelog style; ARCHITECTURE/AGENTS section if present; in-place `Shipped: <date>`
   header on `intent.md`, no directory move).
4. Write bootstrap rule (create minimal CHANGELOG/ARCHITECTURE if missing), the hard
   rule (only auditor-verified behavior), the scope guard (never touch code comments/
   docstrings), and the optional post-run change summary.

### Phase 4: Update the canonical conductor
**Goal**: Rewrite `templates/conductor/sdd-conductor.md` to orchestrate all five roles
with the documentation auto-flow, keeping the three human gates unchanged. (Contract:
Conductor content contract, Gate invariant; G5)
**Dependencies**: Phase 3 (documentation role exists to hand off to)
**Estimated complexity**: Medium

1. Update the pipeline diagram/description to five roles:
   `architect → [gate] → test-writer → [gate] → executor → auditor → [gate] → documentation`.
2. Add the documentation auto-flow rule (non-gated handoff on approved verdict; then
   surface the change summary for optional review).
3. Preserve all existing hard rules and the human-gates-vs-auto-flow split; keep the
   post-audit gate as the third and final human gate (documentation runs after it).
4. Strip "Claude Code Skill"-only framing and any stack residue; keep the portable
   "why orchestration lives in the main thread" rationale.

### Phase 5: Cross-check, portability & traceability sweep
**Goal**: Verify the whole `templates/` output against every behavior guarantee before
handoff. (Contract: all 7 Behavior Guarantees, error-handling rows; G1–G7)
**Dependencies**: Phases 1–4
**Estimated complexity**: Low

1. Manifest check: all 11 files exist and are non-empty (Manifest-completeness).
2. Portability sweep: grep for `opus|sonnet|haiku`, `tools:`, `color:`, `<example>`,
   `SKILL.md`, `.claude/skills/` — none present as a source of truth (Portability
   invariant); confirm every `docs-lookup` role carries the Context7 rule.
3. No-drift sweep: grep for `AI Radar|uv |Bedrock|LangGraph|Vitest|Supabase|mr-engine|
   renderToStaticMarkup|CONVENTIONS` — none present (No-drift invariant).
4. Improvement-preservation check: red-first ordering, docstring spec linkage,
   `high-value-tests` reference, generalized "Project Context" all present.
5. Gate + documentation-fidelity check: 3 human gates intact; documentation's 8
   requirements all encoded.
6. Note any dropped-Claude-only lines or unresolved items in `audit.md` per the
   error-handling contract.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Residual stack/tool drift slips through (Vitest, Supabase, model IDs) | Med | High | Phase 5 explicit grep sweeps for a fixed residue word list |
| Over-generalizing loses a concrete, useful instruction (e.g. the Context7 verify rule becomes vague) | Med | Med | Per-role table names the exact rules to preserve; docs-lookup content rule pins the Context7 phrasing |
| sdd-documentation drifts from the fixed 8-point design | Low | High | Contract enumerates all 8; Phase 5 checks each; design is not open to redesign |
| Schema extraction and architect body diverge (two contradictory copies) | Low | Med | Architect references `spec-schema/` files rather than re-inlining (Phase 2.1) |
| Conductor edit accidentally adds/removes a human gate | Low | High | Gate invariant + Phase 5.5 explicit 3-gate check; documentation added strictly as auto-flow |
| Role Metadata schema inconsistent across the 5 files | Med | Med | Single documented schema in contract; Phase 3.1 mirrors Phase 2 shape |

## File Change Map

- `templates/spec-schema/intent.md` — CREATE — extracted intent template (Phase 1)
- `templates/spec-schema/contract.md` — CREATE — extracted contract template (Phase 1)
- `templates/spec-schema/roadmap.md` — CREATE — extracted roadmap template (Phase 1)
- `templates/spec-schema/tasks.md` — CREATE — extracted tasks template (Phase 1)
- `templates/spec-schema/audit.md` — CREATE — extracted audit template (Phase 1)
- `templates/roles/sdd-architect.md` — CREATE — reconciled architect (Phase 2)
- `templates/roles/sdd-test-writer.md` — CREATE — reconciled test-writer (Phase 2)
- `templates/roles/sdd-executor.md` — CREATE — reconciled executor (Phase 2)
- `templates/roles/sdd-auditor.md` — CREATE — reconciled auditor (Phase 2)
- `templates/roles/sdd-documentation.md` — CREATE — new documentation role (Phase 3)
- `templates/conductor/sdd-conductor.md` — CREATE — canonical 5-role conductor (Phase 4)

No existing files are modified; the live `.claude/` instance and `mr-engine-app` remain
untouched (read-only inputs). All changes are additive under `templates/` (plus this
feature's own `specs/canonical-role-templates/` spec set).
