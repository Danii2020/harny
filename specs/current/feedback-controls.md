# Feedback Controls Specification

> Last synced: 2026-09-23 (monorepo-mode). Owned artifacts: per-turn hooks (`templates/hooks/**`), CI workflow (`templates/ci/**`), shared runner (`templates/hooks/run-feedback.mjs`), `harny-feedback` skill.

## Purpose

Agent feedback controls close the gap between feedforward guidance (steering the agent *before* it acts) and computational feedback (sensors that observe *after* it acts and let it self-correct), per Fowler's harness-engineering framing. This capability provides two feedback surfaces: native per-tool hooks firing at turn-boundary (pre-integration) and a GitHub Actions workflow firing per PR (post-integration). Both surfaces invoke the same shared runner over the same command set (`STACK_PROFILES` mapped from `config.stack`, or from each declared component's own stack), deduping across multiple edits in the same turn and skipping absent tooling (e.g., eslint in a repo without an eslint config). Since `monorepo-mode`, one install may declare several components (a directory and the stack it is written in); dispatch is then per component, from each component's own directory, while the number of feedback surfaces, runners and workflows stays exactly what it was.

## Requirements

### Requirement: FC-1 — Single canonical source maps stack to commands

The system SHALL establish exactly one named module/table that maps `config.stack` to a set of lint/type-check commands, and no command string from that table SHALL appear as a literal string in any template, skill body, or generated artifact. A declared **component** selects among the profiles in that same one table by its own stack string; the table itself gains no per-component field, and `StackProfile`, `CommandSpec`, `FeedbackCommand` and `ReadinessCommand` carry no component, path, directory or cwd vocabulary.

**Source:** agent-feedback-controls · intent.md § G1, contract.md § BG-7; monorepo-mode · contract.md § MC-2

#### Scenario: components select profiles, never extend the table
- **WHEN** an install declares two components with stacks `python` and `typescript`
- **THEN** both resolve against the same `STACK_PROFILES` table by stack string, two TypeScript components share the same profile object by identity, and `src/feedback.ts` contains no occurrence of component vocabulary at all

#### Scenario: no command literals in shipped code
- **WHEN** searching all of `src/`, `templates/`, and `.agents/skills/` for complete command strings (e.g., `npx eslint`, `npx tsc --noEmit`)
- **THEN** every command string appears only in `src/feedback.ts` and in generated inline-JSON blocks within hook configs and the CI workflow, never as a source-level literal

#### Scenario: installation candidates similarly constrained
- **WHEN** searching for install-step commands (e.g., `npm ci`, `npm install`)
- **THEN** they appear only in `src/feedback.ts` entries and in generated blocks, never as literals

### Requirement: FC-2 — Unrecognized or blank stack is non-fatal

The system SHALL handle an unrecognized or blank `config.stack` by writing all hook/workflow artifacts as-is (valid JSON/YAML/TOML, syntactically correct) and marking the commands as an escape hatch that produces only a notice, not a crash or silent failure.

This holds **per component**: an unrecognized stack on any one declared component is inert, warned about once naming that component's path and the unrecognized value, and leaves every artifact written. A blank component stack is not warned about.

**Source:** agent-feedback-controls · intent.md § G1, contract.md § BG-8; monorepo-mode · contract.md § MC-28

#### Scenario: unrecognized component stack warns naming the component
- **WHEN** `npx harny init --component .=python --component apps/web=cobol`
- **THEN** every artifact is still written, `apps/web` contributes no commands, and exactly one `io.warn` names `apps/web`, the value `cobol`, and the built-in profile ids

#### Scenario: unrecognized stack scaffolding
- **WHEN** `npx harny init --stack cobol` (an unrecognized profile)
- **THEN** all hook configs and workflow are written; they include an inert command `'[]'` or equivalent notice; `io.warn` lists the unrecognized value and all valid profile ids; the conductor's markdown block notes "Project stack: cobol (no built-in profile)"

### Requirement: FC-3 — Stack is consumed beyond capture

The system SHALL read `config.stack` by a code path affecting output beyond the markdown-yaml generator's single capture-only line.

**Source:** agent-feedback-controls · intent.md § G1, contract.md § SC3

#### Scenario: stack affects hook/CI rendering
- **WHEN** `config.stack` is set to a recognized profile (e.g., `typescript`, `python`)
- **THEN** `buildPayload` resolves the corresponding profile, `renderCiWorkflow` emits profile-specific install and runner steps, and `renderHook` (all five generators) embed the profile's commands as inline JSON in each hook config

### Requirement: FC-4 — Hook behavior is tool-neutral

The system SHALL specify turn-boundary feedback behavior in tool-neutral language in `templates/hooks/README.md`, stating exactly seven properties of the per-turn batching, deduplication, execution, findings delivery, loop-safety, and per-component dispatch model.

