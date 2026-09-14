# Current-State Specifications

> Current truth for this repo. Maintained by `harny-sync`; do not hand-edit.
> Last synced: 2026-09-13 by templates-skill-library-parity (archive mode: feature archived, capability docs updated, ADRs registered)

## Capabilities

| Capability | Current-State Specification | Incorporated Changes |
|---|---|---|
| spec-workflow | [spec-workflow.md](./spec-workflow.md) | [canonical-role-templates](../archived/canonical-role-templates/), [cli-skeleton](../archived/cli-skeleton/), [sdd-skill-library](../archived/sdd-skill-library/), [templates-skill-library-parity](../archived/templates-skill-library-parity/) |
| pipeline-roles | [pipeline-roles.md](./pipeline-roles.md) | [canonical-role-templates](../archived/canonical-role-templates/), [sdd-skill-library](../archived/sdd-skill-library/), [templates-skill-library-parity](../archived/templates-skill-library-parity/) |
| skill-library | [skill-library.md](./skill-library.md) | [sdd-skill-library](../archived/sdd-skill-library/), [templates-skill-library-parity](../archived/templates-skill-library-parity/) |
| cli-init | [cli-init.md](./cli-init.md) | [cli-skeleton](../archived/cli-skeleton/), [templates-skill-library-parity](../archived/templates-skill-library-parity/) |
| tool-generators | [tool-generators.md](./tool-generators.md) | [cli-skeleton](../archived/cli-skeleton/), [cursor-kiro-copilot-generators](../archived/cursor-kiro-copilot-generators/), [codex-generator](../archived/codex-generator/), [templates-skill-library-parity](../archived/templates-skill-library-parity/) |
| feedback-controls | [feedback-controls.md](./feedback-controls.md) | [agent-feedback-controls](../archived/agent-feedback-controls/) |

## Keyword lookup

> If your question mentions a term on the left, read the capability on the right first.

| Term | Capability |
|---|---|
| cost_tier | pipeline-roles |
| capabilities (vocabulary) | pipeline-roles |
| docs-lookup / Context7 | pipeline-roles |
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
| stack (project) | feedback-controls |
| feedback | feedback-controls |

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

## Open reservations

> Non-blocking findings accepted at ship time and still open.

| ID | Reservation | Severity | Source | Capability |
|---|---|---|---|---|
| AL-19 | Stale test field name: a test's title can overstate its coverage after a refactor removes the field it exercised | MEDIUM | `specs/archived/cli-skeleton/audit.md` AL-19 | cli-init |
| AL-20 | The e2e suite validates built `dist/`, not `src/` — `npm test` alone can false-green a `src/`-only regression | MEDIUM | `specs/archived/cli-skeleton/audit.md` AL-20 | cli-init |
| AL-30 | Per-tool facts (Cursor/Kiro/Copilot) were never re-verified against a live tool install | MEDIUM (human-gated) | `specs/archived/cursor-kiro-copilot-generators/audit.md` AL-30 | tool-generators |
| CG-1 / O4 | Codex facts independently re-confirmed 2026-09-02, but the generated artifact set was never loaded into a live Codex CLI install | MEDIUM (human-gated) | `specs/archived/codex-generator/audit.md` CG-1, O4, CG-12 | tool-generators |
| AL-S15 | `contract.md` § Amendment A1 still prescribes a before/after differential mechanism not shipped; the delivered form is filtered absolute. Contract, roadmap, and tasks text all describe the superseded mechanism and must be corrected before archival. | MEDIUM | `specs/archived/sdd-skill-library/audit.md` AL-S15 | skill-library |
| R1 | Kiro docs disagree on post-file-save event casing (`agentStop` vs. older `PostFileSave` example). Shipped with camelCase `agentStop` per V6 types page; unverifiable without live Kiro run. | MEDIUM (human-gated) | `specs/archived/agent-feedback-controls/audit.md` R1 | feedback-controls |
| R2 | SC13 (live-session hook firing) unverifiable in audit session; requires human restart and re-entry. Accumulator half was observed firing live; Stop delivery was executed verbatim; only in-context delivery remains. | MEDIUM (human-gated) | `specs/archived/agent-feedback-controls/audit.md` R2 | feedback-controls |
| R5 | Kiro's and GitHub Copilot's post-edit payload field shape is assumed but not cited. AL-30 class: wrong field name exits 0 recording nothing. | MEDIUM (human-gated) | `specs/archived/agent-feedback-controls/audit.md` R5 | feedback-controls |
| R6 | Python profile CI gate is deliberately probe-skip-only (no install, both ruff/mypy skip on stock runner). Closeable only by a future feature adding `ciInstall`. | MEDIUM (scope, deliberate) | `specs/archived/agent-feedback-controls/audit.md` R6 | feedback-controls |
| R7 | TypeScript install candidates cover npm only; pnpm/Yarn-Berry can re-enter F1. Needs `localBinary` probe kind (out of A1 scope). | MEDIUM (design, deferred) | `specs/archived/agent-feedback-controls/audit.md` R7 | feedback-controls |
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
