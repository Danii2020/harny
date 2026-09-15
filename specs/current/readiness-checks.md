# Readiness Checks Specification

> Last synced: 2026-09-14. Owned artifacts: `templates/doctor/run-doctor.mjs`, `templates/doctor/README.md`, `templates/shared/probes.mjs`, `harny-doctor` skill, `npx harny doctor` CLI verb.

## Purpose

Feedforward, computational pre-checks that run at session start and before new spec work, verifying the harness is installed and coherent before an agent begins work — evaluation of four check families (environment, harness-file manifest, spec-state sanity, full test suite) with deterministic ready/not-ready outcome, never per-turn and never per-PR. The complement to feedback-controls' per-turn and CI-gate feedback surfaces.

## Requirements

### Requirement: RD-1 — Four check families in fixed order

The system SHALL evaluate readiness across four check families in this exact order: environment (Node version), harness-file manifest (base `.sdd/` artifacts present), spec-state sanity (feature directories coherent), and test suite (stack-specific runner). One check produces one line; no check aborts the run.

**Source:** readiness-doctor · intent.md § G3, contract.md § BG-1, BG-2

#### Scenario: all families evaluated
- **WHEN** the readiness runner executes
- **THEN** all four families are evaluated in the declared order, each check produces exactly one line, and no failing check halts evaluation of remaining checks

### Requirement: RD-2 — Readiness command never reaches per-turn hooks

The system SHALL prevent a test-suite command (the readiness kind) from ever reaching a per-turn hook config or the CI workflow; `commands` element type forbids `kind: 'test'` at compile time.

**Source:** readiness-doctor · intent.md § G4, contract.md § BG-4

#### Scenario: test command rejected at type level
- **WHEN** attempting to assign `kind: 'test'` to a `StackProfile.commands` entry
- **THEN** a TypeScript compile error results

### Requirement: RD-3 — Shared probe implementation

The system SHALL provide exactly one probe evaluator (`probeSatisfied` and related functions) at `templates/shared/probes.mjs`, imported by both feedback and readiness runners, with no duplicate implementations and no per-tool variants.

**Source:** readiness-doctor · intent.md § G4, contract.md § BG-19, BG-20

#### Scenario: single probe evaluator
- **WHEN** searching `templates/` and `.sdd/` for probe function identifiers
- **THEN** each appears only in `templates/shared/probes.mjs` and on the import lines of both runners

### Requirement: RD-4 — Spec-state coherence detection

The system SHALL detect and report by feature name: a `specs/<feature>/` missing any of the five required schema files, and a `specs/<feature>/` carrying `Shipped:` in `intent.md` and approved verdict in `audit.md` yet still existing outside `specs/archived/` (shipped-but-unarchived condition).

**Source:** readiness-doctor · intent.md § G3, contract.md § BG-10

#### Scenario: missing schema file reported
- **WHEN** a `specs/<feature>/` is missing `intent.md`, `contract.md`, `roadmap.md`, `tasks.md`, or `audit.md`
- **THEN** the check reports the feature by name as a failure

#### Scenario: shipped-but-unarchived reported
- **WHEN** a `specs/<feature>/` carries `Shipped:` and an approved verdict but is not in `specs/archived/`
- **THEN** the check reports the feature by name as a failure

### Requirement: RD-5 — Probe-skip determinism

The system SHALL ensure a check whose `requires` probe is false is skipped with a notice and never fails; the skip behavior is identical whether reached via readiness check, per-turn hook, or CI gate.

**Source:** readiness-doctor · intent.md § G3, contract.md § BG-9

#### Scenario: absent tooling skipped
- **WHEN** a test runner's `requires` probe is false (e.g., no `pytest` in PATH)
- **THEN** the check is skipped with a notice, and the run exits ready (0) despite the skip

### Requirement: RD-6 — No mutations

The system SHALL guarantee the readiness check never writes, never mutates the target repo, and exits with a distinct code for "checked and found not ready" (6) vs. CLI errors (1/2/3/4/5/130).

**Source:** readiness-doctor · intent.md § G8, contract.md § BG-6, SC19

#### Scenario: readiness run writes nothing
- **WHEN** the readiness check executes, including on a red (not-ready) result
- **THEN** no files are created, modified, or deleted in the target repo

#### Scenario: not-ready exit code is distinct
- **WHEN** the readiness check completes with at least one failing check
- **THEN** the verb exits 6, distinct from all CLI error codes

### Requirement: RD-7 — Verb and direct invocation agreement

The system SHALL ensure `npx harny doctor` and `node <path>/.sdd/doctor/run-doctor.mjs` evaluate the same checks and report the same ready/not-ready for the same repo state, sharing one `buildDoctorChecks` implementation.

**Source:** readiness-doctor · intent.md § G8, contract.md § BG-7

#### Scenario: verb and direct invocation agree
- **WHEN** running `npx harny doctor` and the direct runner invocation against the same repo
- **THEN** both evaluate identical checks and exit with the same code

## Invariants

**I1 — Entry-level probe gating.** A `require` entry whose `requires` probe is false is skipped with a notice, never failed, using the same probe semantics as feedback controls (`I3`).

**I2 — Ready/not-ready determinism.** Ready means all checks passed or were skipped with notices; not ready means at least one check failed. The result is deterministic: the same repo state always produces the same outcome.

**I3 — Four-family ordering invariant.** The four check families always run in the same order (environment → manifest → spec state → test suite), so the report is consistent across runs and tools.

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| RD-R1 | `run-doctor.mjs` hard-codes schema file names `intent.md` and `audit.md` rather than receiving them from `--checks`, violating BG-3's "no schema file name literal" guarantee and the contract's own `DoctorChecksFile` data model which has no field to carry them. The deviation is functional but declarative. | MEDIUM | readiness-doctor · audit.md F3 |
| RD-R2 | `DoctorResult.skipped` and `.failed` are structurally never non-empty because `stdio: 'inherit'` leaves the parent with no channel to observe per-check outcomes; the `ran` field distinguishes invoked checks only from skipped ones, not from failed ones. | MEDIUM | readiness-doctor · audit.md F5 |
| RD-R3 | No test covers `CLI-5` (conflict rule) on the three new generated paths (`.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs`), verified manually only. | MEDIUM | readiness-doctor · audit.md F6 |
| RD-R4 | `SC19` CLI test no longer exercises the path its own rationale names: both test runs are guaranteed never to spawn a test command (one has unrecognized stack, one has false test probe). | MEDIUM | readiness-doctor · audit.md F7 |
| RD-R5 | Two manually verified coverage gaps (SC20/BG-7 and SC15) have no automated test, held by structure and disclosure rather than by test. | MEDIUM | readiness-doctor · audit.md F2, T26, T28 |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| readiness-doctor | 2026-09-14 | RD-1–RD-7: four-family readiness check, probe-skip determinism, spec-state coherence detection, verb + direct invocation agreement, no mutations, distinct not-ready exit code. |

## Related ADRs

| ADR | Title | Status |

<None yet — readiness-doctor predates or falls outside ADR significance criteria; see harny-adr preconditions.>