**Source:** agent-feedback-controls · intent.md § G2, contract.md § SC4; monorepo-mode · contract.md § Integration Points

#### Scenario: canonical README describes behavior without naming tools
- **WHEN** reading `templates/hooks/README.md` § "The behavior"
- **THEN** it states all seven properties (turn is the unit, accumulate-dedup-run-once, empty turn silent, probe-false skip, findings before yielding, re-entry guard, per-component dispatch) with no tool named; each tool appears only under § "Attributed examples" afterwards

#### Scenario: the seventh property is stated tool-neutrally
- **WHEN** reading the seventh property
- **THEN** it states that a touched path resolves to exactly one declared component and that component's commands run from that component's directory, names no tool, and states that an install declaring no components behaves exactly as properties 1–6 describe

### Requirement: FC-5 — Five generators emit hooks at verified native paths

The system SHALL emit per-tool hook configurations at each tool's native discovery path, bound to each tool's verified turn-completion event, with dated first-party citations for every per-tool fact.

**Source:** agent-feedback-controls · intent.md § G2, contract.md § V1

#### Scenario: Claude Code hook path and event
- **WHEN** generating for Claude Code with `--stack typescript`
- **THEN** a `Stop` hook is registered in `.claude/settings.json` under nested `hooks.Stop` structure

#### Scenario: Cursor hook path and event
- **WHEN** generating for Cursor with `--stack typescript`
- **THEN** a `stop` hook is registered in `.cursor/hooks.json` with `version: 1`

#### Scenario: Kiro hook path and event
- **WHEN** generating for Kiro with `--stack typescript`
- **THEN** an `agentStop` hook is registered in `.kiro/hooks/harny-feedback.json` with `version: "v1"`

#### Scenario: GitHub Copilot hook path and event
- **WHEN** generating for GitHub Copilot with `--stack typescript`
- **THEN** an `agentStop` hook is registered in `.github/hooks/harny-feedback.json` with `"bash"` key (not `command`)

#### Scenario: Codex CLI hook path and event
- **WHEN** generating for Codex with `--stack typescript`
- **THEN** a `Stop` hook is registered in `hooks.json` under nested `hooks.Stop` structure

### Requirement: FC-6 — Canonical behavior survives per-tool adaptation

The system SHALL guarantee that canonical batching and deduplication semantics (one run per turn, covering M deduped paths for N edits) hold on all five tools, and no tool's integration shall silently drop findings or skip them without notice.

Batching and deduplication themselves are unchanged by components: the deduped set is additionally **partitioned** across declared components, and each command sees only its own component's share.

**Source:** agent-feedback-controls · intent.md § G2, contract.md § BG-6, SC6, SC6a; monorepo-mode · contract.md § MC-9, MC-12

#### Scenario: the deduped set is partitioned, not duplicated
- **WHEN** a turn touches one file under `apps/web` and one file at the install root, with `apps/web` declared `typescript` and `.` declared `python`
- **THEN** the TypeScript per-file command receives only the `apps/web` path and runs with cwd `apps/web`, the Python per-file command receives only the root path and runs with cwd the install directory, and neither command's argv contains the other's path

#### Scenario: multiple edits across multiple files batch to one run
- **WHEN** a turn edits 3 files in sequence but only 2 distinct paths, each `per-file` command receiving exactly the deduped paths that pass its extension gate and still exist
- **THEN** exactly one invocation of each command occurs; a `per-file` command with an extension gate receives exactly 2 deduped paths (or fewer if some vanished or do not match), or zero invocations if none pass the filter

#### Scenario: findings reach agent via each tool's documented channel
- **WHEN** the runner produces findings
- **THEN** each tool delivers them via its own non-blocking or blocking channel (Claude Code `additionalContext`, Kiro STDOUT, Cursor/Copilot forced-continuation, Codex `systemMessage`)

### Requirement: FC-7 — CI gate produces exactly one workflow

The system SHALL generate exactly one workflow per install at the enclosing **git repository root**, named `harny-feedback.yml` for a root install and `harny-feedback-<slug>.yml` for a subdirectory install, regardless of how many tools are selected, triggering on `pull_request` and on `push` to `main`, and running the resolved profile's lint/type-check commands via the shared runner.

A multi-component install is no exception: it still produces exactly one workflow with exactly one job and exactly one runner-invocation step. Per-component **install** steps are the only per-component steps, each scoped by `working-directory`; the workflow never acquires `strategy:`, `matrix:`, a second workflow file, an `on.*.paths` filter, or `defaults.run.working-directory`.

**Source:** agent-feedback-controls · intent.md § G3, contract.md § SC7, SC8; ci-workflow-root · contract.md § Proposed amendments; monorepo-mode · contract.md § MC-13, MC-14

