# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed

- **`harny doctor`'s shipped-but-unarchived check now sees the stamp it was built to
  find (`RC-19`).** The check matched `specs.shippedMarker` at the exact start of an
  `intent.md` line, so it recognised only a bare `Shipped: <date>`. The documentation
  role stamps the **bolded** `**Shipped: <date>**`, which that match missed entirely —
  leaving 6 of 14 archived specs invisible to it, including `dogfood-quick-fixes` and
  `ci-workflow-root`, two of the three tail-drop reproductions the check is meant to
  catch. A `--only spec-state` run over a bold-stamped stranded spec exited `0`: a
  green that had seen nothing. The marker is now matched after stripping a line's
  leading Markdown emphasis, list-item, blockquote and heading punctuation, at the line
  start only — never as a substring, so prose that merely names the marker is still not
  a stamp. `checks.json` is unchanged, so an older checks file keeps working. The defect
  predated the family selector below (byte-identical at `d3c2741`); that feature made it
  load-bearing, and it was found by probe immediately before commit rather than by any
  pipeline gate. Covered by seven tests spanning five markup forms and two
  false-positive guards; the archived `intent.md` carries a dated correction note
  retracting its claim that the check "would have caught all three reproductions".

- **Documentation role's archive hand-off no longer completes by narration** —
  `sdd-documentation` had reliably reproduced the same failure three times across two
  features: it would finish the README/CHANGELOG/AGENTS.md updates and the `Shipped:`
  stamp, then hand the archive move, ADR generation, and capability-doc sync back as
  "next steps required" instead of performing them — even once, with an invocation
  brief that explicitly warned it not to. A layered fix, each layer's strength stated
  honestly rather than oversold. **Load-bearing (L1):** `templates/doctor/run-doctor.mjs`
  gains an optional `--only <family>` selector (`environment` / `harness` /
  `repo-readiness` / `spec-state` / `tests`) that runs one of the five existing check
  families alone — reusing family 4's existing shipped-but-unarchived detector rather
  than authoring a second one — and spawns no command from the `tests` family, so it is
  cheap enough to run at the end of every documentation turn. Its absence reproduces
  today's five-family output byte for byte; an unrecognized or value-less `--only` is a
  usage error (exit `1`), never a silently-empty, falsely-ready run. Both the role
  template and the conductor now treat "no failing spec-state line for this feature" as
  a **precondition on reporting completion**, checked with `node .sdd/doctor/run-doctor.mjs
  --only spec-state`, rather than trusting the role's own narration — the conductor
  verifies the archive itself before declaring the pipeline done, the same "a role
  should not be trusted to certify its own gate" principle it already applies elsewhere.
  **Probability reduction at the source (L2):** `sdd-documentation` is raised from
  `cost_tier: cheapest` to `mid`, with a `cost_rationale` that no longer claims the role
  performs no independent verification — it orchestrates a three-call knowledge-base
  hand-off and must now verify the archive landed. This propagates to all five tools
  through each generator's existing tier→model map with no generator change; `COST_TIERS`
  is unchanged and `cheapest` becomes unoccupied by the five default roles, not removed
  — it stays reachable via a `--model` override or a custom role (amends
  `specs/current/pipeline-roles.md` PR-2, declared as **amended, not repealed**: only the
  documentation clause changes). **Defence in depth (L3):** the role template and both
  `harny-document/SKILL.md` copies are brought back to parity on the hand-off's tail —
  the role template previously named `harny-adr` zero times — and both now state the
  completion precondition identically; the completion-precondition text reaches all five
  generators' `sdd-documentation` artifact verbatim, with no generator change, and no
  other role; and this repo's own live `.claude/skills/sdd-conductor/SKILL.md`, which had
  drifted to not mention the documentation stage at all, is repaired to match the shipped
  conductor template, guarded going forward by a presence-gated parity test that skips
  cleanly (never fails) when that untracked file is absent, e.g. in CI. **Stated limit,
  in the same breath as the guarantee:** this feature does **not** guarantee the archive
  always happens. The check's *judgment* is deterministic — an exit code, not a
  narration — but its *invocation* remains an agent instruction, so an agent that drops
  the hand-off can still drop the verification step after it; the unchanged backstop is
  `harny-doctor`'s next session-start run. Adds ADRs 0035–0037 (verify via the existing
  detector rather than new prose or a second check; raise the tier and leave `cheapest`
  unoccupied; guard the untracked live conductor by presence rather than tracking it or
  leaving it unguarded). 730 passing / 1 failing baseline preserved (the sole failure is
  the pre-existing, unrelated `tests/packaging.test.ts` vitest pin). Verdict: **APPROVED
  WITH RESERVATIONS**, not rounded up. Open reservations carried forward: RC-R1 (MEDIUM,
  deliberate — the residual tail-drop risk described above is explicitly not closed by
  this audit); RC-R4 (MEDIUM — the live conductor's repair is itself covered by no
  commit, since `.claude/skills/sdd-conductor/` is gitignored); RC-R7 (LOW, new — the
  dogfood byte-identity check this feature depends on, FC-13/T24, has no automated test,
  only a manual audit-time verification); AL-2 and AL-3 (LOW — the tests' pinned
  acceptance substrings for the completion precondition and its per-generator
  propagation are looser than the guarantees they stand for, verified to hold today only
  by independent auditor re-derivation); AL-5 (LOW — a misconfigured `specs.dir` still
  yields a green `--only spec-state` run indistinguishable from a genuinely clean repo,
  pre-existing family-4 behavior this feature deliberately reuses rather than changes).
  Worth recording plainly: this feature's own archive was the first live exercise of the
  mechanism it builds, and this repo's live documentation agent was moved from `haiku` to
  `sonnet` immediately before this run — so a clean archive here reflects the tier change
  and the new verification step together, and, being a single data point, is evidence at
  n = 1, not confirmation that RC-R1 is closed. (Shipped 2026-09-23.)

