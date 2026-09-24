# Current-State Specifications

> Current truth for this repo. Maintained by `harny-sync`; do not hand-edit.
> Last synced: 2026-09-23 by monorepo-mode (archive mode: feature archived, capability docs updated, ADRs 0038–0042 registered)

## Capabilities

| Capability | Current-State Specification | Incorporated Changes |
|---|---|---|
| spec-workflow | [spec-workflow.md](./spec-workflow.md) | [canonical-role-templates](../archived/canonical-role-templates/), [cli-skeleton](../archived/cli-skeleton/), [sdd-skill-library](../archived/sdd-skill-library/), [templates-skill-library-parity](../archived/templates-skill-library-parity/) |
| pipeline-roles | [pipeline-roles.md](./pipeline-roles.md) | [canonical-role-templates](../archived/canonical-role-templates/), [sdd-skill-library](../archived/sdd-skill-library/), [templates-skill-library-parity](../archived/templates-skill-library-parity/), [ai-sdlc-readiness](../archived/ai-sdlc-readiness/), [dogfood-quick-fixes](../archived/dogfood-quick-fixes/), [documentation-role-completion](../archived/documentation-role-completion/) |
| skill-library | [skill-library.md](./skill-library.md) | [sdd-skill-library](../archived/sdd-skill-library/), [templates-skill-library-parity](../archived/templates-skill-library-parity/), [dogfood-quick-fixes](../archived/dogfood-quick-fixes/), [documentation-role-completion](../archived/documentation-role-completion/) |
| cli-init | [cli-init.md](./cli-init.md) | [cli-skeleton](../archived/cli-skeleton/), [templates-skill-library-parity](../archived/templates-skill-library-parity/), [context7-mcp](../archived/context7-mcp/), [dogfood-quick-fixes](../archived/dogfood-quick-fixes/), [ci-workflow-root](../archived/ci-workflow-root/), [monorepo-mode](../archived/monorepo-mode/) |
| tool-generators | [tool-generators.md](./tool-generators.md) | [cli-skeleton](../archived/cli-skeleton/), [cursor-kiro-copilot-generators](../archived/cursor-kiro-copilot-generators/), [codex-generator](../archived/codex-generator/), [templates-skill-library-parity](../archived/templates-skill-library-parity/), [ai-sdlc-readiness](../archived/ai-sdlc-readiness/), [context7-mcp](../archived/context7-mcp/), [dogfood-quick-fixes](../archived/dogfood-quick-fixes/) |
| feedback-controls | [feedback-controls.md](./feedback-controls.md) | [agent-feedback-controls](../archived/agent-feedback-controls/), [feedback-path-hygiene](../archived/feedback-path-hygiene/), [dogfood-quick-fixes](../archived/dogfood-quick-fixes/), [ci-workflow-root](../archived/ci-workflow-root/), [monorepo-mode](../archived/monorepo-mode/) |
| readiness-checks | [readiness-checks.md](./readiness-checks.md) | [readiness-doctor](../archived/readiness-doctor/), [ai-sdlc-readiness](../archived/ai-sdlc-readiness/), [feedback-path-hygiene](../archived/feedback-path-hygiene/), [ci-workflow-root](../archived/ci-workflow-root/), [documentation-role-completion](../archived/documentation-role-completion/), [monorepo-mode](../archived/monorepo-mode/) |

## Keyword lookup

> If your question mentions a term on the left, read the capability on the right first.

| Term | Capability |
|---|---|
| cost_tier | pipeline-roles |
| capabilities (vocabulary) | pipeline-roles |
| git commit / push (role safety) | pipeline-roles |
| docs-lookup / Context7 / MCP | pipeline-roles, cli-init |
| OAuth / mcp/oauth | cli-init |
| merge-write / merge-marked | cli-init |
| git root / repository root | cli-init, feedback-controls |
| monorepo / subdirectory install | feedback-controls, cli-init |
| components | feedback-controls, cli-init |
| monorepo mode | feedback-controls |
| --component | cli-init |
| per-component dispatch | feedback-controls |
| longest-prefix match | feedback-controls |
| component directory / dir field | readiness-checks, feedback-controls |
| write root | cli-init |
| workflow file name | feedback-controls |
| human gate / verdict | pipeline-roles |
| spec-schema | spec-workflow |
| traceability | spec-workflow |
| Shipped: header | spec-workflow |
| archive / archived | spec-workflow |
| specs/current | spec-workflow |
| harny-* skill | skill-library |
| SKILL.md | skill-library |
| frontmatter (portable keys) | skill-library |
| allowed-tools | skill-library |
| skills: field | skill-library |
| disable-model-invocation | skill-library |
| symlink | skill-library |
| ADR | skill-library |
| harny-sync | skill-library |
| harny-adr | skill-library |
| harny-standards | skill-library |
| AGENTS.md coding standards | skill-library |
| --tools | cli-init |
| --roles / --gates / --model | cli-init |
| exit code | cli-init |
| HarnessError | cli-init |
| determinism | cli-init |
| containment (path) | cli-init |
| trailing newline | cli-init |
| packaging / npm pack | cli-init |
| dry-run | cli-init |
| Generator interface | tool-generators |
| CapabilityMapping | tool-generators |
| TOML | tool-generators |
| wrapper format | tool-generators |
| sandbox_mode | tool-generators |
| model override | tool-generators |
| canonical fidelity | tool-generators |
| .agents/skills | tool-generators, skill-library |
| hook | feedback-controls |
| lint / type-check | feedback-controls |
| CI / GitHub Actions | feedback-controls |
| push trigger / main branch | feedback-controls |
| stack (project) | feedback-controls |
| feedback | feedback-controls |
| doctor | readiness-checks |
| readiness | readiness-checks |
| session start | readiness-checks |
| pre-flight | readiness-checks |
| repo readiness / must-have / recommended | readiness-checks |
| warn outcome | readiness-checks |
| coherence (presence vs. content) | readiness-checks |
| bootstrap mode | pipeline-roles, readiness-checks |
| guidancePath | tool-generators |
| --only / family selector | readiness-checks |
| completion precondition / archive verification | pipeline-roles |
| shipped stamp / marker matching / bolded marker | readiness-checks |