#### Scenario: a two-component install renders one job and one runner step
- **WHEN** generating for an install declaring `.` = `python` and `apps/web` = `typescript`
- **THEN** exactly one workflow is written at the repository root with one job, one runner step named for the deduped stacks in canonical order (`harny feedback (Python, TypeScript / Node)`), at most one install step per component (`Install dependencies (TypeScript / Node — apps/web)` with `working-directory: "apps/web"`), and none of the six forbidden constructs; for a single-component install every step name is byte-identical to the pre-`monorepo-mode` text

#### Scenario: one workflow per install at the repository root
- **WHEN** generating for a root install or a subdirectory install with 1, 3, or 5 tools
- **THEN** exactly one workflow file is written at the repository root, byte-identical across all tool selections for a root install; a subdirectory install's workflow is named `harny-feedback-<slug>.yml` (e.g., `harny-feedback-apps-web.yml`), and no workflow file is written inside the install directory

#### Scenario: workflow contains only install and runner steps
- **WHEN** generating with `--stack typescript`
- **THEN** the workflow declares both a `pull_request` trigger and a `push` trigger filtered to `main`, and contains exactly two step kinds: one install step (`npm ci`) and one runner invocation (`node .sdd/feedback/run-feedback.mjs run --whole-project`); for a subdirectory install, each generated step additionally carries `working-directory: <component>`

### Requirement: FC-8 — CI gate honors probe requirements

The system SHALL ensure that absent tooling (e.g., eslint in a repo without an eslint config) is skipped with a notice in CI, not failed, matching the skip behavior of the per-turn hook.

**Source:** agent-feedback-controls · intent.md § G3, contract.md § BG-9

#### Scenario: CI skips absent linter with notice
- **WHEN** running the generated workflow on a repo without eslint installed
- **THEN** the runner step outputs `skipped \`eslint\`: requirement not met` and exits 0 (green)

### Requirement: FC-9 — Harny-feedback skill is core and always scaffolded

The system SHALL add `harny-feedback` as a core skill (always scaffolded, not optional) to `CORE_SKILL_IDS`, counting 8 core skills total (up from 7 with `harny-doctor` appended last), and no CLI flag SHALL permit naming it with `--skills`.

**Source:** agent-feedback-controls · intent.md § G4, contract.md § SC9, SC9a, BG-15; readiness-doctor · contract.md § State Changes

#### Scenario: core skill always present in --skills none
- **WHEN** invoking `npx harny init --tools claude-code --skills none`
- **THEN** `harny-feedback` and `harny-doctor` are still scaffolded; `--skills none` suppresses only optional skills

#### Scenario: skill counts are 8 core, 2 optional, 10 total
- **WHEN** checking `src/vocabulary.ts` `CORE_SKILL_IDS`, `OPTIONAL_SKILL_IDS`, and `SKILL_IDS`
- **THEN** lengths are 8, 2, and 10 respectively, with `harny-doctor` last in core

### Requirement: FC-10 — Severity definitions not duplicated

The system SHALL map all findings to `harny-audit`'s existing severity buckets (CRITICAL, HIGH, MEDIUM, LOW) by reference, never restating severity definitions in `harny-feedback` itself.

**Source:** agent-feedback-controls · intent.md § G4, contract.md § SC10, BG-10

#### Scenario: harny-feedback maps to harny-audit severities
- **WHEN** reading `.agents/skills/harny-feedback/SKILL.md` Step 4
- **THEN** it maps finding kinds onto `harny-audit`'s severity table by reference, not by restating definitions

### Requirement: FC-11 — Skill updates propagate to both roots

The system SHALL update `harny-implement` and `harny-audit` in both `.agents/skills/` and `templates/skills/` in the same feature, maintaining byte-identical parity.

**Source:** agent-feedback-controls · intent.md § G4, contract.md § SC11, BG-16

#### Scenario: both skill roots updated identically
- **WHEN** comparing `.agents/skills/harny-implement/SKILL.md` and `templates/skills/harny-implement/SKILL.md`
- **THEN** the new feedback-related guidance (Step 4 / final checklist) is character-for-character identical

### Requirement: FC-12 — Auditor verifies without re-running

The system SHALL specify that `harny-audit` Step 6 verifies the per-turn hook fired and the CI gate is green, **without** re-invoking the mapped lint/type-check commands.

**Source:** agent-feedback-controls · intent.md § G5, contract.md § SC12, BG-17

#### Scenario: auditor confirms CI ran, does not re-run linter/type-checker
- **WHEN** `harny-audit` Step 6 runs
- **THEN** it reads the per-turn hook's output and the CI workflow's exit status, and does not execute `eslint` or `tsc --noEmit` itself