### Added

- **Sub-agent feedback hooks** (`subagent-feedback-hooks`). Claude Code, Cursor and
  Codex now register their sub-agent completion event (`SubagentStop`, `subagentStop`,
  `SubagentStop`) in the hook file they already generate, beside the turn-completion
  event. The new registration runs the same runner, `run` mode and inline `--commands`
  payload, plus a new boolean flag, `--keep-turn`. It never passes `--whole-project`.
  `--keep-turn` is identical to a normal `run` except that the turn file is not
  deleted; it has no effect under `--whole-project`. A sub-agent therefore sees its
  findings at its own stop, and the parent's turn-completion run still sees the same
  paths and clears them. Delivery is at-least-once: a finding may be reported twice,
  and is never consumed and dropped by the earlier check.
  - Claude Code's wrapper now takes the event name as a parameter, so it emits
    `hookEventName: "SubagentStop"` for the new registration (a mismatch would be
    silently dropped).
  - The Cursor and Codex wrappers stay one shared script that now forwards trailing
    arguments to the runner.
  - Kiro and GitHub Copilot hook files are unchanged. No new artifact, path or
    `Generator` member was added.
  - `templates/hooks/README.md` gains an eighth tool-neutral behavior property and
    dated per-tool examples.
  - This repo's own `.claude/settings.json` and two golden fixtures were regenerated.

  Audit verdict: **APPROVED WITH RESERVATIONS**. The auditor drove all three tools'
  generated sub-agent commands end to end against the real runner. The suite is
  841/841. Open reservations:
  - **F1 (HIGH):** no test executes the Cursor or Codex sub-agent wrapper, so the
    argument forwarding that carries `--keep-turn` on those two tools has no
    regression guard. It works today.
  - **F4 (LOW):** the two regenerated `.claude/settings.json` goldens are excluded from
    byte comparison.
  - **F6 (LOW):** contract IDs appear in test names (the standing AL-4 class).
  - **F7 (LOW):** the live `.turns/` probe was not run. Whether Codex sub-agent edits
    share the stop's `turn_id`, and whether Cursor's `afterFileEdit` fires inside a
    sub-agent, remain open, so on those tools the registration may be inert.

  (Shipped 2026-09-24.)

