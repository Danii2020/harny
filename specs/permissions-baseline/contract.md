# Contract: Permissions Baseline

## Interfaces

### Public API

```ts
// src/permissions.ts (NEW) — the single owner of every permissions path and the
// policy's parsing/derivation (S5). Tool-neutral: lives beside src/feedback.ts and
// src/mcp.ts, never under src/generators/.

/** `.sdd/permissions/run-guard.mjs` */
export const PERMISSIONS_GUARD_PATH: string;
/** `.sdd/permissions/policy.json` */
export const PERMISSIONS_POLICY_PATH: string;

/** Parses and validates canonical policy JSON. Throws
 *  `HarnessError('TEMPLATE', …)` naming the offending field on any shape error. */
export function parsePermissionPolicy(source: string): PermissionPolicy;

/** Claude Code's static `permissions` block, derived from the policy (PB-9). */
export function claudeCodePermissions(policy: PermissionPolicy): {
  readonly deny: readonly string[];
  readonly ask: readonly string[];
};

/** `.sdd/permissions/run-guard.mjs` and `.sdd/permissions/policy.json`, verbatim,
 *  exactly once per run. `[]` when the templates root carries no permissions
 *  subsystem (lean test fixtures). */
export function buildPermissionsFiles(payload: HarnessPayload): readonly GeneratedFile[];
```

```ts
// src/engine.ts — MODIFIED. HookPayload gains one optional field; HarnessPayload
// gains the two canonical resources. No Generator member is added (TG-1 unchanged).
export interface HookPayload {
  // …existing fields unchanged…
  /** Present when the templates root carries the permissions subsystem. When
   *  absent, every generator renders byte-identically to before (PB-12). */
  readonly permissions?: PermissionsPayload;
}
export interface PermissionsPayload {
  readonly policy: PermissionPolicy;
}
export interface HarnessPayload {
  // …existing fields unchanged…
  readonly permissionsGuard?: SkillResource;   // templates/permissions/run-guard.mjs
  readonly permissionsPolicy?: SkillResource;  // templates/permissions/policy.json
}
```

Each of the five generators' `renderHook` adds its pre-tool registration(s) when
`payload.permissions` is present, via a module-private builder of the established
shape:

```ts
function guardCommand(runner: string): string; // inline `node -e` wrapper + runner path
```

### Data Models

```jsonc
// templates/permissions/policy.json — canonical, tool-neutral, user-editable once
// installed. Version is an integer; unknown top-level keys are rejected.
{
  "version": 1,
  "git": {
    // Glob list; `*` matches within one path segment, so `release/*` matches
    // `release/1.2` and not `release/1/2`.
    "protectedBranches": ["main", "master", "production", "release/*"]
  },
  "read": {
    // gitignore-style patterns, matched against a path relative to the project root.
    "deny": [".env", ".env.*", "*.pem", "*.key", "secrets/**"],
    // Carve-outs from `deny` (a documented non-secret template).
    "allow": [".env.example", ".env.sample", ".env.template"]
  },
  "commands": {
    // Each pattern matches one whole shell subcommand; `*` matches any text
    // (Claude Code's Bash rule semantics). `reason` is shown to the agent.
    "deny": [{ "pattern": "git push *--force*", "reason": "…" } /* … */],
    "ask":  [{ "pattern": "npm install *", "reason": "…" } /* … */]
  }
}
```

```ts
// src/permissions.ts
export interface CommandRule { readonly pattern: string; readonly reason: string; }
export interface PermissionPolicy {
  readonly version: 1;
  readonly git: { readonly protectedBranches: readonly string[] };
  readonly read: { readonly deny: readonly string[]; readonly allow: readonly string[] };
  readonly commands: { readonly deny: readonly CommandRule[]; readonly ask: readonly CommandRule[] };
}
```

**Guard runner CLI** (`.sdd/permissions/run-guard.mjs`, Node builtins only):

```
node .sdd/permissions/run-guard.mjs [--policy <path>]
  stdin : the tool's raw pre-tool hook event JSON (any of the five shapes below)
  exit 0: allow   — prints nothing on stdout (a notice may go to stderr)
  exit 2: deny    — stderr carries exactly one line: the reason
  exit 3: ask     — stderr carries exactly one line: the reason
