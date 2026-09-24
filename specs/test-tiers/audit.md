# Audit: Test Tiers

## Requirements Checklist
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | Tests proposed at the tier suited to the feature (unit / integration / e2e), each justified by spec ids | intent.md G1, SC5 | PENDING | Prompt-level. Shipping verified by T3, T4. Runtime behavior by M1, M2 |
| R2 | Frameworks inferred per tier from repository evidence, never hard-coded; frameworks only as attributed examples | intent.md G2, SC5 | PENDING | Runtime behavior by M1, M4. S7 checked by reading |
| R3 | Propose, then confirm, then write: routed through the orchestrator when delegated, inline when direct, skipped only for unit-only **with no setup**; any setup asks, even when unit-only (the human's answer to Q1) | intent.md G3, SC5, SC6 | PENDING | T4 coupling. Runtime behavior by M1–M4 |
| R4 | Rubric shipped as a bundled `harny-test` resource to all five tools; the dangling `high-value-tests` skill reference is gone | intent.md G4, SC1, SC2, SC3 | PENDING | T1, T2, T6, T7 |
| R5 | Skill and role cite the rubric identically; the role's vendoring conditional is removed | intent.md G4, G5, SC4 | PENDING | T3 |
| R6 | Exactly three human gates; the checkpoint is conditional and not a gate | intent.md G5, SC7 | PENDING | T5 |
| R7 | All five tools render the changes; no `src/` change; vendor limits respected | intent.md G5, SC8 | PENDING | T9, T11 |
| R8 | Suite green; counts, manifest and goldens updated, with only the contracted golden files changed | intent.md SC9 | PENDING | T9, T10, T11, T12 |
| R9 | Manual walkthroughs on Claude Code recorded before 2026-09-27 | intent.md G6, SC10 | PENDING | M1–M5 |
| R10 | Dogfood copies untouched (`.agents/`, `.claude/`) | intent.md § Non-Goals | PENDING | T8, plus a `git status` check |
| R11 | The auditor takes tiers into account: it reads the plan, records Tier Results and raises tier findings in the existing buckets | intent.md G7, SC11 | PENDING | T14, T15, T8; runtime behavior by M5 |
| R12 | All five tools receive the updated test-writer, auditor, conductor and skills | intent.md SC12 | PENDING | T1, T16 |

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
| C19 | TT-19 `harny-test` shape contract, `allowed-tools` unchanged, version "1.1" | PENDING | Existing `tests/skills-templates.test.ts` shape tests; existing D1 test in `tests/skills-fidelity.test.ts`; reading |
| C20 | TT-20 role metadata unchanged except `invocation`/`handoff`; renders on all five tools | PENDING | Existing T40 / Task 4.1 fidelity tests and five-tool e2e (T9) |
| C21 | TT-21 no `src/`, `bin/` or `package.json` change; no new dependency (S4) | PENDING | Existing `tests/packaging.test.ts` dependency guard; `git status` |
| C22 | TT-22 dogfood untouched; divergence declared | PENDING | T8 |
| C23 | TT-23 install counts and packaging manifest | PENDING | T9, T11 |
| C24 | TT-24 only the seven contracted golden paths per tree change (12 modified, 2 created in total); T41 allowlist (test-writer and auditor roles) | PENDING | T12, T13 |
| C25 | TT-25 runtime behavior verified manually on Claude Code, remainder carried as TT-R1 and TT-R2 | PENDING | M1–M5; Final Verdict |
| C26 | TT-26 auditor reads the Test Plan and writes `### Tier Results` in the pinned shape and location, within `audit.md` only | PENDING | T8 (needle); reading; M5 |
| C27 | TT-27 per-tier checks: tests exist, listed ids covered at that tier, setup equals the plan, tier run or `not run: <reason>` | PENDING | Reading; M5 |
| C28 | TT-28 tier findings mapped to existing buckets, identical in skill and role | PENDING | T15; reading; M5 |
| C29 | TT-29 `harny-audit` shape kept, version "1.1", `allowed-tools`/`harny-writes` unchanged; role metadata unchanged | PENDING | Existing shape and D1 tests; existing T40 role-fidelity tests; reading |
| C30 | TT-30 all five generators' test-writer, auditor and conductor artifacts carry the protocol tokens; every install carries the updated skills | PENDING | T16, T1 |

## Test Coverage
| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Each of the five tools, installed alone, writes every `harny-test` file (including `high-value-tests.md`) under its own skill root, byte-equal to the template | PENDING | `tests/skills-placement.test.ts` |
| T2 | In a real five-tool `--skills all` install, every "`<name>` skill" reference resolves to a shipped skill, and every bundled `.md` reference in a `SKILL.md` exists beside it | PENDING | `tests/skill-references.test.ts` |
| T3 | Every rubric citation in the skill and the role names an existing rubric heading; each cites "The one question" and "Picking the right tier"; the role no longer carries the vendoring conditional | PENDING | `tests/test-writer-templates.test.ts` |
| T4 | The awaiting marker and the three plan-status values appear identically in the test-writer skill and role, the conductor, and the auditor skill and role | PENDING | `tests/test-writer-templates.test.ts` |
| T5 | The conductor's pipeline diagram has exactly three human gates, and the three pre-existing load-bearing phrases survive | PENDING | `tests/test-writer-templates.test.ts` |
| T6 | The rubric has one H1, the five pinned H2 headings in order, and no frontmatter | PENDING | `tests/test-writer-templates.test.ts` |
| T7 | The rubric carries none of the dogfood domain residue | PENDING | `tests/skills-templates.test.ts` |
| T8 | `harny-test` and `harny-audit` are declared divergences: the dangling-skill sentence is absent from shipped `harny-test`, and the rubric, the marker and `### Tier Results` are present in the shipped copies, all checked against the dogfood oracle | PENDING | `tests/skills-fidelity.test.ts` |
| T9 | Install counts rise by one per skill root across the single-tool, five-tool and `--skills` scenarios | PENDING | `tests/e2e-init.test.ts` |
| T10 | The default skill-library path list includes the rubric in every single-tool scenario | PENDING | `tests/e2e-init.test.ts` |
| T11 | The npm package includes the rubric | PENDING | `tests/packaging.test.ts` |
| T12 | The `monorepo-mode` golden trees match the built CLI, with only the seven contracted paths regenerated per tree | PENDING | `tests/e2e-init.test.ts` (existing golden test; fixtures regenerated) |
| T13 | The templates non-mutation guard allows the two contracted role edits | PENDING | `tests/canonical-fidelity.test.ts` |
| T14 | The auditor skill and role both name `### Tier Results` and carry the protocol tokens (part of T4's five-file coupling) | PENDING | `tests/test-writer-templates.test.ts` |
| T15 | The auditor skill and role list the same tier conditions at the same severities, with the five contracted conditions at HIGH | PENDING | `tests/test-writer-templates.test.ts` |
| T16 | Each of the five generators renders test-writer, auditor and conductor artifacts carrying the protocol tokens | PENDING | `tests/canonical-fidelity.test.ts` |

**Manual verification on Claude Code (not automatable, contract TT-25; deadline 2026-09-26; the other four tools are TT-R2):**

| ID | Walkthrough | Status | Evidence |
|---|---|---|---|
| M1 | Delegated conductor flow on a frontend+API sample. The plan proposes unit, integration and e2e with evidence and exact e2e setup. The report begins with the marker. No test or manifest change before confirmation. The conductor asks, relays an edit, and the same role resumes, confirms, sets up and writes. The post-red-tests gate shows per-tier status | PENDING | |
| M2 | Unit-only pure-logic feature: `NOT REQUIRED (unit-only, no setup)`, no marker, no pause | PENDING | |
| M3 | Direct `harny-test` invocation: proposes inline, asks, waits, then proceeds in the same conversation | PENDING | |
| M4 | Missing framework: manifest and lockfile byte-unchanged before confirmation. Declining e2e drops it and installs nothing | PENDING | |
| M5 | Tier-aware audit: `### Tier Results` written in the pinned shape, and a seeded deviation (an e2e test under a `PROPOSED` plan, or an unnamed dev dependency) reported as HIGH | PENDING | |

## Audit Log
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-24 | sdd-architect (planned, pre-implementation) | **TT-R1, planned reservation.** Tier inference, the confirmation rule, stop/ask behavior, setup scope and per-tier red reporting are prompt instructions. No automated test can prove an agent follows them. This now also covers the auditor's tier checks (TT-26 to TT-28). Evidence is limited to M1–M5 on Claude Code | MEDIUM (design, deliberate) | Carry forward, as LOW if M1–M5 all pass |
| 2026-09-24 | sdd-architect (planned, pre-implementation) | **TT-R2, named reservation (the human's decision on Q4).** The manual walkthrough targets Claude Code only. Cursor, Kiro, GitHub Copilot and Codex receive identical content (TT-1, TT-30 are tested), but their runtime behavior is not walked through: checkpoint routing (resume versus fresh invocation, the ask-the-human mechanism) and the tier-aware audit. This has the same class as tool-generators AL-30 and CG-1 | MEDIUM (open, human-gated) | Carry forward |
| 2026-09-24 | sdd-architect (post-specs gate revision) | Human answers recorded: Q1 any setup asks even if unit-only (TT-9); Q2 auditor checks tiers, now in scope (TT-26 to TT-30); Q3 readiness manifest unchanged (non-goal); Q4 walkthrough on Claude Code, other four tools named as TT-R2; Q5 `harny-test` version "1.1" (TT-19) | N/A (decision record) | Specs revised; no open reservation added beyond TT-R2's widened scope |
| 2026-09-24 | sdd-architect (planned, pre-implementation) | **TT-R3, planned reservation.** The dogfood `harny-test` and `harny-audit` (which this repo's own pipeline runs) intentionally lack the tier flow and tier audit. The dogfood `harny-test` still points at the dogfood-only `high-value-tests` skill. Both are declared in `DIVERGENCE_TABLE` | LOW (design, deliberate) | Carry forward. A future dogfood-sync feature may close it |

## Final Verdict
_(to be completed by the auditing role)_

**Status**: PENDING

**Summary**:

**Critical Issues** (must fix before merge):

**Warnings** (should fix, not blocking):

**Recommendations** (nice to have):
