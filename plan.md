# Plan v3: "SDD Harness for AI Coding Agents in Production" Workshop — DevFest Quito 2026

**Event:** Sep 26, 2026, USFQ, Quito
**CFP deadline:** Sep 1, 2026
**Workshop length:** 60 min
**What's new in this v3:** the 5-role (soon 6) SDD pipeline **already exists and runs in production** in `mr-engine-app` (your real auto-workshop management app). This project is no longer "design from scratch" — it's **extracting, generalizing, and making portable** what you already built, plus adding the one missing role (Documentation).

---

## 1. What changed from plan v2

- No need to invent the roles or the flow: they already exist in `mr-engine-app/.claude/agents/sdd-*.md` and `.claude/skills/sdd-conductor/SKILL.md`, battle-tested in a real app with real customers.
- The actual project work is **extraction + generalization + portability**, not ground-up design.
- I also found you'd already tried OpenSpec in that same repo (`.cursor/skills/openspec-*`, `.codex/skills/openspec-*`, `.kiro/skills+prompts/`) — in practice this confirmed that Skills (not subagents) is how Cursor/Codex/Kiro received this kind of flow at the time, and it gave us the exact folder convention to follow for the portability layer. (Note: this assumption about Cursor/Codex/Kiro lacking native subagents was later corrected — see Section 3.)

---

## 2. The real system you already have (source of truth for this project)

### The 5 existing roles

| Role | Type | Model | Tools | What it does |
|---|---|---|---|---|
| **sdd-architect** | Subagent (`.claude/agents/sdd-architect.md`) | `opus` | explores code, writes specs | Deeply explores the codebase and produces 5 files in `specs/<feature>/`: `intent.md`, `contract.md`, `roadmap.md`, `audit.md`, `tasks.md` — one at a time, with human approval between files |
| **sdd-test-writer** | Subagent | `sonnet` | reads specs, writes tests | Turns every guarantee in `contract.md` and every success criterion in `intent.md` into tests — red phase (must fail for the right reason) |
| **sdd-executor** | Subagent | `sonnet` | implements | Implements `tasks.md` phase by phase, following `contract.md` to the letter — "the contract is law," zero scope creep |
| **sdd-auditor** | Subagent | `opus` | Read-only + Bash to run tests | Final quality gate: verifies compliance against all 5 specs, confirms the per-turn feedback hook fired (and its findings were heeded) and the generated CI workflow is green — it does not itself re-run lint/type-check, which would duplicate that work — and issues a verdict: `APPROVED` / `APPROVED WITH RESERVATIONS` / `REJECTED` in `audit.md` |
| **sdd-conductor** | **Skill**, not a subagent (`.claude/skills/sdd-conductor/SKILL.md`) | runs in the main thread | orchestrates | Sequences the pipeline, **enforces 3 human gates**, never does another role's work, verifies instead of blindly trusting reports |

**Why the conductor is a Skill, not a subagent:** it needs to live in your main thread so it can pause, ask for your approval (`AskUserQuestion`), and delegate — an isolated subagent couldn't interrupt the conversation to ask you something. Good teaching contrast with the earlier OpenSpec finding: here, the Skill is the *deliberately* correct choice, not a limitation.

### The pipeline with human gates (the part that sells the workshop)

```
sdd-architect
     ↓
[HUMAN GATE: review the 5 specs]
     ↓
sdd-test-writer (red phase — tests that must fail)
     ↓
[HUMAN GATE: confirm the tests fail for the right reason]
     ↓
sdd-executor (green phase — implements until tests pass)
     ↓
sdd-auditor (verifies the contract + confirms the per-turn hook fired and CI is green)
     ↓
[HUMAN GATE: review the final verdict]
```

Hard rule for the conductor: **it never self-approves on your behalf**. If the architect finishes the specs, the conductor stops and summarizes them for you — it doesn't assume your approval. Same rule at the other two gates. This is the exact opposite of "vibe coding" and is the central argument of the workshop: specialized roles + explicit contracts + human stopping points = safe for production.

### The spec schema (5 files, not 3 or 4)

```
specs/<feature-name>/
├── intent.md     # the WHY: problem, goals, success criteria, non-goals, constraints
├── contract.md   # the WHAT: real interfaces in the project's language, data models,
│                 #           behavior guarantees, error-handling table
├── roadmap.md    # the HOW: phases with dependencies, file-change map
├── tasks.md      # granular checklist per phase, with states [ ] [x] [~] [!]
└── audit.md      # compliance checklist + audit log + final verdict
```

