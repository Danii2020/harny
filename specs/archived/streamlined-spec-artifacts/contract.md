# Contract: Streamlined Spec Artifacts

Required items are numbered SA-n. Lines marked *(suggestion)* can be revised by the
executor if it records why. Revision 3.

## Interfaces

### Public API

**SA-1 — Spec-schema file set** (G1, G2, SC1). `templates/spec-schema/` holds exactly
`intent.md`, `execution-plan.md`, `tasks.md` and `audit.md`. `SPEC_SCHEMA_NAMES`
(`src/templates.ts`) becomes:

```ts
export const SPEC_SCHEMA_NAMES = ['intent', 'execution-plan', 'tasks', 'audit'] as const;
```

`harny init` deploys those four files to `.sdd/spec-schema/` once, byte-identical
(SW-5 unchanged). The doctor harness family emits one `spec-schema:<name>` check per
name.

**SA-2 — Schema content** (G1, G3, G6). Each template keeps the existing
`# Spec Schema: <file>` + `## Template` wrapper and contains these sections, in order:

| File | Sections |
|---|---|
| `intent.md` | header (title, `Revision: N`, `Approval: Pending \| Approved revision N by <person> on <date>`); Outcome; Acceptance criteria (`AC1`… each with an observable behavior and an Example input → output/error; compatibility ACs); Scope (In / Out); Constraints; Open questions; Revision history |
| `execution-plan.md` | Guidance consulted; Ownership (incl. affected `specs/current` capabilities); Binding constraints (each with a source); Proposed approach (revisable: decisions, rationale, rejected alternatives); Consumers and migration; Risks; Validation; Revision log |
| `tasks.md` | Status (`Awaiting intent approval` \| `Implementing` \| `Needs audit` \| `Repairing` \| `Blocked` \| `Interrupted` \| `Accepted — pending synchronization`); Baseline (base commit, branch, interpreter, cwd, commands, pre-existing failures); Outcomes (`O1`… each mapped to ACs with Tests / Red / Green evidence, plus migration, docs, broader-suite-vs-baseline and independent-audit outcomes); Working state (updated, outcome, phase, in progress, last command, next step); Finding responses; Checkpoint |
| `audit.md` | AC results (per AC: status, evidence labelled `rerun` / `reused` / `unavailable`); Binding-constraint compliance; Test coverage (incl. `### Tier Results` against § Validation); Findings (id, severity, closure condition, status); Audit log (rounds kept); Final verdict (`APPROVED` / `APPROVED WITH RESERVATIONS` / `REJECTED`) |

The `execution-plan.md` § Validation section has one row per AC. Each row gives what
demonstrates the AC, the tests to write, the test tier (`unit` / `integration` /
`e2e`), the framework inferred from repo evidence, the setup needed (`none` or what to
add), the focused and broader commands, and the cwd. This section is the only test
plan.

The `intent.md` template says to describe observable outcomes. External API, data and
security obligations belong in it; internal names and signatures do not. The
`execution-plan.md` template says to keep binding constraints separate from revisable
suggestions, and to leave out exact file lists, pseudocode, signatures and test bodies
unless an external contract or a repo rule needs them. The `tasks.md` template says:
check an outcome only with evidence, never erase history or weaken criteria, and
record an unavailable required check as unavailable, never as a pass. *(suggestion:
exact wording.)*

**SA-3 — Doctor `checks.json` `specs` block** (G5, SC5–SC7):

```ts
specs: {
  dir: string;
  reservedDirs: readonly string[];
  schemaFiles: readonly string[];        // now ['intent', 'execution-plan', 'tasks']
  legacySchemaFiles?: readonly string[]; // NEW: ['intent', 'contract', 'roadmap', 'tasks', 'audit']
  shippedMarker: string;
  approvedVerdicts: readonly string[];
}
```

`schemaFiles` now lists only the files the architect writes. It is no longer
`SPEC_SCHEMA_NAMES`, because `audit.md` is optional until the audit runs.

**SA-18 — `harny update [target]`** (G7). This is a new CLI verb next to `init` and
`doctor`. `target` defaults to `.`.

| Option | Meaning |
|---|---|
| `--dry-run` | Print the report and write and delete nothing |
| `--force` | Proceed past the uncommitted-changes and not-a-git-repo refusals (SA-22) |

There are no prompts and no other options. The config comes only from
`<target>/.sdd/harness.json`.

**SA-19 — Known legacy paths** (SC12). This is an exported constant, the only input
to any delete:

```ts
export const LEGACY_HARNESS_PATHS = ['.sdd/spec-schema/contract.md', '.sdd/spec-schema/roadmap.md'] as const;
```