```

`--policy` defaults to `policy.json` beside the runner script (never the process
cwd), so the guard works from any working directory.

**Input normalization** (the only place tool payload shapes meet; PB-4):

| Source field(s) | Meaning |
|---|---|
| `tool_input.command`, `toolArgs.command`, top-level `command` | shell command |
| `tool_input.file_path`, `tool_input.path`, `toolArgs.path`, top-level `file_path`, each `tool_input.operations[].path` | file paths |
| `tool_name` / `toolName` / `hook_event_name` | classifies a path as a **read** when it matches `/read|view/i`, or the event is `beforeReadFile` |
| `cwd` (else `process.cwd()`) | where git is asked for the current branch |

`toolArgs` is accepted as an object or a JSON string (Copilot CLI sends both,
verified 2026-09-24).

### State Changes

- Two new generated files per install: `.sdd/permissions/run-guard.mjs` and
  `.sdd/permissions/policy.json` (tool-neutral, written once per run).
- Each generator's existing hook file gains registration(s); Claude Code's also gains a
  top-level `permissions` object.
- At runtime the guard reads the policy file and may run `git rev-parse
  --abbrev-ref HEAD` in the payload's `cwd`. It writes nothing, ever.

## Behavior Guarantees

1. **PB-1 — One canonical policy.** `templates/permissions/policy.json` is the only
   place a rule, pattern, reason or protected branch is written. The guard reads the
   installed copy at runtime; Claude Code's static rules are derived from it at
   generation time. No generator and no other `src/` module re-literals a rule. (G1)
2. **PB-2 — Verbatim, tool-neutral install.** `buildPermissionsFiles` writes the guard
   and the policy byte-for-byte from `templates/permissions/`, exactly once per run
   regardless of tool count, at the paths `src/permissions.ts` owns. (G1, I5-style)
3. **PB-3 — Decision order.** For a shell command the guard splits it into
   subcommands on `&&`, `||`, `;`, `|`, `|&`, `&` and newlines (outside quotes),
   unwraps one level of `sh -c`/`bash -c`/`zsh -c`, strips leading `VAR=value`
   assignments and the wrappers `sudo`, `env`, `command`, `nohup`, `time`, and
   evaluates **every** subcommand. Any deny wins over any ask, and any ask wins over
   allow, across the whole command. (G2)
4. **PB-4 — Reads of secret paths are denied.** A read-classified path, or a path
   argument of a file-reading shell program (`cat`, `less`, `more`, `head`, `tail`,
   `bat`, `nl`, `xxd`, `od`, `strings`, `base64`, `source`, `.`, `cp`, `scp`, `grep`,
   `sed`, `awk`) or an input redirection `< path`, that matches `read.deny` and not
   `read.allow` is denied. Paths are resolved against the payload `cwd` and matched
   relative to the project root with gitignore semantics: a pattern without `/`
   matches the basename at any depth; a pattern with `/` is anchored. (G2)
5. **PB-5 — Command patterns.** A subcommand, normalized to single-space-separated
   tokens, matching a `commands.deny` pattern is denied; one matching a `commands.ask`
   pattern is asked. `*` matches any run of characters, including none; everything else
   is literal; matching is whole-string. (G2)
6. **PB-6 — Protected branches are enforced by resolution, not by pattern.** For each
   `git` subcommand (global options `-C <dir>`, `-c <k=v>`, `--no-pager`, `--git-dir`,
   `--work-tree` skipped; `-C` changes the directory git is asked about):
   - `commit`, `merge`, `cherry-pick`, `revert`, `am` and `rebase` are denied when the
     branch in effect is protected;
   - `push` is denied when any destination is protected. Destinations are each
     refspec's part after `:` (or the whole refspec), with a leading `+` and
     `refs/heads/` stripped, and `HEAD` meaning the branch in effect. A push with no
     refspec targets the branch in effect. `--all` and `--mirror` are always denied.
     A deletion refspec `:<branch>` of a protected branch is denied;
   - `checkout <branch>`, `checkout -b <branch>`, `switch <branch>` and
     `switch -c <branch>` change the branch in effect **for the later subcommands of
     the same command** (so `git checkout main && git commit -m x` is denied).
   - The branch in effect starts as `git rev-parse --abbrev-ref HEAD`. If git cannot
     answer (not a repository, detached `HEAD`), branch-scoped rules do not fire.
   Every other git verb, and every git verb on a feature branch, is allowed by this
   guarantee (PB-5 patterns still apply). (G3)
7. **PB-7 — Glob matching for branches.** `protectedBranches` entries match with `*`
   confined to one `/`-separated segment. (G3)
8. **PB-8 — Native channel per tool, fail closed where `ask` is unavailable.**

   | Tool | Registration (same hook file as today) | Deny | Ask |
   |---|---|---|---|
   | Claude Code | `hooks.PreToolUse`, matcher `Bash\|Read` | `hookSpecificOutput{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason}`, exit 0 | same with `"ask"` |
   | Cursor | `hooks.beforeShellExecution` and `hooks.beforeReadFile` | `{"permission":"deny","user_message","agent_message"}`, exit 0 | shell: `"ask"`; read: `"deny"` |
   | GitHub Copilot | `hooks.preToolUse` entry `{type:"command",bash}` | `{"permissionDecision":"deny","permissionDecisionReason"}`, exit 0 | `"ask"` |
   | Codex CLI | `hooks.PreToolUse`, matcher `Bash`, same `timeout` as `Stop` | `hookSpecificOutput{…"deny"…}`, exit 0 | deny, reason prefixed `requires human approval:` (Codex treats `ask` as unsupported and fails open, verified in Codex source 2026-09-24) |
   | Kiro | `hooks[]` entry `{name:"harny-permissions",trigger:"preToolUse",action:{type:"command",command}}` | exit 2, reason on stderr | exit 2, reason prefixed `requires human approval:` |

   On allow, every wrapper exits 0; Cursor's prints `{"permission":"allow"}` (Cursor
   blocks a permission hook whose output is not valid JSON), and all others print
   nothing. (G2)
9. **PB-9 — Claude Code static defense in depth.** `.claude/settings.json` gains
   `permissions.deny` = `Read(<p>)` for each `read.deny` pattern, then `Read(!<p>)` for
   each `read.allow` pattern (a same-list carve-out), then `Bash(<pattern>)` for each
   `commands.deny` rule; and `permissions.ask` = `Bash(<pattern>)` for each
   `commands.ask` rule. Order is policy order. No `allow` list and no `defaultMode` are
   written. (G4)
10. **PB-10 — Missing or broken policy.** A missing policy file ⇒ exit 0 with one
    stderr notice naming the path. A policy that does not parse or fails validation ⇒
    exit 2 (deny) with a reason naming the path. A payload that is not JSON, or carries
    neither a command nor a path ⇒ exit 0 silently. (G2, SC7)
11. **PB-11 — Determinism and containment.** Generated bytes depend only on the
    templates and the resolved tool selection, never on the environment; every written
    path is relative and inside the install directory; every file ends in exactly one
    `\n` (S3).
12. **PB-12 — Backward compatibility of the generator API.** With `payload.permissions`
    absent, all five `renderHook` outputs are byte-identical to before this feature.
    With it present, every existing registration is byte-identical and the guard
    registration is added beside it.
13. **PB-13 — Dogfood.** This repo's `.claude/settings.json`,
    `.sdd/permissions/run-guard.mjs` and `.sdd/permissions/policy.json` are byte-identical
    to a fresh render for its own `.sdd/harness.json` (FC-13 extended). (G5)
14. **PB-14 — Canonical README is tool-neutral first.** `templates/permissions/README.md`
    states the guard's behavior without naming a tool, then gives dated per-tool
    attributed examples (S7).

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| `templates/permissions/policy.json` invalid at `harny init` | `HarnessError('TEMPLATE')`, exit per `src/errors.ts`, nothing written | Packaging bug surfaced loudly |
| Installed policy missing at runtime | Allow, one stderr notice | Guard inert; doctor/`harny init` restores it |
| Installed policy unparseable or invalid at runtime | Deny every call the guard sees, reason names the file | Loud, fixable by the user; never silently open |
| Hook payload not JSON / nothing to judge | Allow, silent | None |
| Not a git repo, detached HEAD, git missing | Branch rules skipped; patterns and reads still apply | Protected-branch rule inert there |
| Tool offers no `ask` channel (Codex, Kiro) | Deny with `requires human approval:` reason | Agent must ask the human to run it |
| Guard crashes (bug) | Wrapper treats a non-0/2/3 exit as allow and prints the error to stderr | Fail-open on a guard bug, never a broken tool call; covered by tests |

## Dependencies

- Internal: `src/engine.ts`, `src/init.ts`, `src/templates.ts`, all five
  `src/generators/*.ts`, `src/generators/json.ts`, `src/errors.ts`.
- External: **none** (S4). The guard uses only `node:` builtins.

## Integration Points

- `templates/permissions/{policy.json,run-guard.mjs,README.md}` (NEW).
- `src/templates.ts` loads the two runtime resources (optional, like `hookRunner`).
- `src/init.ts` adds `permissions` to the `HookPayload` and `buildPermissionsFiles` to
  the same render step (never a new step, CLI-1).
- `README.md` — baseline, per-tool coverage table, limits, server-side protection step.
- This repo: `.claude/settings.json`, `.sdd/permissions/*` regenerated.
- Tests: `tests/permissions.test.ts`, `tests/permissions/run-guard.test.ts` (new);
  the five `tests/generators/*.test.ts`; `tests/e2e-init.test.ts` counts and goldens;
  `tests/canonical-fidelity.test.ts` dogfood.

## Amendment A1 (2026-09-24, from audit round 1)

Raised by audit findings A1-F1 to A1-F5 and applied under the same gate waiver as the
rest of this run. They tighten PB-3 and PB-5; nothing is repealed.

- **PB-3 (amended).** Before splitting, heredoc bodies (`<<DELIM` / `<<-DELIM`, with
  the delimiter quoted or not, up to a line equal to the delimiter) are removed and
  never judged as commands. A here-string `<<<` is not a read redirection. The body of
  every `$(…)` and `` `…` `` outside single quotes is judged as additional subcommands
  of the same command.
- **PB-5 (amended).** Each subcommand is matched in up to three forms, and a match in
  any form counts: as written; with the program token reduced to its basename
  (`/bin/rm` → `rm`); and, for `git`, with git's global options (`-C <dir>`,
  `-c <k=v>`, `--no-pager`, `--git-dir`, `--work-tree`, …) removed.
- **Error Handling, row "Guard crashes"** gains a required test per tool (A1-F5).