Forced traceability: every item in `contract.md` traces back to a goal in `intent.md`; every task in `tasks.md` traces back to a phase in `roadmap.md`; every item in `audit.md` traces back to `intent.md` or `contract.md`. Nothing floats without justification.

**Important detail already solved:** the architect's prompt explicitly says "use the project's actual language as detected during exploration, never a placeholder" — the system is already stack-agnostic by design; we don't need to add that layer.

### The missing role: sdd-documentation (to be designed in this project)

Doesn't exist yet in `mr-engine-app`. Proposal, following the same pattern:

| Field | Proposed value |
|---|---|
| Type | Subagent (`.claude/agents/sdd-documentation.md`) |
| Model | `haiku` — this is synthesis and writing, not deep reasoning (and it's a perfect cost argument for the workshop: 3 model tiers in one pipeline) |
| Triggers | After the human gate on the auditor's verdict, if the status is `APPROVED` or `APPROVED WITH RESERVATIONS` |
| Input | The 5 specs + `audit.md` with the final verdict + the actual diff of changed files |
| Output | Updates `README.md`, `CHANGELOG.md`, the relevant section of `ARCHITECTURE.md`/`AGENTS.md`, and archives the spec (e.g. adds a "Shipped: <date>" header to `intent.md` or moves it to `specs/archive/`) |
| Hard rule | Only documents what the auditor verified — cannot invent behavior or "improve" the implementation |

With this, the final 6-role pipeline is: **architect → test-writer → executor → auditor → documentation**, orchestrated by **conductor**.

---

## 3. Real portability — important correction (verified, Jul 2026)

You were right to suspect this. When I put together plan v2/v3, I assumed only Claude Code had native subagents, based on the test you'd run with OpenSpec (which uses Skills there for broad compatibility across 25+ tools). But researching Cursor, GitHub, and Kiro specifically, I found that **all 5 target tools already have native subagents with a per-role model field** — no "skills/prompts" fallback is needed for the `sdd-*` pipeline; each tool has its own `agents/` folder:

| Tool | Folder | Format | Scope | Model field |
|---|---|---|---|---|
| Claude Code | `.claude/agents/<role>.md` | Markdown + YAML frontmatter | project or `~/.claude/agents/` | `model: opus/sonnet/haiku` |
| Cursor | `.cursor/agents/<role>.md` | Markdown + YAML frontmatter | project or `~/.cursor/agents/` | `model: inherit/fast/<id>` |
| Kiro | `.kiro/agents/<role>.md` | Markdown + frontmatter | project (`.kiro/agents/`) or `~/.kiro/agents/` | per-agent model selection |
| GitHub Copilot | `.github/agents/<role>.agent.md` (exact extension to confirm) | Markdown + YAML frontmatter | repo or enterprise level | to confirm in week 1 |
| Codex CLI | `.codex/agents/<role>.toml` (or `~/.codex/agents/` — confirm whether project scope exists) | **TOML**, not Markdown | user (confirm whether project scope exists) | per-agent model (e.g. GPT-5.4-mini for fast subagents) |

**Two things to confirm in week 1 research** (they don't block the design, only the generator's implementation details): GitHub Copilot's exact file extension (`.agent.md` vs. `.md` depending on the source), and whether Codex CLI accepts a project-level `agents/` folder or only `~/.codex/agents/` (user-level).

**Implication for the generator:** it's no longer "native subagents vs. prompt fallback" — it's **one format adapter per tool** (4 in Markdown+YAML, 1 in TOML) over the same canonical content for each role. And the cost/quality argument ("Architect on the most capable model, Documentation on the cheapest") now applies to all 5 tools, not just Claude Code — a stronger hook for the workshop than the previous version of the plan.

Adding **GitHub Copilot** as a fifth supported tool (your suggestion) — very relevant for the workshop audience since it's the most widely adopted at companies.

---

## 4. Two-repo architecture

**Repo 1 — `harny` (the product you give away):** a CLI that **extracts and generalizes** the real files from `mr-engine-app` (stripping references specific to the auto workshop, parameterizing roles/models/gates) and writes them into any project, for any of the 5 tools.

```
harny/
├── bin/harness.js                    # npx harny init
├── src/
│   ├── prompts.ts                    # interactive config
│   └── generators/
│       ├── claude-code.ts            # .claude/agents/*.md  (MD + YAML)
│       ├── cursor.ts                 # .cursor/agents/*.md  (MD + YAML)
│       ├── kiro.ts                   # .kiro/agents/*.md    (MD + frontmatter)
│       ├── github-copilot.ts         # .github/agents/*.agent.md (MD + YAML)
│       └── codex.ts                  # .codex/agents/*.toml (the only one in TOML, not Markdown!)
├── templates/
│   ├── roles/                        # CANONICAL content for each role (sdd-architect, sdd-test-writer,
│   │                                  # sdd-executor, sdd-auditor, new sdd-documentation) —
│   │                                  # a single source; each generator only changes the wrapper (MD/TOML)
│   ├── conductor/                    # generalized sdd-conductor
│   ├── spec-schema/                  # intent/contract/roadmap/tasks/audit templates
│   └── agnostic-layer/               # CI, git hooks, gitleaks (from plan v1, unchanged)
└── README.md
```

**Interactive config (`harness init`):**

1. Which agent tool(s) will you use? (Claude Code / Cursor / Kiro / GitHub Copilot / Codex CLI / all)
2. Which roles to enable? (Architect, Test Writer, Executor, Auditor, Documentation — Conductor is always on)
3. Model per role? (pre-filled with what's already proven in production: the most capable model of each tool for Architect/Auditor, a mid-tier model for Test Writer/Executor, the cheapest/fastest for Documentation — editable; the exact model-ID mapping per tool is resolved inside each generator)
4. Which steps have active human gates? (defaults to the 3 already proven: post-specs, post-red-tests, post-audit)
5. Project stack? (optional, only adjusts the agnostic CI layer)

**MCP server configuration:** the `docs-lookup` capability (used by architect/executor/test-writer to verify library APIs before pinning a signature) defaults to Context7 MCP, wired up automatically by `npx harny init` so it works out of the box. Every run writes the Context7 entry into each selected tool's native MCP config file, using a merge-write mechanism that preserves any pre-existing servers and tool-specific settings.

**Future scope — MCP server customization:** A natural follow-on — not scheduled in the current timeline, a candidate for future work — is letting users add their *own* MCP servers (Jira, Linear, Figma, etc.) on top of that default, likely as a `harness mcp add <server>` command (or an extra `init` prompt) that writes to whichever of the 5 tools' MCP config files apply to the user's selection:

| Tool | MCP config file | Format | Root key |
|---|---|---|---|
| Claude Code | `.mcp.json` (repo root) | JSON | `mcpServers` |
| Cursor | `.cursor/mcp.json` | JSON | `mcpServers` |
| GitHub Copilot (VS Code) | `.vscode/mcp.json` | JSON | `servers` (not `mcpServers` — differs from the others) |
| Kiro | `.kiro/settings/mcp.json` | JSON | `mcpServers` |
| Codex CLI | `.codex/config.toml` (project) or `~/.codex/config.toml` | TOML | `[mcp_servers.<name>]` |

**Future scope — stack addons (framework/tool-specific feedback checks):** `stack` stays a single language per component (it only selects the lint/type-check/test `StackProfile`; frameworks like FastAPI or SQLite are discovered by the agents during exploration and documented in per-component `AGENTS.md`, not declared in `harness.json`). If a concrete per-turn check beyond the language profile is needed (e.g. `sqlfluff` for `.sql`, `alembic check` for migrations, `prisma validate`), model it as additive `addons` on a component — small profiles in `src/feedback.ts` that contribute extra `CommandSpec`s, each gated by the `extensions` field from `feedback-path-hygiene`:

```json
"components": [
  { "path": "apps/api", "stack": "python", "addons": ["sqlfluff"] },
  { "path": "apps/web", "stack": "typescript" }
]
```

Not scheduled; add only when a real check justifies it.

**Future scope — `custom-feedback-profiles` (stack-agnostic feedback):** the runner (`run-feedback.mjs`) is already stack-neutral — it executes whatever `CommandSpec`s it's handed and, after `feedback-path-hygiene`, filters touched files by each command's declared `extensions`. What's stack-coupled is the built-in `STACK_PROFILES` catalog in `src/feedback.ts`, which only ships `typescript` and `python`; any other stack gets the "unrecognized stack" escape-hatch notice and no per-turn hook or CI checks, and adding one means editing harny's source. Two parts:
- **User-defined commands in `harness.json`** — `argv`/`pathMode`/`extensions`/`requires` entries that either extend a built-in profile or replace it entirely, so any stack (Go, Rust, Ruby, Elixir, …) works without touching harny. The `extensions` gate is what makes this safe.
- **More built-in profiles** for common stacks (Go, Rust, Java/Kotlin, Ruby, C#) — each is just a data entry.

Composes with `monorepo-mode`: each component could use either a built-in `stack` or custom commands. Not scheduled.

**Ideas I just had for next steps in harny**
- add linters and any other kind of feedback tool for the agents, reference about feedforward and feedback controls: https://martinfowler.com/articles/harness-engineering.html#FeedforwardAndFeedback
- add a kind of init.sh or sh script that will help us verify the readiness of the project by running the tests, the documentation files (agents.md) and the specs.
- expand harny-doctor skill to check for relevant documentation and delegate the documenter if this is not ready for AI/sdd, a sdd/ai sdlc readiness check.

**Repo 2 — `harny-demo`:** a small app (Next.js + FastAPI) with one feature deliberately left half-built, so the full cycle can run live without spending the 60 minutes scaffolding anything from scratch. Slides will also show a real (redacted) excerpt from `mr-engine-app`'s `audit.md` as proof this already runs in production — not just workshop theory.

Feedback post demo:
- https://mcp.context7.com/mcp is actually https://mcp.context7.com/mcp/oauth to make it work correctly
- Dogfooding on `project-agentcore-app` (bootstrapping `stack: "python"` into an
  already-real repo): the `python` `StackProfile`'s `ruff`/`mypy` commands
  (`pathMode: 'per-file'`) have no extension gate on the accumulated
  touched-paths. `run-feedback.mjs`'s `accumulate` mode records every
  `Edit|Write` touched file regardless of type, and `run` mode appends the
  whole deduped set to `argv` unfiltered — so editing a non-`.py` file in the
  same turn as any change (e.g. `.claude/settings.json`, a `.github/workflows/
  *.yml`) makes `ruff check`/`mypy` try to parse it as Python and spam bogus
  `invalid-syntax` "findings" back through the Stop hook. Confirmed CI is not
  affected (`--whole-project` mode passes `per-file` commands a single `.`
  instead of touched paths), so this is Stop-hook-only noise, not a CI
  correctness bug — but it's real, reproducible false-positive advisory
  context on every turn that touches a non-Python file. Fix candidate: either
  filter `touchedPaths` by each `CommandSpec`'s own tool (e.g. a
  `fileExtensions` field on `StackProfile`'s `commands`, mirrored from a
  `python`/`typescript` allowlist) before appending in `run-feedback.mjs`'s
  `run` mode, or accept it as a documented reservation like R7. **Patched
  locally in `project-agentcore-app` on 2026-09-17**, same session as the
  vanished-path fix below: added an optional `extensions` field read directly
  off each `CommandSpec` object in the `--commands` JSON (no `StackProfile`
  schema change needed locally, since the embedded commands are already
  per-project JSON, not re-derived from `src/feedback.ts` at runtime) — a
  `matchesExtensions(path, command.extensions)` gate filters `touchedPaths`
  before `existingPaths()` runs, and `'.'` (the `--whole-project` sentinel)
  always passes through unfiltered regardless of `extensions`, so CI's
  whole-project scan is untouched. Verified: a touched `.toml`/`.mjs` file
  alongside a vanished `.py` path now filters to nothing (clean exit, no
  findings) instead of spamming parse errors; a genuinely touched `.py` file
  still gets checked; `--whole-project` with `extensions` declared still ran
  a full `ruff` pass and surfaced two real pre-existing findings, proving the
  `'.'` bypass works. For a canonical fix in `harny` itself, this becomes a
  real `extensions?: readonly string[]` field on `CommandSpec` in
  `src/feedback.ts` (set per `STACK_PROFILES` entry, e.g. `python` ->
  `['.py', '.pyi']`), threaded through to the generated `--commands` JSON by
  whichever generator already serializes `argv`/`pathMode`/`requires`.
- Second dogfooding find on the same `project-agentcore-app` session (archiving
  10 shipped features into `specs/archived/` via `harny-sync`): `ruff`
  reported `E902 No such file or directory` on several `specs/*/intent.md`
  paths. Root cause is distinct from the extension-gate finding above and more
  general — `run-feedback.mjs`'s touched-file accumulator (`accumulate` mode)
  records a file's absolute path at `Edit|Write` time, but nothing ever
  removes or updates that record if the file is later moved or deleted within
  the *same turn* by something other than `Edit`/`Write` (a `git mv`, `mv`, or
  `rm` run through Bash — exactly what `harny-sync` archive mode does, and
  exactly what a rename spec like `rename-spike-to-shared` does to its own
  `src/*.py` files). By the time `run` mode reads the turn file at Stop, it
  hands `runCommand` (`run-feedback.mjs`, the `dedupedTouchedPaths` →
  `runCommand` per-file path) a path that no longer exists, and the mapped
  tool fails to open it. Not bootstrap-specific and not fixable by "sync
  before wiring feedback" — any steady-state project running a rename/move
  spec hits the identical failure on real source files, not just specs. Fix:
  filter `touchedPaths` through `fs.existsSync` (drop paths that no longer
  exist) before building a `per-file` command's `argv` in `runCommand` —
  unlike the extension-gate finding, this one has no real design tradeoff to
  weigh, it's a plain correctness gap. Patched locally in
  `project-agentcore-app`'s scaffolded copy
  (`.sdd/feedback/run-feedback.mjs`) on 2026-09-17 pending the same fix
  landing in `templates/hooks/run-feedback.mjs` (+ `tests/hooks/
  run-feedback.test.ts`) here through harny's own SDD process.

 - twick the documentation agent to add informational context on the key components of the repo instead of the same AGENTS.md at root level but also do it at component/domain level.

 - real-world incident (`project-agentcore-app`, `web-feed-ui` feature, 2026-09-18): the `sdd-documentation` role (the one actually wired into the automatic post-audit pipeline handoff) committed its own doc changes (`git commit`) without ever being asked to. Root cause: `templates/roles/sdd-documentation.md` has no git-safety guidance anywhere in it — no mention of commit/push either way — unlike the older, overlapping `sdd-documentarian` role template, which has an explicit "Never commit or push" hard rule. Because a custom `subagent_type`'s system prompt is built from just its own template (it does not inherit the top-level harness's "never commit unless the user explicitly asks" policy), the model (running on `haiku` per this role's frontmatter, with `Bash` in its toolset) fell back to the common "finish the task → commit it" agent pattern. Two follow-ups: (1) port an explicit "Never commit or push" rule into `templates/roles/sdd-documentation.md`'s hard rules (done ad hoc in `project-agentcore-app`'s scaffolded `.claude/agents/sdd-documentation.md` on 2026-09-18, pending the same fix landing here); (2) `sdd-documentarian` and `sdd-documentation` are near-duplicate roles (same job: bring README/CLAUDE.md in line with a shipped feature) that drifted independently — one has the git rule, the other doesn't, and only `sdd-documentation` is wired into the conductor's automatic handoff. Worth deciding whether `sdd-documentarian` is retired from the templates entirely (removed from `project-agentcore-app`'s local copy already) or the two are consolidated, so a safety fix made to one role doesn't silently miss its sibling again.

 - Monorepo dogfooding (`project-agentcore-app`, 2026-09-20): installing a second harness for the Next.js frontend with `harny init apps/web --stack typescript` next to the existing root `stack: python` install surfaced three gaps. (1) **No multi-stack support**: one install resolves one `stack`, so a repo with a FastAPI/Python backend and a Next.js frontend needs two full installs (two `.sdd/`, two copies of every agent and skill, two `specs/` knowledge bases). The canonical fix is a stack per component in one install, e.g. `components: [{path: "apps/web", stack: "typescript"}, {path: ".", stack: "python"}]`, with the runner choosing commands by which component a touched path belongs to. (2) **`harny init <subdir>` writes `.github/workflows/harny-feedback.yml` inside the subdirectory**, where GitHub never reads it. It had to be moved by hand to the root as `harny-feedback-web.yml`, with `on.pull_request.paths: [apps/web/**]` and `defaults.run.working-directory: apps/web`. `init` should detect the git root and write the workflow there, scoped to the subdirectory. (3) **Duplicated harness means duplicated local fixes**: the `extensions` gate and the vanished-path filter in `run-feedback.mjs`, the "never commit" rule in `sdd-documentation.md`, and the per-component `harny-doctor`/`harny-document` changes all had to be copied into the second install by hand, because the templates still lack them. The TypeScript profile's `eslint` command also needs an `extensions` list (`.ts/.tsx/.js/.jsx/.mjs/.cjs/.mts/.cts`), added by hand there. Also worth checking: whether same-named nested `.claude/skills` (`apps/web/.claude/skills/harny-*` vs the root ones) collide when Claude Code is launched from the repo root and touches files under `apps/web/`. ADR numbering also becomes ambiguous across two `_index.md` registries; it was resolved by hand with a "repo-wide monotonic, next is 0008" note in both.

**Spec queue derived from the post-demo feedback (2026-09-22; items 4–9 reordered 2026-09-23 so the workshop-readiness gaps come first — workshop is Sat Sep 26, so build in this order and present whatever is unfinished as roadmap):**
1. `feedback-path-hygiene` — vanished-path drop + per-command `extensions` gate in `run-feedback.mjs` (in progress).
2. `dogfood-quick-fixes` — Context7 endpoint → `/mcp/oauth` (verify MCP OAuth support per tool; fall back to `/mcp` only where unsupported); "never commit or push" hard rule in `templates/roles/sdd-documentation.md`. (`sdd-documentarian` never existed in harny's templates — nothing to retire.)
3. `monorepo-mode` (shipped) — `init` asks single repo vs. monorepo; single repo keeps today's one-`stack` behavior; monorepo gets `components: [{path, stack}]` in one install (runner picks commands by component, CI workflow at git root scoped per component, one `specs/` + one ADR registry).
4. `permissions-baseline` — a canonical deny/ask/allow baseline under `templates/permissions/`, rendered per tool like `context7-mcp` renders MCP config: a new declarative `Generator` member, `undefined` where a tool has no such surface. Claude Code first (`permissions.deny/ask` + sandbox settings in `.claude/settings.json`), Codex next (`sandbox_mode` + `approval_policy`), the other three only as far as first-party docs support. Default rules: deny reads of `.env*`, `*.pem`, `secrets/`; **git is allowed on feature branches, blocked on the protected (production) branch** — the agent may `git commit` and `git push` freely on any other branch, but committing to or pushing to `main` (configurable protected list, default `main`, `master`, `production`, `release/*`) is denied, as are `git push --force`, `git commit --no-verify`, `rm -rf`; ask on deploy, DB migrate/reset, `curl | sh`, package installs. Must also ship in harny's own dogfood `.claude/settings.json` (today it has hooks only, no `permissions`) and tighten `.claude/settings.local.json`'s broad `Read(//Users/danielerazo/**)`. This is the enforcement half of `rules-layer` (#6): rules state the policy, permissions enforce it. Caveat that shapes the design: Claude Code `permissions.deny` patterns are prefix matches on the command string, so `Bash(git push origin main:*)` misses a bare `git push` while on `main`, `HEAD:main`, or refspec variants — branch-scoping cannot be a static deny rule alone. It needs a `PreToolUse` hook that resolves the current branch and the push target, plus the `commit-checks` (#5) git `pre-commit`/`pre-push` hooks, and ultimately server-side branch protection on the remote as the only non-bypassable layer (documented as a manual/`gh` step, not something harny can enforce locally). Note this supersedes the blanket "never commit or push" posture for the main agent, but `dogfood-quick-fixes`'s role-level rule for `sdd-documentation` stays: subagent roles still don't commit; the change is that the conductor/human-driven session may. Directly answers "agent deploys without asking" and "corrupts the database".
5. `commit-checks` — a git `pre-commit` hook, tool-neutral so it fires for every agent (and humans). Must ship **both** in the delivery for all 5 tools harny generates (Claude Code, Cursor, Kiro, GitHub Copilot, Codex CLI) **and** in harny's own dogfood copy. Reuses `run-feedback.mjs` via a new `run --staged` mode (`git diff --cached --name-only --diff-filter=ACMR`, so the `extensions` gate from spec 1 applies unchanged) and is **blocking**, unlike the advisory Stop hook. Also the home for `gitleaks protect --staged` (plan v1's never-built agnostic git-hooks layer). Open design points: install via versioned `.sdd/git-hooks/` + `core.hooksPath` behind an `init` consent prompt, detecting and composing with existing husky/lefthook/pre-commit setups rather than clobbering them; a `pre-commit`/`pre-push` guard that blocks commits and pushes on the protected branch list shared with `permissions-baseline` (#4) — the tool-neutral backstop for branch-scoped git; a "never `--no-verify`" rule in the roles (plus a Claude Code deny rule); whether whole-project typecheck runs at commit time or stays CI-only. **Extended 2026-09-23 into secrets management:** the staged `gitleaks protect --staged` scan also runs in the generated CI workflow, and pairs with `permissions-baseline`'s (#4) deny-read rules so the agent can neither read nor commit secrets.
6. `rules-layer` — a canonical, always-on **rules** layer, rendered to each tool's own native rules mechanism. Today a cross-cutting policy (e.g. "never commit or push") has to be written into each role body that needs it — `dogfood-quick-fixes` item 2 writes the same sentence into `templates/roles/sdd-documentation.md` **and** both copies of `harny-document/SKILL.md`, and a third copy would be needed for every further role — because harny has no layer for a rule that applies regardless of which role is running. Research 2026-09-22 (sources below) confirms all five tools have one, and four have a real rules *directory*:

    | Tool | Mechanism | Path | Scoping |
    |---|---|---|---|
    | Claude Code | rules dir | `.claude/rules/**/*.md` (recursive) | `paths:` frontmatter; without it, loaded at launch at the same priority as `.claude/CLAUDE.md` |
    | Cursor | project rules | `.cursor/rules/*.mdc` | frontmatter `alwaysApply: true`, `globs`, `description` |
    | Kiro | steering | `.kiro/steering/*.md` (+ `~/.kiro/steering/`) | `inclusion: always \| fileMatch \| manual \| auto` |
    | GitHub Copilot | instructions | `.github/copilot-instructions.md` (repo-wide) + `.github/instructions/*.instructions.md` | `applyTo:` glob, comma-separated; path-specific files are honored only by the cloud agent and code review, not every surface |
    | Codex CLI | AGENTS.md chain | `AGENTS.md` / `AGENTS.override.md` per directory, global → repo root → cwd, concatenated | directory nesting *is* the scoping; **no rules dir**; `project_doc_fallback_filenames`, 32 KiB `project_doc_max_bytes` cap |

    Codex is the one exception — a harny rule there is a section inside `AGENTS.md` (or a nested one), not its own file. Fits harny's existing design directly: the `Generator` interface already models exactly this class of fact declaratively (`skillsDir`, `hooksPath`, `guidancePath`, `mcpConfig` — ADR 0011's "fixed per-tool path fact, not a method"), and `guidancePath` is already half-modelling it (Kiro's value is literally `.kiro/steering`, Copilot's `.github/copilot-instructions.md`). A `rulesDir`/`rulesConfig` member is the natural sixth, with `undefined` meaning "this tool has no rules surface of its own — fold into `AGENTS.md`". Expect the same work shape as `context7-mcp`: one new declarative member, five per-tool values, canonical rule bodies under `templates/rules/`, plus placement/fidelity tests.

    **Scope decision (2026-09-22): advisory layer only.** Rules are *context, not enforced configuration* in every one of the five tools — Claude Code's own memory docs say so explicitly and point to a `PreToolUse` hook as the way to block an action regardless of what the model decides. That is the same failure class as the `web-feed-ui` incident: the role body was in the prompt and the agent committed anyway. So a rules file makes a policy always-on and visible to every role instead of buried in one role's Step 5, but it is **not** a guarantee, and `rules-layer` does not pretend otherwise. **Enforcement belongs to specs 4 (`permissions-baseline`) and 5 (`commit-checks`)**, which own the blocking surface (both sequenced before this spec): every generator declares a `hooksPath` harny already writes (`.claude/settings.json`, `.cursor/hooks.json`, `hooks.json`, `.kiro/hooks/harny-feedback.json`, `.github/hooks/harny-feedback.json`), so a `PreToolUse` branch-aware deny on `git commit`/`git push` to the protected branch rides the layer that exists. Two layers, one policy: rules state it, hooks enforce it.

    Sources (all re-fetched 2026-09-22): `code.claude.com/docs/en/memory` § "Organize rules with `.claude/rules/`"; `cursor.com/docs/rules`; `kiro.dev/docs/steering/`; `docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions`; `learn.chatgpt.com/docs/agent-configuration/agents-md` § "How Codex discovers guidance".

7. `doctor-security-checks` — `harny-doctor` recommended-tier checks (warn, never change exit code) via the existing presence-probe mechanism: a permissions baseline exists, `.env*` is in `.gitignore`, and the gitleaks hook/CI step is present.
8. `dependency-guard` — an additive addon under `custom-feedback-profiles`: a per-turn/CI check that flags any newly added manifest dependency that doesn't resolve in its registry (hallucinated / slopsquatted packages). Directly answers "agent invents dependencies".
9. `component-level-docs` — `harny-document`/`sdd-documentation` write per-component/domain `AGENTS.md` via heuristic discovery (manifests, top-level source dirs); `harny-doctor` checks their presence.

---

## 5. Updated timeline (Jul 16 → Sep 26, 10 weeks)

| Week | Dates | Focus |
|---|---|---|
| 1 | Jul 16–22 | Extract and generalize the 4 agents + conductor from `mr-engine-app`; design `sdd-documentation`; confirm open details (GitHub Copilot's exact extension, Codex CLI project vs. user scope) |
| 2 | Jul 23–29 | `harny` CLI skeleton (prompts, template engine, canonical per-role content kept separate from the per-tool wrapper) |
| 3 | Jul 30–Aug 5 | Native generators: Claude Code, Cursor, Kiro, GitHub Copilot (all 4 in Markdown+YAML, same adapter) |
| 4 | Aug 6–12 | Codex CLI generator (the only TOML one) + reintegrate the agnostic layer (CI, hooks, gitleaks) from plan v1 |
| 5 | Aug 13–19 | Build `harny-demo`; run the full 6-role cycle end-to-end with Claude Code |
| 6 | Aug 20–26 | Validate portability on Cursor/Kiro/GitHub Copilot/Codex; slides + script; prepare the real `audit.md` excerpt as social proof |
| — | **Sep 1** | **CFP deadline** |
| 7 | Aug 27–Sep 2 | Internal rehearsal #1, timed |
| 8 | Sep 3–9 | Publish both repos; record a backup video |
| 9 | Sep 10–16 | Rehearsal #2 with a test audience |
| 10 | Sep 17–23 | Buffer + final tweaks |
| — | Sep 24–25 | Venue logistics |
| — | **Sep 26** | **Event** |

---

## 6. Workshop agenda (60 min, updated)

| Min | Block |
|---|---|
| 0–5 | Hook: why a single agent with no roles or gates isn't enough for production |
| 5–12 | Anatomy of the harness: agnostic layer (CI, hooks, secrets) + SDD layer (6 roles + 3 gates) |
| 12–15 | Social proof: real `audit.md` excerpt from a production app — this isn't theory |
| 15–20 | `npx harny init` live on `harny-demo` → show what got generated |
| 20–45 | Full live cycle: `propose → [gate] → red tests → [gate] → implementation → audit → [gate] → documentation` |
| 45–52 | Portability: the same 6 roles running as native subagents on Cursor, Kiro, GitHub Copilot, and Codex CLI — one format adapter per tool (4 in Markdown, 1 in TOML), same per-role model strategy across all of them |
| 52–57 | Final checklist + links to both repos |
| 57–60 | Q&A |

---

## 7. Immediate next steps

1. Confirm you want `harny` to start literally from the `mr-engine-app` files as the base (I generalize them) rather than rewriting from scratch.
2. Design the final details of `sdd-documentation` together (the only role that doesn't exist yet) before touching code.
3. Start week 1: copy and generalize the 5 real files (`sdd-architect.md`, `sdd-test-writer.md`, `sdd-executor.md`, `sdd-auditor.md`, `sdd-conductor/SKILL.md`) into the `templates/` folder of the new repo.

---

**Sources:**
- Direct exploration of `mr-engine-app/.claude/agents/sdd-*.md`, `.claude/skills/sdd-conductor/SKILL.md`, `.claude/skills/high-value-tests/SKILL.md`, `specs/*/`, `.cursor/`, `.codex/`, `.kiro/` (your repo, Jul 2026)
- [Fission-AI/OpenSpec (GitHub)](https://github.com/Fission-AI/OpenSpec)
- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [AGENTS.md Spec (2026)](https://www.morphllm.com/agents-md-guide)
- [Subagents | Cursor Docs](https://cursor.com/docs/subagents)
- [About custom agents - GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-custom-agents)
- [Subagents - IDE - Docs - Kiro](https://kiro.dev/docs/chat/subagents/)
- [Subagents | ChatGPT Learn (Codex)](https://developers.openai.com/codex/subagents)