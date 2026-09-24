# Audit: Permissions Baseline

## Requirements Checklist
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | One canonical tool-neutral policy | intent.md G1, SC1 | PENDING | |
| R2 | Guard wired on all five tools | intent.md G2, SC2 | PENDING | |
| R3 | Native deny/ask per tool; fail closed without ask | intent.md G2, SC3, SC4 | PENDING | |
| R4 | Protected-branch git rules | intent.md G3 | PENDING | |
| R5 | Claude Code static rules | intent.md G4, SC5 | PENDING | |
| R6 | Dogfood byte identity | intent.md G5, SC6 | PENDING | |
| R7 | Missing/broken policy handling | intent.md SC7 | PENDING | |
| R8 | README documents baseline and limits | intent.md SC8 | PENDING | |

## Contract Compliance
| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | PB-1 one canonical policy | PENDING | |
| C2 | PB-2 verbatim install | PENDING | |
| C3 | PB-3 decision order | PENDING | |
| C4 | PB-4 secret reads | PENDING | |
| C5 | PB-5 command patterns | PENDING | |
| C6 | PB-6 protected branches | PENDING | |
| C7 | PB-7 branch globs | PENDING | |
| C8 | PB-8 native channels | PENDING | |
| C9 | PB-9 Claude static rules | PENDING | |
| C10 | PB-10 missing/broken policy | PENDING | |
| C11 | PB-11 determinism | PENDING | |
| C12 | PB-12 generator backward compatibility | PENDING | |
| C13 | PB-13 dogfood | PENDING | |
| C14 | PB-14 tool-neutral README | PENDING | |

## Test Coverage
| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Guard: reads, patterns, git rules, payload shapes, errors | PENDING | `tests/permissions/run-guard.test.ts` |
| T2 | `src/permissions.ts` parsing, derivation, files | PENDING | `tests/permissions.test.ts` |
| T3 | Each generator's guard command driven as a subprocess | PENDING | `tests/generators/*.test.ts` |
| T4 | Backward compatibility without `permissions` | PENDING | `tests/generators/*.test.ts` |
| T5 | Dogfood identity | PENDING | `tests/canonical-fidelity.test.ts` |
| T6 | Install path set and counts | PENDING | `tests/e2e-init.test.ts` |

## Audit Log
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| | | | | |

## Final Verdict
_(to be completed by the auditing role)_

**Status**: PENDING
