# Readiness Checks Specification

> Last synced: 2026-09-15. Owned artifacts: `templates/doctor/run-doctor.mjs`, `templates/doctor/README.md`, `templates/shared/probes.mjs`, `harny-doctor` skill, `harny-document` skill (bootstrap mode only), `npx harny doctor` CLI verb.

## Purpose

Feedforward, computational pre-checks that run at session start and before new spec work, verifying the harness is installed and coherent, **and that the target repository itself carries the baseline documentation an AI coding agent needs to work there safely**, before an agent begins work — evaluation of five check families (environment, harness-file manifest, repo readiness, spec-state sanity, full test suite) with deterministic ready/not-ready outcome, never per-turn and never per-PR. The complement to feedback-controls' per-turn and CI-gate feedback surfaces.

## Requirements

### Requirement: RD-1 — Five check families in fixed order

The system SHALL evaluate readiness across five check families in this exact order: environment (Node version), harness-file manifest (base `.sdd/` artifacts present), **repo readiness** (baseline repo-level documentation an agent needs), spec-state sanity (feature directories coherent), and test suite (stack-specific runner). One check produces one line; no check aborts the run.

**Source:** readiness-doctor · intent.md § G3, contract.md § BG-1, BG-2. **Amended by** ai-sdlc-readiness · intent.md § Constraints, contract.md § AR-1 (four families → five; repo readiness inserted third).

#### Scenario: all families evaluated
- **WHEN** the readiness runner executes
- **THEN** all five families are evaluated in the declared order, each check produces exactly one line, and no failing check halts evaluation of remaining checks

### Requirement: RD-2 — Readiness command never reaches per-turn hooks

The system SHALL prevent a test-suite command (the readiness kind) from ever reaching a per-turn hook config or the CI workflow; `commands` element type forbids `kind: 'test'` at compile time. `ReadinessCommand` also forbids `extensions` at compile time, since readiness commands run once whole-project and never consult path-specific settings.

**Source:** readiness-doctor · intent.md § G4, contract.md § BG-4; feedback-path-hygiene · contract.md § PH-9

#### Scenario: test command rejected at type level
- **WHEN** attempting to assign `kind: 'test'` to a `StackProfile.commands` entry
- **THEN** a TypeScript compile error results

#### Scenario: readiness command cannot carry extensions
- **WHEN** attempting to assign `extensions` to a `ReadinessCommand` literal
- **THEN** a TypeScript compile error results (`extensions?: never`)

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

The system SHALL ensure `npx harny doctor` and `node <path>/.sdd/doctor/run-doctor.mjs` evaluate the same checks and report the same ready/not-ready for the same repo state, sharing one `buildDoctorChecks` implementation. The verb re-derives the install location before building checks, which is what keeps the agreement true for a subdirectory install (ci-workflow-root feature).

**Source:** readiness-doctor · intent.md § G8, contract.md § BG-7; ci-workflow-root · contract.md Amendment RD-7

#### Scenario: verb and direct invocation agree
- **WHEN** running `npx harny doctor` and the direct runner invocation against the same repo (root install or subdirectory install)
- **THEN** both evaluate identical checks (including the correctly-placed `ci-workflow` check) and exit with the same code

### Requirement: RD-8 — Two priority tiers, a `warn` outcome, and a must-have gap is a red run

The system SHALL support exactly two priority tiers per check entry — `must-have` (the default when the field is absent) and `recommended` — and one additional outcome, `warn`. A `must-have` entry that is absent produces `FAIL`, the runner exits `2`, `HarnessError('NOT_READY')` is thrown at the verb, and the verb exits `6`. A `recommended` entry that is absent produces `WARN`, named in the report with its remediation, and never changes the run's exit code. The summary line reports four counts, in order: ok / skipped / warned / failed.

**Source:** ai-sdlc-readiness · intent.md § G2, contract.md § AR-2–AR-5, AR-14

#### Scenario: a must-have item is absent
- **WHEN** a `must-have` check's `anyOf` is unsatisfied
- **THEN** the check reports `FAIL`, the runner exits `2`, and the verb exits `6`

#### Scenario: a recommended item is absent
- **WHEN** a `recommended` check's `anyOf` is unsatisfied
- **THEN** the check reports `WARN` naming its remediation, and the run still exits `0`

### Requirement: RD-9 — Repo-readiness family: three entry kinds, derived from resolved generators

The system SHALL populate the `repo readiness` family with exactly three entry kinds, built by `buildRepoReadinessChecks(generators)`: a `README.md` entry (must-have, ungated); an architecture-document entry accepting `ARCHITECTURE.md`, `AGENTS.md`, or `docs/architecture.md` (recommended, ungated — bounded to exactly what `harny-document` already writes or bootstraps, so the check never demands a file the delegated writer would not produce); and one per-tool agent-guidance entry per distinct resolved `Generator` with a declared `guidancePath`, deduped first-seen, `undefined` filtered, each accepting either that tool's own path or `AGENTS.md` and harness-gated (`requires: HARNESS_GATE`) like every other scaffold-derived check. No tool id, instruction-file path, or tool count is a literal in `src/doctor.ts`; every one is read off the resolved `Generator` instances (except `'CLAUDE.md'` inside the pre-existing, deliberately untouched `conventions-doc` entry — see RD-1's amendment note and Open reservations).

