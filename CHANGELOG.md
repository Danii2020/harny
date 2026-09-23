# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **CI workflow repository-root placement for monorepo installs** — when `npx harny init` is run in a subdirectory of a git repository, the generated GitHub Actions workflow file is now placed at the repository root (`.github/workflows/`) where GitHub reads it, rather than inside the install directory where it would be silently ignored. The workflow is named after the install path (e.g., `harny-feedback-apps-web.yml` for an install at `apps/web`) to distinguish multiple installs in one repository. All other artifacts (`.sdd/`, agents, skills, MCP config) remain in the install directory. Each generated step carries `working-directory: <component>` so lint/type-check commands run scoped to the component, not the whole repository. Implements repository-root placement via a declared write root on `GeneratedFile` (`root?: 'repo'`), adds `src/repo.ts` for git-root detection, and introduces four Architecture Decision Records (ADRs 0031–0034). A second install deriving the same workflow name exits 3 with the path named and writes nothing (no silent overwrites). Preserves byte-identity for root-install workflows and re-proves FC-13's dogfood guarantee. Includes two low-severity findings: a post-write report that does not distinguish writes above the install directory (AL-5), and an untested case of same-slug collision for distinct-directory installs (AL-6). (Shipped 2026-09-23.)

- **Context7 MCP endpoint update and CI push-to-`main` trigger** — four independent maintenance fixes grouped as one feature (dogfood-quick-fixes). (1) The Context7 MCP endpoint harny writes is now `/mcp/oauth` instead of `/mcp`, updated across all five tools' native MCP configuration files via the single constant `CONTEXT7_MCP_URL` in `src/mcp.ts`. The OAuth endpoint was chosen because `/mcp` was observed not to work correctly in practice, though Context7's own per-client examples still document `/mcp`; a deliberate departure recorded here and in ADR 0029. All five generators' generated role artifacts and this repo's own scaffolded hooks carry the updated value; no generator changed, and the single-literal invariant holds. (2) The `sdd-documentation` role now carries an explicit hard rule forbidding `git commit`, `git push`, and `--no-verify` flags. The rule appears in `templates/roles/sdd-documentation.md` § "Step 5: Hard Rules" and identically in both `harny-document` skill roots, reaching all five tools' generated artifacts via the canonical-body mechanism and this repo's own thinned live agent via the skill route. (3) Two obsolete doc comments describing pre-amendment `CommandSpec.extensions` semantics are aligned to the amendment A1 wording already correct in the implementation: `src/feedback.ts`'s own comment and the archived `feedback-path-hygiene` contract's § Interfaces copy. A dated correction note explains that this is a text-only alignment closing AL-11, with A1's history left unchanged. (4) The CI workflow gains a `push` trigger scoped to the `main` branch, complementing the existing `pull_request` trigger, so that direct integration to `main` is checked by the post-integration feedback sensor. This repo's own `.github/workflows/harny-feedback.yml` is regenerated to maintain byte-identity with scaffold output. The `main` branch name is hardcoded—deriving it from each target repo would require either a user prompt, a git shell-out (non-deterministic), or moving trigger logic into the generated block (violating ADR 0015's YAML-free principle). Hardcoding is documented as a one-line hand edit for repos using a different default branch (ADR 0030 records the decision). All 34 contract guarantees pass; three LOW findings record continued investigation paths (AL-4 extension: id-bearing `describe` titles, a continuation of standing AL-4 defect in test naming; DQ-3 extension: non-reproducing e2e parallelism coupling with AL-20, which needs a `package.json` change out of scope; DQ-2 is informational only). Two reservations carry: `R-OAuth` (the generated OAuth config was never loaded into a live tool install), confirmed as part of the human-gated AL-30 / CG-1 class this repo already carries; SC17 (the green `harny-feedback` run on a push to `main` is a post-merge observation, closing `feedback-path-hygiene`'s AL-5). (Shipped 2026-09-22.)