## Synchronized Changes

| Change | Archive | Current-State Specification |
|---|---|---|
| canonical-role-templates | [specs/archived/canonical-role-templates/](../archived/canonical-role-templates/) | [spec-workflow.md](./spec-workflow.md), [pipeline-roles.md](./pipeline-roles.md) |
| cli-skeleton | [specs/archived/cli-skeleton/](../archived/cli-skeleton/) | [spec-workflow.md](./spec-workflow.md), [cli-init.md](./cli-init.md), [tool-generators.md](./tool-generators.md) |
| cursor-kiro-copilot-generators | [specs/archived/cursor-kiro-copilot-generators/](../archived/cursor-kiro-copilot-generators/) | [tool-generators.md](./tool-generators.md) |
| codex-generator | [specs/archived/codex-generator/](../archived/codex-generator/) | [tool-generators.md](./tool-generators.md) |
| sdd-skill-library | [specs/archived/sdd-skill-library/](../archived/sdd-skill-library/) | [spec-workflow.md](./spec-workflow.md), [pipeline-roles.md](./pipeline-roles.md), [skill-library.md](./skill-library.md) |
| templates-skill-library-parity | [specs/archived/templates-skill-library-parity/](../archived/templates-skill-library-parity/) | [spec-workflow.md](./spec-workflow.md), [pipeline-roles.md](./pipeline-roles.md), [skill-library.md](./skill-library.md), [cli-init.md](./cli-init.md), [tool-generators.md](./tool-generators.md) |
| agent-feedback-controls | [specs/archived/agent-feedback-controls/](../archived/agent-feedback-controls/) | [skill-library.md](./skill-library.md), [cli-init.md](./cli-init.md), [tool-generators.md](./tool-generators.md), [feedback-controls.md](./feedback-controls.md) |
| readiness-doctor | [specs/archived/readiness-doctor/](../archived/readiness-doctor/) | [skill-library.md](./skill-library.md), [feedback-controls.md](./feedback-controls.md), [cli-init.md](./cli-init.md), [readiness-checks.md](./readiness-checks.md) |
| ai-sdlc-readiness | [specs/archived/ai-sdlc-readiness/](../archived/ai-sdlc-readiness/) | [readiness-checks.md](./readiness-checks.md), [tool-generators.md](./tool-generators.md), [pipeline-roles.md](./pipeline-roles.md) |
| context7-mcp | [specs/archived/context7-mcp/](../archived/context7-mcp/) | [tool-generators.md](./tool-generators.md), [cli-init.md](./cli-init.md) |
| feedback-path-hygiene | [specs/archived/feedback-path-hygiene/](../archived/feedback-path-hygiene/) | [feedback-controls.md](./feedback-controls.md), [readiness-checks.md](./readiness-checks.md) |
| dogfood-quick-fixes | [specs/archived/dogfood-quick-fixes/](../archived/dogfood-quick-fixes/) | [pipeline-roles.md](./pipeline-roles.md), [skill-library.md](./skill-library.md), [cli-init.md](./cli-init.md), [tool-generators.md](./tool-generators.md), [feedback-controls.md](./feedback-controls.md) |
| documentation-role-completion | [specs/archived/documentation-role-completion/](../archived/documentation-role-completion/) | [pipeline-roles.md](./pipeline-roles.md), [skill-library.md](./skill-library.md), [readiness-checks.md](./readiness-checks.md) |
| monorepo-mode | [specs/archived/monorepo-mode/](../archived/monorepo-mode/) | [feedback-controls.md](./feedback-controls.md), [cli-init.md](./cli-init.md), [readiness-checks.md](./readiness-checks.md) |

