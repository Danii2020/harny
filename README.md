# harny

A portable **Specification-Driven Development (SDD)** subagent pipeline, with
generators for **Claude Code**, **Cursor**, **Kiro**, **GitHub Copilot**, and **Codex**.

Instead of asking a single agent to design, test, implement, and audit a feature in
one undifferentiated pass, this pipeline splits the work across five specialized
roles with explicit human review gates in between:

```
sdd-architect
     |
[HUMAN GATE: review the 5 specs]
     |
sdd-test-writer   (red phase - tests that must fail for the right reason)
     |
[HUMAN GATE: confirm the tests fail for the right reason]
     |
sdd-executor      (green phase - implements until tests pass)
     |
sdd-auditor       (verifies the contract + confirms the per-turn hook fired and CI is green)
     |
[HUMAN GATE: review the final verdict]
     |
sdd-documentation (automatic, non-gated - runs only on an approved verdict)
```

Each feature gets a 5-file spec under `specs/<feature-name>/`:

| File | Answers |
|---|---|
| `intent.md` | Why: problem, goals, success criteria, non-goals, constraints |
| `contract.md` | What: interfaces, data models, behavior guarantees, error handling |
| `roadmap.md` | How: implementation phases, dependencies, file-change map |
| `tasks.md` | Granular checklist per phase (`[ ]` `[x]` `[~]` `[!]`) |
| `audit.md` | Compliance checklist, audit log, final verdict |

Every item is traceable: each `contract.md` item cites the `intent.md` goal it
serves, each `tasks.md` item cites a `roadmap.md` phase, and each `audit.md` item
cites back to `intent.md` or `contract.md`.

## What's actually running today

On this repo, the pipeline is wired up as Claude Code subagents and a Skill:

- `.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md` — five thin
  specialized roles that run as Claude Code subagents. Each agent body is ≤ 25 lines;
  combined file size is 148 lines (down from 646) because shared instructions are now in
  ten reusable skills.
- `.claude/skills/sdd-conductor/SKILL.md` — orchestrates the five roles, enforces
  the three human gates, and never self-approves on the human's behalf.
- Ten `harny-*` skills bridged from `.agents/skills/` via git-tracked symlinks under
  `.claude/skills/harny-{propose,test,implement,audit,document,sync,feedback,doctor,adr,standards}/` —
  canonical instruction sets that the five agents delegate to and that can be reused
  or inspected independently.

The `npx harny init` CLI scaffolds this same pipeline into any target repository,
choosing which tool(s) to target. Each tool gets its own generator that reads the
portable role templates and adapts them to that tool's native format and capability
model.

Since `templates-skill-library-parity`, the scaffolder also writes the same ten
`harny-*` skills to the target repository as **real files** (never symlinks), one copy
per tool's skill-discovery root:
- `.claude/skills/harny-*/` for Claude Code
- `.kiro/skills/harny-*/` for Kiro  
- `.agents/skills/harny-*/` for Cursor, GitHub Copilot, and Codex (shared root)

Eight skills are always scaffolded (`harny-propose`, `harny-test`, `harny-implement`,
`harny-audit`, `harny-document`, `harny-sync`, `harny-feedback`, `harny-doctor`); two
are optional (`harny-adr` and `harny-standards`, selectable via the `--skills` flag).

### Knowledge base and documentation

- `specs/current/` — the fast-lookup picture of current behavior, live statements,
  invariants, open reservations, and keyword routing (five capability docs plus index).
- `specs/archived/` — byte-identical historical record of every shipped feature, with its
  rationale decisions published as Architecture Decision Records (ADRs).

## Building and installing locally

Since this package is not yet published to npm, you must build it locally before running the CLI:

```sh
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Then invoke the CLI in one of these ways:
# Option 1: Use npm link to add harny to your PATH
npm link
harny init /path/to/target-repo

# Option 2: Run directly from the repo
node bin/harness.js init /path/to/target-repo

# Option 3: Run within this repo's directory (npx reads local dist/)
npx harny init /path/to/target-repo
```

**Note:** The build step is required before running the CLI, as `bin/harness.js` loads TypeScript
output from `dist/`. If you make changes to `src/`, re-run `npm run build` before testing.

## Using harny to scaffold a new project

The `npx harny init` CLI scaffolds the SDD pipeline into any target repository,
interactively or non-interactively. For monorepo installs (a subdirectory rather
than the repository root), the generated CI workflow is placed at the repository
root where GitHub Actions reads it, while all other artifacts stay in the install
directory:

