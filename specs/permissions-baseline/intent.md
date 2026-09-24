# Intent: Permissions Baseline

> **Gate waiver (recorded, not implied).** The human who requested this feature
> (2026-09-24) explicitly waived all three human gates for this run and delegated
> approval to the agent running the pipeline: "skip all the human gates, auto approve
> it yourself, follow the best recommendations and at the end just give me the final
> audit". Every gate below that says "approved" was approved by that delegation, not by
> a human reading the artifact. The final audit is the first human-facing checkpoint.

## Problem Statement

harny scaffolds five coding-agent harnesses, and none of them is told what the agent
must never do. The only guardrails today are prose: role bodies and `AGENTS.md`. Prose
is context, not enforcement. The `web-feed-ui` incident (plan.md) is the failure
class: the rule was in the prompt, and the agent committed anyway. Concretely, a
harny-scaffolded agent can today:

- read `.env`, private keys and `secrets/` into its context, and from there into a log,
  a commit or a model provider;
- commit to or push to `main` (or any production branch) directly;
- force-push, skip git hooks with `--no-verify`, or `rm -rf` a tree;
- deploy, run or reset database migrations, pipe a remote script into a shell, or add
  a dependency, all without a human in the loop.

harny's own dogfood `.claude/settings.json` carries hooks only and no `permissions`
block, so harny does not follow its own advice.

## Goals

1. **G1 — One canonical, tool-neutral baseline.** A single policy (deny, ask, protected
   branches, secret-path reads) lives in `templates/permissions/`, is copied into every
   install as editable data, and is the only source every tool's enforcement derives
   from.
2. **G2 — Enforced on all five tools, as far as each tool's first-party surface
   allows.** Every generator wires a pre-tool-call hook to one shared, tool-neutral
   guard runner, and uses each tool's native decision channel. Where a tool cannot
   express a decision (e.g. `ask` on Codex or Kiro), the guard fails **closed**
   (deny, naming the reason), never silently open.
3. **G3 — Git is free on feature branches and blocked on protected ones.** Committing
   (and other history-writing git verbs) while on a protected branch, and pushing to a
   protected branch by any spelling (bare `git push`, `HEAD:main`, `+main`,
   `refs/heads/main`, `--all`, `--mirror`), is denied. Everything else in git,
   including commit and push on feature branches, is allowed. The protected list is
   configurable and defaults to `main`, `master`, `production` and `release/*`.
4. **G4 — Defense in depth where a tool has a static layer.** Claude Code also receives
   native `permissions.deny`/`permissions.ask` rules generated from the same policy, so
   the baseline holds even if the hook is removed.
5. **G5 — harny dogfoods it.** This repo's own `.claude/settings.json` and `.sdd/`
   carry the baseline, byte-identical to a fresh `harny init` (FC-13 discipline).

## Success Criteria

- [ ] SC1 — `templates/permissions/policy.json` and `templates/permissions/run-guard.mjs`
      exist, and `harny init` writes them verbatim to `.sdd/permissions/`.
- [ ] SC2 — All five generators' hook files register a pre-tool guard: Claude Code
      `PreToolUse`, Cursor `beforeShellExecution` + `beforeReadFile`, GitHub Copilot
      `preToolUse`, Codex `PreToolUse`, Kiro `preToolUse`.
- [ ] SC3 — Driving each tool's generated guard command as a real subprocess with that
      tool's documented payload shape yields that tool's documented deny output for
      `cat .env`, a read of `.env`, `git push origin main`, `git push --force`,
      `git commit --no-verify` and `rm -rf build`, and allows `git push origin
      feature/x` and `git commit -m x` on a feature branch.
- [ ] SC4 — `ask` rules (deploy, migrate/reset, pipe-to-shell, package add) produce
      `ask` on Claude Code, Cursor (shell) and Copilot, and a fail-closed deny on Codex
      and Kiro whose reason says human approval is required.
- [ ] SC5 — Claude Code's `.claude/settings.json` carries `permissions.deny` and
      `permissions.ask` generated from the policy, including a `.env.example`
      carve-out.
