# src/generators — per-tool generators

Component guidance for this directory. The root [`AGENTS.md`](../../AGENTS.md) still
applies, especially § Coding standards (S1–S7); this file adds only what is specific here.

## Purpose

One module per coding tool harny scaffolds: `claude-code.ts`, `cursor.ts`, `kiro.ts`,
`github-copilot.ts`, `codex.ts`. Each exports one object implementing `Generator`
(`types.ts`), which turns tool-neutral payloads from `src/engine.ts` into that tool's
own files. `index.ts` registers them.

## Key files

- `types.ts` — the `Generator` interface. Declarative members (`skillsDir`,
  `hooksPath`, `guidancePath`, `mcpConfig`, `nestedGuidance`) are fixed per-tool facts;
  methods (`renderRole`, `renderConductor`, `renderHook`) render content.
- `markdown-yaml.ts`, `toml.ts`, `json.ts` — the only serializers. A generator never
  hand-rolls frontmatter, TOML or JSON (TG-5).
- `guard.ts` — the shared shape of every tool's permissions-guard hook command; each
  generator supplies only its three output snippets.

## Conventions

- Every per-tool fact (a path, an event name, an output field) carries a dated,
  first-party citation in a comment next to it. An unverified fact is recorded as a
  reservation in the feature's spec, never presented as verified.
- A generator never learns what a monorepo component is: `--commands` payloads arrive
  precomputed in `HookPayload` (MC-15).
- New members are required-but-possibly-`undefined`, so a sixth generator cannot skip
  the question.
- Adding a registration to a hook file must leave every existing registration
  byte-identical; the tests assert it per tool.

## Commands

- `npx vitest run tests/generators` — the generator suites, including subprocess tests
  that run each generated hook command against the real runners.
- `npm run typecheck` — required after any change to `types.ts`.
