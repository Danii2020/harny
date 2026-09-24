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

1. **Six check families run, in this fixed order, every time.** *Environment* (is
   the running Node new enough, and is a test-suite command even configured for this
   stack), *harness manifest* (are the base harness files this repo's `harny init`
   scaffolded still present), *repo readiness* (is the target repository itself
   legible to an AI agent — a README, an architecture/structure document, and each
   selected tool's own guidance file), *security* (are the permissions baseline and
   the commit checks installed, wired and active, is `.env` git-ignored, is a secret
   scanner available locally and in CI), *spec state* (is `specs/` internally
   coherent), and *tests* (does the full test suite pass). Repo readiness is a
   separate family from harness manifest, not more entries in it, because the two
   ask different questions: harness manifest asks whether harny's own artifacts are
   installed; repo readiness asks whether the repository itself carries the baseline
   documentation an agent needs to work here safely. Every security check is
   **recommended**: it warns with its remediation and never changes the exit code,
   because a repository can have legitimate reasons, such as a hook manager or another
   secret scanner, to do it differently. Security checks ask the real question rather
   than a proxy: whether git ignores `.env` is asked of git itself, and whether the
   hooks are active is asked of `core.hooksPath`, not inferred from a file existing.
   Fixed order means two runs of the same repo state produce identical output.
2. **The run is all-or-nothing in reporting, never in execution.** A failing check
   never aborts the run: every check in every family is always evaluated, so one
   report shows everything wrong at once, not one thing at a time.
3. **A check whose tooling is absent is skipped with a notice, never failed.** The
   same presence-probe semantics `templates/hooks/README.md` behavior 4 describes
   govern here too, reusing the identical evaluator (see "What lives here" below) —
   a repo that legitimately has no test runner for its stack is not "broken," and a
   readiness check that fails outright on absence trains people to ignore it.
4. **Every presence assertion carries one of two priority tiers, and each tier
   reports differently when its target is absent.** A **must-have** item that is
   absent **fails** the run: the repo is reported not ready for SDD work. A
   **recommended** item that is absent **warns**: named in the report with its
   remediation, but never turning a ready run into a not-ready one. This is why the
   report distinguishes three non-`ok` cases, not two: **not checked** (`skip` — the
   entry's own requirement was not met, e.g. an absent tool or an un-scaffolded
   repo), **checked and lacking but not blocking** (`warn` — a recommended item was
   absent), and **checked and blocking** (`fail` — a must-have item was absent).
   Collapsing any two of these three would hide exactly the blind spot this control
   exists to close.
5. **Exit code distinguishes "ready" from "not ready" from "the check itself broke."**
   Three outcomes, three distinct codes: every check `ok`, `skip`, or `warn` (ready —
   a warned run is still a ready run); at least one check `fail` (not ready — a
   correctly completed, red result); the check itself could not run at all, e.g. an
   unreadable or invalid `--checks` value (a runner bug or misuse, never confused
   with a red readiness result).
6. **No command string, stack name, spec-directory name, schema-file name, document
   name, accepted path, tier value, family label, or `Shipped:`/verdict literal is
   hard-coded in the runner.** Every such value is handed to the runner as data
   (`--checks`), generated once per `harny init` run from the single sources that
   already own each value (the stack-to-command mapping, the spec-schema file list,
   the shipped/approved markers, the repo-readiness entries and their tiers) — never
   duplicated or re-typed here.
7. **The runner asserts presence only; it never inspects a document's contents.**
   Whether `README.md`, an architecture document, or a tool's own guidance file
   exists is computational and belongs here. Whether that document actually says
   anything useful — states the project's purpose, names its components, names the
   commands that validate a change — is judgement, and belongs one layer up, in the
   reading procedure that consumes this report (`harny-doctor`'s coherence-assessment
   step). A keyword grep in this runner would be easy to satisfy and hard to trust,
   so this runner does not perform one.
8. **A stale committed runner is not a silent failure.** A repo whose committed
   `.sdd/doctor/run-doctor.mjs` predates the repo-readiness family simply produces no
   family-3 lines — it still runs the four families it knows, including the
   conventions-document check, unchanged. Likewise a runner or `checks.json` that
   predates the security family produces no security lines. Re-run `npx harny init`
   after upgrading harny to pick up new families.

## What this checks, concretely

- **Environment** — the Node version actually running the check.
- **Harness manifest** — the base artifacts a repo scaffolded by `harny init`
  should still have: a conventions document, `.sdd/harness.json`, the spec-schema
  templates, the feedback runner and CI workflow, each generator's conductor
  artifact, and every core skill under each resolved skill root. Each entry that
  itself depends on the repo being harny-scaffolded is gated on `.sdd/harness.json`
  being present, so a repo this tool was never run against (this repo included, if
  it predates `harny init`) is not penalized for artifacts it never claimed to have.
- **Repo readiness** — is the *target repository itself* legible to an AI agent,
  distinct from whether harny's own artifacts are installed: a README (must-have); an
  architecture/structure document (recommended); and, for each tool this repo actually
  selected, that tool's own root guidance file or a shared `AGENTS.md` fallback
  (recommended, and only evaluated for a repo that opted into a tool at all). Claude
  Code reading `CLAUDE.md` is one attributed example of a tool-specific guidance file;
  it is never the only possibility — each selected tool contributes its own entry,
  derived from that tool's own adapter, never a fixed list.
- **Spec state** — every `specs/<feature>/` directory (excluding `current` and
  `archived`) is checked for the five spec-schema files, and for the
  shipped-but-unarchived condition: a feature whose `intent.md` is stamped
  `Shipped:` and whose `audit.md` carries an approved verdict, but which still sits
  outside `specs/archived/` — the exact condition `harny-sync`'s bounded, ≤4-file
  lookup cannot see, because noticing it would require reading every feature
  directory in the repo.
- **Tests** — the resolved stack's full test-suite command (never the per-turn
  lint/type-check commands `harny-feedback` owns — see "Boundary with
  `harny-feedback`" below), run once, in full, before work starts. A repository
  that declares more than one component (a directory and the stack it is written
  in) contributes one command per component; each such entry carries a `dir`
  field naming that component's directory, POSIX and relative to the install
  directory, absent when it is the install directory itself — the runner
  resolves both the command's working directory and its presence probe from
  `dir ?? '.'`, so an older generated `checks.json` (no `dir` anywhere) keeps
  running unchanged.

## Boundary with `harny-feedback`

`harny-feedback` owns the per-turn lint/type-check trigger and the
before-marking-a-task-done trigger; this control never duplicates either. This
control owns session-start and pre-spec-work readiness, including the one thing
`harny-feedback` deliberately never runs: the full test suite. A `ReadinessCommand`
(this control's `kind: 'test'`) can never reach a per-turn hook or the CI workflow's
inline JSON — its type forbids the `lint`/`typecheck` kinds a `FeedbackCommand`
carries, and vice versa.

## What lives here

- `run-doctor.mjs` — the shared runner script implementing the six families above.
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