- **Per-turn feedback path filtering** — the turn-based feedback runner now filters per-file commands by file type (extension), preventing false-positive linter findings when a turn edits configuration, workflows, or documentation alongside code. Each per-file command declares optional `extensions` (file suffixes it accepts); touched paths are filtered by extension and existence before reaching the command; an empty filtered set silently skips the command, never spawning it with zero path arguments. CI's whole-project mode (`--whole-project`) bypasses both filters and is unchanged. `ReadinessCommand` forbids `extensions` at compile time (ADR 0018 precedent). This resolves false `E902`/syntax errors when ruff/mypy receive JSON/YAML/Markdown paths; fixes the root cause of incorrect "harness-only" findings on mixed-content turns. All five tool generators' hook configs and the CI workflow serialize the new field automatically via existing `JSON.stringify` calls. Three shipped per-file commands now declare their suffixes: `eslint` gets 8 JS/TS suffixes, while `ruff` and `mypy` each get `.py` and `.pyi`. Generated dogfood artifacts (`.claude/settings.json`, `.github/workflows/harny-feedback.yml`, `.sdd/feedback/run-feedback.mjs`) are regenerated to maintain FC-13 byte identity. Five open reservations carry forward (AL-1 narrowed: only unstat-able-path untested; AL-2/AL-5/AL-8/AL-11 deferred to follow-ups). Accepted by human after post-audit amendment A1, which resolves AL-3: an `extensions` list with no valid entry now means "no filter", matching backward-compatibility intent.

- **Default Context7 MCP server wiring** — the `docs-lookup` capability now works out of the box.
  Every `npx harny init` run writes the default Context7 MCP server configuration into each
  selected tool's native MCP config file (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`,
  `.kiro/settings/mcp.json`, `.codex/config.toml`), so the `mcp__context7__resolve-library-id` /
  `mcp__context7__query-docs` tokens (Claude Code), `@context7` tag (Kiro), and advisory
  capability references (Cursor, GitHub Copilot, Codex) resolve to a real server instead of a
  dangling artifact. The merge-write mechanism (read existing, extend with one entry, preserve
  every other setting) ensures no pre-existing MCP server, unrelated Codex setting, or
  tool-specific configuration is ever destroyed; a file harny cannot safely extend is left
  byte-identical and reported, never mangled. Re-running `init` over a scaffolded repo is safe
  and converges to byte-identical output. The generated configuration uses Context7's
  unauthenticated hosted endpoint and never writes a credential, credential placeholder, or
  environment-variable reference; trust remains gated by each tool's own native approval prompt
  (no auto-trust, no permission widening). Five open reservations carry forward: `R-Cursor`
  (MCP support possibly gated by a settings toggle), `R-Codex` (Desktop may ignore project
  `.codex/config.toml`), and the standing `AL-30` / `CG-1`/`O4` (documentation-verified facts,
  not live-install-verified). Amends five shipped current-truth statements in
  `specs/current/tool-generators.md` and `specs/current/cli-init.md`: `TG-1` (adds declarative
  `mcpConfig` member), `TG-10` (adds one MCP artifact per resolved generator), `CLI-1`/`CLI-4`/`CLI-5`
  (integration into step 11, amended determinism clause, narrow exemption from conflict rule for
  merge-owned paths).

- **AI/SDLC readiness check** — extends `harny-doctor` with a fifth check family, `repo readiness`,
  that assesses whether a target repository carries the baseline documentation an AI coding agent
  needs to work safely. Introduces two priority tiers: **must-have** items (absent means the repo
  reports not ready, exit `6`) and **recommended** items (absent means warn, but never change exit
  code). The new family checks three universal entries — `README.md` (must-have), an architecture
  document (recommended), and per-tool guidance files (recommended, gated by `.sdd/harness.json`)
  — and introduces a fourth outcome, `warn`, to the readiness report. Simultaneously, `harny-doctor`
  gains a coherence-assessment step that reads guidance documents present and judges three
  elements: **purpose** (what is this project?), **components** (what are the main parts?), and
  **validation** (what commands prove a change is good?) — all must-have for the conventions
  document, recommended for README and architecture. When gaps are found, `harny-doctor` reports
  them by name and asks the human whether to delegate drafting to `harny-document`, which now
  offers a **bootstrap mode**: draft repo-level documents from observed repository evidence,
  without an approved audit in play. Five families now run in fixed order: environment → harness
  manifest → **repo readiness (new)** → spec state → tests. Amends two shipped current-truth
  statements in `specs/current/readiness-checks.md`: RD-1/invariant I3 (four families → five),
  and invariant I2 (ready now includes `warn` outcomes). No new CLI verb or flag; `npx harny doctor`
  gains behavior. Writes nothing on any outcome. Open reservations: F2 (RD-R2's recorded rationale
  now obsolete — `stdio: 'inherit'` was replaced during post-audit fix, so the stated cause is
  false even though the effect is unchanged and intentional), F3 (live streaming lost, stderr
  re-routed to stdout), F4 (bootstrap mode's refusals weakly tested), F5 (SC7/AR-7 tension),
  F6 (README behavior 4 replaced rather than extended), F7 (only family 3 visually labelled),
  F8 (`DoctorResult.ran` overstates its contents).

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