- **One install, many components (`monorepo-mode`)** — a single harny install can now
  declare `components: [{ path, stack }]` in `.sdd/harness.json` instead of one `stack`,
  so a repository with a Python backend and a TypeScript frontend needs **one** install
  rather than two. Components are declared with the repeatable
  `--component <path>=<stack>` flag (`--component .=python --component apps/web=typescript`),
  through a `--config` file, or by answering the new "Is this a single repo or a
  monorepo?" question in interactive `init`, which presets and reports itself when
  `--stack` or `--component` was supplied on the command line. `stack` and `components`
  are mutually exclusive from one source: supplying both is a usage error (exit 2) naming
  both fields, with no precedence rule and no silent winner. **What does not change is the
  point**: a multi-component install writes the same path set a single-stack install
  writes — one `.sdd/`, one copy of every role and skill per distinct skill root, one
  feedback runner, one readiness runner, one `probes.mjs`, one hook config per tool, one
  CI workflow, one spec-schema set, and therefore one `specs/` and one ADR sequence for
  the whole repository. Components change what those artifacts do, never how many exist,
  which is what dissolves the duplicate-runner and duplicate-ADR-registry gaps recorded
  while dogfooding a two-install monorepo on 2026-09-20. **Per-turn feedback** assigns
  each touched path to the single component whose declared directory is its longest
  **segment**-prefix — `apps/web-admin/x.ts` resolves to `apps/web-admin`, never to
  `apps/web`, and `.` is an ordinary zero-segment component that wins only when nothing
  longer matches — then runs that component's commands, with that component's directory as
  both the `spawnSync` cwd and the `requires` probe root, seeing only that component's
  paths. A `whole-project` command (what CI runs) runs once per component that has **at
  least one assigned touched path**, from that component's own directory, and not at all
  for components with none; the gate is assignment, not the per-file extension filter. A
  touched path belonging to no declared component runs no command and is dropped with
  exactly one stderr notice naming the count — never reassigned to a default, never
  silent. A declared component whose directory is absent at runtime is skipped wholesale
  with one notice naming it and its command count, counted as skipped in the
  `--whole-project` summary, and the directory is never created. An unrecognized component
  stack stays inert rather than fatal: every artifact is still written, that component
  contributes no commands, and `init` warns once naming the component path and the value.
  **`npx harny doctor`** runs each component's test command from that component's own
  directory — the component directory travels as a `dir` field on the generated
  `checks.json` entry, never as a field on `CommandSpec`, so `run-doctor.mjs` acquires no
  component literal (`command.dir ?? '.'` is its only change), `checks.json` stays at
  `version: 1`, and a pre-feature `checks.json` behaves byte-identically. **CI stays one
  workflow with one job** at the git root: one runner step for the whole install plus at
  most one dependency-install step per component, each scoped with `working-directory`,
  and none of `strategy:`, `matrix:`, a second workflow, `on.*.paths` or
  `defaults.run.working-directory`. No generator learns what a component is — the
  `Generator` interface gains no member, `src/feedback.ts` and `src/repo.ts` are unmodified,
  and the only component vocabulary under `src/generators/**` is confined by a grep gate to
  `renderProjectConfigBlock` in `markdown-yaml.ts`. **The non-negotiable constraint —
  a `components`-free install is byte-identical to before — was proven, not asserted**:
  golden-byte regression over the whole generated tree for both a root and a subdirectory
  install, independently verified non-vacuous by perturbation (two stray bytes in
  `templates/shared/probes.mjs` turn it red), and an existing `.sdd/harness.json` carrying
  only `stack` loads, merges and round-trips unchanged — never migrated, never warned
  about. No new runtime or dev dependency, no new file under `templates/` (still
  thirty-one), no new generated path. Adds ADRs 0038–0042 (`components` replaces `stack`
  rather than coexisting as a fallback; longest **segment**-prefix match with an
  unassigned path dropped rather than defaulted; the component list travels on the payload
  rather than as a new `CiPlacement` field, a declared departure from `ci-workflow-root`
  XC-6's anticipated mechanism; `whole-project` once per *affected* component; `dir` on the
  generated checks entry). Suite: **828 passing, 0 failing, 0 skipped (33 files)**; `build`
  and `typecheck` clean. Verdict: **APPROVED WITH RESERVATIONS** — round 1 was REJECTED on
  a CRITICAL defect (a lone non-`.` component's readiness command ran at the install root
  instead of the component's directory, a silent false-readiness verdict); the fix names
  the two previously-conflated boundaries as exported predicates and was
  perturbation-proved closed. **Four deferred findings are carried as accepted
  reservations, knowingly**: **F2 (HIGH)** — the `stack`/`components` exclusivity check
  runs on the writing path only, so a **hand-edited** `.sdd/harness.json` carrying both
  fields is accepted silently by `npx harny doctor` with `components` winning (harny itself
  never writes both); **F3 (HIGH)** — the turn-mode half of the absent-component-directory
  error row is reachable and untested, and the audit corrects the earlier note that claimed
  it unreachable; **F4 (MEDIUM)** — `--component .=python`, a single `.` component, renders
  the generated conductor's project-configuration block with **neither** a `Project stack:`
  line nor a `Component:` line, so an agent reading that block cannot tell the project is
  Python (write that shape as `--stack python` meanwhile); **F5 (MEDIUM)** — all five
  `renderHook`s ship a `payload.commands ?? profile.commands` fallback rather than the
  contracted literal `payload.commands`, ruled acceptable because the field is non-optional
  and the fallback is unreachable in production, but five test fixtures now build payloads
  missing a required field. Also carried: **F6** — settled by human decision, `tests/packaging.test.ts`
  keeps a key-set-only dependency assertion, which means `AGENTS.md` S4 has lost mechanical
  version-drift detection and has no replacement enforcement point (now recorded in
  `AGENTS.md`); **F8 (MEDIUM)** — the per-turn feedback hook could not be confirmed to have
  fired during implementation (`.sdd/feedback/.turns/` carries a nine-day-stale mtime), the
  one open question about process rather than code; plus LOW items F7 and MC-5's wording
  versus MC-14's mandate, F9 (no green CI run on the shipping commit yet), F10 (MC-11's "N
  is always 0" is not strictly true for a touched path outside the install directory), F11
  (the repo-shape question is asked fourth, before the stack question, not literally
  first), F12, F13, MC-20's id-suffix wording, and the unguarded predicate duplication at
  `src/generators/markdown-yaml.ts:62`. (Shipped 2026-09-23.)

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