```sh
# Install at a subdirectory in a monorepo
npx harny init apps/web --yes --stack typescript

# Result:
# - `.github/workflows/harny-feedback-apps-web.yml` written to the repository root
# - `apps/web/.sdd/` and `apps/web/.claude/` written to the install directory
# - No harny artifacts written into other directories
# - The CI workflow runs its checks scoped to the `apps/web` component
```

### One install, several components

A repository whose directories are written in different stacks no longer needs one
harny install per stack. A single install can declare **components** — a directory and
the stack it is written in — through the repeatable `--component <path>=<stack>` flag,
or by answering "Monorepo" to the repo-shape question in interactive mode:

```sh
# One install at the repository root covering a Python backend and a TypeScript frontend
npx harny init /path/to/repo --yes --component .=python --component apps/web=typescript
```

That install writes exactly the same artifact set a single-stack install writes: one
`.sdd/`, one copy of every role and skill per distinct skill root, one feedback runner,
one readiness runner, one CI workflow, one spec-schema set — and therefore one `specs/`
and one ADR sequence for the whole repository. Components change what those artifacts
*do*, never how many of them there are:

- **Per-turn feedback** — each touched path is assigned to the single component whose
  declared directory is its longest **segment**-prefix, so `apps/web-admin/x.ts` resolves
  to `apps/web-admin` and never to `apps/web`. That component's commands run with that
  component's directory as their working directory, and see only that component's paths.
  `.` is an ordinary component that wins only when nothing longer matches.
- **Whole-project commands** (`--whole-project`, which is what CI runs) run once per
  component that has at least one assigned touched path, from that component's own
  directory — not once per declared component.
- **A touched path belonging to no declared component** runs no command. It is reported
  once on stderr with the number of dropped paths, never reassigned to a default and
  never silently discarded.
- **A declared component whose directory is absent** is skipped with a notice naming it;
  harny never creates the directory.
- **`npx harny doctor`** runs each component's test command from that component's own
  directory, and the direct runner invocation agrees with the verb.
- **CI stays one workflow with one job** at the repository root: one runner step for the
  whole install, plus at most one dependency-install step per component, each scoped with
  `working-directory`. No build matrix, no second workflow, no path filters.
- **An unrecognized component stack is inert, not fatal** — every artifact is still
  written, that component simply contributes no commands, and `init` warns once naming
  the component path and the value.

`--stack` and `--component` are mutually exclusive: supplying both in one `init`
invocation is a usage error naming both fields, and `.sdd/harness.json` carries either
`stack` or `components`, never both.

**An install that declares no components is unchanged, byte for byte.** `--stack
typescript` (or no stack at all) produces exactly the paths and exactly the file contents
it produced before components existed, and an existing `.sdd/harness.json` carrying only
`stack` keeps loading and round-tripping unchanged — never migrated, never warned about.
This is held by golden-byte regression tests over the whole generated tree, not by
convention.

**Two known gaps, recorded in the feature's audit and deliberately deferred:**

- A **hand-edited** `.sdd/harness.json` carrying *both* `stack` and `components` is
  accepted silently by `npx harny doctor`, with `components` taking effect. The
  mutual-exclusivity check runs on the writing path, not on the reading path. harny
  itself never writes both fields, so this is reachable only by editing the file by hand.
- A single-component install declared as `--component .=<stack>` renders the generated
  conductor's project-configuration block with **neither** a project-stack line nor a
  component line, so an agent reading that block cannot tell which stack the project is.
  Write that shape as `--stack <stack>` until this is fixed.

### Basic usage examples

```sh
# Interactive mode — asks seven questions: which tool(s), which roles, which
# optional skills, single repo or monorepo, model per role, active gates, and
# project stack (for a monorepo, one path/stack pair per component instead).
npx harny init /path/to/target-repo

# Non-interactive with defaults:
npx harny init /path/to/target-repo --yes

# Non-interactive with per-tool generator selection:
npx harny init /path/to/target-repo --yes --tools claude-code

# Monorepo: install in a subdirectory, CI workflow auto-placed at the root:
npx harny init /path/to/repo/apps/web --yes --stack typescript

# Deselect specific roles (generates only the auditor agent):
npx harny init /path/to/target-repo --yes --roles sdd-auditor

# Preview without writing:
npx harny init /path/to/target-repo --dry-run

# Using a saved configuration file:
npx harny init /path/to/target-repo --config ./harness-config.json
```

