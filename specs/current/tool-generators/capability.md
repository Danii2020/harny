# Capability: tool-generators

> Last synced: 2026-09-08. Owned artifacts: `src/generators/types.ts`,
> `src/generators/markdown-yaml.ts`, `src/generators/toml.ts`,
> `src/generators/{claude-code,cursor,kiro,github-copilot,codex}.ts`,
> `src/generators/index.ts`.

## Purpose

The `Generator` adapter interface and the five per-tool implementations that
translate the canonical `templates/` content and a resolved `HarnessConfig`
into each target coding-agent tool's own file format, verified against each
vendor's first-party documentation.

## Current behavior

| ID | Statement | Provenance |
|---|---|---|
| TG-1 | Every generator implements one `Generator` interface (`id`, `displayName`, `agentsDir`, `wrapperFormat`, `conductorPath`, `roleFileName`, `mapModel`, `mapCapabilities`, `renderRole`, `renderConductor`), deliberately sufficient for all five targets without amendment: `.claude/agents/<role>.md`, `.cursor/agents/<role>.md`, `.kiro/agents/<role>.md`, `.github/agents/<role>.agent.md` (all `markdown-yaml`), and `.codex/agents/<role>.toml` (`toml`) | cli-skeleton · contract.md § "Public API — src/generators/types.ts"; cursor-kiro-copilot-generators · contract.md § "Interface sufficiency finding" |
| TG-2 | `availableToolIds()` is exactly `['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']`; every one of the five resolves to a real `Generator`, none to `undefined` | codex-generator · contract.md Behavior Guarantee 1 |
| TG-3 | For every role and the conductor, the canonical body sliced from the **raw** template file (read directly with `fs.readFile`, never through the parser) appears byte-for-byte as a contiguous substring of every generator's output — verified non-self-referentially so a parser bug that silently drops content cannot pass by comparing against its own extraction | cli-skeleton · contract.md Behavior Guarantee 23; cursor-kiro-copilot-generators · contract.md Behavior Guarantee 12; codex-generator · contract.md Behavior Guarantee 4 |
| TG-4 | The only per-tool differences in rendered output are target path, file name, frontmatter/TOML wrapper, mapped model id, and mapped capability tokens — no generator rewrites, truncates, reflows, or re-headings canonical prose | cli-skeleton · contract.md Behavior Guarantee 2 |
| TG-5 | No generator file contains a hand-written `---` frontmatter literal, a TOML triple-quote literal, or its own serializer — all frontmatter/quoting/TOML-encoding comes from the two shared modules `src/generators/markdown-yaml.ts` and `src/generators/toml.ts` | cursor-kiro-copilot-generators · contract.md Behavior Guarantee 3; codex-generator · contract.md Behavior Guarantee 5 |
| TG-6 | Per-tool verified facts, each with a first-party source dated 2026-08-12 (Cursor/Kiro/Copilot) or 2026-08-30 (Codex): Cursor role files at `.cursor/agents/<role>.md` (frontmatter `name`, `description`, `model`, `readonly`, `is_background`; conductor via `.cursor/skills/`); Kiro at `.kiro/agents/<role>.md` (adds a `tools` category-tag field; conductor via `.kiro/skills/`, `description` ≤1024 chars); GitHub Copilot at `.github/agents/<role>.agent.md` (only `description` required; body capped at 30,000 chars; conductor via `.github/skills/`); Codex at `.codex/agents/<role>.toml` (`name`, `description`, `developer_instructions` required; role prose lives *inside* a TOML string, not a document body; conductor at `.agents/skills/sdd-conductor/SKILL.md` — **not** `.codex/skills/`, which does not exist) | cursor-kiro-copilot-generators · contract.md § "Verified per-tool facts"; codex-generator · contract.md § "Verified Codex facts" |
| TG-7 | Vendor limits are enforced loudly: a Kiro/Copilot skill `description` over 1,024 characters, a Copilot role body over 30,000 characters, or unrepresentable TOML content (`'''`, a bare carriage return, a control character) throws `HarnessError('TEMPLATE')` naming the artifact and the limit, before any write | cursor-kiro-copilot-generators · contract.md Behavior Guarantee 10; codex-generator · contract.md Behavior Guarantee 11 |
| TG-8 | Codex subagents have no tool/permission-allowlist field at all — they inherit the parent session's permission mode — so `codex.ts` emits `sandbox_mode: "read-only"` only when a role's capabilities contain no `write-files`, and never emits `"workspace-write"` (never widens permissions) | codex-generator · contract.md Behavior Guarantee 7; § "Verified Codex facts" |
| TG-9 | `.agents/skills/` is Codex's own repo-scope skill discovery root (walked from cwd up to the repo root), and is explicitly documented in shipped code as "not namespaced to one tool" — the same directory this repo's `harny-*` skill library (see `skill-library` capability) also uses as its canonical, tool-neutral home | codex-generator · contract.md § "Verified Codex facts" "Skills (conductor artifact)"; `src/generators/codex.ts:148–149` |
| TG-10 | With all five tools selected, one `init` run emits 5 × (5 role artifacts + 1 conductor artifact) = 30 tool artifacts, plus exactly one copy each of the five spec-schema files and `.sdd/harness.json` | codex-generator · contract.md Behavior Guarantee 14 |
| TG-11 | The Cursor generator's `cheapest` tier maps to `gpt-5.4-mini` in Cursor's own model catalogue — a different vendor surface than Codex, where that same id retired on 2026-08-31; this is not a defect in scope for any shipped feature, only a forward-looking re-verification note | codex-generator · audit.md CG-11 |

## Invariants

1. `src/generators/types.ts`, `markdown-yaml.ts` and `toml.ts` stay the single source of shared rendering logic; a sixth generator must not hand-roll its own frontmatter or TOML serialization.
2. A generator never mutates `templates/`; canonical content reaches output only by being read from `templates/` at runtime.
3. Adding a generator must not change any existing generator's file — `claude-code.ts`, `cursor.ts`, `kiro.ts`, `github-copilot.ts` stayed byte-identical across the addition of `codex.ts`.

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| AL-30 | Per-tool facts (paths, frontmatter keys, model ids) for Cursor, Kiro, and GitHub Copilot were verified once against vendor docs (2026-08-12) but never re-verified by loading generated artifacts into a live install of any of the three tools; a generator writing to a directory a tool never reads fails silently with exit code 0 | MEDIUM (open, human-gated) | cursor-kiro-copilot-generators · audit.md AL-30 |
| CG-1 / O4 | The Codex facts were independently re-fetched and re-confirmed against first-party URLs on 2026-09-02 (CG-1), but — like AL-30 for the other three tools — the generated Codex artifact set has never been loaded into a running Codex CLI install to confirm it actually discovers the five agents and the `sdd-conductor` skill (O4/CG-12) | MEDIUM (open, human-gated) | codex-generator · audit.md CG-1, O4, CG-12 |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| cli-skeleton | 2026-07-30 | The `Generator` interface and the first implementation, `claude-code.ts` |
| cursor-kiro-copilot-generators | 2026-08-30 | `cursor.ts`, `kiro.ts`, `github-copilot.ts`, and the shared `markdown-yaml.ts` |
| codex-generator | 2026-09-02 | `codex.ts` and the shared `toml.ts`, closing out all five targets |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| (none — these three features predate the ADR log; no backfill per `harny-adr`'s no-backfill rule) | | |