## Decisions (ADR registry)

| ADR | Title | Status | Capability | Path |
|---|---|---|---|---|
| 0001 | Symlink bridge for skill discovery | Accepted | skill-library | `specs/archived/sdd-skill-library/decisions/0001-symlink-bridge-for-skill-discovery.md` |
| 0002 | Knowledge base taxonomy — specs/current/ and specs/archived/ | Accepted | spec-workflow | `specs/archived/sdd-skill-library/decisions/0002-knowledge-base-taxonomy-specs-current-and-archived.md` |
| 0003 | Amendment A2 — track all of specs/ | Accepted | spec-workflow | `specs/archived/sdd-skill-library/decisions/0003-amendment-a2-track-all-of-specs.md` |
| 0004 | Non-mutation check — filtered absolute form | Accepted | spec-workflow | `specs/archived/sdd-skill-library/decisions/0004-non-mutation-check-filtered-absolute-form.md` |
| 0005 | Portable skill frontmatter — six keys | Accepted | skill-library | `specs/archived/sdd-skill-library/decisions/0005-portable-skill-frontmatter-six-keys.md` |
| 0006 | Coding standards — single source of truth in AGENTS.md | Accepted | pipeline-roles | `specs/archived/sdd-skill-library/decisions/0006-coding-standards-single-source-in-agents-md.md` |
| 0007 | ADR storage and global monotonic numbering | Accepted | spec-workflow | `specs/archived/sdd-skill-library/decisions/0007-adr-storage-and-global-monotonic-numbering.md` |
| 0008 | Flat OpenSpec-derived capability format | Accepted | spec-workflow | `specs/archived/sdd-skill-library/decisions/0008-flat-openspec-derived-capability-format.md` |
| 0009 | Keep `allowed-tools` key uniformly across all skill roots | Accepted | skill-library | `specs/archived/templates-skill-library-parity/decisions/0009-allowed-tools-key-kept-uniformly-across-roots.md` |
| 0010 | GitHub Copilot skills route to `.agents/skills/` unconditionally | Accepted | tool-generators | `specs/archived/templates-skill-library-parity/decisions/0010-github-copilot-skills-route-to-agents-skills.md` |
| 0011 | Generator interface gains `skillsDir` member; no `renderSkill` method | Accepted | tool-generators | `specs/archived/templates-skill-library-parity/decisions/0011-generator-interface-gains-skillsdir-member.md` |
| 0012 | Skills get stronger fidelity guarantees than roles (Gu 9/10 not TG-3/TG-4) | Accepted | skill-library | `specs/archived/templates-skill-library-parity/decisions/0012-skills-get-stronger-fidelity-guarantees-than-roles.md` |
| 0013 | Template roles remain full-body, not thinned; no thin pointer layer in `templates/` | Accepted | pipeline-roles | `specs/archived/templates-skill-library-parity/decisions/0013-templates-roles-remain-full-body-not-thinned.md` |
| 0014 | renderHook as method on Generator interface (departs from ADR 0011) | Accepted | tool-generators | `specs/archived/agent-feedback-controls/decisions/0014-renderhook-as-method-on-generator-interface.md` |
| 0015 | No YAML dependency in canonical CI workflow | Accepted | feedback-controls | `specs/archived/agent-feedback-controls/decisions/0015-no-yaml-dependency-in-canonical-ci-workflow.md` |
| 0016 | harny-feedback as core-tier skill (always scaffolded) | Accepted | skill-library | `specs/archived/agent-feedback-controls/decisions/0016-harny-feedback-core-tier-skill.md` |
| 0017 | Reuse shared runner in CI via --whole-project flag | Accepted | feedback-controls | `specs/archived/agent-feedback-controls/decisions/0017-reuse-shared-runner-in-ci-via-whole-project-flag.md` |
| 0018 | CommandSpec<K> type-level leak prevention | Accepted | readiness-checks | `specs/archived/readiness-doctor/decisions/0018-commandspeck-type-level-leak-prevention.md` |
| 0019 | Shared probes.mjs extraction | Accepted | feedback-controls | `specs/archived/readiness-doctor/decisions/0019-shared-probes-extraction.md` |
| 0020 | .sdd/harness.json-gated scaffold-artifact checks | Accepted | readiness-checks | `specs/archived/readiness-doctor/decisions/0020-harness-json-gated-scaffold-checks.md` |
| 0021 | NOT_READY exit code taxonomy extension | Accepted | cli-init | `specs/archived/readiness-doctor/decisions/0021-not-ready-exit-code-taxonomy-extension.md` |
| 0022 | A fifth check family, `repo readiness`, rather than more entries in family 2 | Accepted | readiness-checks | `specs/archived/ai-sdlc-readiness/decisions/0022-fifth-check-family-for-repo-readiness.md` |
| 0023 | Must-have/recommended tier split, a new `warn` outcome, and `conventions-doc` stays in family 2 | Accepted | readiness-checks | `specs/archived/ai-sdlc-readiness/decisions/0023-must-have-recommended-tiers-and-warn-outcome.md` |
| 0024 | Presence checked in the deterministic runner; coherence judged one layer up, in the skill | Accepted | readiness-checks | `specs/archived/ai-sdlc-readiness/decisions/0024-presence-in-runner-coherence-in-skill.md` |
| 0025 | `guidancePath` as a declarative `Generator` member, continuing ADR 0011 not ADR 0014 | Accepted | tool-generators | `specs/archived/ai-sdlc-readiness/decisions/0025-guidancepath-as-declarative-generator-member.md` |
| 0026 | Merge-write, never whole-file, for co-owned MCP config | Accepted | cli-init | `specs/archived/context7-mcp/decisions/0026-merge-write-for-mcp-config.md` |
| 0027 | mcpConfig as a declarative Generator member (continuing ADR 0011/0025) | Accepted | tool-generators | `specs/archived/context7-mcp/decisions/0027-declarative-mcpconfig-generator-member.md` |
| 0028 | Path filtering lives only in the per-turn code path; the `.` sentinel bypasses it by construction | Accepted | feedback-controls | `specs/archived/feedback-path-hygiene/decisions/0028-path-filtering-in-turn-based-code-path-only.md` |
| 0029 | Context7 `/mcp/oauth` for all five tools, no per-tool fallback | Accepted | cli-init | `specs/archived/dogfood-quick-fixes/decisions/0029-context7-oauth-endpoint.md` |
| 0030 | Hardcode `main` in the canonical CI push trigger rather than deriving the default branch | Accepted | feedback-controls | `specs/archived/dogfood-quick-fixes/decisions/0030-hardcode-main-ci-trigger.md` |
| 0031 | A declared write root on `GeneratedFile`, never a weakened `assertContained` | Accepted | cli-init | `specs/archived/ci-workflow-root/decisions/0031-declared-write-root.md` |
| 0032 | Scope a subdirectory install with step-level `working-directory`, no `paths:` filter | Accepted | feedback-controls | `specs/archived/ci-workflow-root/decisions/0032-step-scoping-no-paths-filter.md` |
| 0033 | Detect the repository root by walking for a `.git` entry, not by shelling out to `git rev-parse` | Accepted | cli-init | `specs/archived/ci-workflow-root/decisions/0033-walk-git-dont-shell.md` |
| 0034 | Derive the workflow file name from the install prefix; surface a name collision as `CONFLICT` rather than resolving it | Accepted | feedback-controls | `specs/archived/ci-workflow-root/decisions/0034-slug-collision-conflict.md` |
| 0035 | Verify the archive with the existing spec-state detector via a family selector, not with new advisory prose or a second check | Accepted | readiness-checks | `specs/archived/documentation-role-completion/decisions/0035-family-selector-not-new-check.md` |
| 0036 | Raise `sdd-documentation` to `mid`; leave `cheapest` unoccupied rather than reassigning another role to it | Accepted | pipeline-roles | `specs/archived/documentation-role-completion/decisions/0036-raise-documentation-tier-to-mid.md` |
| 0037 | Guard the untracked live conductor with a presence-gated parity test rather than tracking the file or leaving it unguarded | Accepted | pipeline-roles | `specs/archived/documentation-role-completion/decisions/0037-presence-gated-conductor-guard.md` |
| 0038 | `components` replaces `stack`, mutually exclusive, never a fallback | Accepted | cli-init | `specs/archived/monorepo-mode/decisions/0038-components-replaces-stack.md` |
| 0039 | Longest segment-prefix match; an unassigned path is dropped with a notice | Accepted | feedback-controls | `specs/archived/monorepo-mode/decisions/0039-longest-segment-prefix-match.md` |
| 0040 | The component list travels on the payload, not as a new `CiPlacement` field | Accepted | cli-init | `specs/archived/monorepo-mode/decisions/0040-component-list-on-payload-not-ciplacement.md` |
| 0041 | A `whole-project` command runs once per component with an assigned touched path | Accepted | feedback-controls | `specs/archived/monorepo-mode/decisions/0041-whole-project-per-affected-component.md` |
| 0042 | Component scoping for readiness is a `dir` field on the generated checks entry, never on `CommandSpec` | Accepted | readiness-checks | `specs/archived/monorepo-mode/decisions/0042-dir-on-generated-checks-entry.md` |