**Key flags:**
- `--tools <list>` — comma-separated tool ids or `all` (default: `claude-code`)
- `--roles <list>` — comma-separated role ids or `all` (default: all five; conductor always included)
- `--skills <list>` — optional skill ids to scaffold: `all`, `none`, or comma list of `harny-adr`/`harny-standards` (default: `harny-standards` only; the eight core skills are always included)
- `--model <role>=<value>` — repeatable; `<value>` is a cost tier or a literal model id
- `--gates <list>` — comma-separated gate ids, `all`, or `none` (default: all three)
- `--stack <name>` — project stack (captured only, for future MCP provisioning); mutually exclusive with `--component`
- `--component <path>=<stack>` — repeatable; declares one component of a monorepo install (a directory and the stack it is written in), e.g. `--component .=python --component apps/web=typescript` for one install covering a Python backend and a TypeScript frontend. Mutually exclusive with `--stack`. The runner resolves each touched path to its component by longest **segment**-prefix match and runs that component's commands from that component's own directory — see "One install, several components" above and `templates/hooks/README.md`
- `--config <path>` — read configuration from JSON file instead of prompting
- `--yes` — accept all defaults, skip prompts and final confirmation
- `--dry-run` — print planned file list; write nothing
- `--force` — overwrite existing files without prompting

**Shipped tools:**
- `claude-code` — generates `.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md` and `.claude/skills/sdd-conductor/SKILL.md`
- `cursor` — generates `.cursor/agents/sdd-*.md` and `.cursor/skills/sdd-conductor/SKILL.md`
- `kiro` — generates `.kiro/agents/sdd-*.md` and `.kiro/skills/sdd-conductor/SKILL.md`
- `github-copilot` — generates `.github/agents/sdd-*.agent.md` and `.github/skills/sdd-conductor/SKILL.md`
- `codex` — generates `.codex/agents/sdd-*.toml` (TOML format) and `.agents/skills/sdd-conductor/SKILL.md`