### Requirement: FC-13 — Dogfood artifacts derive from canonical templates

The system SHALL ensure this repo's own `.claude/settings.json`, `.github/workflows/harny-feedback.yml`, `.sdd/feedback/run-feedback.mjs`, `.sdd/shared/probes.mjs`, `.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`, `.sdd/harness.json`, and `.sdd/spec-schema/*.md` are byte-identical to what `npx harny init --tools claude-code --stack typescript` produces for a downstream repo. The git-root install case is the byte-identity-preserving path through the new placement logic (`ci-workflow-root` feature); this feature regenerated the workflow's header comment.

This repo's own install remains a **single-repo** `stack: typescript` install at the git root, declaring no components, and all eight dogfood paths stay byte-identical across the `monorepo-mode` feature.

**Source:** agent-feedback-controls · intent.md § G5, contract.md § SC14; readiness-doctor · contract.md § State Changes, Post-implementation dogfood extension; ci-workflow-root · contract.md § Proposed amendments; monorepo-mode · intent.md § SC3

#### Scenario: dogfood paths unchanged by components
- **WHEN** comparing this repo's `.sdd/feedback/run-feedback.mjs`, `.sdd/doctor/run-doctor.mjs`, `.sdd/shared/probes.mjs` and `.github/workflows/harny-feedback.yml` to fresh `init` output after `monorepo-mode`
- **THEN** each runner is byte-identical to its `templates/` source and the workflow differs only by the contracted header comment block

#### Scenario: no dogfood divergence
- **WHEN** running `npx harny init` against a scratch target with matching configuration
- **THEN** all feedback and readiness artifacts, plus configuration and spec-schema, are byte-identical to this repo's committed versions; seven of eight paths remain unchanged from before the `ci-workflow-root` feature, with only the workflow's header comment revised per CR-7

### Requirement: FC-14 — Feedback-controls capability created from template

The system SHALL create `specs/current/feedback-controls.md` from `capability-template.md` with all sections filled and stable requirement IDs in a fresh `FC-` namespace.

**Source:** agent-feedback-controls · intent.md § G6, contract.md § SC15

#### Scenario: new capability doc exists post-archive
- **WHEN** `harny-sync` archive mode completes
- **THEN** `specs/current/feedback-controls.md` exists with all Requirements, Invariants, Open reservations, Contributing features, and Related ADRs sections filled

### Requirement: FC-15 — Index keywords registered

The system SHALL add keyword rows to `specs/current/_index.md` for `hook`, `lint / type-check`, `CI / GitHub Actions`, `stack`, and `feedback` routing to this capability.

**Source:** agent-feedback-controls · intent.md § G6, contract.md § SC16

#### Scenario: _index.md keywords route to feedback-controls
- **WHEN** searching `specs/current/_index.md` § Keyword lookup
- **THEN** rows exist for `hook`, `lint / type-check`, `CI / GitHub Actions`, `stack`, `feedback` with capability `feedback-controls`

### Requirement: FC-16 — AGENTS.md feedforward/feedback vocabulary

The system SHALL add a new section to `AGENTS.md` classifying all controls (role prompts, conventions, gates, hooks, CI) into Fowler's feedforward-computational/feedback-computational/feedforward-inferential/feedback-inferential quadrants, naming inferential feedback as deliberately empty.

**Source:** agent-feedback-controls · intent.md § G7, contract.md § SC17

#### Scenario: feedforward vs. feedback classification table
- **WHEN** reading `AGENTS.md` § "Feedforward vs. feedback"
- **THEN** a table classifies role prompts/conventions/gates (feedforward-inferential), native hooks/CI (feedback-computational), and explicitly names inferential feedback as "deliberately empty"

### Requirement: FC-17 — Documentation accuracy corrected

The system SHALL reword README.md:21, `plan.md` lines 27 and 45 from "runs the toolchain" to "confirms the per-turn hook fired and CI is green", and ensure `AGENTS.md` lines 25-26 accurately state the CI deployment status.

**Source:** agent-feedback-controls · intent.md § G7, contract.md § SC18

#### Scenario: README describes audit behavior accurately
- **WHEN** reading `README.md` line 21 and `plan.md` lines 27, 45
- **THEN** they state "confirms" behavior (verification) rather than "runs" behavior (re-execution)

### Requirement: FC-18 — Amendments to current-truth statements

The system SHALL apply all seven amendments to `specs/current/*.md` files (SL-1, CLI-10, TG-10, TG-1, TG-3, AGENTS.md:25-26, SL-10) documenting the impact of this feature on existing capability statements.

**Source:** agent-feedback-controls · intent.md § All, contract.md § AM-1–AM-7

#### Scenario: skill-library.md reflects nine total skills
- **WHEN** reading `specs/current/skill-library.md` SL-1
- **THEN** it states nine total skills (up from eight), listing `harny-feedback` as core

