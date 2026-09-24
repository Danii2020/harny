# Contract: Doctor Security Checks

## Interfaces

### Public API

```ts
// src/doctor.ts — MODIFIED
export type DoctorAssertion =
  | { readonly kind: 'probe'; readonly probe: ToolProbe }                       // probes.mjs, verbatim
  | { readonly kind: 'gitIgnored'; readonly paths: readonly string[] }          // every path ignored
  | { readonly kind: 'gitConfig'; readonly key: string; readonly equals: string }
  | { readonly kind: 'fileContains'; readonly path: string; readonly text: string };

export interface DoctorCheck {
  // …existing fields unchanged…
  /** Absent: today's `anyOf` presence assertion. Present: this assertion replaces
   *  it, and `anyOf` is `[]`. */
  readonly assert?: DoctorAssertion;
}

export interface DoctorChecksFile {
  // …existing fields unchanged; `version` stays 1…
  readonly security: readonly DoctorCheck[];
  readonly securityLabel: string;
}

export const SECURITY_FAMILY_LABEL: string; // 'security'

/** Pure. The security family's entries for the resolved generators and placement. */
export function buildSecurityChecks(
  generators: readonly Generator[],
  placement?: CiPlacement,
): readonly DoctorCheck[];
```

```ts
// src/git-hooks.ts — MODIFIED: the CI step name becomes an owned constant (S5),
// asserted equal to the one in templates/ci/harny-feedback.yml by a test.
export const CI_SECRET_SCAN_STEP_NAME: string; // 'Secret scan (gitleaks)'
```

`run-doctor.mjs`: `FAMILY_TOKENS` gains `'security'`, in position 4.

### Data Models

The security family, in this order, every entry `tier: 'recommended'`:

| id | Assertion | Gate (`requires`) |
|---|---|---|
| `security:permissions-policy` | `anyOf: [PERMISSIONS_POLICY_PATH]` | harness gate |
| `security:permissions-guard` | `anyOf: [PERMISSIONS_GUARD_PATH]` | harness gate |
| `security:permissions-wired:<tool id>` (one per resolved generator, generator order) | `fileContains(generator.hooksPath, 'run-guard.mjs')` | harness gate |
| `security:env-ignored` | `gitIgnored(['.env', '.env.local'])` | none |
| `security:git-hooks` | `anyOf: ['.sdd/git-hooks/pre-commit']` | harness gate |
| `security:git-hooks-active` | `gitConfig('core.hooksPath', <prefix>/.sdd/git-hooks)` | harness gate |
| `security:gitleaks` | `probe({ binary: 'gitleaks' })` | none |
| `security:ci-secret-scan` | `fileContains(<workflow path from the install dir>, CI_SECRET_SCAN_STEP_NAME)` | harness gate |

### State Changes

`.sdd/doctor/checks.json` gains `security` and `securityLabel`. `run-doctor.mjs` gains
the family. Nothing is written at doctor run time.

## Behavior Guarantees

1. **DS-1 — Family placement and label.** The runner prints `-- <securityLabel> --`
   followed by one line per entry, after repo readiness and before spec state, only
   when `security` is present. (G1)
2. **DS-2 — Recommended only.** A missed security assertion emits `WARN <id> -
   <remediation>` and never changes the exit code. (G2)
3. **DS-3 — Assertion semantics.**
   - `probe`: `probeSatisfied(probe, cwd)` from `probes.mjs`.
   - `gitIgnored`: `git check-ignore -q -- <p>` exits 0, run once per path from `cwd`.
     All paths must pass.
   - `gitConfig`: `git config --get <key>` from `cwd` prints exactly `equals`.
   - `fileContains`: the file at `path`, resolved from `cwd`, exists and contains
     `text`.
   (G3)
4. **DS-4 — Git-backed assertions skip outside git.** When `cwd` is not inside a git
   work tree (`git rev-parse --is-inside-work-tree` fails) or git is missing,
   `gitIgnored` and `gitConfig` entries emit `SKIP` with `not a git repository`. (SC3)
5. **DS-5 — The existing gate applies first.** `requires` is evaluated before any
   assertion, as today: false means `SKIP`. (G5)
6. **DS-6 — Per-generator wiring.** One `permissions-wired` entry per resolved
   generator, in generator order, naming that tool's `hooksPath`. (G4)
7. **DS-7 — `--only security`** runs just this family; an unknown `--only` value is
   still a usage error naming the six tokens. (SC4)
8. **DS-8 — Compatibility.** A checks file without `security` produces no security
   lines. An entry without `assert` evaluates exactly as before in every family. The
   pre-existing families' lines are unchanged. (G5, SC5)
9. **DS-9 — Determinism and ownership.** `buildSecurityChecks` is pure; every path
   and text it emits is imported from its owning module. (S3, S5)
10. **DS-10 — Dogfood.** This repository's `.sdd/doctor/checks.json` and
    `run-doctor.mjs` equal a fresh render. (G6)
11. **DS-11 — Docs.** `templates/doctor/README.md` and both `harny-doctor/SKILL.md`
    roots describe six families and the security family's tier. (S7)

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| Not a git repository / git missing | git-backed entries `SKIP` | No false warnings |
| `git check-ignore` exits 128 | That entry `WARN`s with the remediation | Visible, non-fatal |
| `fileContains` target missing | `WARN` (a missing file cannot contain the step) | Remediation says re-run `harny init` |
| Unknown `assert.kind` (a newer checks.json) | `WARN` naming the unknown kind | Never crashes, never fails |

## Dependencies

- Internal: `src/doctor.ts`, `src/git-hooks.ts`, `src/permissions.ts`, `src/repo.ts`,
  `templates/doctor/run-doctor.mjs`, `templates/shared/probes.mjs`.
- External: none (S4).

## Integration Points

- `templates/doctor/README.md`, `templates/skills/harny-doctor/SKILL.md` and
  `.agents/skills/harny-doctor/SKILL.md` (kept identical).
- README "Checking whether a repository is ready" gains the family.
- Tests: `tests/doctor.test.ts`, `tests/doctor-runner.test.ts`, goldens,
  `tests/canonical-fidelity.test.ts`.
