# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

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