**Generated files per `init` run:**
- For a single tool with the default skill set: 7 tool-specific files (5 roles + conductor + 1 MCP config) + 9 core/optional skills (8 core + 1 default `harny-standards`, one per tool's root) + 6 shared files (5 spec schema templates + configuration) = 22 files total
- For multiple tools with defaults: 7 files per selected tool (35 total for all five), plus 9 skills per unique root (8 core + 1 default `harny-standards` for three roots = 27 total), plus 6 shared files = 68 files total
- With `--skills all`: includes both optional skills (`harny-adr` and `harny-standards`) for 10 skills per root instead of 9
- Example: `--tools claude-code,cursor,kiro,github-copilot,codex --skills all` generates 35 tool artifacts + 50 skill artifacts (10 per root) + 6 shared = 91 files total

**Default MCP server wiring:** Each selected tool now gets a default Context7 MCP server entry written into its own native MCP configuration file (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `.kiro/settings/mcp.json`, `.codex/config.toml`), so the `docs-lookup` capability's canonical tool tokens (`mcp__context7__resolve-library-id` and `mcp__context7__query-docs` on Claude Code, `@context7` on Kiro) resolve to a real, connected server out of the box. The endpoint harny writes is Context7's OAuth variant (`/mcp/oauth`), which requires clients to implement the MCP OAuth specification. This was chosen because the plain `/mcp` endpoint was observed not to work correctly in practice, despite Context7's own per-client documentation still showing it. These five files are repo-scoped configuration and are tracked in version control; they are never deleted or rewritten whole-file, only extended to add the Context7 entry if absent. The first time an agent calls a Context7 tool, that tool's own native first-use approval prompt remains the approval gate — harny writes the configuration only, never auto-approves or widens permissions. No credential, credential placeholder, or environment-variable reference is ever written alongside the endpoint.

**Sub-agent feedback:** On Claude Code, Cursor and Codex, the generated hook config also registers the tool's sub-agent completion event (`SubagentStop` / `subagentStop` / `SubagentStop`) beside the turn-completion one. It runs the same feedback runner over the same touched files, plus `--keep-turn`, so a sub-agent such as `sdd-executor` sees lint/type-check findings on its own work before it hands back, and the file list is left in place for the parent agent's own turn-end run. Delivery is at-least-once: a finding may be reported twice (to the sub-agent, then to the parent) but is never dropped by the earlier check. Kiro and GitHub Copilot are deliberately not wired for this; their hook files are unchanged. Still open: whether Cursor's `afterFileEdit` fires inside a sub-agent, and whether a Codex sub-agent's edits and its stop share one `turn_id`. On either tool the registration may therefore be inert; it is never wrong.

## Permissions baseline

Every `harny init` also installs a permissions baseline: `.sdd/permissions/policy.json`, an editable list of what the agent may not do, and `.sdd/permissions/run-guard.mjs`, a tool-neutral guard that each selected tool's "before a tool runs" hook calls. The default baseline:

- **Denies** reading `.env`, `.env.*` (except `.env.example`, `.env.sample` and `.env.template`), `*.pem`, `*.key` and `secrets/**`.
- **Denies** `git push --force` (and `-f`, `--force-with-lease`, `+refspec`), `--no-verify` on commit and push, and `rm -rf`.
- **Denies** committing or pushing to a protected branch (`main`, `master`, `production`, `release/*` by default) by any spelling. Commits and pushes on every other branch are allowed.
- **Asks** before deploys, database migrations and resets, piping a download into a shell, and adding a package.

| Tool | Hook | Deny | Ask |
|---|---|---|---|
| Claude Code | `PreToolUse`, plus static `permissions.deny`/`ask` in `.claude/settings.json` | yes | yes |
| Cursor | `beforeShellExecution`, `beforeReadFile` | yes | shell only; a read-side ask is denied |
| GitHub Copilot | `preToolUse` | yes | yes |
| Codex CLI | `PreToolUse` (`Bash`) | yes | denied with "requires human approval" (Codex has no ask) |
| Kiro | `preToolUse` | yes | denied with "requires human approval" (Kiro has no ask); not yet verified live |

The guard judges the command text the agent writes, so it is a floor, not a wall. For branches that must never be pushed to directly, also enable **server-side branch protection** on your remote (GitHub: *Settings → Rules → Rulesets*); only the remote can make that rule unbypassable. `templates/permissions/README.md` covers the behavior, the failure modes and the per-tool details.

## Commit checks

`harny init` also installs git hooks at `.sdd/git-hooks/`. Hooks are the one checkpoint every committer passes through, so they apply to every agent on all five tools, and to people:

- **`pre-commit`** blocks a commit to a protected branch (the same `git.protectedBranches` list as the permissions baseline; a repository's first commit is exempt). It also blocks a secret in the staged changes, via `gitleaks git --pre-commit --staged` when gitleaks is installed, and a lint finding on the staged files, via the feedback runner's new `run --staged` mode (per-file commands only; whole-project checks such as `tsc` stay in CI). An existing `.git/hooks/pre-commit` is chained.
- **`pre-push`** blocks a push to a protected branch by any refspec, including deleting one.

With your consent (asked interactively; the default under `--yes`), `harny init` activates the hooks by setting `core.hooksPath`. It never does so over husky, lefthook, pre-commit or an existing `core.hooksPath`; instead it prints the line to add to that setup. Pass `--no-git-hooks` to write the hooks without activating them.

Hooks are local configuration, so a fresh clone, including a cloud agent's checkout, has none active. The generated CI workflow is the backstop: it downloads a pinned gitleaks release, verifies its checksum, and scans each pull request's or push's commits for secrets. `git commit --no-verify` still skips the hooks for people; the permissions baseline denies it to agents. See `templates/git-hooks/README.md` for the details and limits.

## Checking whether a repository is ready

`npx harny doctor` runs the scaffolded readiness check against a target repository —
a feedforward, computational pre-check (see `AGENTS.md` § "Feedforward vs. feedback")
that confirms both that the harness is installed and coherent, and that the target
repository carries the baseline documentation an AI coding agent needs to work safely.
This runs before an agent starts work, rather than discovering gaps partway through a
session:

```sh
# Check the current directory:
npx harny doctor

# Check another repository, overriding the recorded stack:
npx harny doctor /path/to/target-repo --stack python

# Equivalent direct invocation (what CI or a hook would run):
node /path/to/target-repo/.sdd/doctor/run-doctor.mjs

# Direct invocation only: scope to a single check family, cheaply
node /path/to/target-repo/.sdd/doctor/run-doctor.mjs --only spec-state
```

The **security** family reports, as warnings only (never a failure, never a changed
exit code), whether:
- the permissions baseline is installed and each selected tool's hook config calls its
  guard;
- git actually ignores `.env` and `.env.local` (asked of `git check-ignore`, not by
  reading `.gitignore`);
- the commit-check hooks exist and `core.hooksPath` points at them;
- gitleaks is installed locally;
- the CI workflow still carries its secret-scan step.

Each warning names its fix. Run it alone with `--only security`.

The direct runner invocation also accepts an optional `--only <family>` selector —
one of `environment`, `harness`, `repo-readiness`, `security`, `spec-state`, or
`tests` — that evaluates that single family alone instead of all six, and spawns no command from
the `tests` family unless `tests` itself is the selected family. An unrecognized
value or a value-less `--only` is a usage error (exit `1`), never a silently-empty,
falsely-ready run. This is what makes it cheap enough for the `sdd-documentation`
role and the conductor to run `--only spec-state` as a precondition on reporting an
archive hand-off complete, without paying for a full test-suite run every time. Its
absence reproduces today's five-family output byte for byte. `--only` is **not**
available on the `npx harny doctor` CLI verb, which always evaluates all five
families with no selector — `src/doctor.ts` is unchanged.

It evaluates five check families in this fixed order:

1. **Environment** — Node.js version and runtime readiness
2. **Harness manifest** — base `.sdd/` scaffold files (the generator's own artifacts)
3. **Repo readiness** — repository documentation the agent needs: a `README.md` (must-have);
   an architecture/structure document (recommended); and per-tool guidance files
   (recommended, gated by tool selection in `.sdd/harness.json`)
4. **Spec state** — coherence of the `specs/` directory if harny specs are in use
5. **Test suite** — running the resolved stack's full test suite (stack-specific runner)

Two tiers govern each check:
- **Must-have** — an absent item fails the run and exits `6` (not ready)
- **Recommended** — an absent item warns (named in the report with remediation) but never
  changes the exit code

The summary line reports four counts: `ok`, `skipped`, `warned`, and `failed`. Exits `0`
when ready (no failures, possibly some warnings); exits `6` when at least one must-have
check failed (never confused with a CLI usage/internal error); exits `2` when the target
directory is missing, unreadable, or the runner could not complete. Writes nothing under
any flag combination: this is the one command that executes project tooling, and it never
mutates the repo it inspects.

For repositories with gaps, `harny-doctor` does more than report: it reads the present
guidance documents (README, conventions document, architecture document) and judges three
coherence elements:
- **Purpose** — does it state what this project is and what it is for?
- **Components** — does it name the top-level structure and what each main part does?
- **Validation** — does it name the commands that prove a change is good (tests, lint,
  type-check, build)?

All three are must-have for the conventions document and recommended for the README and
architecture document. When gaps are found, `harny-doctor` reports them to the human and
asks whether to delegate drafting to `harny-document`, which can bootstrap repo-level
guidance documents from observed evidence.

**Key flags:**
- `[target]` — directory to check (default: `.`)
- `--stack <name>` — override the stack recorded in `.sdd/harness.json`

## Portable templates

`templates/` at the repo root holds a **canonical, tool-agnostic** version of the
five roles, the conductor, the spec schema, and the skill library:

```
templates/
├── roles/         # sdd-architect, sdd-test-writer, sdd-executor, sdd-auditor,
│                  # sdd-documentation - portable role bodies, no Claude-Code-only
│                  # tools:/model:/frontmatter mechanics baked in as the source of
│                  # truth. Each role instead declares an abstract cost_tier
│                  # (most-capable / mid / cheapest) and a capabilities list.
├── conductor/     # sdd-conductor.md - the same 5-role, 3-gate orchestration logic,
│                  # described without assuming any single tool's Skill format.
├── spec-schema/   # intent/contract/roadmap/tasks/audit.md - the blank scaffolds
│                  # the architect emits, extracted as standalone template files.
└── skills/        # Ten harny-* skills plus bundled resources and a shape contract:
                   # harny-propose, harny-test, harny-implement, harny-audit,
                   # harny-document, harny-sync, harny-feedback, harny-doctor,
                   # harny-adr, harny-standards.
                   # Each skill carries six portable frontmatter keys and five body
                   # sections per the Agent Skills specification.
```

These templates are the canonical source that `npx harny init` reads from when
generating configuration for a target repository. The CLI treats `templates/` as
read-only input — the per-tool generators adapt this content without modifying it.
The ten skills are **copied as real files** to each tool's skill-discovery root,
never as symlinks, and never edited by the generators.

## Repository layout

This repo's own SDD pipeline (running on Claude Code):

```
.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md
.claude/skills/sdd-conductor/SKILL.md
```

Shared templates and specs:

```
specs/<feature-name>/{intent,contract,roadmap,tasks,audit}.md
templates/{roles,conductor,spec-schema}/
plan.md          # background/vision notes (workshop planning)
AGENTS.md        # tool-agnostic conventions for this repo
CLAUDE.md        # Claude-Code-specific notes; defers to AGENTS.md
```

When you run `npx harny init` in a target repository, it generates a pipeline for your
chosen tool(s) — e.g., `.cursor/agents/sdd-*.md` for Cursor, `.kiro/agents/sdd-*.md` for Kiro,
or `.github/agents/sdd-*.agent.md` for GitHub Copilot — plus shared `.sdd/spec-schema/` and
`.sdd/harness.json` files.

See `AGENTS.md` for the full conventions this repo follows.
