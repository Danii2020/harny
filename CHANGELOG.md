# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **Readiness doctor** — feedforward, computational pre-check run at session start and before new
  spec work. `harny-doctor` is the eighth core skill (ninth and tenth skills across the all-skills
  set, always scaffolded). A new `npx harny doctor [target] [--stack name]` CLI verb runs the
  scaffolded readiness check in `.sdd/doctor/run-doctor.mjs`, evaluating four families in fixed order:
  environment (Node version), harness-file manifest (`.sdd/` scaffold completeness), spec-state
  sanity (five-file features, shipped-but-unarchived detection), and the full test suite (stack-specific
  runner). One line per check; exit 0 when ready, exit 6 when not ready (distinct from CLI errors),
  exit 2 when invalid target. Writes nothing under any condition. Four-check schema extracted to
  `.sdd/doctor/checks.json`, probe evaluator extracted to `.sdd/shared/probes.mjs` (shared by both
  the feedback and readiness runners), both generated during `npx harny init` and subject to `CLI-5`
  conflict rules. Five current-truth amendments to `specs/current/`: SL-1 (nine→ten skills),
  FC-9 (7→8 core, 9→10 total), CLI-10 (26→30 template files), CLI-2 (new `NOT_READY`→6 exit code row),
  and feedback-controls.md I5/FC-13 (generated runtime now two files: `.sdd/feedback/run-feedback.mjs` +
  `.sdd/shared/probes.mjs`, plus `.sdd/doctor/run-doctor.mjs` + `.sdd/shared/probes.mjs` for readiness).
  A new capability namespace `readiness-checks` (prefix `RD-`) created from `harny-sync`'s
  `capability-template.md`. Open reservations: F3 (hard-coded schema file names), F4 (README.md
  lines 152–155 pre-existing staleness), F5 (`DoctorResult.skipped`/`.failed` never non-empty),
  F6 (no `CLI-5` test on three new paths), F7 (`SC19` test no longer spawns test command),
  and T26/T28 (two manually-verified but untested coverage gaps).

