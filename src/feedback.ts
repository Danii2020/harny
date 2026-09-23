/**
 * The single stack->command mapping (contract.md "Public API — src/feedback.ts",
 * G1). This is the ONLY place a feedback command string is written (SC1) —
 * generators, the runner and the CI workflow all receive commands from here rather
 * than re-literalling them.
 *
 * Imports only `./vocabulary.js` and `./errors.js`, preserving `cli-init.md` CLI-11
 * (no import cycles). Neither is currently needed by this module's own logic, so
 * this file has no imports at all — the constraint is a ceiling, not a floor.
 */

/** How a command consumes the turn's touched-file set. */
export type PathMode = 'per-file' | 'whole-project';

/** A presence test evaluated in the target repo at hook/CI runtime, not at
 *  generation time — `harny init` cannot know what a repo will install later. */
export interface ToolProbe {
  /** `package.json` script name that must exist, e.g. `typecheck`. */
  readonly script?: string;
  /** Executable that must resolve on PATH, e.g. `ruff`. */
  readonly binary?: string;
  /** Any one of these files must exist, e.g. `['.eslintrc.json', 'eslint.config.js']`. */
  readonly anyFile?: readonly string[];
}

/** The two computational-FEEDBACK kinds: fast enough for a per-turn hook.
 *  (readiness-doctor.) */
export type FeedbackKind = 'lint' | 'typecheck';
/** The computational-FEEDFORWARD kind: run once before work starts, never per
 *  turn. (readiness-doctor.) */
export type ReadinessKind = 'test';

/** The shape both `FeedbackCommand` and `ReadinessCommand` share. Originally
 *  extracted verbatim from `FeedbackCommand` (readiness-doctor); `extensions` added
 *  by feedback-path-hygiene. Optional, so every existing consumer and every
 *  hand-written commands JSON keeps working unchanged (ADR 0018). */
export interface CommandSpec<K extends string> {
  /** Stable id, unique within its profile. Used in generated output and findings. */
  readonly id: string;
  readonly kind: K;
  /** Argv, never a shell string — no quoting/injection surface. Executed from the
   *  target repo root. */
  readonly argv: readonly string[];
  /** `per-file` appends the turn's touched paths to `argv`; `whole-project` ignores
   *  them (e.g. `tsc --noEmit`, which cannot type-check a file in isolation). */
  readonly pathMode: PathMode;
  /** **(NEW — feedback-path-hygiene.)** File-name suffixes this command accepts,
   *  each including its leading dot (e.g. `'.py'`). Consulted ONLY by the runner's
   *  turn-based `run` mode, and only for `per-file` commands: a touched path is
   *  passed to this command iff it ends with one of these suffixes (case-sensitive).
   *  **(A1.)** A valid entry is a non-empty string. Absent, not an array, empty
   *  (`[]`), or an array with no valid entry (e.g. `[null, '']`, `[5]`) all mean no
   *  extension filtering; when at least one valid entry is present, only the valid
   *  entries are matched and invalid ones are ignored (`[null, '', 5, '.py']` behaves
   *  as `['.py']`). An unusable list means "no filter", never "match nothing", so a
   *  misconfigured list can never silently disable a linter. Ignored by
   *  `whole-project` commands, by `run --whole-project` (whose `.` sentinel bypasses
   *  every path filter), and by the readiness runner. */
  readonly extensions?: readonly string[];
  /** Probe deciding whether this command is usable in the target repo. When it
   *  resolves false the command is SKIPPED with a notice, never a failure (BG-9). */
  readonly requires: ToolProbe;
}

/** Unchanged name, unchanged shape — now expressed as a narrowing over
 *  `CommandSpec`. Deliberately NOT `test`: the test suite is already run by
 *  `harny-implement`/`harny-audit` and is far too slow for a per-turn hook. */
