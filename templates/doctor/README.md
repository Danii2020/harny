# The canonical readiness-check behavior

This directory holds the canonical, tool-neutral source for harny's computational
**feedforward** control (Fowler's harness-engineering vocabulary — see `AGENTS.md`'s
feedforward/feedback split): a deterministic pre-check that runs **before** the agent
starts work, confirming the harness it is about to rely on is actually installed and
coherent — a session-start counterpart to the per-turn/CI **feedback** controls
`templates/hooks/` implements.

The behavior below is what `run-doctor.mjs` implements. It is stated first as
behavior, tool-neutral throughout — the readiness check has no per-tool variant at
all, unlike the feedback hook (`AGENTS.md` S7).

## The behavior

1. **Four check families run, in this fixed order, every time.** *Environment* (is
   the running Node new enough, and is a test-suite command even configured for this
   stack), *harness manifest* (are the base harness files this repo's `harny init`
   scaffolded still present), *spec state* (is `specs/` internally coherent), and
   *tests* (does the full test suite pass). Fixed order means two runs of the same
   repo state produce identical output.
2. **The run is all-or-nothing in reporting, never in execution.** A failing check
   never aborts the run: every check in every family is always evaluated, so one
   report shows everything wrong at once, not one thing at a time.
3. **A check whose tooling is absent is skipped with a notice, never failed.** The
   same presence-probe semantics `templates/hooks/README.md` behavior 4 describes
   govern here too, reusing the identical evaluator (see "What lives here" below) —
   a repo that legitimately has no test runner for its stack is not "broken," and a
   readiness check that fails outright on absence trains people to ignore it.
4. **A skip is reported as coverage, never as a pass.** The report distinguishes
   "this was checked and is fine" from "this was not checked" — collapsing the two
   would hide exactly the blind spot this control exists to close.
5. **Exit code distinguishes "ready" from "not ready" from "the check itself broke."**
   Three outcomes, three distinct codes: every check `ok` or `skip` (ready); at least
   one check `fail` (not ready — a correctly completed, red result); the check
   itself could not run at all, e.g. an unreadable or invalid `--checks` value (a
   runner bug or misuse, never confused with a red readiness result).
6. **No command string, stack name, spec-directory name, schema-file name, or
   `Shipped:`/verdict literal is hard-coded in the runner.** Every such value is
   handed to the runner as data (`--checks`), generated once per `harny init` run
   from the single sources that already own each value (the stack-to-command
   mapping, the spec-schema file list, the shipped/approved markers) — never
   duplicated or re-typed here.

## What this checks, concretely

- **Environment** — the Node version actually running the check.
- **Harness manifest** — the base artifacts a repo scaffolded by `harny init`
  should still have: a conventions document, `.sdd/harness.json`, the spec-schema
  templates, the feedback runner and CI workflow, each generator's conductor
  artifact, and every core skill under each resolved skill root. Each entry that
  itself depends on the repo being harny-scaffolded is gated on `.sdd/harness.json`
  being present, so a repo this tool was never run against (this repo included, if
  it predates `harny init`) is not penalized for artifacts it never claimed to have.
- **Spec state** — every `specs/<feature>/` directory (excluding `current` and
  `archived`) is checked for the five spec-schema files, and for the
  shipped-but-unarchived condition: a feature whose `intent.md` is stamped
  `Shipped:` and whose `audit.md` carries an approved verdict, but which still sits
  outside `specs/archived/` — the exact condition `harny-sync`'s bounded, ≤4-file
  lookup cannot see, because noticing it would require reading every feature
  directory in the repo.
- **Tests** — the resolved stack's full test-suite command (never the per-turn
  lint/type-check commands `harny-feedback` owns — see "Boundary with
  `harny-feedback`" below), run once, in full, before work starts.

## Boundary with `harny-feedback`

`harny-feedback` owns the per-turn lint/type-check trigger and the
before-marking-a-task-done trigger; this control never duplicates either. This
control owns session-start and pre-spec-work readiness, including the one thing
`harny-feedback` deliberately never runs: the full test suite. A `ReadinessCommand`
(this control's `kind: 'test'`) can never reach a per-turn hook or the CI workflow's
inline JSON — its type forbids the `lint`/`typecheck` kinds a `FeedbackCommand`
carries, and vice versa.

## What lives here

- `run-doctor.mjs` — the shared runner script implementing the four families above.
  It is copied **verbatim** into every scaffolded project at
  `.sdd/doctor/run-doctor.mjs`; its bytes never vary by stack or by tool. Every
  value it evaluates arrives via `--checks` (defaulting to
  `.sdd/doctor/checks.json`, generated once per `harny init` run).

## The `feedback/` / `doctor/` / `shared/` layout convention

The generated `.sdd/` runtime holds three subdirectories with one rule between
them: `feedback/` and `doctor/` each hold one executable entry point (a script
invoked directly, by a hook, by CI, or by `npx harny doctor`); `shared/` holds code
both entry points import rather than each carrying its own copy. Today `shared/`
holds exactly one module, `probes.mjs` — the single implementation of every
presence-probe check (`scriptExists`, `binaryExists`, `anyFileExists`,
`probeSatisfied`), imported by both `run-feedback.mjs` and `run-doctor.mjs` via the
identical relative specifier `../shared/probes.mjs`, which resolves correctly in
both the `templates/` tree and the generated `.sdd/` tree because `shared/` is a
sibling of each entry point's own directory in both. A future generated script
joins this convention rather than copying code a third time.
