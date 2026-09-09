# `specs/archived/` — the path-redirect rule

Archived artifacts are never edited, so their internal `specs/<feature>/…` citations
(roughly 48, inside the archived files themselves), and the roughly 44 more in
`tests/**`, `src/vocabulary.ts`, `src/templates.ts` and `CHANGELOG.md`, remain literal.
This file states the single resolution rule once, rather than rewriting any of them:

> A path of the form `specs/<feature>/<file>` appearing in any archived artifact, source
> comment, test header or changelog entry resolves to `specs/archived/<feature>/<file>`
> for the four features archived on 2026-09-08 (`canonical-role-templates`,
> `cli-skeleton`, `cursor-kiro-copilot-generators`, `codex-generator`) and for any
> feature archived by `harny-sync` afterwards. Archived artifacts are historical
> records and are not rewritten.