- [ ] SC6 — This repo's `.claude/settings.json` and `.sdd/permissions/*` are
      byte-identical to what `harny init` renders for it.
- [ ] SC7 — A missing policy file allows with a one-line notice; an unparseable one
      denies. Neither crashes the agent's tool call with an unhandled error.
- [ ] SC8 — README documents the baseline, its per-tool coverage, its limits, and the
      manual server-side branch-protection step.

## Non-Goals

- **Git `pre-commit`/`pre-push` hooks and `gitleaks`.** That is `commit-checks`
  (plan.md #5), the tool-neutral git-level backstop.
- **Server-side branch protection.** It is the only non-bypassable layer, but harny
  cannot enforce it locally. It is documented as a manual step (SC8), not automated.
- **Codex `sandbox_mode`/`approval_policy` in `.codex/config.toml`.** Codex's defaults
  for a trusted project (`workspace-write`, `on-request`) already match this baseline.
  Writing them would add no protection, would override a user's own choice, and would
  need a TOML top-level-key merge `src/mcp.ts` does not have. Recorded, not built.
- **Cursor CLI `.cursor/cli.json` permissions and Kiro agent `toolsSettings`.** Their
  first-party docs were unreachable from the authoring environment (egress-blocked), so
  per the "wire only what is documented" rule (ADR 0044) they are not written.
- **Tightening `.claude/settings.local.json`.** That file is user-local and gitignored;
  it is not in any checkout harny can see. Recorded as a manual follow-up for the
  human.
- **Doctor checks for the baseline.** That is `doctor-security-checks` (plan.md #7).
- **Denying writes to secret files.** The plan names reads; writes are out of scope.
- **A security boundary against a determined agent.** Command-string inspection is
  best-effort by nature (Claude Code's own docs say the same of its Bash rules): an
  interpreter that opens a file itself is not caught. The guard raises the floor; the
  sandbox, `commit-checks` and server-side protection are the walls.

## Constraints

- `harny-sync` lookup returned `feedback-controls` (FC-1–FC-28, I1–I7),
  `tool-generators` (TG-1–TG-12) and `cli-init` as current truth. This feature
  **amends, and does not contradict**:
  - TG-1 is unchanged: no new `Generator` member. plan.md suggested "a new declarative
    `Generator` member"; this feature instead extends `renderHook`, because the guard
    registration lives in the hook file each generator already writes, and hook files
    vary structurally per tool — exactly ADR 0014's reason for `renderHook` being a
    method. This divergence from plan.md is deliberate and recorded as an ADR candidate.
  - FC-5/FC-27 gain a pre-tool registration per tool; no existing registration changes.
  - FC-13 extends to `.sdd/permissions/*` and the new settings keys.
- `AGENTS.md` S1–S7. In particular: S3 (deterministic, byte-identical output; the
  guard's `git` shell-out is runtime behavior, never generation), S4 (no new
  dependency), S5 (every path and policy literal owned by one module), S7 (the canonical
  README and policy are tool-neutral).
- The guard runner is copied byte-for-byte into every install, like `run-feedback.mjs`
  (I5), and imports nothing outside Node builtins.
- `dogfood-quick-fixes`'s role rule stays: sub-agent roles still never commit or push.
  This feature adds a *harness* guard; it does not grant roles new permissions.

## Prior Art

- `templates/hooks/run-feedback.mjs` + per-generator inline `node -e` wrappers
  (`agent-feedback-controls`): one tool-neutral runner, per-tool output translation.
  The guard follows it exactly.
- `subagent-feedback-hooks` (ADR 0044): wire only first-party-documented events;
  record the rest as probes.
- Claude Code permission rule semantics (`code.claude.com/docs/en/permissions`,
  verified 2026-09-24): whole-subcommand wildcard matching, deny → ask → allow order,
  gitignore path syntax, `!` carve-outs. The guard reuses this pattern language so one
  pattern list serves both the guard and Claude Code's static rules.
