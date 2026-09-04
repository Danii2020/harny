# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- `npx harny init` — a CLI for scaffolding the SDD pipeline into any target
  repository. Supports interactive mode (five questions: tool selection, enabled
  roles, per-role model tier, active gates, project stack) and non-interactive
  modes (`--yes` for defaults, `--config` for a saved configuration file,
  `--dry-run` to preview). Supports per-flag overrides: `--tools`, `--roles`,
  `--model`, `--gates`, `--stack`. Exit codes map to error types; writes nothing
  when any path already exists unless `--force` is given. Includes `npm run build`
  (TypeScript to `dist/`), `npm run typecheck`, and `npm test` (vitest).
- Reference generator for Claude Code, proving the `Generator` adapter interface:
  reads abstract role templates (with cost-tier and capabilities), maps tiers to
  Claude model ids (most-capable→opus, mid→sonnet, cheapest→haiku), renders
  Markdown+YAML agent frontmatter, and generates the conductor Skill.
- Three more per-tool generators — Cursor, Kiro, and GitHub Copilot — proving the
  same `Generator` interface holds across tools with materially different agent
  formats, frontmatter keys, and capability models. Each generator's paths, file
  extensions, frontmatter fields, and model identifiers are verified against
  current vendor documentation, with sources and verification date recorded in
  `specs/cursor-kiro-copilot-generators/contract.md`. `--tools` now accepts
  `claude-code`, `cursor`, `kiro`, and `github-copilot` as shipped, selectable
  tools, plus `all`.
- The fifth per-tool generator — **Codex CLI** — completing the initial target set.
  Codex generates `.codex/agents/sdd-*.toml` files (TOML format, distinct from the
  Markdown+YAML format of the other four tools) and a shared Markdown conductor
  artifact at `.agents/skills/sdd-conductor/SKILL.md`. A new `src/generators/toml.ts`
  wrapper module owns all TOML syntax emission (exact analogue of `markdown-yaml.ts`
  for the other four), ensuring that `src/generators/codex.ts` contains no TOML syntax
  literals itself. All five Codex paths, keys, model ids, and sandbox-mode semantics
  are verified against first-party Codex documentation (sources and verification date
  in `specs/codex-generator/contract.md`). With Codex, `--tools` now accepts all five
  tools, and `availableToolIds()` returns all five.
- Spec-schema pointer block appended to every generated role artifact, across all
  four shipped generators (including a retrofit onto Claude Code's own output),
  making the deployed `.sdd/spec-schema/` directory reachable from inside a
  generated agent file. Closes audit finding AL-5.
- Shared rendering helpers `yamlFlowSequence` and `renderSpecSchemaPointerBlock`
  in `src/generators/markdown-yaml.ts`, keeping YAML formatting and spec-schema
  block placement consistent across all Markdown+YAML target tools.
- Spec-schema deployment: the five spec-schema templates from `templates/` are
  written to `.sdd/spec-schema/` in the target repo, so the architect role's
  internal schema references resolve after generation.
- Configuration persistence: the resolved `HarnessConfig` is written to
  `.sdd/harness.json` for later use (e.g., by a future `harness mcp add` command).
- Two open reservations (non-blocking) recorded in the audit: AL-19 (a stale test
  field name in the test suite) and AL-20 (the e2e test suite validates the built
  `dist/` rather than `src/` directly, so a `src/`-only regression escapes until
  someone remembers to rebuild).
- Canonical, tool-agnostic role templates under `templates/roles/` for the full
  five-role SDD pipeline (`sdd-architect`, `sdd-test-writer`, `sdd-executor`,
  `sdd-auditor`, `sdd-documentation`), reconciled from the two prior Claude-Code-only
  copies with no `tools:` list, model id, or Claude-only path baked in as the source
  of truth — each role instead declares an abstract `cost_tier` and `capabilities`
  set.
- `templates/conductor/sdd-conductor.md` — canonical orchestration content
  describing the five-role pipeline and the three human review gates
  (post-specs, post-red-tests, post-audit), with the documentation hand-off wired
  in as a non-gated automatic step.
- `templates/spec-schema/` — the `intent`/`contract`/`roadmap`/`tasks`/`audit`
  spec templates extracted as standalone files, matching what the architect role
  emits.
- The live `sdd-documentation` agent (`.claude/agents/sdd-documentation.md`) —
  the fifth pipeline role, running automatically after a human approves the
  auditor's `APPROVED` or `APPROVED WITH RESERVATIONS` verdict. It documents only
  what the audit verified and never touches source code or code comments.
- This project's own root documentation: `README.md`, `CHANGELOG.md`, `AGENTS.md`,
  and `CLAUDE.md`.

### Changed

- Generated role artifacts for all four shipped tools now include the
  spec-schema pointer block described above; this applies retroactively to
  Claude Code's output as well, as part of the AL-5 closure.
