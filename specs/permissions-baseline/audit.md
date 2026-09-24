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
| 2026-09-24 | sdd-auditor (harny-audit), round 1 | **Baseline.** Suite 876/876 after commit `7ee2b80`, typecheck clean, doctor 24 ok / 0 failed. No dependency change (`package.json`/lockfile diff empty, S4). No `.sdd/permissions` literal outside `src/permissions.ts` (S5). | INFO | — |
| 2026-09-24 | round 1 | **Live evidence (positive).** This repo's dogfood `PreToolUse` guard fired in the auditing session itself: it denied the auditor's `rm -rf <scratch>` with the policy's reason, and denied a command containing `git push origin main`. So the Claude Code wiring (PB-8/PB-13) is confirmed live, not only by subprocess. | INFO | — |
| 2026-09-24 | round 1 | **A1-F1 — Deny patterns are bypassed by git global options.** `git -C . push --force` and `git -c k=v push --force` are allowed: `judgeGit` skips global options but pattern matching (PB-5) sees the raw text, so `git push *--force*` never matches. Agents use `git -C <dir>` routinely. PB-5 holds as written, but intent G2 and SC3 ("force push denied") do not hold for this spelling. Claude Code's static rules have the same gap. | HIGH | Fix: also match patterns against the git subcommand with global options removed. Amend PB-5. |
| 2026-09-24 | round 1 | **A1-F2 — A program given by path escapes patterns.** `/bin/rm -rf build` is allowed; `rm -rf*` expects a bare `rm`. | MEDIUM | Fix: also match with the program token reduced to its basename. Amend PB-5. |
| 2026-09-24 | round 1 | **A1-F3 — Command substitution is not inspected.** `echo $(cat .env)` is allowed; `$(…)` and backticks are neither split nor judged. | MEDIUM | Fix: judge each `$(…)`/backtick body as additional subcommands. Amend PB-3. |
| 2026-09-24 | round 1 | **A1-F4 — Heredoc bodies are judged as commands (false positive).** Observed live: the guard denied the auditor's `cat > file <<'EOF'` whose body contained `git push origin main`, because newline splitting treats heredoc lines as subcommands. This blocks legitimate writes of docs and scripts. | MEDIUM | Fix: skip heredoc bodies up to their delimiter. Amend PB-3. |
| 2026-09-24 | round 1 | **A1-F5 — Contract error row "guard crashes → wrapper allows" has no test.** The wrapper's non-0/2/3 branch is untested for all five tools. | HIGH | Fix: a test driving each generated wrapper against a guard that exits 1. |
| 2026-09-24 | round 1 | **A1-F6 — Residual spellings.** `xargs rm -rf`, combined short flags (`git commit -nm`), `cd` before git, `git pull` on a protected branch and `push.default=upstream` are not caught. Best-effort by contract (intent Non-Goals). | LOW | Carry as a reservation; `commit-checks` and server-side protection are the backstops. |

## Final Verdict
_(to be completed by the auditing role)_

**Status**: PENDING
