# Intent: Doctor Security Checks

> **Gate waiver (recorded, not implied).** The requester waived all three human gates
> for this run on 2026-09-24 ("the exact same instructions as before": full auto
> approval on best practices, dogfood plus all five harness deliverables, a PR once the
> audit approves). The pull request is the first human checkpoint.

## Problem Statement

`permissions-baseline` and `commit-checks` add security controls that only work if
they are present **and wired**. Several failure modes are silent:

- a checkout scaffolded before those features has no guard, policy or hooks;
- git hooks are written but `core.hooksPath` never got set, because consent was
  declined, the checkout is a fresh clone, or another hook manager is in charge;
- gitleaks is not installed, so every local secret scan is skipped with a notice
  nobody reads;
- a tool's hook config was hand-edited and no longer calls the permissions guard;
- `.env` is not ignored, so the one file the guard protects from reads can still be
  committed.

`harny doctor` is the readiness check an agent runs at session start. It says
nothing about any of this.

## Goals

1. **G1 — A security family in the readiness report.** Checks for each failure mode
   above, reported as a labelled family of its own, beside environment, harness, repo
   readiness, spec state and tests.
2. **G2 — Warn, never block.** Every security check is `recommended` tier: named with
   its remediation, never changing the exit code (plan.md #7).
3. **G3 — Answer the real question, not a proxy.** "Is `.env` ignored?" is asked of git
   (`git check-ignore`), not answered by grepping `.gitignore`. "Are the hooks active?"
   is asked of `core.hooksPath`, not inferred from a file existing.
4. **G4 — Per-harness where it is per-harness.** The permissions guard is wired
   differently in each of the five tools, so each selected tool's own hook config is
   checked for the guard. Everything else is tool-neutral and checked once.
5. **G5 — Compatible in both directions.** An older runner given a new `checks.json`,
   or a new runner given an old one, runs without error. The family simply appears or
   does not.
6. **G6 — harny dogfoods it.** This repository's `checks.json` and runner are
   regenerated, and its own doctor run shows the family.

## Success Criteria

- [ ] SC1 — `harny doctor` prints a `-- security --` family whose entries cover the
      permissions policy and guard, the guard's wiring in each selected tool, `.env`
      being git-ignored, the hooks being present and active, gitleaks being installed,
      and the CI secret-scan step being present.
- [ ] SC2 — Every security entry is `recommended`: a miss prints `WARN` with a
      remediation, and the exit code is unchanged.
- [ ] SC3 — Outside a git repository, the git-backed entries are `SKIP`ped with a
      reason, never failed or warned.
- [ ] SC4 — `--only security` runs only this family; `--only` still rejects unknown
      values.
- [ ] SC5 — A `checks.json` without the security keys produces no security lines. The
      pre-existing families' output and exit codes are byte-identical to before.
- [ ] SC6 — This repository's `.sdd/doctor/*` are byte-identical to a fresh render.

## Non-Goals

- **Fixing anything.** The doctor reports; it never installs gitleaks, edits
  `.gitignore` or sets `core.hooksPath`. The remediations say how.
- **Must-have security checks.** plan.md #7 fixes the tier at recommended. A repository
  may have legitimate reasons, such as a hook manager or a different secret scanner.
- **Scanning for secrets.** That is gitleaks' job in the hook and CI.
- **Verifying hook-config semantics beyond "calls the guard".** Parsing five tools'
  hook formats would duplicate the generators.

## Constraints

- `harny-sync` current truth: `readiness-checks` (RD-*, including AR-5 "absent tier
  means must-have", RC-1–RC-4 `--only`), plus `permissions-baseline` and `commit-checks`
  on this stacked branch. This feature **amends**:
  - "five check families" becomes six, with security inserted after repo readiness,
    before spec state;
  - `DoctorCheck` gains one optional field, `assert`. Absent means today's `anyOf`
    presence semantics, so every existing entry and every older `checks.json` behaves
    exactly as before.
- The ToolProbe evaluator (`templates/shared/probes.mjs`) is reused for the gitleaks
  binary check ("the existing presence-probe mechanism", plan.md #7), not
  re-implemented.
- S1–S7; S4: no dependency. S5: every path the checks name is imported from its owning
  module (`src/permissions.ts`, `src/git-hooks.ts`, `src/feedback.ts`).

## Prior Art

- `ai-sdlc-readiness`: added family 3 as a new `checks.json` key plus a label, both
  tolerated absent (AR-5, SC9). This feature follows it exactly.
- git docs (verified 2026-09-24): `git check-ignore` exits 0 if **any** given path is
  ignored, 1 if none, 128 on a fatal error, so each path gets its own call.
  `git config --get` exits 1 when the key is absent. A tracked file is reported
  not-ignored, which is correct here: a committed `.env` is exactly the problem.