#### Scenario: cli-init.md reflects correct template count
- **WHEN** reading `specs/current/cli-init.md` CLI-10
- **THEN** it states 26 `templates/**` files (corrected from 22/25)

#### Scenario: tool-generators.md reflects hook artifacts
- **WHEN** reading `specs/current/tool-generators.md` TG-10
- **THEN** it counts 30 tool artifacts plus one hook artifact per resolved generator plus shared runner/workflow

### Requirement: FC-19 — CI gate findings cause PR to fail

The system SHALL ensure that findings reported by the CI workflow's lint/type-check step cause the workflow to exit with status 2, failing the PR gate until findings are addressed.

**Source:** agent-feedback-controls · post-audit amendment A1, contract.md § BG-19

#### Scenario: CI exits 2 on findings
- **WHEN** the shared runner detects findings (exit 1 from a command)
- **THEN** the workflow step exits 2, failing the CI check

### Requirement: FC-20 — CI whole-project mode

The system SHALL implement a `--whole-project` mode in the shared runner that checks the entire project (not a per-turn file set), never reads or writes turn state, and never honors the re-entry guard. `--whole-project` covers **every** declared component: each component's commands run from that component's own directory with the `.` sentinel, the summary line's text is unchanged with its counters summed across components, and a finding still exits 2 unmediated.

**Source:** agent-feedback-controls · post-audit amendment A1, contract.md § BG-20; monorepo-mode · contract.md § MC-19

#### Scenario: whole-project covers every component
- **WHEN** invoking the runner with `--whole-project` on a two-component install
- **THEN** every component's commands run once from that component's directory, `totalCount`/`ranCount`/`skippedCount` are summed across components into the unchanged summary string, turn state is still never consulted, and any finding exits 2

#### Scenario: CI runner ignores turn state
- **WHEN** invoking the runner with `--whole-project`
- **THEN** `.sdd/feedback/.turns/` is not consulted or modified, and `--whole-project` does not appear in any generated hook config (CI-only flag)

### Requirement: FC-21 — Python profile CI is probe-skip-only

The system SHALL define the `python` profile's CI gate with no install step, so both `ruff` and `mypy` skip with notices on a stock runner, by deliberate scope decision. Installable Python linters are not assumed.

**Source:** agent-feedback-controls · post-audit amendment A1, contract.md § BG-21, R6

#### Scenario: python profile has no ciInstall
- **WHEN** generating with `--stack python`
- **THEN** the CI workflow contains no install step, only a runner invocation, and both commands skip with legible notices

### Requirement: FC-22 — Vanished touched paths never reach a per-file command

The system SHALL drop touched paths that no longer exist on disk when the runner evaluates each per-file command in turn-based `run` mode, before that command's argv is built.

**Source:** feedback-path-hygiene · contract.md § PH-1

#### Scenario: vanished path never passed to command
- **WHEN** a turn records a touched path that is later deleted in the same turn (e.g., by `git mv`, `harny-sync` archive move)
- **THEN** the per-file command's invocation never receives that path in its argv

### Requirement: FC-23 — Optional per-command extension gate

The system SHALL allow each per-file command to declare optional `extensions` (file suffixes it accepts). Touched paths are filtered by extension (case-sensitive suffix match, valid entries = non-empty strings) before the command is invoked; an empty filtered set silently skips the command, never spawning it with zero path arguments. Absent, non-array, or zero-valid-entry `extensions` means no filter.

**Source:** feedback-path-hygiene · contract.md § PH-2, PH-3, PH-5, PH-6

#### Scenario: per-file command receives only matching paths
- **WHEN** a per-file command declares `extensions: ['.py', '.pyi']` and a turn touches `.py`, `.json`, and `.js` files
- **THEN** the command receives exactly the `.py` and `.pyi` file paths, never the others

#### Scenario: empty filtered set skips the command
- **WHEN** a per-file command with `extensions: ['.py']` is evaluated on a turn touching only `.json` and `.yml` files
- **THEN** the command is not invoked at all, exits 0 on the run, and produces no output

### Requirement: FC-24 — The `.` sentinel bypasses both filters

The system SHALL ensure that `run --whole-project`, which passes the special `.` argument to each per-file command, bypasses both the extension gate and the existence check, so CI behavior is unchanged.

**Source:** feedback-path-hygiene · contract.md § PH-7

#### Scenario: `--whole-project` passes `.` unconditionally
- **WHEN** invoking the runner with `--whole-project`
- **THEN** each per-file command receives exactly `['.']` as its trailing arguments, regardless of any `extensions` it declares, and neither extension nor existence filtering applies

### Requirement: FC-25 — A touched path resolves to exactly one component by longest segment-prefix

