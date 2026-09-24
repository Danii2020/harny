# Contract: Commit Checks

## Interfaces

### Public API

```ts
// src/git-hooks.ts (NEW) — owns every git-hooks path and the activation logic (S5).
// Tool-neutral: beside src/permissions.ts, never under src/generators/.

export const GIT_HOOKS_DIR: string;            // '.sdd/git-hooks'
export const GIT_HOOKS_COMMANDS_PATH: string;  // '.sdd/git-hooks/commands.json'

/** The hook shims (executable), the hook runner, and the commands file, exactly
 *  once per run. `[]` when the templates root carries no git-hooks subsystem. */
export function buildGitHooksFiles(payload: HarnessPayload, commands: CommandsPayload): readonly GeneratedFile[];

export type GitHooksActivation =
  | { readonly kind: 'activated'; readonly hooksPath: string }
  | { readonly kind: 'already-active'; readonly hooksPath: string }
  | { readonly kind: 'skipped'; readonly reason: string };

/** Sets `core.hooksPath` on the repository enclosing `targetDir`, or explains why
 *  not. Never throws for an expected refusal; reports it as `skipped`. */
export function activateGitHooks(targetDir: string, repoRoot: string | undefined): Promise<GitHooksActivation>;
```

```ts
// src/generators/types.ts — MODIFIED
export interface GeneratedFile {
  // …existing fields unchanged…
  /** Written with mode 0o755 when `true`. Absent for every artifact before this
   *  feature; `true | undefined` like `merge` and `root`. */
  readonly executable?: true;
}

// src/init.ts — MODIFIED
export interface InitOptions {
  // …existing fields unchanged…
  /** `false` skips activation (`--no-git-hooks`). `undefined`/`true`: activate,
   *  after an interactive confirmation when `interactive`. */
  readonly gitHooks?: boolean;
}
```

CLI: `harny init` gains `--no-git-hooks`. Interactive runs ask one confirmation
(default yes) after the write confirmation.

### Data Models

**Installed layout** (all at the install directory):

| Path | Source | Mode |
|---|---|---|
| `.sdd/git-hooks/pre-commit` | `templates/git-hooks/pre-commit`, verbatim | 0755 |
| `.sdd/git-hooks/pre-push` | `templates/git-hooks/pre-push`, verbatim | 0755 |
| `.sdd/git-hooks/run-git-hook.mjs` | `templates/git-hooks/run-git-hook.mjs`, verbatim | 0644 |
| `.sdd/git-hooks/commands.json` | `renderJson(buildCommandsPayload(components))` | 0644 |

**Hook runner CLI** (`node run-git-hook.mjs <pre-commit|pre-push> [git's hook args]`):
exit 0 lets git proceed; any non-zero aborts the commit or push. Human-readable
reasons go to stderr.

**Feedback runner** (`run-feedback.mjs`): `run --staged --commands <path|inline>`.

### State Changes

- New generated files above; the CI workflow template gains a static step; the
  feedback runner gains a flag.
- Activation writes exactly one git config key, `core.hooksPath`, in the enclosing
  repository's local config (`.git/config`). Nothing else outside the write plan is
  touched.

## Behavior Guarantees

1. **CC-1 — Tool-neutral, once per install.** The four files are written once per run
   regardless of tool selection, identical for all five tools; no generator changes.
   The shims are `#!/bin/sh` scripts that `exec node` on `run-git-hook.mjs` beside
   them, and are written executable. (G1)
2. **CC-2 — `run --staged`.** A boolean flag on `run`, never a mode. Paths are
   `git diff --cached --name-only --diff-filter=ACMR -z` from the repository top level,
   made absolute, deduplicated. They then take exactly the turn-mode path (component
   dispatch, extension and existence filters, probe skip). **Whole-project commands
   never run** under `--staged`. No stdin is read and `stop_hook_active` is irrelevant.
   The exit code is 2 when any command reports a finding, 0 otherwise, including when
   nothing is staged. (G3)
