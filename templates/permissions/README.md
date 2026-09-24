# The permissions baseline

`policy.json` is the baseline of what a coding agent may not do in a harny-scaffolded
repository, and `run-guard.mjs` is the one tool-neutral script that enforces it.
`harny init` copies both, byte for byte, into `.sdd/permissions/`. The installed
`policy.json` is yours to edit: the guard reads it on every call.

The behavior is stated first without naming any tool. Each tool appears afterwards
only as an attributed example of how that behavior is wired on its own hook surface
(`AGENTS.md` S7).

## The behavior

1. **One policy, one guard.** Every rule, reason and protected branch lives in
   `policy.json`. A tool's hook forwards its raw "before a tool runs" event to the
   guard, which answers **allow**, **deny** or **ask**, and a thin per-tool wrapper
   translates that answer into the tool's own decision channel.
2. **Secrets stay out of the agent's context.** A read of a path matching
   `read.deny`, and not `read.allow`, is denied. That covers the agent's own file-read
   tool, file-reading shell programs (`cat`, `head`, `grep`, `cp`, …) and `< file`
   redirections. Patterns use gitignore syntax: `.env.*` matches at any depth, while
   `secrets/**` is anchored at the project root.
3. **Commands are judged one subcommand at a time.** A command line is split on
   `&&`, `||`, `;`, pipes, `&` and newlines. One level of `sh -c "…"` is unwrapped,
   and leading `VAR=value`, `sudo`, `env`, `command`, `nohup` and `time` are stripped.
   Each subcommand is matched against `commands.deny` and `commands.ask`, where `*`
   matches any text and the match is against the whole subcommand. A deny anywhere in
   the line beats an ask anywhere, which beats allow.
4. **Git is free on feature branches and blocked on protected ones.** While the
   current branch matches `git.protectedBranches`, `commit`, `merge`, `cherry-pick`,
   `revert`, `am` and `rebase` are denied. A push whose destination is protected is
   denied however it is spelled: a bare push from a protected branch, `HEAD:main`,
   `+main`, `refs/heads/main`, deleting a protected branch, `--all`, `--mirror`. A
   `git checkout`/`git switch` earlier in the same command line counts. In branch
   patterns, `*` stays within one path segment.
5. **Where a tool cannot ask, the guard refuses.** If a tool's hook surface has no
   "ask the human" answer, an ask rule becomes a deny whose reason starts with
   `requires human approval:`. It is never silently allowed.
6. **Failure modes are loud or harmless, never silently open on policy.** A missing
   `policy.json` means allow, with a one-line notice. A `policy.json` that does not
   parse or validate means every call is denied until it is fixed. A guard crash means
   allow: a bug in the guard never breaks the agent's tool call.

## Limits

This is a floor, not a wall. The guard reads the command text the agent wrote, not
what a program does once it runs, so an interpreter that opens a file itself is not
caught. The layers that close the gap live elsewhere:

- git `pre-commit`/`pre-push` hooks (`commit-checks`);
- the tool's own sandbox, where it has one;
- **server-side branch protection on the remote**, the only layer an agent cannot
  bypass. Enable it for every branch in `protectedBranches`: on GitHub, go to
  *Settings → Rules → Rulesets*, or use
  `gh api repos/<owner>/<repo>/rulesets --method POST …`. harny cannot do this for
  you.

## Attributed examples

Verified against each tool's first-party documentation or source on 2026-09-24:

- **Claude Code** registers `PreToolUse` (matcher `Bash|Read`) in
  `.claude/settings.json` and answers through
  `hookSpecificOutput.permissionDecision` (`deny` / `ask`). The same file also
  carries a static `permissions.deny` / `permissions.ask` block generated from
  `policy.json`, so the baseline holds even if the hook is removed.
- **Cursor** registers `beforeShellExecution` and `beforeReadFile` in
  `.cursor/hooks.json` and answers `{"permission": "allow" | "deny" | "ask"}`. The
  wrapper always prints valid JSON, because Cursor blocks a permission hook whose
  output is not valid JSON. A read-side ask is answered with deny.
- **GitHub Copilot** registers `preToolUse` in `.github/hooks/harny-feedback.json` and
  answers `{"permissionDecision": "deny" | "ask"}`. The guard accepts `toolArgs` as
  an object or as a JSON string, since Copilot CLI sends both.
- **Codex CLI** registers `PreToolUse` (matcher `Bash`) in `hooks.json` and answers
  `permissionDecision: "deny"`. Codex treats `ask` as unsupported and fails open, so
  ask rules are denied instead (behavior 5). Codex has no separate file-read tool;
  secret reads are caught in shell commands.
- **Kiro** registers a `preToolUse` hook in `.kiro/hooks/harny-feedback.json`, and the
  wrapper exits `2` with the reason on stderr to block. Kiro has no ask, so behavior
  5 applies. This is not yet confirmed against a live Kiro install.