- **Agent feedback controls** — per-turn and CI-gate feedback for code quality checks. `harny-feedback`
  is a new core skill (seventh core, always scaffolded) that maps project stack (`--stack` flag)
  to canonical lint/type-check commands via a shared `STACK_PROFILES` configuration. All five
  target tools now scaffold native per-tool hook configs (Claude Code, Cursor, Kiro, GitHub
  Copilot, Codex) that fire at turn-boundary (`Stop`/`stop`/`agentStop` events), accumulate
  the list of edited files across the turn, and invoke the shared `run-feedback.mjs` runner
  in `accumulate` mode — batching N edits across M files into exactly one run per turn covering
  the M deduped paths. A new GitHub Actions workflow (`templates/ci/harny-feedback.yml`) provides
  CI-gate feedback: it installs dependencies (per-profile, e.g., `npm ci` for TypeScript) and
  invokes the same runner in `run --whole-project` mode, exiting 0 (green) on clean runs and
  exiting 2 (red) on findings. Both surfaces deliver findings to the agent (via turn-completion
  events) or the CI log (via the workflow step's stderr), without invoking the lint/type-check
  commands in the auditor's step (BG-17: auditor verifies, does not re-run). Five open reservations
  remain: Kiro casing (R1, first-party docs contradict), live-session restart (R2, verification
  deferred to human), uncited Kiro/Copilot payload shape (R5), Python CI is probe-skip-only (R6,
  deliberate scope), npm-only install can re-enter early findings on pnpm/Yarn-Berry (R7, design
  deferred to a future feature). Updated `AGENTS.md` § "Feedforward vs. feedback" to classify
  all controls (the five role prompts, this repo's conventions, and the three human gates as
  feedforward-inferential; the native hooks as feedback-computational; and inferential feedback
  as deliberately empty).

- **Skill Library and Knowledge Base** — the live five-agent pipeline is now composed of
  eight reusable `harny-*` skills bridged via symlinks from `.agents/skills/` (harny-propose,
  harny-test, harny-implement, harny-audit, harny-document, harny-sync, harny-adr,
  harny-standards). Each agent body is ≤ 25 lines; combined agent file size is 148 lines
  down from 646. All skills are portable (no Claude-Code-only frontmatter keys); all are
  discoverable and preloadable by the harness. The skills' base contract is published at
  `.agents/skills/README.md` with the shape spec, six required frontmatter keys, five
  required body sections, and seven binding rules for future extensions.
- **Knowledge base** — `specs/current/` (fast-lookup current truth, five capability docs
  covering spec-workflow, pipeline-roles, skill-library, cli-init, tool-generators) and
  `specs/archived/` (historical record of all shipped features). The capability docs state
  current behavior with provenance, invariants, open reservations, contributing features,
  and related ADRs. `specs/current/_index.md` (103 lines, ≤ 150) routes questions by keyword
  (38 keyword rows, ≥ 20) and registers Architecture Decision Records.
- **Architecture Decision Records** — significant decisions from the four migrated features
  are recorded as ADRs under `specs/archived/<feature>/decisions/`, with the adr-template.md
  bundled into the `harny-adr` skill. The ADR numbering is globally monotonic. This feature
  itself generates candidates for the follow-up decision-documentation task, to be recorded
  after approval.
- **Skill synchronization** (`harny-sync`) — two modes (lookup and archive) that maintain
  `specs/current/` and `specs/archived/` as the single source of truth. Lookup reads at most
  4 files and routes new questions. Archive moves a stamped spec directory, re-verifies
  checksums, updates affected capability docs (merging, never overwriting), and regenerates
  the index. Archive is atomic (precondition-gated, checksum-restoring on failure).
- **Documentation hand-off** (`harny-document`) — runs automatically after human approval,
  updates README/CHANGELOG/AGENTS.md, stamps the spec's intent.md in place with `Shipped:
  <date>`, then invokes the archive/ADR/sync chain with the six-step contracted ordering.
- **Scaffolded skill library and parity** — `templates-skill-library-parity` closes the gap
  between harny's own pipeline (which runs eight portable `harny-*` skills via symlinks) and
  the pipeline `npx harny init` scaffolds (which previously had no skills). Every target
  repository now receives the same eight skills as real files (never symlinks), written to
  each tool's native skill-discovery root: `.claude/skills/` for Claude Code, `.kiro/skills/`
  for Kiro, and `.agents/skills/` for Cursor, GitHub Copilot, and Codex. Six skills are
  always scaffolded (`harny-propose`, `harny-test`, `harny-implement`, `harny-audit`,
  `harny-document`, `harny-sync`); two are optional and selectable via `--skills`
  (`harny-adr` and `harny-standards`, with `harny-standards` included by default). The
  scaffolder now writes 20 files for a single tool (6 roles + 1 conductor + 6 core skills +
  6 shared) or 60 files for all five tools (30 tool-specific + 24 skill copies across three
  roots + 6 shared). All skills are portable (no tool-specific frontmatter) and conform to
  the Agent Skills specification.

### Changed

- The `.gitignore` now includes all of `specs/` (both `current/` and `archived/`, plus in-flight
  feature work under `specs/<feature-name>/`) so the knowledge base is tracked in version
  control and durable across clones, per Amendment A2. Agent files (`.claude/agents/sdd-*.md`)
  remain gitignored and local, per the contracted design. The eight bridge symlinks stage at
  git mode `120000` for symlink durability.

- `npx harny init` — a CLI for scaffolding the SDD pipeline into any target
  repository. Supports interactive mode (six questions: tool selection, enabled
  roles, optional skills, per-role model tier, active gates, project stack) and
  non-interactive modes (`--yes` for defaults, `--config` for a saved configuration
  file, `--dry-run` to preview). Supports per-flag overrides: `--tools`, `--roles`,
  `--skills`, `--model`, `--gates`, `--stack`. Exit codes map to error types; writes
  nothing when any path already exists unless `--force` is given. Includes `npm run
  build` (TypeScript to `dist/`), `npm run typecheck`, and `npm test` (vitest).
- Reference generator for Claude Code, proving the `Generator` adapter interface:
  reads abstract role templates (with cost-tier and capabilities), maps tiers to
  Claude model ids (most-capable→opus, mid→sonnet, cheapest→haiku), renders
  Markdown+YAML agent frontmatter, and generates the conductor Skill.
- Three more per-tool generators — Cursor, Kiro, and GitHub Copilot — proving the
  same `Generator` interface holds across tools with materially different agent
  formats, frontmatter keys, and capability models. Each generator's paths, file
  extensions, frontmatter fields, and model identifiers are verified against
  current vendor documentation, with sources and verification date recorded in
  `specs/cursor-kiro-copilot-generators/contract.md`. `--tools` now accepts
  `claude-code`, `cursor`, `kiro`, and `github-copilot` as shipped, selectable
  tools, plus `all`.
- The fifth per-tool generator — **Codex CLI** — completing the initial target set.
  Codex generates `.codex/agents/sdd-*.toml` files (TOML format, distinct from the
  Markdown+YAML format of the other four tools) and a shared Markdown conductor
  artifact at `.agents/skills/sdd-conductor/SKILL.md`. A new `src/generators/toml.ts`
  wrapper module owns all TOML syntax emission (exact analogue of `markdown-yaml.ts`
  for the other four), ensuring that `src/generators/codex.ts` contains no TOML syntax
  literals itself. All five Codex paths, keys, model ids, and sandbox-mode semantics
  are verified against first-party Codex documentation (sources and verification date
  in `specs/codex-generator/contract.md`). With Codex, `--tools` now accepts all five
  tools, and `availableToolIds()` returns all five.
- Spec-schema pointer block appended to every generated role artifact, across all
  four shipped generators (including a retrofit onto Claude Code's own output),
  making the deployed `.sdd/spec-schema/` directory reachable from inside a
  generated agent file. Closes audit finding AL-5.
- Shared rendering helpers `yamlFlowSequence` and `renderSpecSchemaPointerBlock`
  in `src/generators/markdown-yaml.ts`, keeping YAML formatting and spec-schema
  block placement consistent across all Markdown+YAML target tools.
- Spec-schema deployment: the five spec-schema templates from `templates/` are
  written to `.sdd/spec-schema/` in the target repo, so the architect role's
  internal schema references resolve after generation.
- Configuration persistence: the resolved `HarnessConfig` is written to
  `.sdd/harness.json` for later use (e.g., by a future `harness mcp add` command).
- Two open reservations (non-blocking) recorded in the audit: AL-19 (a stale test
  field name in the test suite) and AL-20 (the e2e test suite validates the built
  `dist/` rather than `src/` directly, so a `src/`-only regression escapes until
  someone remembers to rebuild).
- Canonical, tool-agnostic role templates under `templates/roles/` for the full
  five-role SDD pipeline (`sdd-architect`, `sdd-test-writer`, `sdd-executor`,
  `sdd-auditor`, `sdd-documentation`), reconciled from the two prior Claude-Code-only
  copies with no `tools:` list, model id, or Claude-only path baked in as the source
  of truth — each role instead declares an abstract `cost_tier` and `capabilities`
  set.
- `templates/conductor/sdd-conductor.md` — canonical orchestration content
  describing the five-role pipeline and the three human review gates
  (post-specs, post-red-tests, post-audit), with the documentation hand-off wired
  in as a non-gated automatic step.
- `templates/spec-schema/` — the `intent`/`contract`/`roadmap`/`tasks`/`audit`
  spec templates extracted as standalone files, matching what the architect role
  emits.
- The live `sdd-documentation` agent (`.claude/agents/sdd-documentation.md`) —
  the fifth pipeline role, running automatically after a human approves the
  auditor's `APPROVED` or `APPROVED WITH RESERVATIONS` verdict. It documents only
  what the audit verified and never touches source code or code comments.
- This project's own root documentation: `README.md`, `CHANGELOG.md`, `AGENTS.md`,
  and `CLAUDE.md`.

### Changed

- Generated role artifacts for all four shipped tools now include the
  spec-schema pointer block described above; this applies retroactively to
  Claude Code's output as well, as part of the AL-5 closure.
