# Audit: Test Tiers

## Requirements Checklist
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | Tests proposed at the tier suited to the feature (unit / integration / e2e), each justified by spec ids | intent.md G1, SC5 | PENDING | Prompt-level. Shipping verified by T3, T4. Runtime behavior by M1, M2 |
| R2 | Frameworks inferred per tier from repository evidence, never hard-coded; frameworks only as attributed examples | intent.md G2, SC5 | PENDING | Runtime behavior by M1, M4. S7 checked by reading |
| R3 | Propose, then confirm, then write: routed through the orchestrator when delegated, inline when direct, skipped for unit-only with no setup | intent.md G3, SC5, SC6 | PENDING | T4 coupling. Runtime behavior by M1–M4 |
| R4 | Rubric shipped as a bundled `harny-test` resource to all five tools; the dangling `high-value-tests` skill reference is gone | intent.md G4, SC1, SC2, SC3 | PENDING | T1, T2, T6, T7 |
| R5 | Skill and role cite the rubric identically; the role's vendoring conditional is removed | intent.md G4, G5, SC4 | PENDING | T3 |
| R6 | Exactly three human gates; the checkpoint is conditional and not a gate | intent.md G5, SC7 | PENDING | T5 |
| R7 | All five tools render the changes; no `src/` change; vendor limits respected | intent.md G5, SC8 | PENDING | T9, T11 |
| R8 | Suite green; counts, manifest and goldens updated, with only the contracted golden files changed | intent.md SC9 | PENDING | T9, T10, T11, T12 |
| R9 | Manual walkthroughs recorded before 2026-09-27 | intent.md G6, SC10 | PENDING | M1–M4 |
| R10 | Dogfood copies untouched (`.agents/`, `.claude/`) | intent.md § Non-Goals | PENDING | T8, plus a `git status` check |

## Contract Compliance
| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | TT-1 rubric ships to every skill root of every tool | PENDING | T1, T10 |
| C2 | TT-2 rubric content and pinned section structure | PENDING | T6 (structure); reading (content) |
| C3 | TT-3 rubric neutrality, no frontmatter, no `'''` | PENDING | T6, T7 |
| C4 | TT-4 no dangling skill or resource references in the shipped tree | PENDING | T2 |
| C5 | TT-5 skill and role cite the rubric identically; conditional removed | PENDING | T3 |
| C6 | TT-6 tier selection from the closed vocabulary with rationale | PENDING | Reading; M1, M2 |
| C7 | TT-7 framework inference with cited evidence and exact setup | PENDING | Reading; M1, M4 |
| C8 | TT-8 Test Plan recorded only in `audit.md` § Test Coverage, pinned shape | PENDING | Reading; M1 |
| C9 | TT-9 exact confirmation rule (non-unit tier, or any setup) | PENDING | Reading; M1, M2 |
| C10 | TT-10 stop (delegated) or ask inline (direct) | PENDING | Reading; M1, M3 |
| C11 | TT-11 only a human confirms; edits that add setup re-propose | PENDING | Reading; M1, M4 |
| C12 | TT-12 setup limited to the confirmed "Setup needed" entries | PENDING | Reading; M1, M4 |
| C13 | TT-13 default run offline; existing rules preserved | PENDING | Reading; M1 |
| C14 | TT-14 per-tier red status, never claimed without a run | PENDING | Reading; M1 |
| C15 | TT-15 conductor verifies `PROPOSED`, asks, and relays to the same role | PENDING | Reading; M1 |
| C16 | TT-16 exactly three gates; checkpoint is not a gate; rules #1–#5 intact | PENDING | T5; reading |
| C17 | TT-17 protocol tokens identical in skill, role and conductor | PENDING | T4 |
| C18 | TT-18 post-red-tests gate shows tiers and per-tier red status | PENDING | Reading; M1 |
| C19 | TT-19 `harny-test` shape contract, `allowed-tools` unchanged, version "2.0" | PENDING | Existing `tests/skills-templates.test.ts` shape tests; existing D1 test in `tests/skills-fidelity.test.ts`; reading |
| C20 | TT-20 role metadata unchanged except `invocation`/`handoff`; renders on all five tools | PENDING | Existing T40 / Task 4.1 fidelity tests and five-tool e2e (T9) |
| C21 | TT-21 no `src/`, `bin/` or `package.json` change; no new dependency (S4) | PENDING | Existing `tests/packaging.test.ts` dependency guard; `git status` |
| C22 | TT-22 dogfood untouched; divergence declared | PENDING | T8 |
| C23 | TT-23 install counts and packaging manifest | PENDING | T9, T11 |
| C24 | TT-24 only the five contracted golden paths per tree change; T41 allowlist | PENDING | T12, T13 |
| C25 | TT-25 runtime behavior verified manually, remainder carried as TT-R1 | PENDING | M1–M4; Final Verdict |