## Open reservations

> Non-blocking findings accepted at ship time and still open.

| ID | Reservation | Severity | Source | Capability |
|---|---|---|---|---|
| AL-19 | Stale test field name: a test's title can overstate its coverage after a refactor removes the field it exercised | MEDIUM | `specs/archived/cli-skeleton/audit.md` AL-19 | cli-init |
| AL-20 | The e2e suite validates built `dist/`, not `src/` — `npm test` alone can false-green a `src/`-only regression | MEDIUM | `specs/archived/cli-skeleton/audit.md` AL-20 | cli-init |
| DQ-3 | A non-reproducing `tests/e2e-init.test.ts` parallelism failure observed during full-suite audit. `bin/harness.js` spawns from `dist/`, and a parallel `npm run build` overlapping an e2e run can have the spawned CLI read a partially-written `dist/`. The fix needs a `pretest` build script or `e2e` file serialization (a `package.json` change out of this feature's scope). Same coupling class as AL-20, but in race form rather than staleness form. | LOW (new) | `specs/archived/dogfood-quick-fixes/audit.md` DQ-3 | cli-init |
| AL-30 | Per-tool facts (Cursor/Kiro/Copilot) were never re-verified against a live tool install | MEDIUM (human-gated) | `specs/archived/cursor-kiro-copilot-generators/audit.md` AL-30 | tool-generators |
| CG-1 / O4 | Codex facts independently re-confirmed 2026-09-02, but the generated artifact set was never loaded into a live Codex CLI install | MEDIUM (human-gated) | `specs/archived/codex-generator/audit.md` CG-1, O4, CG-12 | tool-generators |
| AL-S15 | `contract.md` § Amendment A1 still prescribes a before/after differential mechanism not shipped; the delivered form is filtered absolute. Contract, roadmap, and tasks text all describe the superseded mechanism and must be corrected before archival. | MEDIUM | `specs/archived/sdd-skill-library/audit.md` AL-S15 | skill-library |
| R1 | Kiro docs disagree on post-file-save event casing (`agentStop` vs. older `PostFileSave` example). Shipped with camelCase `agentStop` per V6 types page; unverifiable without live Kiro run. | MEDIUM (human-gated) | `specs/archived/agent-feedback-controls/audit.md` R1 | feedback-controls |
| R2 | SC13 (live-session hook firing) unverifiable in audit session; requires human restart and re-entry. Accumulator half was observed firing live; Stop delivery was executed verbatim; only in-context delivery remains. | MEDIUM (human-gated) | `specs/archived/agent-feedback-controls/audit.md` R2 | feedback-controls |
| R5 | Kiro's and GitHub Copilot's post-edit payload field shape is assumed but not cited. AL-30 class: wrong field name exits 0 recording nothing. | MEDIUM (human-gated) | `specs/archived/agent-feedback-controls/audit.md` R5 | feedback-controls |
| R6 | Python profile CI gate is deliberately probe-skip-only (no install, both ruff/mypy skip on stock runner). Closeable only by a future feature adding `ciInstall`. | MEDIUM (scope, deliberate) | `specs/archived/agent-feedback-controls/audit.md` R6 | feedback-controls |
| R7 | TypeScript install candidates cover npm only; pnpm/Yarn-Berry can re-enter F1. Needs `localBinary` probe kind (out of A1 scope). | MEDIUM (design, deferred) | `specs/archived/agent-feedback-controls/audit.md` R7 | feedback-controls |
| R8 | Only `Stop` is hooked, never `SubagentStop` — Stop fires only for the main conversation, so in a conductor-orchestrated pipeline the check only runs when the conductor's own turn ends, never while a subagent is working; a mid-implementation broken state inside a subagent's own turn is never caught live. Whether `PostToolUse` accumulation still attributes subagent edits to the same turn key as the conductor (so they're swept up at that next `Stop`) is plausible but not independently confirmed. Never examined when `agent-feedback-controls` shipped. | MEDIUM (design, unexamined) | `specs/current/feedback-controls.md` R8 — context7-mcp dogfood observation, 2026-09-15 | feedback-controls |
| AL-S16 | The T41 filter is status-blind and hardcodes eight skill names. A modification of a tracked bridge symlink may escape detection, and a ninth `harny-*` skill causes false positive. Must filter on `?? ` + `harny-` discovery pattern. | MEDIUM | `specs/archived/sdd-skill-library/audit.md` AL-S16 | skill-library |
| CR-1 | Live discovery of a symlinked skill and warning-free `skills:` preloading are unverified in-session (require a Claude Code restart) | MEDIUM | `specs/archived/sdd-skill-library/audit.md` "Carried reservations" | skill-library |
| CR-2 | The entire live pipeline depends on the `.agents`↔`.claude` symlink bridge surviving | LOW | `specs/archived/sdd-skill-library/audit.md` "Carried reservations" | skill-library |
| AL-P3 | `templates/skills/harny-test/SKILL.md` ships hard, unhedged dependency on non-scaffolded `high-value-tests` skill; `templates/roles/sdd-test-writer.md:34` handles the same case correctly with a hedge | MEDIUM (design, deferred) | `specs/archived/templates-skill-library-parity/audit.md` AL-P3 | skill-library |
| AL-P6 | All seven `allowed-tools` values are comma-separated, contradicting V4 (space-separated per portable spec); `templates/skills/README.md:24` documents the non-conforming form as canonical | MEDIUM (design, deferred) | `specs/archived/templates-skill-library-parity/audit.md` AL-P6 | skill-library |
| AL-P7 | `intent.md` SC11's interactive `io.warn` branch is not implemented; the branch built at `src/init.ts:124–133` is structurally unreachable | MEDIUM (design, deferred) | `specs/archived/templates-skill-library-parity/audit.md` AL-P7 | cli-init |
| AL-P12 | `templates/skills/harny-implement/SKILL.md:46` and `harny-propose/SKILL.md:37` name `CLAUDE.md` as *the* conventions source; pre-existing role templates already say "`CLAUDE.md`, `AGENTS.md`, or equivalent" | MEDIUM (design, deferred) | `specs/archived/templates-skill-library-parity/audit.md` AL-P12 | pipeline-roles |
| AL-P8 | Contract ids appear in four test names where `AGENTS.md` S6 forbids them; standard is already systemically unmet and needs clarification | LOW (documentation) | `specs/archived/templates-skill-library-parity/audit.md` AL-P8 | cli-init |
| AL-P9 | A ninth skill directory in `templates/skills/` would be silently never shipped; no test detects it at authorship time | LOW (design) | `specs/archived/templates-skill-library-parity/audit.md` AL-P9 | skill-library |
| AL-P10 | Three new/updated tests are weaker than their guarantee; three edge cases have downgraded assertions or leftover type casts | LOW (test quality) | `specs/archived/templates-skill-library-parity/audit.md` AL-P10 | cli-init |
| RD-R1 | `run-doctor.mjs` hard-codes schema file names `intent.md` and `audit.md` rather than receiving them from `--checks`, violating BG-3's "no schema file name literal" guarantee | MEDIUM | `specs/archived/readiness-doctor/audit.md` F3 | readiness-checks |
| RD-R2 | `DoctorResult.skipped`/`.failed` are structurally never populated — not because no channel exists (captured pipes now do), but because parsing that output into per-check structured outcomes was deliberately declined by design | MEDIUM | `specs/archived/readiness-doctor/audit.md` F5; wording corrected `specs/archived/ai-sdlc-readiness/audit.md` F2 | readiness-checks |
| RD-R3 | No test covers `CLI-5` (conflict rule) on the three new generated paths, verified manually only | MEDIUM | `specs/archived/readiness-doctor/audit.md` F6 | readiness-checks |
| RD-R4 | `SC19` CLI test no longer exercises the path its own rationale names: both test runs are guaranteed never to spawn a test command | MEDIUM | `specs/archived/readiness-doctor/audit.md` F7 | readiness-checks |
| RD-R5 | No automated test drives verb + direct invocation against one shared fixture (RD-7); more consequential since ai-sdlc-readiness's F1 (resolved) showed this is exactly the gap class that let a real disagreement ship undetected | MEDIUM | `specs/archived/readiness-doctor/audit.md` F2, T26, T28; escalated `specs/archived/ai-sdlc-readiness/audit.md` F1, C16 | readiness-checks |
| RD-R6 | Captured-pipe `stdio` mode loses live streaming and routes runner stderr through `io.log` instead of `io.warn` | MEDIUM | `specs/archived/ai-sdlc-readiness/audit.md` F3 | readiness-checks |
| RD-R7 | `harny-document` bootstrap mode's test assertion is weak — 4 of 5 required substrings pre-existed the feature | MEDIUM | `specs/archived/ai-sdlc-readiness/audit.md` F4 | readiness-checks |
| RD-R8 | AR-16/RD-7 agreement now bounded at 64 MiB (`DOCTOR_RUNNER_MAX_BUFFER`); undocumented in `contract.md` | LOW | `specs/archived/ai-sdlc-readiness/audit.md` F12 | readiness-checks |
| RD-R9 | `'CLAUDE.md'` remains a literal in `src/doctor.ts` (`conventions-doc`) and `src/generators/claude-code.ts`, an accepted exception since moving `conventions-doc` was out of scope | LOW | `specs/archived/ai-sdlc-readiness/audit.md` F5 | readiness-checks |
| AL-2 | `assertRepoRootPermitted`'s doc comment overstates what it bounds; it constrains the declared *root*, not the destination path, though narrowness of destination rests on ADR 0031's single declaration site (WR-5) | LOW | `specs/archived/ci-workflow-root/audit.md` AL-2 | cli-init |
| AL-3 | The WR-5 grep gate matches only single quotes; a `root: "repo"` assignment in double quotes would pass undetected (theoretical today, repo style is single quotes throughout) | LOW | `specs/archived/ci-workflow-root/audit.md` AL-3 | cli-init |
| AL-4 | The no-repository warning uses past tense ("was written") but fires before any write and under `--dry-run`; prefer future tense ("will be written") | LOW | `specs/archived/ci-workflow-root/audit.md` AL-4 | cli-init |
| AL-5 | The CLI's post-write report (`src/cli.ts:145`) lists no paths, so a subdirectory install's single out-of-target write is indistinguishable; `InitResult.written` correctly carries `../`-prefixed paths, but the CLI's human-facing message does not | LOW | `specs/archived/ci-workflow-root/audit.md` AL-5 | cli-init |
| AL-6 | Same-slug collision across distinct directories (e.g., `apps/web` and `apps-web`) has no automated test; verified by hand and behaves correctly, but ADR 0034's rule needs a regression guard | LOW | `specs/archived/ci-workflow-root/audit.md` AL-6 | feedback-controls |
| AL-8 | `AGENTS.md` S6 forbids contract ids in test names; the suite already violates this systematically, and this feature follows that observed convention; reconciliation is repo-wide, not this feature's to fix | LOW | `specs/archived/ci-workflow-root/audit.md` AL-8 | cli-init |
| RD-R10 | A generated `checks.json`'s `ci-workflow` entry records an install-relative path that goes stale if the install directory is moved to a different depth; `npx harny doctor` re-derives and is never stale; remediation is to re-run `npx harny init` | LOW | `specs/archived/ci-workflow-root/contract.md` § Behavior Guarantees (DR-5) | readiness-checks |
| R-Cursor | MCP support in some Cursor installs may sit behind a settings toggle that defaults off; the generated `.cursor/mcp.json` would be correct but inert until toggled in Cursor settings | MEDIUM (human-gated) | `specs/archived/context7-mcp/audit.md` R-Cursor | tool-generators |
| R-Codex | Codex Desktop may ignore project-scope `.codex/config.toml` MCP servers per `openai/codex#13025`, loading only user-global config; the generated file is correct for Codex CLI surface | MEDIUM (human-gated) | `specs/archived/context7-mcp/audit.md` R-Codex | tool-generators |
| R-OAuth | `/mcp/oauth` is documented as gated on a client implementing the MCP OAuth specification and was never loaded into a live install of any of the five tools. Same AL-30 / CG-1 class: vendor-side facts verified through documentation rather than live-install testing. | MEDIUM (human-gated) | `specs/archived/dogfood-quick-fixes/audit.md` R-OAuth | cli-init |
| RC-R1 | The residual tail-drop risk is not closed: `PR-11`'s check's judgment is deterministic, but its invocation is still an agent instruction; an agent that drops the archive hand-off can equally drop the verification step after it. Deliberate — this feature guarantees the answer is computed when the check runs, not that the check always runs. | MEDIUM (design, deliberate) | `specs/archived/documentation-role-completion/audit.md` RC-R1; `contract.md` RC-13 | pipeline-roles |
| RC-R4 | The live, per-tool conductor copy remains untracked; the parity guard detects drift only where that file exists on a given machine, and its own repair during this feature's ship is covered by no commit (`.claude/skills/sdd-conductor/` is gitignored). | MEDIUM | `specs/archived/documentation-role-completion/audit.md` RC-R4, AL-8 | pipeline-roles |
| RC-R7 | FC-13's byte-identity guarantee has no automated test covering the T24 case (fresh-init byte-identity of `.sdd/`, including `.sdd/harness.json`'s recorded tier); verified manually at audit time only. | LOW (coverage) | `specs/archived/documentation-role-completion/audit.md` RC-R7 | readiness-checks |
| RC-AL2 | The acceptance-substring tests pinning the documentation role's completion-precondition text are looser than the guarantee itself; verified to hold today only by independent auditor re-derivation. | LOW | `specs/archived/documentation-role-completion/audit.md` AL-2 | pipeline-roles |
| RC-AL3 | The per-generator propagation test for the completion-precondition text pins a single anchor substring rather than the full element list, weaker than its "verbatim" guarantee; verified to hold today only by independent auditor re-derivation across all five scaffolded artifacts. | LOW | `specs/archived/documentation-role-completion/audit.md` AL-3 | pipeline-roles |
| RC-AL5 | A misconfigured `specs.dir` yields a green `--only spec-state` run indistinguishable from a genuinely clean repo; pre-existing family-4 behavior deliberately reused, not introduced, by this feature. | LOW | `specs/archived/documentation-role-completion/audit.md` AL-5 | readiness-checks |
| MR-F2 | The `stack`/`components` exclusivity rule is enforced on the writing path only; `validateConfig` has no check, so a hand-edited `.sdd/harness.json` carrying both fields is accepted silently by `npx harny doctor`, with `components` winning. harny itself never writes both. | HIGH (deferred by human decision) | `specs/archived/monorepo-mode/audit.md` F2, C1, A3 | cli-init |
| MR-F3 | The turn-mode half of the "component directory absent + `requires: {}`" error row is reachable and untested; the earlier "unreachable" reasoning is disproved and corrected in audit row T39a. | HIGH (coverage, deferred by human decision) | `specs/archived/monorepo-mode/audit.md` F3, T39a | feedback-controls |
| MR-F4 | A declared single `.` component (`--component .=python`) renders the conductor's project-configuration block with neither a `Project stack:` line nor a `Component:` line — and that is exactly the shape the exclusivity error message recommends. | MEDIUM (deferred by human decision) | `specs/archived/monorepo-mode/audit.md` F4, C16, A4 | cli-init |
| MR-F5 | All five generators' `renderHook` ship a `payload.commands ?? profile.commands` fallback rather than the contracted literal; ruled acceptable because the field is non-optional and the fallback is unreachable in production, but five test fixtures now build payloads missing a required field. | MEDIUM (design, deferred) | `specs/archived/monorepo-mode/audit.md` F5, C15 | feedback-controls |
| MR-F6 | `tests/packaging.test.ts` now asserts the dependency key set rather than exact version pins, so `AGENTS.md` S4 has lost mechanical version-drift detection and has no replacement enforcement point. Accepted by the human as an amendment to `codex-generator` guarantee 16. | MEDIUM (accepted amendment, consequence open) | `specs/archived/monorepo-mode/audit.md` F6 | cli-init |
| MR-F8 | The per-turn feedback hook could not be confirmed to have fired during `monorepo-mode`'s implementation (`.sdd/feedback/.turns/` carried a nine-day-stale mtime). The human should confirm the hooks were live for those sessions. | MEDIUM (process, human-gated) | `specs/archived/monorepo-mode/audit.md` F8 | feedback-controls |
| MR-F7 | MC-5's "no single-repo guard at any rendering site" cannot be literally held, because its own MC-14 mandates different step-name text for more than one component; byte-identity is proven by golden comparison instead. Amend the wording, not the code. | LOW (wording) | `specs/archived/monorepo-mode/audit.md` F7, C5 | feedback-controls |
| MR-F9 | CI had not exercised `monorepo-mode` at sign-off (nothing committed); a green run on the shipping commit is still required. | LOW (process) | `specs/archived/monorepo-mode/audit.md` F9 | cli-init |
| MR-F10 | A touched path outside the install directory now resolves to no component and is dropped with the notice, where it was previously passed through — so "the dropped count is always 0 for a single `.` component" is not strictly true. Subdirectory installs only; no artifact changes. | LOW | `specs/archived/monorepo-mode/audit.md` F10 | feedback-controls |
| MR-F11 | The interactive repo-shape question is asked fourth (before the stack question), not literally first as its contract headline says, and carries no `Q` number in the prompt comment scheme. | LOW (wording) | `specs/archived/monorepo-mode/audit.md` F11, C25 | cli-init |
| MR-F13 | The "N is always 0" regression test lacks a positive control: it would also pass on a runner that dispatched nothing. Weak rather than vacuous. | LOW (test quality) | `specs/archived/monorepo-mode/audit.md` F13, A5 | feedback-controls |
| MR-MC20 | The readiness id suffix `:<path>` follows the `isSingleRootComponent` boundary, so a lone non-`.` component gets `npm-test:apps/web` where MC-20's original wording implied a bare id. Recorded so the gap is not rediscovered as a defect. | LOW (wording) | `specs/archived/monorepo-mode/audit.md` C20 | readiness-checks |
| MR-S5 | The single-repo predicate is duplicated as an inline expression at `src/generators/markdown-yaml.ts:62`, because an ESM import is top-level and would fail the component-vocabulary grep gate over `src/generators/**`. Ruled the correct disposition, but unguarded: nothing turns red if `src/engine.ts`'s predicate changes and that line does not. Deleted by MR-F4's fix. | LOW (residual) | `specs/archived/monorepo-mode/audit.md` round-2 Audit Log ruling, S5 | cli-init |

## Notes

Task 3.11 routing check — three real questions this spec had to answer during
exploration, each resolved in one `_index.md` read:

1. *"Where does `SPEC_SCHEMA_DIR` come from, and can a generator re-literal it?"* →
   keyword `spec-schema` routes to `spec-workflow`, which states SW-6/SW-5 citing
   `src/engine.ts` and the deployment guarantee directly.
2. *"What frontmatter keys is a `harny-*` skill allowed to declare?"* → keyword
   `frontmatter (portable keys)` routes to `skill-library`, which states SL-3 with
   the exact six-key list and the V5/V6 citation.
3. *"Does Codex read `.codex/skills/` or something else for the conductor?"* →
   keyword `.agents/skills` routes to `tool-generators` (and `skill-library`), which
   states TG-6/TG-9 naming `.agents/skills/sdd-conductor/SKILL.md` explicitly and the
   shared-namespace consequence.