export type FeedbackCommand = CommandSpec<FeedbackKind>;
/** **(MODIFIED — feedback-path-hygiene.)** Readiness commands run whole-project,
 *  once, via `run-doctor.mjs`, which never appends paths, so `extensions` has no
 *  meaning here. `?: never` makes declaring it a compile error (ADR 0018's
 *  type-level-prevention precedent) rather than a silently ignored field. Carried by
 *  `StackProfile.readiness`, never by `StackProfile.commands`: `commands: readonly
 *  FeedbackCommand[]` makes a `kind: 'test'` entry a compile error, which is what
 *  keeps the test suite out of every per-turn hook and out of the CI workflow's
 *  inline JSON (BG-4). */
export type ReadinessCommand = CommandSpec<ReadinessKind> & { readonly extensions?: never };

/** **(A1 — NEW.)** One candidate dependency-bootstrap command for the CI surface
 *  only. Never executed by the per-turn hook: a developer's working tree already
 *  has its dependencies, and installing them on every turn would violate BG-1's
 *  one-cheap-run-per-turn posture. A fresh CI checkout has none, which is why the
 *  two surfaces differ here and nowhere else (see contract.md § "Post-audit
 *  amendment A1"). */
export interface FeedbackInstall {
  /** Stable id, unique within its profile. Appears in the generated step name. */
  readonly id: string;
  /** Argv, never a shell string — same rule as `FeedbackCommand.argv`. Run from
   *  the target repo root. */
  readonly argv: readonly string[];
  /** Gate for this candidate. Restricted to `anyFile`, and `anyFile` is REQUIRED
   *  here (unlike on `ToolProbe`, where every field is optional) so an ungated
   *  install candidate — one that would run `npm ci` in a repo with no manifest —
   *  is unrepresentable. See contract.md § A1 "Why install gating may be rendered
   *  into shell but command probes may not". */
  readonly requires: Required<Pick<ToolProbe, 'anyFile'>>;
}

/** Suffixes the python profile's per-file commands accept (ruff, mypy). */
const PYTHON_SOURCE_EXTENSIONS: readonly string[] = ['.py', '.pyi'];
/** Suffixes the typescript profile's per-file command accepts (eslint). */
const JS_TS_SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

export const STACK_PROFILE_IDS = ['typescript', 'python'] as const;
export type StackProfileId = (typeof STACK_PROFILE_IDS)[number];

export interface StackProfile {
  readonly id: StackProfileId;
  readonly displayName: string;
  /** Lower-cased match tokens. `resolveStackProfile` matches a normalized
   *  `config.stack` against these. */
  readonly aliases: readonly string[];
  /** In stable emission order. Never empty. */
  readonly commands: readonly FeedbackCommand[];
  /** **(A1 — NEW.)** Ordered CI-only install candidates; the FIRST entry whose
   *  `requires` gate passes is the one that runs, and no more than one ever runs.
   *  Absent (the `python` profile) or all-gates-false ⇒ no install happens, which
   *  is a notice and never a failure: every command then falls through to BG-9's
   *  ordinary probe-skip path. */
  readonly ciInstall?: readonly FeedbackInstall[];
  /** **(NEW — readiness-doctor.)** Feedforward-computational commands: the full
   *  test-suite run `harny-doctor` performs before work starts, never per turn —
   *  kept off `commands` (rather than added there with a `test` kind) precisely
   *  because a per-turn hook is far too slow for a full test-suite run
   *  (see `FeedbackCommand`'s doc comment). Optional and possibly empty for the
   *  same reason `ciInstall` is (BG-8's escape hatch); absent ⇒ the readiness
   *  run's test family reports a notice, never a failure. */
  readonly readiness?: readonly ReadinessCommand[];
}

