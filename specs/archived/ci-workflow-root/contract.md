# Contract: ci-workflow-root

Affected capabilities: **feedback-controls** (primary — the CI workflow's placement,
name, and scoping), **cli-init** (the write-plan mechanism, containment, conflict
detection, determinism), **readiness-checks** (the `ci-workflow` check's path).
**tool-generators** is *not* affected: the `Generator` interface gains no member, no
generator is edited, and no per-tool artifact moves.

Contract item ids in this file use the feature-local prefixes below. Every item cites
the `intent.md` goal it serves.

| Prefix | Area | Goals |
|---|---|---|
| `WR-` | The declared write root: `GeneratedFile.root`, `planWrites`, containment, conflicts | G2 |
| `CW-` | Placement: repository-root discovery, prefix, slug, workflow path, announcement | G1, G3, G7 |
| `CR-` | Rendering and the canonical CI region | G4, G6 |
| `DR-` | The readiness check's view of the workflow | G5 |
| `AC-` | The dated correction note in the archived `agent-feedback-controls` contract | G6 |
| `XC-` | Cross-cutting: dogfood byte-identity, dependencies, suite baseline, forward compatibility | G4, G7 |

---

## Interfaces

### Public API — `src/repo.ts` (NEW) — G1, G3

The first git-aware module in `src/`. It answers exactly two questions — *where is the
repository root?* and *what is this install's workflow called?* — and does nothing
else. It imports `node:fs/promises`, `node:path`, and `./feedback.js` (for
`CI_WORKFLOW_PATH`, per `AGENTS.md` S5), and nothing imports it back, preserving
`cli-init.md` CLI-11's acyclic graph. Its position in the strictly-downward import
order is: `cli.ts` → `init.ts` → `doctor.ts` → `engine.ts` → **`repo.ts`** →
`feedback.ts`.

```ts
/**
 * Where an install directory sits inside its enclosing git repository — the one fact
 * that decides where the CI workflow goes, because GitHub reads
 * `.github/workflows/` only at a repository root.
 */
export interface InstallLocation {
  /** Absolute, resolved path of the install directory (`runInit`'s `targetDir`). */
  readonly targetDir: string;
  /** Absolute, resolved path of the enclosing repository root. Equal to `targetDir`
   *  when `insideRepo` is false — the degenerate root, so every consumer can treat
   *  the no-repository case as "the install directory is the root" without
   *  branching. */
  readonly repoRoot: string;
  /** POSIX path from `repoRoot` to `targetDir`. Empty string when the install
   *  directory IS the repository root, and empty string when `insideRepo` is false. */
  readonly prefix: string;
  /** Whether a `.git` entry was found at `targetDir` or above it. */
  readonly insideRepo: boolean;
}

/** The entry whose presence marks a repository root. A directory in a normal clone;
 *  a FILE in a worktree or submodule checkout — both count (CW-2). */
export const GIT_ENTRY_NAME = '.git';

/**
 * Walks upward from `startDir` looking for a `.git` entry of any type, stopping at the
 * filesystem root. Returns the first directory that has one, or `undefined`.
 *
 * Deliberately a filesystem walk, not `git rev-parse --show-toplevel`: no dependency
 * on git being installed or on PATH, no subprocess, no locale- or config-dependent
 * output to parse, and the same answer in a container that carries the checkout but
 * not the tool (ADR 0033). An entry that exists but cannot be stat'ed (permissions) is
 * treated as absent and the walk continues upward.
 */
export async function findRepoRoot(startDir: string): Promise<string | undefined>;

/** `findRepoRoot` plus the derived prefix, packaged as the one value every consumer
 *  passes around. Never throws for a missing repository; that is `insideRepo: false`. */
export async function resolveInstallLocation(targetDir: string): Promise<InstallLocation>;

/**
 * Turns an install prefix into the file-name fragment that distinguishes one install's
 * workflow from another's, by a fixed five-step rule (CW-5):
 *   1. lower-case;
 *   2. replace every character outside `[a-z0-9]` with `-`;
 *   3. collapse runs of `-` to one;
 *   4. trim leading and trailing `-`;
 *   5. if the result is empty, return `'install'`.
 * Pure, synchronous, total, and deterministic. `'apps/web'` -> `'apps-web'`;
 * `'packages/@scope/ui'` -> `'packages-scope-ui'`; `'services/api_v2'` ->
 * `'services-api-v2'`.
 */
export function componentSlug(prefix: string): string;

/**
 * The workflow's path, POSIX, **relative to the repository root**.
 *
 * `ciWorkflowPathFor('')` returns `CI_WORKFLOW_PATH` itself, byte-for-byte (CW-4) —
 * the value is re-used, never re-typed (`AGENTS.md` S5). A non-empty prefix splices
 * `-<slug>` before the extension of that same constant, so the directory, the base
 * name, and the extension all continue to have exactly one home in `src/feedback.ts`.
 */
export function ciWorkflowPathFor(prefix: string): string;

/**
 * The same file, expressed **relative to the install directory** — what the readiness
 * check needs, because `run-doctor.mjs` resolves every `anyOf` entry against the
 * directory it runs in. `''` yields `CI_WORKFLOW_PATH` unchanged; `'apps/web'` yields
 * `'../../.github/workflows/harny-feedback-apps-web.yml'`.
 */
export function ciWorkflowPathFromInstallDir(prefix: string): string;
```

### Public API — `src/generators/types.ts` (MODIFIED) — G2

One optional member on `GeneratedFile`. Nothing is renamed, removed, or reordered; no
`Generator` member is added or changed.

```ts
export interface GeneratedFile {
  /** POSIX-style path relative to the root named by `root`. Never absolute, never `..`. */
  readonly path: string;
  /** Full file contents, ending in exactly one `\n`. */
  readonly contents: string;
  readonly merge?: true;
  /** **(NEW — ci-workflow-root.)** Which root `path` is relative to. Absent — the
   *  default for every artifact written before this feature and for every artifact
   *  except one — means the install directory (`targetDir`). `'repo'` means the
   *  enclosing git repository's root, which may be `targetDir` itself or an ancestor
   *  of it, and never anything else (WR-4).
   *
   *  Deliberately `'repo' | undefined` rather than a two-member enum with a `'target'`
   *  default, for the same reason `merge` is `true | undefined` (context7-mcp, MC-7):
   *  no existing call site has to opt out, and the non-default capability is a single
   *  greppable token. Exactly one expression in all of `src/` assigns it (WR-5). */
  readonly root?: 'repo';
}
```

### Public API — `src/writer.ts` (MODIFIED) — G2

`assertContained` is **not modified**. Its parameters, its body, its two throw sites,
and its doc comment are byte-unchanged. What changes is what it is called *with*: the
root a file declared, rather than `targetDir` unconditionally.

```ts
export interface WritePlan {
  readonly targetDir: string;
  /** **(NEW — ci-workflow-root.)** Absolute path of the enclosing repository root, or
   *  `targetDir` when the install directory is the root or is not in a repository at
   *  all. Every `root: 'repo'` file resolves against this. */
  readonly repoRoot: string;
  readonly files: readonly GeneratedFile[];
  /** Paths that already exist on disk, as display paths (WR-7). */
  readonly conflicts: readonly string[];
}

/** The absolute directory a file's `path` is relative to. Total over `GeneratedFile`:
 *  `'repo'` selects `repoRoot`, absent selects `targetDir`. */
export function resolveWriteRoot(
  file: GeneratedFile,
  targetDir: string,
  repoRoot: string,
): string;

/** A file's path as a reader should see it: POSIX, relative to `targetDir`. Identical
 *  to `file.path` for every target-rooted file (so today's reporting is unchanged);
 *  `../`-prefixed for a repo-rooted file in a subdirectory install (WR-7). */
export function displayPath(file: GeneratedFile, targetDir: string, repoRoot: string): string;

/** **(MODIFIED.)** `repoRoot` defaults to `targetDir`, so every existing caller and
 *  test keeps its exact behavior without edit. */
export async function planWrites(
  files: readonly GeneratedFile[],
  targetDir: string,
  repoRoot?: string,
): Promise<WritePlan>;

/** Unchanged signature. Resolves each file against its own root via
 *  `resolveWriteRoot`, and reports written paths as display paths. */
export async function applyWrites(
  plan: WritePlan,
  options: { readonly force: boolean },
): Promise<readonly string[]>;
```

`planWrites`' per-file loop gains exactly one guard ahead of the existing
`assertContained` call:

```ts
for (const file of files) {
  const root = resolveWriteRoot(file, targetDir, repoRoot);
  if (file.root === 'repo') {
    assertRepoRootPermitted(repoRoot, targetDir);
  }
  assertContained(file.path, root);
  if (file.merge) continue;
  // ... existing conflict probe, against `path.join(root, file.path)`
}
```

```ts
/** Throws if `repoRoot` is neither `targetDir` nor an ancestor of it. A generated file
 *  may escape UPWARD along the install directory's own ancestry and nowhere else:
 *  never to a sibling, never to an unrelated absolute path, never below `targetDir`
 *  via a root that is a descendant. Like `assertContained`, this is a generator bug,
 *  not a user-facing `HarnessError` (`AGENTS.md` S2). */
function assertRepoRootPermitted(repoRoot: string, targetDir: string): void;
```

### Public API — `src/engine.ts` (MODIFIED) — G1, G3, G4

```ts
/** **(NEW — ci-workflow-root.)** Where an install sits inside the repository that will
 *  run its CI, reduced to the only fact the renderer needs. A struct rather than a
 *  bare string so `monorepo-mode` can add fields (a component list) without changing
 *  any signature here (XC-6). */
export interface CiPlacement {
  /** POSIX path from the repository root to the install directory. `''` means the
   *  install directory IS the repository root — today's only case. */
  readonly prefix: string;
}

/** The placement every pre-existing caller gets by default: the install directory is
 *  the repository root, which is exactly harny's own case (XC-1). */
export const ROOT_PLACEMENT: CiPlacement = { prefix: '' };

/** **(MODIFIED.)** `placement` defaults to `ROOT_PLACEMENT`, so every existing caller
 *  and test keeps its exact behavior — and its exact bytes — without edit. */
export function buildFeedbackFiles(
  payload: HarnessPayload,
  placement?: CiPlacement,
): readonly GeneratedFile[];
```

Its returned workflow entry is the one place in `src/` that declares a non-default
write root (WR-5):

```ts
{
  path: ciWorkflowPathFor(placement.prefix),
  contents: renderCiWorkflow(payload.ciWorkflowTemplate.contents, profile, stack, placement),
  root: 'repo',
}
```

`root: 'repo'` is assigned **unconditionally**, not only for a subdirectory install
(CW-8): the workflow's root is always the repository, and for a root install
`repoRoot === targetDir` makes that identical to today's destination. A branch here
would mean two code paths where the statement "this artifact belongs to the repository"
is true of both.

Two private helpers change or appear in the same module:

```ts
/** **(MODIFIED.)** Gains `placement`. For `placement.prefix === ''` the returned
 *  string is what today's three-argument version returns, byte-for-byte (CR-1). */
function renderCiWorkflow(
  template: string,
  profile: StackProfile | undefined,
  stack: string | undefined,
  placement: CiPlacement,
): string;

/** **(NEW.)** Rewrites the canonical `name:` line — the single canonical-region value
 *  this feature ever touches (CR-3), and only when `placement.prefix` is non-empty.
 *  Replaces the first line matching `/^name:\s/`; throws `HarnessError('TEMPLATE')`
 *  when there is none, mirroring `spliceGeneratedYamlBlock`'s missing-marker guard
 *  (CR-8). Uses the existing shared `yamlQuote`; no YAML library (CR-9, ADR 0015). */
function renameCanonicalWorkflow(template: string, workflowName: string): string;
```

`spliceGeneratedYamlBlock`, `renderInstallGateChain`, and `renderRunnerInvocation` are
**unchanged**. In particular `renderRunnerInvocation` still emits
`node .sdd/feedback/run-feedback.mjs …` with no component prefix — the step's working
directory moves instead (C6, CR-2).

### Public API — `src/doctor.ts` (MODIFIED) — G5

```ts
/** **(MODIFIED.)** Gains a third parameter, defaulted, so the `ci-workflow` entry can
 *  name the workflow's real location. Every other check in every family is unchanged
 *  and untouched by `placement`. */
export function buildDoctorChecks(
  config: HarnessConfig,
  generators: readonly Generator[],
  placement?: CiPlacement,
): DoctorChecksFile;

/** **(MODIFIED.)** Same defaulted parameter, forwarded to `buildDoctorChecks`. */
export function buildDoctorFiles(
  payload: HarnessPayload,
  generators: readonly Generator[],
  placement?: CiPlacement,
): readonly GeneratedFile[];
```

The one changed entry:

```ts
const ciWorkflowCheckPath = ciWorkflowPathFromInstallDir(placement.prefix);
require.push({
  id: 'ci-workflow',
  description: `${ciWorkflowCheckPath} is scaffolded`,
  anyOf: [ciWorkflowCheckPath],
  remediation: `run npx harny init and commit ${ciWorkflowCheckPath}`,
  requires: HARNESS_GATE,
});
```

`runDoctor` resolves the location itself before building checks, so the verb and the
generated `checks.json` are produced by the same function from the same input (DR-3,
`readiness-checks.md` RD-7):

```ts
const location = await resolveInstallLocation(targetDir);
const checks = buildDoctorChecks(config, generators, { prefix: location.prefix });
```

### Public API — `src/init.ts` (MODIFIED) — G1, C9

`runInit`'s signature, its `InitOptions`, and its `InitResult` shape are unchanged, and
the sequence stays at **thirteen steps** (`cli-init.md` CLI-1). The location is
resolved at the top of step 11 — the render step that `context7-mcp` already widened to
read from `targetDir` — and threaded into step 12:

```ts
// 11. Render …
const location = await resolveInstallLocation(targetDir);
// … warnings per CW-9 …
files.push(...buildFeedbackFiles(payload, { prefix: location.prefix }));
files.push(...buildDoctorFiles(payload, resolvedGenerators, { prefix: location.prefix }));

// 12. Plan writes.
const plan = await planWrites(files, targetDir, location.repoRoot);
```

### Canonical template — `templates/ci/harny-feedback.yml` (MODIFIED header only) — G6

The YAML below the header is byte-unchanged: `name:`, `on:` with both triggers,
`jobs.feedback.runs-on`, the checkout step, and the two marker lines all stay exactly as
they are. Only the leading comment block is revised, to state the narrowed canonical
claim (CR-7) and to explain the two placements a reader may be looking at:

```yaml
# Generated by harny — the shared computational-feedback CI gate.
# GitHub reads `.github/workflows/` only at a repository ROOT, so this file always
# lives at the root even when the harness that generated it was installed in a
# subdirectory. For a subdirectory install the file is named after the install path
# (e.g. `harny-feedback-apps-web.yml`) and its generated steps carry a
# `working-directory:` pointing at that subdirectory.
#
# Everything outside the generated-block markers below — the triggers, the job, the
# checkout step, and this comment — is canonical and copied verbatim by every run,
# with exactly one exception: for a subdirectory install the `name:` line below is
# rewritten to name the subdirectory, so two harnesses in one repository are
# distinguishable in the checks list. Nothing else outside the markers ever varies.
# Do not hand-edit the generated block — re-run `harny init` instead.
# …
```

The full replacement text is specified by CR-7; the two paragraphs above are its
substantive additions. Revising this header changes the bytes of the generated
workflow, including harny's own — which is why XC-1 requires regenerating and
committing `.github/workflows/harny-feedback.yml` in this same change, and why SC2
compares the **non-header region** against the pre-change output.

---

## Data Models

**No new or modified data structure outside the four declarations above.**
`HarnessConfig`, `HarnessPayload`, `ProjectConfigSummary`, `HookPayload`,
`StackProfile`, `FeedbackCommand`, `DoctorCheck`, `DoctorChecksFile`, `McpConfig`,
and `Generator` all keep their exact current shape. In particular:

- **`HarnessConfig` gains no field and `.sdd/harness.json` gains no key** (XC-4). The
  install's placement is a fact about where the directory sits on disk, re-derivable in
  microseconds and invalidated by any `mv`; persisting it would create a second source
  of truth that can silently disagree with the first. `serializeConfig`'s output is
  byte-unchanged, so `.sdd/harness.json` stays on FC-13's byte-identical list for free.
- **`Generator` gains no member** (XC-5). Placement is not a per-tool fact — it is the
  same for all five tools in one install — so it has no business in the interface that
  ADRs 0011/0025/0027 reserve for per-tool facts.

---

## State Changes

| Surface | Change |
|---|---|
| Files written into the install directory | **None added, none removed, none moved.** Exactly one path leaves: `.github/workflows/harny-feedback*.yml` is now resolved against the repository root. For a root install that is the same absolute path as today. |
| Files written above the install directory | Exactly one, and only for a subdirectory install: `<repoRoot>/.github/workflows/harny-feedback-<slug>.yml`. |
| `.sdd/doctor/checks.json` | The `ci-workflow` entry's `anyOf`, `description`, and `remediation` carry the install-relative workflow path. Byte-unchanged for a root install. |
| `.sdd/harness.json` | Byte-unchanged. |
| `.sdd/feedback/run-feedback.mjs`, `.sdd/shared/probes.mjs`, `.sdd/doctor/run-doctor.mjs` | Byte-unchanged (SC13, DR-4). No runner learns anything about placement; `run-doctor.mjs` already resolves `anyOf` entries with `path.join(cwd, p)`, which tolerates a `../`-prefixed entry. |
| Every per-tool artifact (agents, conductor, skills, hooks, MCP config) | Byte-unchanged, same paths, same contents. |
| `InitResult.planned` / `.written` / `WritePlan.conflicts` | Same type (`readonly string[]`), same values for every target-rooted file; a repo-rooted file in a subdirectory install appears as a `../`-prefixed display path. |
| This repository's own `.github/workflows/harny-feedback.yml` | Regenerated: header comment revised, everything below it unchanged. |
| `specs/archived/agent-feedback-controls/contract.md` | One dated blockquote appended after the existing bullet at line 808. No other byte changes. |

---

## Behavior Guarantees

### The declared write root (G2)

1. **WR-1 — A generated file declares its root.** `GeneratedFile.root` is `'repo'` or
   absent; absent means the install directory. Every artifact that existed before this
   feature leaves it absent and behaves exactly as before. No call site is edited to
   opt out.
2. **WR-2 — `assertContained` is unchanged and still universal.** Its function body is
   byte-identical to its current form, and `planWrites` still calls it exactly once for
   every file in the plan, before any conflict probe and before any write. The only
   difference is the directory it is handed: the file's own resolved root. A path that
   is absolute, or that escapes the root it declared, still throws a plain `Error`.
3. **WR-3 — `planWrites` carries the repository root.** `planWrites(files, targetDir,
   repoRoot?)` records `repoRoot` on the returned `WritePlan`; omitting the argument
   makes `repoRoot === targetDir`, which reproduces today's behavior exactly for every
   existing caller and every existing test.
4. **WR-4 — Escape is upward along the install directory's own ancestry, or not at
   all.** A `root: 'repo'` file is permitted only when `repoRoot` is `targetDir` or a
   proper ancestor of it. A `repoRoot` that is a sibling, a descendant, or unrelated is
   a generator bug and throws a plain `Error` naming both directories, before anything
   is written. There is no flag, option, or environment variable that relaxes this.
5. **WR-5 — Exactly one site in `src/` may write above the install directory.** The
   token `root: 'repo'` appears in exactly one expression in all of `src/` — the
   workflow entry in `buildFeedbackFiles` — plus its type declaration in
   `src/generators/types.ts` and its two reads in `src/writer.ts`. A test asserts this
   count by grep, in the same style as `agent-feedback-controls` BG-7's
   command-literal gate.
6. **WR-6 — Conflict detection follows the file to its root.** A pre-existing file at a
   repo-rooted destination enters `WritePlan.conflicts` exactly as an in-target file
   does, and `applyWrites` still refuses the entire run before writing anything. A
   second install can therefore never silently overwrite a first install's workflow.
7. **WR-7 — Out-of-target paths are visually distinct.** Every path in
   `WritePlan.conflicts`, `InitResult.planned`, and `InitResult.written` is POSIX and
   relative to `targetDir`. For every target-rooted file that is `file.path` unchanged;
   for a repo-rooted file in a subdirectory install it begins with `../`. No absolute
   path is ever reported.
8. **WR-8 — `--dry-run` still writes nothing anywhere.** Neither root is touched, and
   the dry-run listing includes the repo-rooted path in display form.
9. **WR-9 — All-or-nothing spans both roots.** When `WritePlan.conflicts` is non-empty
   and `--force` is absent, nothing is written at either root — the existing
   pre-write `CONFLICT` throw already guarantees this, and this feature does not add a
   write that precedes it.

### Placement (G1, G3, G7)

10. **CW-1 — `resolveInstallLocation` is total.** For any existing directory it returns
    an `InstallLocation` and never throws. `prefix` is always `''` or a POSIX relative
    path with no leading `./`, no trailing `/`, and no `..` segment.
11. **CW-2 — `.git` counts whether it is a directory or a file.** A normal clone (`.git`
    directory), a `git worktree` checkout (`.git` file), and a submodule checkout
    (`.git` file) are all detected as repository roots. Detection is by entry presence,
    not entry type, and a `.git` that exists but cannot be stat'ed is treated as absent
    so the walk continues upward rather than aborting the run.
12. **CW-3 — Not being in a repository is a normal outcome.** When no `.git` entry is
    found between `targetDir` and the filesystem root, `insideRepo` is `false`,
    `repoRoot` is `targetDir`, `prefix` is `''`, and every downstream consumer takes
    exactly today's path. `init` exits 0. It never throws, never falls back to
    `process.cwd()`, and never consults `GIT_DIR` or `GIT_WORK_TREE`.
13. **CW-4 — The root placement reproduces the constant exactly.**
    `ciWorkflowPathFor('') === CI_WORKFLOW_PATH`, compared as strings. The directory,
    base name, and extension are read off that constant rather than re-typed
    (`AGENTS.md` S5).
14. **CW-5 — The slug is deterministic, pure, and total.** `componentSlug` applies the
    five-step rule in § Interfaces and is a pure function of its argument: no
    filesystem access, no clock, no environment. The same prefix always yields the same
    slug, on every platform.
15. **CW-6 — A subdirectory install's workflow is name-scoped.** For a non-empty
    prefix the path is `.github/workflows/harny-feedback-<slug>.yml`. Two installs at
    two different subdirectories whose slugs differ produce two files, and neither
    overwrites the other.
16. **CW-7 — Exactly one generated path varies with placement.** Every other path in
    the write plan — all `.sdd/*`, all per-tool artifacts, all skills, the MCP configs
    — is byte-identical to what the same config produces today, with the same root
    (absent) and the same relative path.
17. **CW-8 — The workflow declares `root: 'repo'` unconditionally.** There is no
    placement-dependent branch on the declaration itself; a root install resolves
    `'repo'` to `targetDir` because `repoRoot === targetDir`.
18. **CW-9 — A write above the install directory is never silent.** When `prefix` is
    non-empty, `init` emits one `io.warn` naming the resolved repository root, the
    workflow's destination, and the reason (GitHub reads workflows only at the root).
    When `insideRepo` is `false`, `init` emits one `io.warn` stating that the directory
    is not inside a git repository and that the workflow was written inside it, where
    GitHub will read it only if this directory is itself the repository root. A root
    install inside a repository emits neither — it is the ordinary case, not a
    condition.
19. **CW-10 — `runInit` remains thirteen steps.** Location resolution is folded into
    step 11 alongside the MCP build, exactly as `context7-mcp` folded its own
    `targetDir`-reading work there. No step is added, removed, or reordered
    (`cli-init.md` CLI-1).
20. **CW-11 — Determinism holds over a widened, stated input set.** Two `runInit` runs
    with the same config, the same templates, the same pre-existing merge-owned
    contents **and the same install-directory position within the same repository**
    produce byte-identical output. Position is now an input; it is a pure function of
    the filesystem, involves no clock, no randomness, no network, no remote git state,
    and no subprocess. `cli-init.md` CLI-4 is amended, not violated (see § Proposed
    amendments).

### Rendering and the canonical CI region (G4, G6)

21. **CR-1 — A root install's workflow is byte-identical to today's, outside the
    header.** With `prefix === ''`, `renderCiWorkflow`'s output equals the pre-change
    three-argument function's output for the same template, profile, and stack. No
    `name:` rewrite happens, no `working-directory` line is emitted, and the generated
    block's step list is character-for-character what it is today. The only difference
    between this feature's generated file and the one currently committed is the
    revised header comment (CR-7), which is canonical template text, not rendered
    output.
22. **CR-2 — Scoping is a working-directory change, never a path prefix.** For a
    non-empty prefix, each generated `run` step gains one line,
    `working-directory: <yamlQuote(prefix)>`, immediately after its `run:` line. The
    runner invocation still names `.sdd/feedback/run-feedback.mjs` with no prefix, the
    install gate chain still tests `-f package-lock.json` and `-f package.json` with no
    prefix, every command probe still resolves `tsconfig.json` and the eslint config
    candidates with no prefix, and `--whole-project`'s `.` sentinel still means "this
    directory". All of them move together because the step's working directory moved,
    which is the only mechanism that moves all of them at once (C6).
23. **CR-3 — The canonical region, restated precisely.** In **both** placements these
    are copied verbatim from `templates/ci/harny-feedback.yml`: the header comment, the
    `on:` block (both triggers, `main` per ADR 0030), `jobs:`, the job id `feedback`,
    `runs-on: ubuntu-latest`, `steps:`, the checkout step including
    `actions/checkout@v5`, and both marker lines. Exactly one canonical value is ever
    rewritten, and only when `prefix` is non-empty: the **`name:` line**, which becomes
    `name: "harny feedback (<prefix>)"`. This is the narrowing C4 demands, stated in
    full: the claim "the structure outside the markers is copied verbatim" becomes
    "…verbatim, except that a subdirectory install renames the workflow, and nothing
    else."
24. **CR-4 — No `on.pull_request.paths` filter is ever generated.** The hand-fix that
    motivated this feature added one; harny does not. GitHub's own documentation states
    that a workflow skipped by path filtering leaves its associated checks in a
    `Pending` state, which blocks pull requests that require those checks — a
    silent-blocking failure of the same family as the silent-never-running failure this
    feature exists to remove. A repository that wants the filter adds it by hand, the
    same posture ADR 0030 takes toward the `main` branch name. Recorded as ADR 0032.
25. **CR-5 — No `defaults.run.working-directory` is ever generated**, at workflow or at
    job level. Both live in the canonical region, and both would have to be *removed*
    by `monorepo-mode`, whose single root-level job runs from the repository root
    (C7, XC-6). Step-level scoping lives inside the generated block, which every
    feature is already free to re-render.
26. **CR-6 — The generated block still carries no trigger.** It contains no `on:` key
    and no `push` token, in both placements — the regression guard
    `dogfood-quick-fixes` added for CI-4 continues to hold and is extended to cover the
    subdirectory rendering.
27. **CR-7 — The template header states the narrowed claim.** The revised header names:
    that the file always lives at a repository root; that a subdirectory install's file
    is named after the install path; that its generated steps carry a
    `working-directory`; that everything outside the markers is verbatim except the
    `name:` line; and that the generated block must not be hand-edited. The existing
    paragraphs about the two triggers, the `main` literal, and the runner invocation are
    preserved.
28. **CR-8 — A template with no `name:` line is a packaging error, not a crash.**
    `renameCanonicalWorkflow` throws `HarnessError('TEMPLATE')` with a message naming
    the file and stating that this is a packaging bug, mirroring
    `spliceGeneratedYamlBlock`'s missing-marker guard verbatim in posture.
29. **CR-9 — Still no YAML dependency.** Both the splice and the rename are line
    operations on strings, using the existing `yamlQuote` from
    `src/generators/markdown-yaml.ts`. ADR 0015 stands.

### Readiness (G5)

30. **DR-1 — The readiness check points at the file that exists.** For any placement,
    `.sdd/doctor/checks.json`'s `ci-workflow` entry names the workflow's location
    **relative to the install directory**, which is where `run-doctor.mjs` resolves it
    from. For `prefix === 'apps/web'` that is
    `../../.github/workflows/harny-feedback-apps-web.yml`. The entry's `description`
    and `remediation` name the same path, so the report and the fix agree.
31. **DR-2 — A root install's entry is byte-unchanged.** With `prefix === ''` the
    `ci-workflow` entry is character-for-character what `buildDoctorChecks` emits today,
    which keeps `.sdd/doctor/checks.json` on FC-13's byte-identical list.
32. **DR-3 — The verb re-derives, so RD-7 holds.** `runDoctor` calls
    `resolveInstallLocation(targetDir)` and passes the resulting prefix to the same
    `buildDoctorChecks` that generated the on-disk `checks.json`. `npx harny doctor
    <dir>` and `node <dir>/.sdd/doctor/run-doctor.mjs` therefore evaluate the same
    `ci-workflow` entry and reach the same ready/not-ready result for the same repo
    state.
33. **DR-4 — No runner changes.** `templates/doctor/run-doctor.mjs`,
    `templates/shared/probes.mjs`, and `templates/hooks/run-feedback.mjs` are
    byte-unchanged by this feature, and so are their three scaffolded copies.
    `anyPathExists` already does `fs.existsSync(path.join(cwd, p))`, which resolves a
    `../`-prefixed entry correctly with no code change.
34. **DR-5 — A generated `checks.json` can go stale after a directory move; the verb
    cannot.** Moving an install directory to a different depth invalidates the recorded
    relative path, and the check then reports `FAIL` with a remediation naming a path
    that no longer matches. The remediation for that is the one `init` already prints
    for every scaffold-derived check: re-run `npx harny init`. `npx harny doctor`
    itself is never stale, because DR-3 re-derives. This limitation is accepted and
    documented rather than fixed by persisting placement into `.sdd/harness.json`
    (XC-4), which would make the same staleness durable instead of transient.

### The archived-contract correction (G6)

35. **AC-1 — A dated note, placed after the existing text.**
    `specs/archived/agent-feedback-controls/contract.md`'s bullet ending "The canonical
    structure outside the markers otherwise stays as shipped, including
    `actions/checkout@v4`." (line 808) gains a dated blockquote **immediately after**
    it. The original sentence is left byte-identical; nothing in it is edited, struck,
    or reworded.
36. **AC-2 — Nothing else in that archived feature is touched.** Its `intent.md`,
    `roadmap.md`, `tasks.md`, `audit.md`, every other line of its `contract.md`, its
    `## Post-audit amendment A1` section, and every `## Audit Log` row are
    byte-unchanged. No finding is re-graded and no verdict is restated. The amendment's
    history is recorded, not rewritten.
37. **AC-3 — The note is self-explaining.** It carries the date (2026-09-22), names
    `ci-workflow-root` as the feature making it, states that the pin moved from
    `actions/checkout@v4` to `@v5` on 2026-09-22 and that the sentence above predates
    that move, and confirms that this is a text correction only: no guarantee, no
    behavior, and no audit finding changes. It follows the exact shape of the
    `> **Text correction (2026-09-22, \`dogfood-quick-fixes\`).**` note at
    `specs/archived/feedback-path-hygiene/contract.md:17`.

### Cross-cutting (G4, G7)

38. **XC-1 — FC-13's eight paths are re-proven, and harny's own workflow is regenerated
    in this change.** Because CR-7 revises canonical template text, this repository's
    `.github/workflows/harny-feedback.yml` changes; it is regenerated and committed as
    part of this feature, and byte-identity is re-proven by running
    `npx harny init <scratch> --yes --tools claude-code --stack typescript` and
    comparing all eight FC-13 paths (`.claude/settings.json`,
    `.github/workflows/harny-feedback.yml`, `.sdd/feedback/run-feedback.mjs`,
    `.sdd/shared/probes.mjs`, `.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`,
    `.sdd/harness.json`, `.sdd/spec-schema/*.md`). Seven of the eight are expected
    byte-unchanged from their currently committed form; only the workflow's header
    differs.
39. **XC-2 — No dependency is added.** Runtime and dev dependency sets are exactly
    `commander`, `@clack/prompts`, `typescript`, `vitest`, `@types/node` as pinned
    today (`AGENTS.md` S4). The new module uses `node:fs/promises` and `node:path`
    only.
40. **XC-3 — `package.json` and `tests/packaging.test.ts` are not touched, and the
    suite baseline is preserved.** The pre-existing single failure (the vitest version
    pin) stays failing and is not "fixed". No previously passing test is made to fail.
    The packaged template count stays at thirty-one: this feature adds no file under
    `templates/`.
41. **XC-4 — No configuration surface changes.** `HarnessConfig`, `serializeConfig`,
    `.sdd/harness.json`, every CLI flag, and every prompt are unchanged. There is no
    `--repo-root`, no `--workflow-name`, and no new question.
42. **XC-5 — No generator changes.** The `Generator` interface gains no member; none of
    the five generator files is edited; `skillRootsFor`, `renderHook`, `renderRole`,
    `renderConductor`, and `buildMcpFiles` are untouched.
43. **XC-6 — `monorepo-mode` extends this, and deletes none of it.** Its decided shape
    — one job at the git root making one runner call, the runner resolving each touched
    path to its component — is reached from here by installing at the repository root:
    `prefix` is `''`, so no `name:` rewrite happens, no `working-directory` is emitted,
    the canonical file name is used, and the single runner invocation runs from the
    root. That is exactly today's rendering. The seams `monorepo-mode` will use are
    already in place: `CiPlacement` is a struct, so a component list is an added field
    rather than a changed signature; per-step scoping lives inside the generated block,
    which is re-rendered per feature, rather than in the canonical region, which is not;
    and no per-component job, matrix, or workflow file is introduced here that would
    have to be collapsed later. This feature implements **no** part of
    `components: [{path, stack}]`.

---

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| A generated path is absolute or escapes the root it declared | `assertContained` throws a plain `Error` before any write (unchanged) | Exit 1 (`EXIT.UNEXPECTED`). A generator bug, reported as such |
| A `root: 'repo'` file is planned while `repoRoot` is not `targetDir` or an ancestor of it | `assertRepoRootPermitted` throws a plain `Error` naming both directories, before any write | Exit 1. A generator bug; no partial write |
| `templates/ci/harny-feedback.yml` has no `name:` line | `HarnessError('TEMPLATE')` naming the file and stating this is a packaging bug | Exit 5, with the same wording posture as the missing-marker error |
| `templates/ci/harny-feedback.yml` is missing its generated-block markers | Unchanged: `HarnessError('TEMPLATE')` | Exit 5 |
| The workflow's destination already exists at the repository root, without `--force` | The path enters `WritePlan.conflicts` as a `../`-prefixed display path; `applyWrites` throws `HarnessError('CONFLICT')` before writing anything | Exit 3. Nothing is written at either root; the message names the path and points at `--force` |
| Two installs in one repository derive the same slug (e.g. `apps/web` and `apps-web`) | The second run sees the first's file as a conflict and refuses | Exit 3, loud. Remediation: install from a differently-named directory, or re-run with `--force` to overwrite deliberately |
| `targetDir` is not inside any git repository | `insideRepo: false`; the workflow is written inside `targetDir` exactly as today; one `io.warn` | Exit 0 with a named warning |
| `targetDir` is a subdirectory of a repository | The workflow is written at the repository root; one `io.warn` naming root, destination, and reason | Exit 0 with a named warning |
| A `.git` entry exists but cannot be stat'ed (permissions) | Treated as absent; the upward walk continues | No error; resolution proceeds, possibly to an ancestor or to `insideRepo: false` |
| The repository root is not writable, or `.github/workflows/` cannot be created there | `applyWrites`' existing disclosure path: a plain `Error` naming the failing path and every path already written | Exit 1, with partial state disclosed, never hidden |
| An unrecognized or blank `--stack` in a subdirectory install | Unchanged (`feedback-controls.md` FC-2): the notice step is generated, and it too carries the `working-directory` line | Exit 0 with the existing escape-hatch warning |

---

## Dependencies

- **Internal**: `src/feedback.ts` (`CI_WORKFLOW_PATH`), `src/engine.ts`
  (`buildFeedbackFiles`, `renderCiWorkflow`, `CiPlacement`), `src/writer.ts`
  (`assertContained`, `planWrites`, `applyWrites`), `src/doctor.ts`
  (`buildDoctorChecks`, `buildDoctorFiles`, `runDoctor`), `src/init.ts` (`runInit`),
  `src/generators/types.ts` (`GeneratedFile`),
  `src/generators/markdown-yaml.ts` (`yamlQuote`), `src/errors.ts` (`HarnessError`).
- **Node builtins**: `node:fs/promises`, `node:path` — both already used across `src/`.
- **External packages**: **none added, none removed, none version-changed**
  (`AGENTS.md` S4; XC-2).

---

## Integration Points

- **`runInit` step 11 → `buildFeedbackFiles` / `buildDoctorFiles`** — the placement is
  resolved once per run and handed to both builders; neither reads the filesystem
  itself, so both stay pure and unit-testable without a git fixture.
- **`runInit` step 12 → `planWrites`** — the repository root reaches the writer only
  through the plan, so `applyWrites` needs no new parameter.
- **`runDoctor` → `buildDoctorChecks`** — the verb re-derives placement so the two
  readiness surfaces agree (RD-7).
- **`.sdd/doctor/checks.json` → `templates/doctor/run-doctor.mjs`** — placement travels
  as data in an existing field (`anyOf`), which is why the runner needs no change and
  stays byte-identical (RD-3's "every path is data, never a literal in the runner").
- **The generated workflow → `.sdd/feedback/run-feedback.mjs`** — unchanged interface:
  `run --whole-project --commands <inline JSON>`. The component is expressed by the
  step's working directory, not by the runner's arguments, which is what leaves
  `monorepo-mode` free to express components inside the runner instead (XC-6).
- **`AGENTS.md` § "Feedforward vs. feedback"** — the feedback-computational cell's CI
  half becomes true for subdirectory installs, where it was silently false.

---

## Proposed amendments to `specs/current/`

Applied by `harny-sync` archive mode after this feature ships.

| Statement | Change |
|---|---|
| `feedback-controls.md` **FC-7** ("generate exactly one `.github/workflows/harny-feedback.yml`") | Rewrite: the system generates exactly one workflow per install, at the enclosing **git repository root**, named `harny-feedback.yml` for a root install and `harny-feedback-<slug>.yml` for a subdirectory install. "Exactly one per run, byte-identical across tool selections" and the two-step-kinds scenario are unchanged; a subdirectory install's two steps additionally carry `working-directory` |
| `feedback-controls.md` **FC-13** | No change to the enumerated eight paths. Add that the git-root install case is the byte-identity-preserving path through the new placement logic, and that this feature regenerated the workflow's header |
| `feedback-controls.md` § Invariants | Add: **I7 — The CI workflow belongs to the repository, every other artifact belongs to the install.** Exactly one generated artifact resolves against the repository root; every other resolves against the install directory |
| `feedback-controls.md` § Contributing features | Add `ci-workflow-root` with its `Shipped:` date and "repository-root placement, install-scoped workflow name, step-level component scoping, no `paths:` filter" |
| `cli-init.md` **CLI-4** | Amend the determinism clause: byte-identical output requires the same config, templates, merge-owned contents **and the same install-directory position within the same repository**. Amend the containment clause: every generated path is relative and resolves inside the root it declares — the install directory by default, or the enclosing repository root for the single artifact that declares it, which must be the install directory or an ancestor |
| `cli-init.md` **CLI-5** | Amend: conflict detection covers every planned path at whichever root it resolves against, so a pre-existing file at the repository root blocks the run exactly as one inside the install directory does |
| `cli-init.md` **CLI-1** | No content change (the sequence is still thirteen steps); record in § Contributing features that step 11 also resolves the install location |
| `cli-init.md` § Invariants | Add: a new module `src/repo.ts` sits between `engine.ts` and `feedback.ts` in the downward import order; nothing imports it back |
| `readiness-checks.md` **RD-7** | No content change; record that the verb resolves the install location before building checks, which is what keeps the agreement true for a subdirectory install |
| `readiness-checks.md` § Open reservations | Add **RD-R10** (LOW): a generated `checks.json`'s `ci-workflow` entry records an install-relative path that goes stale if the install directory is moved to a different depth; `npx harny doctor` re-derives and is never stale; remediation is to re-run `npx harny init` |
| `_index.md` § Keyword lookup | Add rows: `git root / repository root` → `feedback-controls`; `monorepo / subdirectory install` → `feedback-controls`; `write root` → `cli-init`; `workflow file name` → `feedback-controls` |
| `_index.md` § Decisions | Register **ADR 0031**–**ADR 0034** (below) |
| `AGENTS.md` § Coding standards **S3** | Amend the containment clause: every written path is relative and inside its **declared root** — the install directory for every artifact except the CI workflow, whose declared root is the enclosing git repository (`GeneratedFile.root === 'repo'`). Update the code reference from `src/writer.ts:16–28` to the range covering `resolveWriteRoot`, `assertRepoRootPermitted`, and the unchanged `assertContained` (`src/writer.ts:20–78`), and add a citation to this feature's WR-1–WR-5 |

## Decisions to record as ADRs

Numbering is globally monotonic; the next free number is **0031**.

| ADR | Title | Capability |
|---|---|---|
| 0031 | A declared write root on `GeneratedFile`, never a weakened `assertContained` | cli-init |
| 0032 | Scope a subdirectory install with a step-level `working-directory` and no `paths:` filter | feedback-controls |
| 0033 | Detect the repository root by walking for a `.git` entry, not by shelling out to `git rev-parse` | cli-init |
| 0034 | Derive the workflow file name from the install prefix; surface a name collision as `CONFLICT` rather than resolving it | feedback-controls |

ADR 0033 must explicitly address **ADR 0030**, which rejected deriving the CI workflow's
branch name from git. The distinction it records: 0030 rejected deriving workflow
*content* from **remote** state (`refs/remotes/origin/HEAD`), which varies with clone
options and remote configuration; this feature derives artifact *placement* from
**local filesystem** state, which is a pure function of the checkout on disk. The two
are not the same claim, and 0033 exists so a future reader does not mistake this
feature for a reversal of 0030.