**Source:** ai-sdlc-readiness · intent.md § G1, G6, G7, contract.md § AR-6–AR-11

#### Scenario: a repo has claude-code and github-copilot selected
- **WHEN** `buildRepoReadinessChecks` runs against a resolved generator set containing `claude-code` and `github-copilot`
- **THEN** it emits the README entry, the architecture entry, and exactly two agent-guidance entries — one accepting `CLAUDE.md`/`AGENTS.md`, one accepting `.github/copilot-instructions.md`/`AGENTS.md`

#### Scenario: cursor or codex alone is selected
- **WHEN** only `cursor` or only `codex` is resolved (both declare `guidancePath: undefined`, reading `AGENTS.md` natively)
- **THEN** no agent-guidance entry is emitted for that tool — its guidance is `AGENTS.md`, already covered universally by the architecture entry's `anyOf`

### Requirement: RD-10 — Coherence is judged by the skill, never the runner

The system SHALL keep document *presence* computational, in the runner (`anyPathExists`, no content read), and document *coherence* — whether a guidance document actually states the project's purpose, its components, and the commands that validate a change — as judgement performed by `harny-doctor`'s reading procedure. No check in `templates/doctor/run-doctor.mjs` greps, keyword-matches, or heading-matches a document's contents.

**Source:** ai-sdlc-readiness · intent.md § G3, contract.md § AR-17

#### Scenario: a guidance document exists but is empty
- **WHEN** `README.md` exists but is zero bytes
- **THEN** `repo-readiness:readme` still reports `OK` — presence, not content, is what the runner checks; coherence is `harny-doctor`'s separate reading step

### Requirement: RD-11 — Gaps are reported, then asked about, never fixed unilaterally

The system SHALL have `harny-doctor` report the specific document and the specific gap for every failing or warning repo-readiness (and conventions-doc) entry, then ask the human whether to delegate drafting to `harny-document`'s bootstrap mode — never invoking it unprompted. `harny-document`'s bootstrap mode is reachable only when there is no approved `audit.md` for a named feature (mutually exclusive with its normal post-audit path); it refuses to touch `specs/`, source files, `CHANGELOG.md`, and never triggers the `harny-sync`/`harny-adr` hand-off, marking its output as a draft for human review.

**Source:** ai-sdlc-readiness · intent.md § G4, G5, contract.md § AR-18, AR-19

#### Scenario: harny-doctor finds a missing README
- **WHEN** the repo-readiness family reports `repo-readiness:readme` as `FAIL`
- **THEN** `harny-doctor` names the file and the gap, asks whether to delegate to `harny-document`, and invokes it only on an explicit yes

## Invariants

**I1 — Entry-level probe gating.** A `require` entry whose `requires` probe is false is skipped with a notice, never failed, using the same probe semantics as feedback controls (`I3`).

**I2 — Ready/not-ready determinism (amended).** Ready means every check is `ok`, `skip`, or `warn`; not ready means at least one check is `fail`. The result is deterministic: the same repo state always produces the same outcome. *(Amended by ai-sdlc-readiness · contract.md § AR-2 to admit the `warn` outcome; the determinism half is unchanged.)*

**I3 — Five-family ordering invariant (amended).** The five check families always run in the same order (environment → manifest → **repo readiness** → spec state → test suite), so the report is consistent across runs and tools. *(Amended by ai-sdlc-readiness · contract.md § AR-1; was "four-family" before repo readiness was inserted third.)*

