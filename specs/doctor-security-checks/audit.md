# Audit: Doctor Security Checks

## Requirements Checklist
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | Security family | G1, SC1 | PASS | Real five-tool install: 12 entries under `-- security --`, after repo readiness and before spec state. |
| R2 | Recommended only | G2, SC2 | PASS | Hand-broken install: 4 WARN, exit 0. This repo: 31 ok / 1 warn / 0 failed. |
| R3 | Real questions | G3, SC3 | PASS | `.env` asked of `git check-ignore` per path (a `.env`-only `.gitignore` still warns for `.env.local`); hooks asked of `core.hooksPath`; non-git directory → SKIP. |
| R4 | Per-harness wiring | G4 | PASS | One `permissions-wired:<tool>` per selected tool; emptying `.cursor/hooks.json` warns for Cursor only. |
| R5 | Compatibility | G5, SC4, SC5 | PASS | New runner + `main`'s `checks.json`: no security lines. `main`'s runner + new `checks.json`: runs, no security lines. Harness family output byte-identical old vs new runner. |
| R6 | Dogfood | G6, SC6 | PASS | `.sdd/doctor/*` regenerated; the run surfaced a real gap (`.env` not ignored) whose remediation was applied. |

## Contract Compliance
| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | DS-1 placement and label | PASS | Runner test (regex over order) + live runs |
| C2 | DS-2 recommended only | PASS | Runner test compares exit codes with and without the family |
| C3 | DS-3 four assertion kinds | PASS | One runner test per kind, incl. `!.env.example` negation |
| C4 | DS-4 git skips | PASS | Runner test + live non-git install |
| C5 | DS-5 gate first | PASS | Runner test (`requires` → SKIP) |
| C6 | DS-6 per-generator wiring | PASS | Generation test over all five generators; live break test |
| C7 | DS-7 `--only security` | PASS | Runner test: only the family; bad value exit 1 naming `security` |
| C8 | DS-8 compatibility | PASS | Both directions verified live against `main`'s runner and checks file |
| C9 | DS-9 pure, owned paths | PASS (see F1) | Generation test (equal on two calls; paths from `src/permissions.ts`, `src/git-hooks.ts`) |
| C10 | DS-10 dogfood | PASS | `tests/canonical-fidelity.test.ts` runner identity; checks regenerated through `buildDoctorFiles` |
| C11 | DS-11 docs | PASS | Doctor README (six families, tier rationale), both SKILL.md roots identical, root README |

## Test Coverage
| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Runner family, kinds, skips, `--only`, unknown kind | PASS | `tests/doctor/run-doctor-security.test.ts` (8) |
| T2 | Generation, subdirectory placement, step-name invariant | PASS | `tests/doctor-security.test.ts` (4) |

## Audit Log
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-24 | sdd-auditor (harny-audit) | **Baseline.** Suite **923/923**, typecheck clean, doctor 31 ok / 1 warned / 0 failed (the warning is real: no gitleaks in this container). No dependency change. Commit `51c9b51` passed this repo's own pre-commit hook. | INFO | — |
| 2026-09-24 | sdd-auditor | **Dogfood caught a real gap.** `security:env-ignored` warned on harny itself: its `.gitignore` did not ignore `.env`. The remediation was applied (`.env`, `.env.*`, `!.env.example/.sample/.template`), verified with `git check-ignore`. | INFO | — |
| 2026-09-24 | sdd-auditor | **DSC-F1 — S5: `core.hooksPath` is re-literalled** in `src/doctor.ts`, while `src/git-hooks.ts` owns the behavior that sets it. | LOW | Export a `GIT_HOOKS_CONFIG_KEY` from `src/git-hooks.ts` in a follow-up. |
| 2026-09-24 | sdd-auditor | **DSC-F2 — Every fresh install warns `env-ignored`**, because `harny init` never touches `.gitignore`. Correct per the non-goal "the doctor reports, never fixes", but it makes the warning near-universal. | LOW | Follow-up: have `init` offer `.gitignore` rules for `.env*` (consented, like hook activation). |
| 2026-09-24 | sdd-auditor | **DSC-F3 — The wiring check is a substring test** (`run-guard.mjs` in the hook file). A config naming the guard in an inert position would pass. All five formats are JSON without comments, so the realistic false pass is small. | LOW | Accept. |
| 2026-09-24 | sdd-auditor | **DSC-F4 — S6: contract ids in `describe` titles** (the standing AL-4 class). | LOW | AL-4 sweep. |
| 2026-09-24 | sdd-auditor | **DSC-R1 — CI has not run on this change yet.** | MEDIUM (process) | Confirm green on the PR. |

## Final Verdict

**Status**: APPROVED WITH RESERVATIONS

**Summary**: The security family works end to end on real installs across all five harnesses. It warns without blocking, skips outside git, detects per-tool wiring loss, and is compatible in both directions with older runners and checks files. Its first dogfood run found and fixed a real gap in harny itself. No finding above LOW remains, except the pending CI run.

**Critical Issues** (must fix before merge):
- None.

**Warnings** (should fix, not blocking):
- DSC-R1 (MEDIUM): confirm the PR's `harny feedback` check is green.

**Recommendations** (nice to have):
- DSC-F2: offer `.gitignore` rules for `.env*` at `harny init`.
- DSC-F1, DSC-F3, DSC-F4: small hygiene items.