Paths are relative to the install dir. Directories, globs and anything under `specs/`
are never allowed. *(suggestion: owning module `src/writer.ts` or `src/engine.ts`.)*

### Data Models

**SA-4 — Ownership** (G2, G3). Each spec file and section has exactly one writer:

| File / section | Writer |
|---|---|
| `intent.md`, `execution-plan.md` (incl. § Validation) | architect (documentation adds only the `Shipped:` stamp) |
| `tasks.md` initial draft | architect (Status `Awaiting intent approval`) |
| `tasks.md` Tests and Red evidence for each outcome | test-writer |
| everything else in `tasks.md`, including Finding responses | executor |
| `audit.md` (created on the first audit round) | auditor only |

**SA-20 — Update report** (SC13–SC15). There is one line per path, in plan order, each
with a status of `created`, `updated`, `unchanged` or `removed`. A final summary line
gives the count for each status. Dry-run uses the same lines, prefixed
`would be`. *(suggestion: exact wording.)*

### State Changes

`update` and `init --force` may delete the files listed in SA-19. No other state
changes beyond the doctor and the deployed files.

## Behavior Guarantees

1. **SA-5** (SC2) The architect writes exactly `intent.md`, `execution-plan.md` and
   `tasks.md`, and never `audit.md`.
2. **SA-6** (SC3) No role, skill or conductor text in `templates/`, `.agents/skills/`,
   `.claude/agents/` or `.claude/skills/sdd-conductor/` names `contract.md` or
   `roadmap.md`, except one legacy-shape note per reading role: "a feature dir holding
   `contract.md`/`roadmap.md` is legacy; read them in place of `execution-plan.md`".
3. **SA-7** (SC4) Test scope:
   - The `**Plan status**` line, the `### Test Plan` subsection and conductor hard rule
     6 are removed. Gate 2 still presents coverage and each tier's red status.
   - The test-writer writes the tests that § Validation names, at the tiers and with
     the setup it names. It adds no setup or tier beyond that.
   - If it needs an unlisted tier or setup, it writes nothing more and reports first
     line `TEST PLAN AWAITING CONFIRMATION`, naming the gap. The conductor asks the
     human and relays the answer. The approved plan changes only through the architect.
   - The auditor's `### Tier Results` flags (existing severity buckets):
     - a test at a tier that § Validation does not name;
     - a named tier with no tests;
     - setup that § Validation does not name.
4. **SA-8** (SC5) Doctor family `spec-state`: if a feature dir holds neither
   `contract.md` nor `roadmap.md`, it is checked against `schemaFiles`, and a dir with
   missing files fails with `<dir>/<name> is missing <files>`.
5. **SA-9** (SC6) If the dir holds `contract.md` or `roadmap.md` and
   `legacySchemaFiles` is present, it is checked against `legacySchemaFiles`. That
   includes a dir that also holds `execution-plan.md`.
6. **SA-10** (SC7) If `legacySchemaFiles` is absent, every dir is checked against
   `schemaFiles`, exactly as today.
7. **SA-11** Shipped-but-unarchived detection is unchanged. A dir with no `audit.md`
   is never "approved".
8. **SA-12** (SC8) `harny-sync` archive preconditions accept either shape: the new
   shape needs `intent`, `execution-plan`, `tasks` and `audit`, and the legacy shape
   needs all five. SHA-256 checks cover every file in the directory. Affected
   capabilities come from `execution-plan.md` § Ownership, or from `contract.md` in the
   legacy shape.
9. **SA-13** (SC9) `renderSpecSchemaPointerBlock` names the deployed scaffolds and
   states that the architect writes three of them and the auditor writes `audit.md`.
10. **SA-14** (SC1) A fresh `harny init` writes no `contract.md` or `roadmap.md` under
    `.sdd/spec-schema/`.
11. **SA-15** (SC10) This repo's `.sdd/` matches fresh `harny update` output (FC-13).
    Running `update` on this repo also removes its stale legacy schema files.
12. **SA-16** (G5, SC17) No file under `specs/` changes through this feature's code
    paths, and no existing spec dir is edited by hand.