**I4 — Presence is computational, coherence is judgement.** The runner (`templates/doctor/run-doctor.mjs`) only ever checks whether a path exists; it never reads a document's contents to judge its quality. Coherence — does a guidance document actually state purpose, components, and validation commands — is `harny-doctor`'s reading step, one layer up. *(Added by ai-sdlc-readiness · contract.md § AR-17; formalizes the division of labour RD-10 states as a requirement.)*

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| RD-R1 | `run-doctor.mjs` hard-codes schema file names `intent.md` and `audit.md` rather than receiving them from `--checks`, violating BG-3's "no schema file name literal" guarantee and the contract's own `DoctorChecksFile` data model which has no field to carry them. The deviation is functional but declarative. | MEDIUM | readiness-doctor · audit.md F3 |
| RD-R2 | `DoctorResult.skipped` and `.failed` are structurally never populated — not because no channel exists to observe per-check outcomes (as of ai-sdlc-readiness's post-audit fix, `runDoctor` does capture the runner's stdout/stderr via `stdio: ['ignore','pipe','pipe']`), but because parsing that captured output into per-check structured outcomes was deliberately declined by design (ai-sdlc-readiness · intent.md § Non-Goals: "adds no `warned` field that would inherit the same defect"). The `ran` field distinguishes invoked checks only from skipped ones, not from failed ones. | MEDIUM | readiness-doctor · audit.md F5; wording corrected by ai-sdlc-readiness · audit.md F2 (2026-09-15) |
| RD-R3 | No test covers `CLI-5` (conflict rule) on the three new generated paths (`.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs`), verified manually only. | MEDIUM | readiness-doctor · audit.md F6 |
| RD-R4 | `SC19` CLI test no longer exercises the path its own rationale names: both test runs are guaranteed never to spawn a test command (one has unrecognized stack, one has false test probe). | MEDIUM | readiness-doctor · audit.md F7 |
| RD-R5 | No automated test drives both `npx harny doctor` and a direct `node run-doctor.mjs` invocation against one shared fixture to confirm agreement (RD-7); held by manual observation only. **More consequential since ai-sdlc-readiness**: this is precisely the class of gap that let that feature's F1 (HIGH — an unhandled `ENOBUFS` making the verb and the direct invocation disagree above a 1 MiB, later 64 MiB, output threshold) ship undetected until manual audit. Recommended follow-up, not yet scheduled. | MEDIUM | readiness-doctor · audit.md F2, T26, T28; escalated by ai-sdlc-readiness · audit.md F1 (RESOLVED), C16 |
| RD-R6 | `runDoctor`'s captured-pipe `stdio` mode (introduced by ai-sdlc-readiness's post-audit F1 fix) loses live output streaming — nothing prints until the child runner exits — and routes the runner's stderr through `io.log` (stdout) rather than the `io.warn` channel that already exists for this purpose. | MEDIUM | ai-sdlc-readiness · audit.md F3 |
| RD-R7 | `harny-document`'s bootstrap-mode `SKILL.md` prose is contracted (AR-19) and present, but its test assertion (`tests/skills-fidelity.test.ts`) is weak: 4 of the 5 required substrings (`draft`, `CHANGELOG.md`, `harny-sync`, `harny-adr`) already occurred in the pre-existing post-audit section before this feature, so the assertion would still pass even if every bootstrap refusal clause were deleted. | MEDIUM | ai-sdlc-readiness · audit.md F4 |
| RD-R8 | AR-16/RD-7 ("verb and direct invocation agree") now holds only up to `DOCTOR_RUNNER_MAX_BUFFER` (64 MiB); above that the verb abstains with a diagnosable `HarnessError('USAGE')` rather than reaching a ready/not-ready conclusion. This bound is real and deliberate (see RD-8/RD-9 gate design) but is not yet stated in `contract.md`. | LOW | ai-sdlc-readiness · audit.md F12 |
| RD-R9 | `'CLAUDE.md'` is a literal in both `src/doctor.ts` (inside the deliberately-untouched `conventions-doc` entry) and `src/generators/claude-code.ts` (its `guidancePath` declaration) — an accepted, contracted exception to the "derive every per-tool fact, never re-literal it" rule, since moving or removing `conventions-doc`'s literal was explicitly out of scope (see RD-1's amendment note). | LOW | ai-sdlc-readiness · audit.md F5 |
| RD-R10 | A generated `checks.json`'s `ci-workflow` entry records an install-relative path that goes stale if the install directory is moved to a different depth; `npx harny doctor` re-derives and is never stale; remediation is to re-run `npx harny init`. The relative path is data produced during init, and persisting it would create a second source of truth that can diverge from the filesystem. | LOW | ci-workflow-root · contract.md § Behavior Guarantees (DR-5) |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| readiness-doctor | 2026-09-14 | RD-1–RD-7: four-family readiness check, probe-skip determinism, spec-state coherence detection, verb + direct invocation agreement, no mutations, distinct not-ready exit code. |
| ai-sdlc-readiness | 2026-09-15 | RD-8–RD-11: fifth `repo readiness` family (README must-have; architecture + per-tool agent-guidance recommended); two-tier model and `warn` outcome; presence-vs-coherence layering (runner checks presence only, `harny-doctor` judges coherence); ask-before-delegating hand-off to `harny-document`'s new bootstrap mode. Amended RD-1/I3 (four families → five) and I2 (ready/not-ready now admits `warn`). |
| ci-workflow-root | 2026-09-23 | Amended RD-7: the verb re-derives install location before building checks, which keeps agreement true for subdirectory installs. Added RD-R10: generated `checks.json`'s `ci-workflow` entry records install-relative path that goes stale after a directory move; verb is never stale. |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| 0022 | A fifth check family, `repo readiness`, rather than more entries in family 2 | Accepted |
| 0023 | Must-have/recommended tier split, a new `warn` outcome, and `conventions-doc` stays in family 2 | Accepted |
| 0024 | Presence checked in the deterministic runner; coherence judged one layer up, in the skill | Accepted |
