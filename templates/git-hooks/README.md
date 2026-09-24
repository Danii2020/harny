# Commit checks

`pre-commit` and `pre-push` are git hooks, so they run for whoever commits: any coding
agent, on any tool, and any person. `harny init` installs them at `.sdd/git-hooks/`
and, with your consent, points the repository's `core.hooksPath` at that directory.

## The behavior

1. **`pre-commit` blocks, in this order, at the first failure:**
   1. **A commit to a protected branch.** The branch list is `git.protectedBranches`
      in `.sdd/permissions/policy.json`, the same list the permissions guard uses. The
      first commit of a new repository is exempt, so a fresh project can be started.
   2. **A secret in the staged changes**, found by `gitleaks git --pre-commit --staged`
      when gitleaks is installed. Without it, one notice says the scan was skipped.
   3. **A lint finding on the staged files.** This is the feedback runner's
      `run --staged`: per-file commands only, over the Added, Copied, Modified and
      Renamed files, with the same extension filters and presence probes as the
      per-turn hook.
   4. **A pre-existing `.git/hooks/pre-commit`**, which still runs, chained.
2. **`pre-push` blocks a push to a protected branch** by any refspec, including
   deleting one. Tags and other refs pass. A pre-existing `.git/hooks/pre-push` is
   chained with the same arguments and input.
3. **Installation composes, never clobbers.** Activation is skipped, with a message
   saying what to add, if the repository already uses husky, lefthook or pre-commit,
   or already sets a different `core.hooksPath`. Skipping it leaves the files in place,
   and they can be called from any hook manager: `sh .sdd/git-hooks/pre-commit`.
4. **Whole-project checks stay in CI.** A type-check of the whole project on every
   commit makes commits slow enough that people bypass them. The CI workflow runs it,
   and also scans each change's commits with gitleaks.

## Limits

- `git commit --no-verify` skips every hook. That is git's own escape hatch for people;
  the permissions baseline denies it to agents.
- Hooks are local configuration. A fresh clone, including the checkouts that cloud
  coding agents work in, has no active hooks until `harny init` (or
  `git config core.hooksPath .sdd/git-hooks`) runs there. The CI workflow is the
  backstop for exactly that case.
- Linters read the working-tree copy of a staged file. If only part of a file is
  staged, the unstaged part is linted too.
- Without Node.js on `PATH`, the hooks print a notice and let the commit through,
  rather than locking a person out of their repository.
- A gitleaks false positive can be allowed with a `gitleaks:allow` comment or a
  `.gitleaksignore` entry, both gitleaks' own mechanisms.