The system SHALL assign each deduped touched path to the single declared component whose directory is the path's longest **segment**-prefix — matching on `rel === dir` or `rel.startsWith(dir + '/')`, never on a bare string prefix — and SHALL run that component's commands with that component's directory as both the `spawnSync` working directory and the root against which each command's `requires` probe is evaluated. `'.'` is an ordinary zero-segment component that wins only when nothing longer matches. Touched paths themselves stay absolute.

**Source:** monorepo-mode · contract.md § MC-9, MC-10, MC-12; ADR 0039

#### Scenario: segment boundary, not string prefix
- **WHEN** components `apps/web` and `apps/web-admin` are both declared and the turn touches `apps/web-admin/x.ts`
- **THEN** the path is assigned to `apps/web-admin` and never to `apps/web`

#### Scenario: the root component wins only by default
- **WHEN** components `.` and `apps/web` are declared and the turn touches `src/index.ts`
- **THEN** the path is assigned to `.`, because no longer declared directory matches

### Requirement: FC-26 — Unassignable work is dropped with a notice, never guessed at

The system SHALL run no command for a touched path that belongs to no declared component, and SHALL report the drop exactly once on stderr naming the number of dropped paths — never reassigning such a path to a default component and never discarding it silently. A declared component whose directory is absent at runtime SHALL be skipped wholesale with exactly one notice naming it and its command count, counted as skipped in the `--whole-project` summary, never spawned into, and its directory SHALL never be created. A component with no assigned touched path SHALL run nothing at all, per-file or whole-project; a `whole-project` command runs once per component with **at least one assigned path**, and that gate is assignment, never the per-file extension filter.

**Source:** monorepo-mode · contract.md § MC-11, MC-17, MC-18; ADR 0039, ADR 0041

#### Scenario: an unassigned path runs nothing and is reported once
- **WHEN** a turn touches a path under no declared component directory
- **THEN** no command receives that path and exactly one stderr notice names the count of dropped paths

#### Scenario: an absent component directory is skipped, not created
- **WHEN** a declared component's directory does not exist when the runner runs `--whole-project`
- **THEN** that component's commands are all counted as skipped with one notice naming the component and its command count, nothing is spawned, and the directory is not created

#### Scenario: whole-project gating is assignment, not extension
- **WHEN** a turn touches only a `.md` file inside a component that declares both an extension-gated per-file command and a whole-project command
- **THEN** the per-file command is skipped by its extension gate while the whole-project command still runs once from that component's directory

## Invariants

**I1 — Turn as the batch unit.** All five tools' hooks fire at turn-boundary, never per-edit, so the agent sees findings from its complete set of edits in one batch before it yields control.

**I2 — Deduplication across the turn.** If a turn edits the same file twice, the runner receives that path exactly once, not twice.

**I3 — Probe-skip is deterministic.** A command is skipped if and only if its `requires` check fails (e.g., no eslint config, tool not in PATH); the result is the same whether reached via per-turn hook or CI gate. Probe evaluation is **per component**, against that component's own directory — the same directory the command will run in, never the install root for a non-root component.

**I4 — Findings never fail the agent's own process.** All five hook wrappers exit 0 even when findings are reported, so a linter failure cannot crash the agent; CI's exit-2 signal is reserved for the PR gate, not the agent's turn.

**I5 — Runtime byte-for-byte fidelity.** `templates/hooks/run-feedback.mjs` and `templates/shared/probes.mjs` are copied verbatim into `.sdd/feedback/run-feedback.mjs` and `.sdd/shared/probes.mjs` during generation; no per-tool variant exists. The runtime is now two files, not one, because `probes.mjs` is shared by both feedback and readiness runners.

**I6 — Loop safety via re-entry guard.** The runner checks `stop_hook_active` (where present) and suppresses blocking responses on re-entry, so it cannot drive runaway agent loops.

