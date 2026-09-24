# Audit: Commit Checks

## Requirements Checklist
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | Blocking tool-neutral commit gate | G1, SC1, SC2 | PASS | Real `git commit` in throwaway repositories: protected branch blocked, first commit exempt, feature branch allowed, lint finding blocks. Live in this checkout. |
| R2 | One protected list; pre-push | G2, SC3 | PASS | Reads `.sdd/permissions/policy.json`; three refspec spellings refused; tags pass. |
| R3 | `run --staged` reuse | G3, SC5 | PASS | Shares `dispatchTouchedPaths`; the 44 pre-existing runner tests pass over the refactor. |
| R4 | Compose, never clobber | G4, SC6 | PASS | Five manager markers, a foreign `core.hooksPath`, idempotence, subdirectory path, `--no-git-hooks`, dry run; the legacy hook is chained. |
| R5 | Secrets locally and in CI | G1, G5, SC4, SC7 | PASS (CI pending) | Local: fake gitleaks drives block and skip. CI: step content byte-pinned by golden; asset names verified against gitleaks' goreleaser config; the live run is confirmed by the PR (CC-R1). |
| R6 | Dogfood | G6, SC8 | PASS | Fidelity test (bytes and 100755 index mode); hooks active in this checkout. |

## Contract Compliance
| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | CC-1 four files, once, shims executable | PASS | `buildGitHooksFiles` test; `runInit` writes mode 0755; e2e path sets hold one of each. |
| C2 | CC-2 `run --staged` | PASS | `tests/hooks/run-feedback-staged.test.ts`: ACMR only, `.ts` filter, whole-project never, deletions ignored, exit 2. |
| C3 | CC-3 pre-commit order | PASS | `tests/git-hooks/run-git-hook.test.ts`: each step, and chaining with exit propagation. |
| C4 | CC-4 pre-push | PASS | Refspec spellings, tags, the deletion wording in code; live `main` refusal. |
| C5 | CC-5 shared list, missing policy | PASS | Missing-policy test (notice, commit proceeds). |
| C6 | CC-6 activation | PASS | `tests/git-hooks.test.ts` (all refusal branches) plus `confirmGitHooks` tests (added round 1). |
| C7 | CC-7 CI secret scan | PASS (live run pending) | Template and `root-workflow-non-header.yml` golden; release naming checked against source. |
| C8 | CC-8 determinism | PASS | `buildGitHooksFiles` is deterministic (asserted equal on two calls); goldens byte-compared. |
| C9 | CC-9 dogfood | PASS | Fidelity test. |
| C10 | CC-10 README | PASS | `templates/git-hooks/README.md`: behavior with no tool named; limits section. |

## Test Coverage
| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | `run --staged` | PASS | `tests/hooks/run-feedback-staged.test.ts` |
| T2 | Hooks in real repositories (incl. node-missing fail-open) | PASS | `tests/git-hooks/run-git-hook.test.ts` |
| T3 | Files, executable bit, activation, consent prompt | PASS | `tests/git-hooks.test.ts`, `tests/prompts.test.ts` |
| T4 | CI step | PASS | `tests/engine.test.ts` against `tests/fixtures/golden/ci-workflow-root/root-workflow-non-header.yml` |
| T5 | Dogfood identity | PASS | `tests/canonical-fidelity.test.ts` |

## Audit Log
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-24 | sdd-auditor (harny-audit), round 1 | **Baseline.** Commit `8129e4c` was made *through* this repository's own active `pre-commit` hook (dogfood). Suite 909/909, typecheck clean, doctor 24 ok / 0 failed. No `package.json`/lockfile change (S4). No `.sdd/git-hooks` literal outside `src/git-hooks.ts` (S5). | INFO | — |
| 2026-09-24 | round 1 | **Live evidence (positive).** In this checkout, `.sdd/git-hooks/pre-commit` ran and printed the gitleaks-skipped notice. `pre-push`, fed a `refs/heads/main` destination, refused with exit 1. | INFO | — |
| 2026-09-24 | round 1 | **Release names verified against source.** `gitleaks_8.30.1_linux_x64.tar.gz` is confirmed against the v8.30.1 `.goreleaser.yml` `name_template` (amd64 → `x64`, default `tar.gz`); `gitleaks_8.30.1_checksums.txt` is goreleaser's default checksum name. The download itself cannot be exercised from the audit sandbox (egress policy). | INFO | Confirmed by the PR's CI run (CC-R1). |
| 2026-09-24 | round 1 | **CC-F1 — The interactive consent prompt has no test.** `confirmGitHooks` (CC-6, "after an interactive confirmation") is never exercised: accept, decline and cancel are all unverified. | HIGH | Fix: unit tests over the mocked `@clack/prompts`, following `confirmWrite`'s. |
| 2026-09-24 | round 1 | **CC-F2 — Merge commits on a protected branch are not blocked locally.** `git merge` runs `pre-merge-commit`, not `pre-commit`, so a local merge into `main` succeeds. `pre-push` still refuses the push. | LOW | Carry; a `pre-merge-commit` shim is a small follow-up. |
| 2026-09-24 | round 1 | **CC-F3 — One active install per repository.** A second `harny init` in the same repository sees the first's `core.hooksPath` and skips activation, with a message, so only the first install's lint commands run at commit time. | LOW | Documented by the skip message; carry. |
| 2026-09-24 | round 1 | **CC-F4 — Protected-branch glob logic exists twice at runtime**, in `run-guard.mjs` and `run-git-hook.mjs`. Both are self-contained by design (copied verbatim, builtins only), so they cannot share a module. | LOW | Accept; both are covered by tests on the same cases. |
| 2026-09-24 | round 1 | **CC-F5 — S6: contract ids in `describe` titles** in the new test files (the standing AL-4 class). | LOW | AL-4 sweep. |
| 2026-09-24 | sdd-auditor (harny-audit), round 2 | **CC-F1 closed**: `confirmGitHooks` tests added (yes, no, cancel). Suite **911/911**, doctor 24 ok. | INFO | — |
| 2026-09-24 | round 2 | **CC-R1 — The CI secret-scan step has not run yet.** Its first live run is this PR's `harny feedback` check. A wrong URL or checksum would fail loudly, never silently pass. | MEDIUM (process) | Confirm green on the PR; the PR description names it. |
| 2026-09-24 | round 2 | **Non-goals honored.** No whole-project checks at commit, no skip switch, no role-body change, no doctor checks, no licensed action. | INFO | — |


## Final Verdict

**Status**: APPROVED WITH RESERVATIONS

**Summary**: All ten guarantees hold and are tested against real git repositories, and the hooks are live in this checkout: they gated this feature's own commit. Round 1's one HIGH gap (untested consent prompt) is closed. What remains is the first live run of the CI secret-scan step, plus three LOW design limits.

**Critical Issues** (must fix before merge):
- None.

**Warnings** (should fix, not blocking):
- CC-R1 (MEDIUM): confirm the `harny feedback` check, including "Secret scan (gitleaks)", is green on the PR.

**Recommendations** (nice to have):
- CC-F2: add a `pre-merge-commit` shim so local merges into a protected branch are blocked too.
- CC-F3, CC-F4, CC-F5: one active install per repository; the duplicated branch-glob logic; ids in test titles.