3. **CC-3 — `pre-commit` order**, stopping at the first failing step:
   1. **Protected branch.** When `HEAD` names a branch matching
      `git.protectedBranches` in `<install>/.sdd/permissions/policy.json` **and** that
      branch already has a commit, fail naming the branch. An unborn branch (the
      repository's first commit) passes.
   2. **Secrets.** If `gitleaks` is on `PATH`, run
      `gitleaks git --pre-commit --staged --redact --no-banner` from the top level; any
      non-zero exit fails. If absent, print one notice and continue.
   3. **Lint.** If `<install>/.sdd/feedback/run-feedback.mjs` and `commands.json`
      exist, run `run --staged` from the install directory; a non-zero exit fails.
   4. **Chain.** If `<git-common-dir>/hooks/pre-commit` exists, is executable, and is
      not this shim, run it and propagate a non-zero exit. (G1, G4)
4. **CC-4 — `pre-push`.** For each stdin line, a remote ref `refs/heads/<b>` whose `<b>`
   matches `git.protectedBranches` fails the push naming `<b>`; that includes a deletion,
   where the local object is all zeros. Tags and other refs pass. Then the chained
   `<git-common-dir>/hooks/pre-push` runs with the same arguments and stdin. (G2, G4)
5. **CC-5 — One protected list, glob-matched as in permissions-baseline PB-7.** `*`
   stays within one `/` segment. A missing or invalid policy skips the branch checks
   with one notice; it never fails a commit on its own. (G2)
6. **CC-6 — Activation.** `activateGitHooks` returns:
   - `skipped` when `targetDir` is not inside a git repository;
   - `skipped` naming the manager when the repository root holds `.husky/`,
     `lefthook.yml`, `.lefthook.yml`, `lefthook.yaml` or `.pre-commit-config.yaml`;
     the reason tells the user to call `.sdd/git-hooks/pre-commit`/`pre-push` from it;
   - `skipped` when `core.hooksPath` is already set to a different value;
   - `already-active` when it already equals ours;
   - otherwise it sets `core.hooksPath` to the install's `.sdd/git-hooks`, relative to
     the repository root, and returns `activated`.

   `runInit` calls it only after a successful non-dry-run write, when
   `gitHooks !== false` and, if interactive, the user confirmed. It reports the outcome
   with one `io.log`/`io.warn` line. (G4)
7. **CC-7 — CI secret scan.** The canonical workflow's checkout fetches full history
   (`fetch-depth: 0`). After the generated block, one static step downloads the pinned
   gitleaks release (`gitleaks_<v>_linux_x64.tar.gz`) and verifies it against that
   release's `checksums.txt` with `sha256sum -c`. It then runs `gitleaks git
   --redact --no-banner` over the change's range only: on `pull_request`,
   `<base.sha>..<head.sha>`; on `push`, `<before>..<sha>`, or `-1 <sha>` when `before`
   is all zeros. A leak fails the job. No licensed action is used. (G5)
8. **CC-8 — Determinism and containment.** Generated bytes depend only on templates
   and the resolved components; every file ends in one `\n`; every path is inside the
   install directory, except the workflow (`root: 'repo'`, unchanged). Activation is
   not a file write and is reported. (S3)
9. **CC-9 — Dogfood.** This repository's `.sdd/git-hooks/*`, `.sdd/feedback/run-feedback.mjs`
   and `.github/workflows/harny-feedback.yml` are byte-identical to a fresh render for
   its `.sdd/harness.json`. (G6)
10. **CC-10 — Canonical README.** `templates/git-hooks/README.md` states the behavior
    tool-neutrally and names the limits: agents in cloud checkouts, `--no-verify`,
    partial staging, whole-project checks left to CI. (S7)

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| Not in a git repository at init | Activation `skipped`, one warning | Files written; hooks inactive |
| Another hook manager / hooksPath present | Activation `skipped`, warning with the line to add | Nothing clobbered |
| `gitleaks` not installed (local) | One notice, commit proceeds | Secret scan runs in CI instead |
| Policy missing or invalid (hook) | Branch checks skipped, one notice | Other checks still run |
| Feedback runner or `commands.json` missing | Lint step skipped, one notice | Other checks still run |
| `node` missing | The shim prints a notice and **passes (exit 0)** | A machine without Node is not locked out of committing |
| Chained hook fails | Its exit code propagates | Existing hook behavior preserved |
| CI checksum mismatch | Step fails | A tampered or renamed release never runs |

## Dependencies

- Internal: `src/engine.ts` (`buildCommandsPayload`), `src/init.ts`, `src/cli.ts`,
  `src/prompts.ts`, `src/templates.ts`, `src/writer.ts`, `src/generators/types.ts`,
  `src/generators/json.ts`, `templates/hooks/run-feedback.mjs`,
  `templates/ci/harny-feedback.yml`.
- External: **none** added to `package.json` (S4). gitleaks is an optional local tool and
  a pinned CI download, never a package dependency.

## Integration Points

- `templates/git-hooks/{pre-commit,pre-push,run-git-hook.mjs,README.md}` (NEW).
- README: a "Commit checks" section.
- Tests: `tests/git-hooks.test.ts`, `tests/git-hooks/run-git-hook.test.ts` (new);
  `tests/hooks/run-feedback.test.ts` (`--staged`); e2e counts and goldens; dogfood
  fidelity; CI template tests.