## Test Coverage
| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Each of the five tools, installed alone, writes every `harny-test` file (including `high-value-tests.md`) under its own skill root, byte-equal to the template | PENDING | `tests/skills-placement.test.ts` |
| T2 | In a real five-tool `--skills all` install, every "`<name>` skill" reference resolves to a shipped skill, and every bundled `.md` reference in a `SKILL.md` exists beside it | PENDING | `tests/skill-references.test.ts` |
| T3 | Every rubric citation in the skill and the role names an existing rubric heading; each cites "The one question" and "Picking the right tier"; the role no longer carries the vendoring conditional | PENDING | `tests/test-writer-templates.test.ts` |
| T4 | The awaiting marker and the three plan-status values appear identically in the skill, the role and the conductor | PENDING | `tests/test-writer-templates.test.ts` |
| T5 | The conductor's pipeline diagram has exactly three human gates, and the three pre-existing load-bearing phrases survive | PENDING | `tests/test-writer-templates.test.ts` |
| T6 | The rubric has one H1, the five pinned H2 headings in order, and no frontmatter | PENDING | `tests/test-writer-templates.test.ts` |
| T7 | The rubric carries none of the dogfood domain residue | PENDING | `tests/skills-templates.test.ts` |
| T8 | `harny-test` is a declared divergence: the dangling-skill sentence is absent from the shipped copy and the new rubric and marker are present, both checked against the dogfood oracle | PENDING | `tests/skills-fidelity.test.ts` |
| T9 | Install counts rise by one per skill root across the single-tool, five-tool and `--skills` scenarios | PENDING | `tests/e2e-init.test.ts` |
| T10 | The default skill-library path list includes the rubric in every single-tool scenario | PENDING | `tests/e2e-init.test.ts` |
| T11 | The npm package includes the rubric | PENDING | `tests/packaging.test.ts` |
| T12 | The `monorepo-mode` golden trees match the built CLI, with only the five contracted paths regenerated per tree | PENDING | `tests/e2e-init.test.ts` (existing golden test; fixtures regenerated) |
| T13 | The templates non-mutation guard allows the contracted role edit | PENDING | `tests/canonical-fidelity.test.ts` |

**Manual verification (not automatable, contract TT-25; deadline 2026-09-26):**

| ID | Walkthrough | Status | Evidence |
|---|---|---|---|
| M1 | Delegated conductor flow on a frontend+API sample. The plan proposes unit, integration and e2e with evidence and exact e2e setup. The report begins with the marker. No test or manifest change before confirmation. The conductor asks, relays an edit, and the same role resumes, confirms, sets up and writes. The post-red-tests gate shows per-tier status | PENDING | |
| M2 | Unit-only pure-logic feature: `NOT REQUIRED (unit-only, no setup)`, no marker, no pause | PENDING | |
| M3 | Direct `harny-test` invocation: proposes inline, asks, waits, then proceeds in the same conversation | PENDING | |
| M4 | Missing framework: manifest and lockfile byte-unchanged before confirmation. Declining e2e drops it and installs nothing | PENDING | |

## Audit Log
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-24 | sdd-architect (planned, pre-implementation) | **TT-R1, planned reservation.** Tier inference, the confirmation rule, stop/ask behavior, setup scope and per-tier red reporting are prompt instructions. No automated test can prove an agent follows them. Evidence is limited to M1–M4 on one tool (Claude Code, plus an optional second) | MEDIUM (design, deliberate) | Carry forward unless M1–M4 all pass. Even then, carry forward as LOW |
| 2026-09-24 | sdd-architect (planned, pre-implementation) | **TT-R2, planned reservation.** Checkpoint routing (resume versus fresh invocation, the ask-the-human mechanism) is not walked through on Cursor, Kiro, GitHub Copilot or Codex. This has the same class as tool-generators AL-30 and CG-1 | MEDIUM (open, human-gated) | Carry forward |
| 2026-09-24 | sdd-architect (planned, pre-implementation) | **TT-R3, planned reservation.** The dogfood `harny-test` (which this repo's own pipeline runs) intentionally lacks the tier flow and still points at the dogfood-only `high-value-tests` skill. This is declared in `DIVERGENCE_TABLE` | LOW (design, deliberate) | Carry forward. A future dogfood-sync feature may close it |

## Final Verdict
_(to be completed by the auditing role)_

**Status**: PENDING

**Summary**:

**Critical Issues** (must fix before merge):

**Warnings** (should fix, not blocking):

**Recommendations** (nice to have):