/** The mapping. The ONLY place a feedback command string is written (SC1). */
export const STACK_PROFILES: readonly StackProfile[] = [
  {
    id: 'typescript',
    displayName: 'TypeScript / Node',
    aliases: [
      'typescript',
      'ts',
      'node',
      'nodejs',
      'javascript',
      'js',
      'next',
      'nextjs',
      'react',
      'typescript-node',
    ],
    commands: [
      {
        id: 'eslint',
        kind: 'lint',
        argv: ['npx', 'eslint'],
        pathMode: 'per-file',
        extensions: JS_TS_SOURCE_EXTENSIONS,
        requires: {
          anyFile: ['eslint.config.js', 'eslint.config.mjs', '.eslintrc.json', '.eslintrc.cjs'],
        },
      },
      {
        id: 'tsc',
        kind: 'typecheck',
        argv: ['npx', 'tsc', '--noEmit'],
        pathMode: 'whole-project',
        requires: { anyFile: ['tsconfig.json'] },
      },
    ],
    // (A1 — NEW.) CI-only; first passing gate wins, at most one runs.
    ciInstall: [
      { id: 'npm-ci', argv: ['npm', 'ci'], requires: { anyFile: ['package-lock.json'] } },
      {
        id: 'npm-install',
        argv: ['npm', 'install', '--no-audit', '--no-fund'],
        requires: { anyFile: ['package.json'] },
      },
    ],
    // (readiness-doctor — NEW.) Feedforward-only; never reaches a per-turn hook
    // or the CI workflow's inline JSON (BG-4).
    readiness: [
      {
        id: 'npm-test',
        kind: 'test',
        argv: ['npm', 'test'],
        pathMode: 'whole-project',
        requires: { script: 'test' },
      },
    ],
  },
  {
    id: 'python',
    displayName: 'Python',
    aliases: ['python', 'py', 'fastapi', 'django', 'flask', 'python-fastapi'],
    commands: [
      {
        id: 'ruff',
        kind: 'lint',
        argv: ['ruff', 'check'],
        pathMode: 'per-file',
        extensions: PYTHON_SOURCE_EXTENSIONS,
        requires: { binary: 'ruff' },
      },
      {
        id: 'mypy',
        kind: 'typecheck',
        argv: ['mypy'],
        pathMode: 'per-file',
        extensions: PYTHON_SOURCE_EXTENSIONS,
        requires: { binary: 'mypy' },
      },
    ],
    // (A1.) No `ciInstall`: deliberate, see BG-21 and reservation R6.
    // (readiness-doctor — NEW.) Feedforward-only; never reaches a per-turn hook
    // or the CI workflow's inline JSON (BG-4).
    readiness: [
      {
        id: 'pytest',
        kind: 'test',
        argv: ['pytest', '-q'],
        pathMode: 'whole-project',
        requires: { binary: 'pytest' },
      },
    ],
  },
];

/** Lower-cases and strips whitespace/punctuation so alias matching is tolerant of
 *  decoration like "Node.js" or "  Django!! " without needing every decorated form
 *  listed as its own alias. */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const NORMALIZED_ALIAS_INDEX: ReadonlyMap<string, StackProfile> = new Map(
  STACK_PROFILES.flatMap((profile) => profile.aliases.map((alias) => [normalize(alias), profile] as const)),
);

/** Case-insensitive, whitespace/punctuation-normalized alias match.
 *  Returns `undefined` for a blank, absent, or unrecognized stack — never throws
 *  (SC2, BG-8). */
export function resolveStackProfile(stack: string | undefined): StackProfile | undefined {
  if (!stack) {
    return undefined;
  }

  const normalized = normalize(stack);
  if (!normalized) {
    return undefined;
  }

  return NORMALIZED_ALIAS_INDEX.get(normalized);
}

/** POSIX path, relative to the target repo root, of the shared runner script. */
export const FEEDBACK_RUNNER_PATH = '.sdd/feedback/run-feedback.mjs';
/** POSIX path of the generated GitHub Actions workflow. */
export const CI_WORKFLOW_PATH = '.github/workflows/harny-feedback.yml';
/** Where the runner accumulates one turn's touched paths. */
export const TOUCHED_FILES_DIR = '.sdd/feedback/.turns';
