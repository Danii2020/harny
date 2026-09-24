# Intent: Component-Level Docs

> **Gate waiver (recorded, not implied).** The requester waived all three human gates
> for this run on 2026-09-24 ("same instructions as before": full auto approval on
> best practices, dogfood plus all five harness deliverables, a PR once the audit
> approves). The pull request is the first human checkpoint.

## Problem Statement

harny gives an agent one root guidance file. In a monorepo, or in a single package with
distinct domains, the conventions that matter differ per directory: the backend's test
command, the frontend's component rules, what a generators directory must never
import. Root guidance either grows until it is ignored, or it omits them.

All five tools can scope guidance to a directory, but not the same way (verified
2026-09-24):

| Tool | Reads a nested `AGENTS.md`? | Source |
|---|---|---|
| Codex CLI | Yes, as a directory chain | first-party AGENTS.md docs (plan.md, 2026-09-22) |
| Cursor | Yes, applied to its subtree | cursor.com/docs/rules |
| GitHub Copilot | Yes, root to leaf, deeper wins | GitHub changelog 2025-08-28; Copilot CLI docs |
| Claude Code | **Only when no `CLAUDE.md` exists at or above the working directory.** A subdirectory `CLAUDE.md` loads on demand, and `@AGENTS.md` in it imports the sibling file | code.claude.com/docs/en/memory § AGENTS.md, § Share one file |
| Kiro | **Root only**; directory scoping is a steering file with `inclusion: fileMatch`, and `#[[file:…]]` includes a file by workspace-relative path | kiro.dev/docs/steering (via search; site egress-blocked) |

So a nested `AGENTS.md` alone reaches three tools. It silently does nothing on Claude
Code in any repository with a root `CLAUDE.md`, which is every harny install that
selects Claude Code, and it does nothing on Kiro.

## Goals

1. **G1 — Find the components.** A deterministic heuristic finds a repository's
   components: directories holding a package manifest, declared monorepo components,
   and domain directories under a top-level source root. There is one implementation,
   shared by `harny init` and `harny doctor`.
2. **G2 — Doctor names what is missing.** For each component, a recommended-tier check
   says whether `<dir>/AGENTS.md` exists. For each selected tool that needs a bridge,
   another says whether the bridge exists. Each remediation is exact: the file to write
   and what it must contain.
3. **G3 — Every tool loads the one file.** `<dir>/AGENTS.md` is the single source. Tools
   that do not read it natively get a generated bridge that includes it: Claude Code
   `<dir>/CLAUDE.md` (`@AGENTS.md`), Kiro `.kiro/steering/component-<slug>.md`
   (`fileMatch` plus `#[[file:<dir>/AGENTS.md]]`). Cursor, Copilot and Codex need none.
4. **G4 — `harny init` wires what already exists.** For every discovered component that
   already has an `AGENTS.md`, `init` writes the missing bridges. It never overwrites an
   existing file there, and warns when an existing `CLAUDE.md` lacks the import.
5. **G5 — The documentation role writes the content.** `harny-document` gains a
   component-docs step: write `AGENTS.md` for the components a feature touched
   (post-audit) or that the caller names (bootstrap), from repository evidence, then
   apply the doctor's bridge remediations.
6. **G6 — harny dogfoods it.** This repository's own component (`src/generators`) gets
   an `AGENTS.md` and its Claude Code bridge.

## Success Criteria

- [ ] SC1 — Discovery returns manifest directories (depth ≤ 3, never the root),
      declared components, and `src|lib|app/<child>` directories with ≥ 3 files, sorted
      and deduplicated, skipping dependency, build and hidden directories.
- [ ] SC2 — `harny doctor` warns (never fails) per component missing `AGENTS.md` and per
      missing bridge, with exact remediation.
- [ ] SC3 — `harny init` writes Claude Code and Kiro bridges for components that have an
      `AGENTS.md`, writes none for Cursor, Copilot or Codex, and never overwrites.
- [ ] SC4 — A generated Claude Code bridge makes the component `AGENTS.md` load (import
      syntax per Claude Code docs); a Kiro bridge has valid steering frontmatter.
- [ ] SC5 — `harny-document` (both skill roots) describes the component-docs step
      tool-neutrally.
- [ ] SC6 — This repository has `src/generators/AGENTS.md` and `src/generators/CLAUDE.md`,
      and its doctor reports them OK.

## Non-Goals

- **Generating `AGENTS.md` content deterministically.** Content is the documentation
  role's judgment from evidence; code only finds components and wires bridges.
- **Rules layers** (`.claude/rules`, `.cursor/rules`, and so on). That is `rules-layer`
  (plan #6).
- **Must-have tier.** Missing component docs warn only.
- **Deleting stale bridges** for removed components.

## Constraints

- Current truth: `tool-generators` TG-1 gains a seventh declarative member,
  `componentBridge`, in the `guidancePath`/`mcpConfig` lineage (ADR 0011/0025/0027).
  `readiness-checks` repo-readiness family gains dynamic entries. Nothing contradicts
  shipped behavior; old `checks.json` files and runners are unaffected.
- The runtime discovery module is shipped at `.sdd/shared/components.mjs` and imported
  by the doctor runner **dynamically**, so an install that predates it still runs.
- S1–S7; S4 no dependency; S7 the skill text is tool-neutral first.