13. **SA-17** (SC11) `AGENTS.md`: the § SDD spec schema table, the traceability rule
    (each § Validation row cites an AC, each `tasks.md` outcome cites ACs, each audit
    item cites an AC or binding constraint), the § templates tree, S4 ("an explicit
    line in the feature's `execution-plan.md` § Binding constraints"), "Treat the
    intent ACs and execution-plan binding constraints as law", and S3 noting the
    SA-19 delete exception. `README.md`: spec table, tree, and an `update` usage
    section.
14. **SA-21 — Update equals init** (SC13). `update` renders through `runInit` with
    `configFile = <target>/.sdd/harness.json`, `interactive: false` and
    `gitHooks: false`, so the files it writes are byte-identical to a fresh `init` with
    that config. It overwrites generated files without the CONFLICT refusal.
    Merge-marked files (MCP configs) and component guidance bridges keep `init`'s
    existing merge/leave-alone behavior. A file whose bytes would not change is
    reported `unchanged` and not rewritten.
15. **SA-22 — Safety before any change** (SC16). Before writing or deleting, `update`
    collects every path it would change: `updated` plus `removed`. It refuses with
    `HarnessError('CONFLICT')` (exit 3) and lists the offending paths when either:
    - one of those paths is tracked and has staged or unstaged changes; or
    - the target is not inside a git repo.

    Untracked paths never block, and are overwritten or removed. `init --force` runs
    no dirty check (accepted).

    `--force` skips both refusals. `--dry-run` never refuses. It reports what would
    happen and names the paths that would trigger a refusal.
16. **SA-23 — Removals** (SC12). After all writes succeed, a non-dry-run `init` and
    `update` delete each SA-19 path that exists as a regular file and report it
    `removed`. `init`'s existing CONFLICT refusal still runs first. A path that is absent is not reported.
    A path that is a directory or symlink is skipped with a warning. A delete failure
    reports the paths already written or removed (as `applyWrites` does) and exits
    non-zero.
17. **SA-24 — Idempotency** (SC14). A second `update` with no intervening change
    reports only `unchanged` lines and exits 0.
18. **SA-25 — Untouched** (SC17). `update` never reads or writes under the configured
    `specs` dir, never calls git-hooks activation, and never rewrites
    `.sdd/harness.json` with different bytes. It is re-emitted only from its own parsed
    content.

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| New-shape dir missing `execution-plan.md` | spec-state `fail` naming it | not ready |
| Legacy dir missing `audit.md` | spec-state `fail` naming it (as today) | not ready |
| Dir holds both `execution-plan.md` and `contract.md` | judged as legacy (SA-9) | names legacy files if missing |
| Old `checks.json` + new runner | SA-10 | unchanged |
| Archive of new-shape dir lacking `audit.md` | refuse, name precondition | nothing moved |
| Test-writer needs a tier or setup that § Validation does not name | stop, `TEST PLAN AWAITING CONFIRMATION` | human decides via conductor |
| `update`: `.sdd/harness.json` absent | `HarnessError('USAGE')` "not initialised; run harny init" (exit 2) | nothing changed |
| `update`: `harness.json` invalid | existing `loadConfigFile` / `validateConfig` USAGE error (exit 2) | nothing changed |
| `update`: tracked path with staged/unstaged changes, or no git repo, no `--force` | `CONFLICT` listing the paths (exit 3) | nothing changed |
| `update`: no selected tool has a generator | existing `NO_GENERATOR` (exit 4) | nothing changed |
| `update`/`init`: write or delete fails midway | disclosure of what was already written or removed, exit 1 | partial state named |
| `templates/spec-schema/execution-plan.md` missing | existing `TEMPLATE` missing-file error | `init`/`update` fail, as today |

## Dependencies

- None added (S4). The git status check reuses the repo's existing `git` invocation
  pattern (`src/repo.ts` / `src/git-hooks.ts`).

## Integration Points

- Prompt consumers to migrate:
  - the five role templates, the conductor (template and live), and the five live
    agents;
  - skills `harny-propose`, `harny-test`, `harny-implement`, `harny-audit`,
    `harny-document`, `harny-sync` and `harny-adr`, in both `templates/skills/` and
    `.agents/skills/` (keep `DIVERGENCE_TABLE` truthful);
  - the dogfood `high-value-tests` skill and `templates/doctor/README.md`.
- Code: `src/templates.ts`, `src/doctor.ts`, `src/generators/markdown-yaml.ts`,
  `src/writer.ts` (removals, unchanged-detection), `src/init.ts` (an update mode or a
  thin `runUpdate` over it), and `src/cli.ts` (`update` verb).
- Test fixtures: the template-fixture trees under `tests/fixtures/templates/*/spec-schema/`.
- Tests with a hard-coded five-name list or the Test Plan:
  - `doctor-runner`, `doctor-runner-only`, `doctor`, `engine`, `e2e-init` and `init`;
  - `packaging`, `templates`, `skill-references` and `canonical-fidelity`;
  - `test-writer-templates`, `skills-fidelity`, `conductor-parity` and the generator
    tests.
- New tests: `update` in `tests/update.test.ts` and `tests/cli.test.ts`, and removals
  in `tests/writer.test.ts`.
- Golden fixtures under `tests/fixtures/golden/monorepo-mode/` are regenerated, never
  hand-edited.