**I7 — The CI workflow belongs to the repository, every other artifact belongs to the install.** Exactly one generated artifact resolves against the repository root; every other resolves against the install directory. The CI workflow's placement and naming are derived from the install directory's position within the repository (`ci-workflow-root` feature). Still true with components declared: component directories are **data** (a `dir` field, a `working-directory:` value), never write targets, so the count of artifacts resolving against the repository root stays exactly one (`monorepo-mode` MC-30).

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| R1 | Kiro docs disagree on post-file-save event casing (`agentStop` vs. Kiro's older `PostFileSave` example). Shipped with camelCase `agentStop` per V6 types page; unverifiable without live Kiro run. | MEDIUM (human-gated) | agent-feedback-controls · audit.md MA-5/R1 |
| R2 | SC13 (live-session hook firing) unverifiable in audit session; requires human restart and re-entry. Accumulator half was observed firing live; Stop delivery was executed verbatim; only in-context delivery to live agent remains. | MEDIUM (human-gated) | agent-feedback-controls · audit.md MA-2/R2 |
| R5 | Kiro's and GitHub Copilot's post-edit payload field shape (carrying `tool_input.file_path` and turn key) is assumed but not cited in a first-party source. AL-30 class: wrong field name exits 0 recording nothing, turn looks empty. | MEDIUM (human-gated) | agent-feedback-controls · audit.md F3/R5 |
| R6 | Python profile CI gate is deliberately probe-skip-only (no install step, no assumed Python convention); both ruff/mypy skip on stock runner. Closeable only by a future feature adding `ciInstall` to python profile. | MEDIUM (scope, deliberate) | agent-feedback-controls · audit.md R6 |
| R7 | TypeScript profile install candidates cover npm only; pnpm/Yarn-Berry repo can fall through to `npm install` not actually populating node_modules, re-entering F1's exact failure. Needs a `localBinary` probe kind (out of A1 scope). | MEDIUM (design, deferred) | agent-feedback-controls · audit.md R7 |
| R8 | Only `Stop` is hooked, never `SubagentStop` — and Stop fires only for the main conversation, never when a subagent (e.g. a conductor-orchestrated `sdd-executor`/`sdd-test-writer`/`sdd-documentation` run) finishes on its own. In a conductor-driven pipeline where all real edits happen inside subagents, the check-and-report step can only ever fire at the conductor's own next `Stop` (i.e. once a subagent fully completes and hands back), not during the subagent's work — so a deliberately mid-implementation-broken state (e.g. a roadmap phase that intentionally fails `tsc` until a later phase lands) is never caught live. Whether `PostToolUse` accumulation still correctly attributes subagent edits to the same turn key as the conductor's (so they get swept up at that next `Stop` rather than lost) depends on whether Claude Code shares `session_id` between a subagent and its parent — plausible per current docs and per an empty `.sdd/feedback/.turns/` despite heavy subagent edit activity in this repo's own `context7-mcp` dogfood session, but not independently confirmed against a live run. Never examined when `agent-feedback-controls` was designed, built, or audited — no mention of subagents anywhere in this capability's spec or `templates/hooks/README.md`. Surfaced by direct dogfood observation during the `context7-mcp` feature's own conductor-orchestrated pipeline, not by a formal audit. | MEDIUM (design, unexamined) | context7-mcp dogfood observation, 2026-09-15 (this session) |
| MR-F3 | The turn-mode half of the "declared component directory absent + `requires: {}`" error row is **reachable and untested**. The earlier reasoning that a turn-mode assigned path implies an existing directory is false: `dedupedTouchedPaths` does no existence filtering and `existingPaths` runs inside `perFilePathsFor`, i.e. after component assignment and only for `per-file` commands, so a vanished path under a removed component directory does reach the notice in turn mode. Only the `--whole-project` half is covered. | HIGH (coverage, deferred by human decision) | monorepo-mode · audit.md F3, rows T39/T39a |
| MR-F5 | All five generators' `renderHook` ship `payload.commands ?? (profile ? profile.commands : [])` rather than the contracted literal `payload.commands`. Ruled acceptable: `HookPayload.commands` is non-optional and `runInit` is its only construction site, so the fallback is unreachable in production and the "no generator learns what a component is" guarantee holds in full. The cost is that five generator test fixtures build `HookPayload`-shaped objects missing a required field, and the `??` disarms the type system's own guarantee. Closed by supplying `commands` in those five fixtures, then shipping the literal form. | MEDIUM (design, deferred) | monorepo-mode · audit.md F5, C15 |
| MR-F10 | MC-11's "with a single `.` component, the dropped-path count is always 0" is not strictly true: a touched path outside the install directory resolves to no component and is now dropped with the notice where it was previously passed through. Affects subdirectory installs only; no generated artifact changes. Recorded as a deliberate narrowing. | LOW | monorepo-mode · audit.md F10 |
| MR-F13 | The "N is always 0 for the legacy single-`.` form" test sets no invocation log and asserts only exit 0 plus the absence of a string, so it would also pass on a runner that dispatched nothing. Weak rather than vacuous — bare-array dispatch is proven positively elsewhere in the same file. | LOW (test quality) | monorepo-mode · audit.md F13, A5 |
| MR-F7 | MC-5's "no `if (isSingleRepo)` guard appears at any rendering site" is not literally held and cannot be: its own MC-14 mandates different step-name text for more than one component. The observable byte-identity guarantee is met and mechanically proven by golden comparison; the two boundaries are now named, exported, documented predicates (`isSingleRootComponent`, `hasMultipleComponents`). Residue is a spec-wording problem — amend MC-5, do not edit code. | LOW (wording) | monorepo-mode · audit.md F7, C5 |
| MR-F8 | The per-turn feedback hook could not be confirmed to have fired during `monorepo-mode`'s implementation: `.sdd/feedback/.turns/` held only `.gitignore` with a 2026-09-14 mtime, nine days before the work, and both turn-file creation and the runner's post-run cleanup update that mtime. Circumstantial, not conclusive. The human should confirm the `PostToolUse`/`Stop` hooks were live for the implementing sessions. | MEDIUM (process, human-gated) | monorepo-mode · audit.md F8 |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| agent-feedback-controls | 2026-09-14 | FC-1–FC-21: per-turn hooks (all five tools), CI workflow, harny-feedback core skill, stack→commands mapping, probe-skip behavior, turn-boundary batching, findings delivery channels, CI gate feedback, dogfood fidelity. Post-A1: `ciInstall`, `--whole-project` flag, CI whole-project step, Python probe-skip-only profile. |
| feedback-path-hygiene | 2026-09-22 | FC-22–FC-24: vanished-path drop, per-command optional `extensions` gate (case-sensitive suffix match), empty filtered set skip, `.` sentinel bypass for CI. Amended FC-6 scenario and FC-4 wording. Post-A1: no-valid-entry `extensions` means no filter (guard against silent linter disable). |
| dogfood-quick-fixes | 2026-09-22 | Amended FC-7: workflow now triggers on both `pull_request` and `push` to `main` (push-to-main CI feedback). Aligned AL-11 `extensions` wording across three sites (item 3). |
| ci-workflow-root | 2026-09-23 | Amended FC-7, FC-13: repository-root placement, install-scoped workflow name (`harny-feedback-<slug>.yml` for subdirectory installs), step-level component scoping via `working-directory`, no `paths:` filter. Added I7 (CI workflow as repository artifact). ADRs 0032, 0034 record the placement and naming strategy decisions. |
| monorepo-mode | 2026-09-23 | FC-25–FC-26: per-component dispatch by longest **segment**-prefix match, per-component cwd and probe root, unassigned paths dropped with one notice, absent component directories skipped and never created, whole-project once per *affected* component. Amended FC-1 (components select among the same profiles; no component vocabulary in `src/feedback.ts`), FC-2 (per-component inert-stack warning), FC-4 (six → **seven** tool-neutral properties), FC-6 (the deduped set is partitioned across components), FC-7 (a monorepo install is still one workflow, one job, one runner step), FC-13 (this repo stays single-repo and byte-identical), FC-20 (whole-project covers every component), I3 (per-component probe evaluation) and I7 (component directories are data, never write targets). ADRs 0039, 0041. Verdict APPROVED WITH RESERVATIONS: MR-F3, MR-F5, MR-F7, MR-F8, MR-F10, MR-F13 carried. |

## Related ADRs

> Rebuilt from each ADR file's own `Capability:` field.

| ADR | Title | Status | Path |
|---|---|---|---|
| 0015 | No YAML dependency in canonical CI workflow | Accepted | `specs/archived/agent-feedback-controls/decisions/0015-no-yaml-dependency-in-canonical-ci-workflow.md` |
| 0017 | Reuse shared runner in CI via `--whole-project` flag | Accepted | `specs/archived/agent-feedback-controls/decisions/0017-reuse-shared-runner-in-ci-via-whole-project-flag.md` |
| 0019 | Shared `probes.mjs` extraction | Accepted | `specs/archived/readiness-doctor/decisions/0019-shared-probes-extraction.md` |
| 0028 | Path filtering lives only in the per-turn code path; the `.` sentinel bypasses it by construction | Accepted | `specs/archived/feedback-path-hygiene/decisions/0028-path-filtering-in-turn-based-code-path-only.md` |
| 0030 | Hardcode `main` in the canonical CI push trigger rather than deriving the default branch | Accepted | `specs/archived/dogfood-quick-fixes/decisions/0030-hardcode-main-ci-trigger.md` |
| 0032 | Scope a subdirectory install with step-level `working-directory`, no `paths:` filter | Accepted | `specs/archived/ci-workflow-root/decisions/0032-step-scoping-no-paths-filter.md` |
| 0034 | Derive the workflow file name from the install prefix; surface a name collision as `CONFLICT` | Accepted | `specs/archived/ci-workflow-root/decisions/0034-slug-collision-conflict.md` |
| 0039 | Longest segment-prefix match; an unassigned path is dropped with a notice | Accepted | `specs/archived/monorepo-mode/decisions/0039-longest-segment-prefix-match.md` |
| 0041 | A `whole-project` command runs once per component with an assigned touched path | Accepted | `specs/archived/monorepo-mode/decisions/0041-whole-project-per-affected-component.md` |

