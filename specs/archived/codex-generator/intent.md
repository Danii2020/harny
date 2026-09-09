# Intent: codex-generator

**Shipped: 2026-09-02**

## Problem Statement

`specs/cli-skeleton/` (Shipped 2026-07-30) built the whole delivery machine and shipped
one generator. `specs/cursor-kiro-copilot-generators/` (Shipped 2026-08-30) added three
more. All four are Markdown + YAML frontmatter and share
`src/generators/markdown-yaml.ts`. **Codex CLI is the fifth and last target, and it is
the only one that is not a Markdown file at all.**

The consequences today are concrete:

1. **One of the five advertised tools still cannot be scaffolded.**
   `availableToolIds()` returns `['claude-code', 'cursor', 'kiro', 'github-copilot']`.
   `npx harny init --tools codex` exits 4 (`NO_GENERATOR`) having written nothing; an
   interactive run offers `codex` with the hint `generator not shipped yet`
   (`src/prompts.ts:62`); `README.md:126` lists it under "Tools in progress (planned,
   not yet implemented)". `plan.md` §4 promises a CLI that writes the pipeline "into any
   project, for any of the 5 tools", and §6's minute 45–52 workshop block is
   *specifically* the portability demo across all five. One fifth of that demo is
   currently a warning message.

2. **The shared wrapper layer has never been exercised by a non-Markdown target.**
   `src/generators/markdown-yaml.ts` is genuinely shared by four adapters, but every one
   of them emits `---` frontmatter, a `#`-comment run, an HTML-comment provenance line,
   and an HTML-comment-delimited generated block. Codex has none of those affordances:
   its agent definition is a TOML table, its comments are `#` lines, and — critically —
   **the role body is not a document body at all, it is the value of a
   `developer_instructions` string key**. Every rendering assumption baked into the
   shared helpers gets its first real test here, and the seam between "wrapper" and
   "canonical content" gets its first real proof.

3. **`plan.md`'s Codex row (§3) is a planning artifact with two openly unconfirmed cells
   and, as of today, at least one cell that is stale to the day.** It flags "confirm
   whether project scope exists" twice, and offers "GPT-5.4-mini for fast subagents" as
   the model example. Building the generator from that table without re-verification
   would risk the exact silent failure mode this repo already named: a generator writing
   to a directory the tool never reads produces files, exit code 0, and nothing working.

4. **`specs/cursor-kiro-copilot-generators/audit.md` carries AL-30 as an open,
   human-gated MEDIUM finding across two audit passes** — the contract's per-tool facts
   were verified against a documentation review that neither audit pass could re-run,
   because no Context7 / WebFetch / WebSearch tooling was available in either
   environment. That reservation must not be silently repeated here. This spec therefore
   records, explicitly and in the contract, *which* verification channel was available,
   *when* it was used, and *what* remains unverifiable in-session.

   **Recorded up front:** live docs-lookup **was** available while writing this spec and
   **was** used (Context7 `/openai/codex` plus OpenAI's own `learn.chatgpt.com` /
   `developers.openai.com` documentation, 2026-08-30). Both of `plan.md`'s open Codex
   questions are now answered from primary sources, and one *additional* discrepancy was
   found that `plan.md` did not flag at all. What still cannot be done in-session is the
   other half of AL-30: loading the generated artifacts into a **live Codex CLI install**
   and confirming it lists the five agents. That half remains open and is carried as an
   explicit, human-gated task rather than presented as done.

5. **Shipping Codex makes an existing error path structurally unreachable, and three
   test files currently depend on it being reachable.** `codex` is the stand-in every
   suite uses for "a tool with no generator": `tests/init.test.ts:153,174`,
   `tests/cli.test.ts:140`, `tests/prompts.test.ts:76`. Once the registry has all five
   `TOOL_IDS`, `HarnessError('NO_GENERATOR')` (exit 4) and the "Skipped `<tool>`:
   generator not shipped yet" warning can no longer be triggered by any legal
   `--tools` value. Retiring those tests, or weakening them to `toContain`, would quietly
   delete coverage of two documented `cli-skeleton` guarantees. They must be re-pointed
   at a synthetic empty/partial registry, not deleted.

Who is affected: the DevFest Quito workshop audience (the portability block is a third
of the runtime and this is the block's punchline — the one tool whose format is
genuinely different); teams standardized on Codex CLI; and the maintainer, who inherits
a five-adapter surface whose shared layer is either proven portable or proven
Markdown-shaped by this feature and nothing later.

## Goals

1. **G1 — Ship the Codex CLI generator.** `src/generators/codex.ts` exporting
   `codexGenerator: Generator`, emitting one `.toml` agent-definition file per enabled
   role under the project-level agents directory verified in `contract.md`.
2. **G2 — Add the TOML wrapper layer as a shared module, not inline.**
   `src/generators/toml.ts`, a sibling of `markdown-yaml.ts`, owning every TOML literal:
   string quoting/escaping, multi-line string emission, comment rendering, and the
   TOML-native forms of the provenance line, the project-configuration block and the
   spec-schema pointer block. No `"""`, `'''`, `=` or `#` serialization logic appears in
   `codex.ts` itself, exactly as no `---` appears in the four Markdown generators.
3. **G3 — Verify every Codex fact against live vendor documentation, and record it.**
   Each pinned path, extension, field name, model id and limit in `contract.md` carries
   a source URL (or Context7 library id) and the verification date. `plan.md` is not an
   accepted source for any of them. Every place verification contradicts `plan.md` is
   stated in a discrepancy table, never silently followed and never silently overridden.
4. **G4 — Preserve canonical fidelity through a non-Markdown wrapper.** The canonical
   role/conductor body must survive into the generated `.toml` file **byte-for-byte and
   still contiguous**, so `cli-skeleton` Behavior Guarantee 23 and the existing
   `tests/canonical-fidelity.test.ts` oracle extend to the fifth generator unchanged —
   without adding a TOML parser to the test suite to decode it back.
5. **G5 — Emit a conductor artifact for Codex, in a mechanism that can actually pause
   for a human.** The conductor must run in the main conversation and stop at the three
   gates; a spawned subagent structurally cannot. The chosen mechanism, its verified
   on-disk location, and the caveats of that location are pinned in `contract.md` and
   disclosed inside the generated artifact.
6. **G6 — Nothing silently dropped, in a format with no capability field.** Codex agent
   TOML has no tool-allowlist key. Every capability of every enabled role must therefore
   reach the generated artifact as a note, including the auditor's free-text
   `write-files (audit.md only)` scope and any unknown token — the AL-7 renderer-side
   obligation, honored for the fifth and final tool.
7. **G7 — Test whether `src/generators/types.ts` is sufficient for a TOML target, and
   say so either way.** The interface was designed for five targets and has been proven
   against four Markdown ones. If `wrapperFormat: 'toml'` needs no amendment, that is
   recorded as a finding with the reasoning; if it does, the amendment is proposed
   explicitly rather than worked around inside `codex.ts`.
8. **G8 — Retire the "not shipped yet" stub cleanly and completely.** Registry entry,
   `availableToolIds()`, the interactive hint, `README.md`, and the three test files that
   use `codex` as their unimplemented-tool stand-in. The `NO_GENERATOR` code path and its
   coverage are **kept**, re-pointed at a synthetic registry rather than a real tool id.
9. **G9 — Reach five-of-five coverage without regressing any of the four shipped
   adapters.** `templates/**`, `src/generators/types.ts`, `markdown-yaml.ts`,
   `claude-code.ts`, `cursor.ts`, `kiro.ts`, `github-copilot.ts`, and every module
   outside `src/generators/` stay byte-identical, and no new runtime dependency is added.
10. **G10 — Do not repeat AL-30 silently.** State in `contract.md` exactly which
    verification channel was used and when; carry the un-performable live-install check
    as an explicit open task in `tasks.md` and an explicit reservation in `audit.md`,
    with the specific claims a human should check first.

## Success Criteria

- [ ] **SC1 (G1, G8)** `getGenerator('codex')` returns a `Generator`, and
      `availableToolIds()` is exactly
      `['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']` in `TOOL_IDS` order.
- [ ] **SC2 (G1)** `npx harny init --tools codex --yes` into an empty directory exits 0
      and writes 5 role `.toml` files + 1 conductor artifact + the 6 shared files, with
      no warning about a skipped tool.
- [ ] **SC3 (G1, G2)** Every generated `.toml` file parses as valid TOML, and its
      decoded `name`, `description` and instruction-body values equal the canonical
      values. (Verified in tests without adding a runtime dependency — see `contract.md`.)
- [ ] **SC4 (G4)** For all five roles and the conductor, the canonical body sliced from
      the **raw** template file (`fs.readFile`, never via
      `parseRoleTemplate`/`parseConductorTemplate`) appears byte-for-byte as a contiguous
      substring of the generated Codex artifact — the same oracle
      `tests/canonical-fidelity.test.ts` already applies to the other four.
- [ ] **SC5 (G3)** Every row of `contract.md` § "Verified Codex facts" carries a source
      and the date `2026-08-30`, and § "Discrepancies from `plan.md`" resolves both cells
      `plan.md` marked "to confirm" plus every additional divergence found.
- [ ] **SC6 (G6)** The generated `sdd-auditor` Codex artifact contains the string
      `audit.md only`, and a synthetic role carrying an unknown capability token renders
      `unmapped capability: <name>`.
- [ ] **SC7 (G5)** A Codex conductor artifact is emitted unconditionally at the path
      pinned in `contract.md`, carries only `id`/`purpose`-derived metadata, and contains
      the `harny:begin`/`harny:end` project-configuration block.
- [ ] **SC8 (G2)** `src/generators/codex.ts` contains no TOML syntax literal: no `"""`,
      no `'''`, no hand-written `key = value` line, no `#` comment serializer. A source
      scan asserts this, mirroring the existing "no `---` in a generator" guarantee.
- [ ] **SC9 (G8)** `NO_GENERATOR` (exit 4) and the "generator not shipped yet" skip
      warning both still have passing tests, driven by a synthetic registry rather than
      by `--tools codex`.
- [ ] **SC10 (G9)** `npm run typecheck` and `npm test` pass; `git diff --stat` shows no
      change to `templates/`, `src/generators/types.ts`, `markdown-yaml.ts`, or the four
      shipped generator files; `package.json` `dependencies`/`devDependencies` are
      byte-identical.
- [ ] **SC11 (G7)** `contract.md` contains an explicit "Interface sufficiency finding"
      section reaching a stated verdict for the TOML target.
- [ ] **SC12 (G10)** `audit.md` records the live-install verification as an explicit,
      named reservation with a reproducible procedure — not as an unremarked gap, and not
      as done.

## Non-Goals

- **A general-purpose TOML serializer or a TOML dependency.** `src/generators/toml.ts`
  emits exactly the shapes this contract needs (top-level string keys, multi-line string
  values, comments). It is not a library, it does not handle arrays of tables, dates,
  or nested tables, and no TOML package enters `dependencies` or `devDependencies`.
- **Writing `.codex/config.toml`.** MCP provisioning remains the standing non-goal
  established by `plan.md` §4 "future scope" and honored by all four shipped generators.
  Codex is the one tool whose MCP configuration *is* TOML, which makes it tempting to
  fold in here; it stays out, and `roadmap.md` records it as the natural follow-up.
- **`[agents]` table entries in `config.toml`.** Codex supports registering agent roles
  via a `config.toml` `[agents]` table with a `config_file` pointer. harny writes
  standalone agent files only; it does not edit a user's `config.toml`.
- **User-level (`~/.codex/…`) installation.** harny scaffolds into a target *repository*,
  as it does for all four shipped tools. The user-level scope is recorded in
  `contract.md` as a verified fact and deliberately not written to.
- **`model_reasoning_effort`, `approval_policy`, `[permissions]` profiles.** Real Codex
  keys with no counterpart in the canonical `cost_tier` / `capabilities` vocabulary.
  Emitting them would invent configuration the canonical layer never expressed. Their
  omission is recorded in `contract.md` as a decision, not an oversight.
- **Refactoring the four shipped Markdown generators.** If a helper looks shareable
  between `markdown-yaml.ts` and `toml.ts`, it is *not* hoisted in this feature.
  `markdown-yaml.ts` stays byte-identical (G9).
- **Amending `src/generators/types.ts`.** Not forbidden, but out of scope unless G7's
  analysis proves it necessary; in that case the amendment is proposed in `contract.md`
  and gated on human approval before implementation, not made unilaterally.
- **Live-install verification inside this session.** Cannot be performed here (no Codex
  CLI install, no way to observe its agent picker). Carried as an explicit human-gated
  task, per G10.
- **Retiring `plan.md`.** It stays as the historical planning record. This spec corrects
  it in a discrepancy table; it does not edit it.
- **Documentation updates.** `README.md`, `CHANGELOG.md` and `AGENTS.md` all currently
  say Codex is unshipped. Updating them is `sdd-documentation`'s automatic post-audit
  step, listed in `roadmap.md` as such, not this feature's implementation work.

## Constraints

**Technical**

- **TOML, not Markdown.** Verified: Codex custom agents are `.toml` files whose role
  content is the value of a `developer_instructions` string key, not a document body.
  This is the first target where the canonical body must be *embedded in a string* rather
  than concatenated after a header — the single hardest constraint in this feature,
  because G4 requires it to stay byte-for-byte contiguous anyway.
- **The interface is fixed.** `Generator` already declares `wrapperFormat: 'toml'` and
  `roleFileName` already accommodates `<role>.toml`; `renderRole`/`renderConductor`
  already return an opaque `GeneratedFile`. The adapter must fit that shape (G7).
- **`SPEC_SCHEMA_DIR` must come from `src/engine.ts`**, not be re-literalled in
  `codex.ts` — the rule `cursor-kiro-copilot-generators` guarantee 8 established.
- **Determinism and containment** (`cli-skeleton` guarantees 13, 19): identical inputs
  produce byte-identical output; every path is relative and inside the target directory;
  every artifact ends in exactly one `\n`.
- **Node ≥ 20.19.0, TypeScript 7.0.2, ESM with `.js` import specifiers,** `vitest`
  4.1.10 — the existing toolchain, unchanged.
- **Vendor limits must fail loudly, never silently**, following the precedent set by the
  Kiro/Copilot size guards: if canonical content grows into something the target format
  cannot represent, the generator throws `HarnessError('TEMPLATE')` naming the artifact
  and the reason.

**Compatibility**

- `specs/cli-skeleton/contract.md` guarantees 1–23 and `specs/cursor-kiro-copilot-generators/contract.md`
  guarantees 1–14 remain in force and must now hold across **five** generators. This
  spec is additive except where a subsection is explicitly headed **SUPERSEDES**.
- `TOOL_IDS` order is `['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']`
  (`src/vocabulary.ts:7`) and is not changed; the registry keeps that order, so
  `availableToolIds()` stays deterministic.
- The existing five-target interface-sufficiency evidence table in
  `tests/generators/registry.test.ts` already encodes `codex` → `.codex/agents`,
  `wrapperFormat: 'toml'`, `.codex/agents/sdd-architect.toml`. The real generator must
  either match it or the test must be updated deliberately and the divergence explained.
- Cursor loads `.codex/agents/` as a compatibility location (discrepancy D7 of
  `specs/cursor-kiro-copilot-generators/contract.md`, already disclosed in the generated
  Cursor conductor). Selecting `--tools cursor,codex` therefore has a real, documented
  interaction that this feature must acknowledge rather than discover later — and it now
  runs in the *other* direction too, since a Codex-format file lands where Cursor looks.

**Business**

- The DevFest Quito workshop's portability block needs all five tools demonstrable; this
  is the last one.
- The spec must be written so an executor with no Codex CLI install can implement it, and
  an auditor with no Codex CLI install can verify everything except the live-install
  check — which is why that check is isolated as a single named task.

## Prior Art

**In this codebase**

- `specs/cursor-kiro-copilot-generators/` — the closest analog and the direct
  precedent for the docs-verification discipline (`contract.md` § "Verified per-tool
  facts" with per-row sources and a verification date; § "Discrepancies from `plan.md`";
  the "Interface sufficiency finding" section). Scope differs: that spec shipped three
  parallel adapters over one shared wrapper; this ships **one** adapter over a **new**
  wrapper, so its three-way symmetry structure is deliberately not carried over.
- `specs/cli-skeleton/` — origin of the `Generator` interface, `markdown-yaml.ts`,
  `writer.ts`, and the guarantees this feature extends to a fifth target.
- `src/generators/cursor.ts` — the structural model for a target with **no**
  tool-allowlist field: `tokens` stays `[]`, every capability becomes a note, and the one
  real permission control (`readonly`) is *derived* from the capability set and emitted
  only when it is the more restrictive value. Codex's `sandbox_mode` is the same shape of
  problem, and `isReadonlyRole` is the precedent for how to expose the derivation
  (exported for testability, deliberately not added to `Generator`).
- `src/generators/github-copilot.ts` and `kiro.ts` — the precedent for vendor-limit
  guards that throw `HarnessError('TEMPLATE')` rather than emitting a file the vendor
  will reject.
- `src/generators/markdown-yaml.ts` — the module `toml.ts` is a sibling of, and the
  reference for what belongs in a wrapper layer vs. in an adapter.
- `tests/canonical-fidelity.test.ts` — the non-self-referential byte-for-byte oracle
  (raw `fs.readFile`, never the parser) that G4/SC4 extend to the fifth generator.
- `specs/cursor-kiro-copilot-generators/audit.md` finding **AL-30** — the open,
  human-gated reservation this feature is explicitly instructed not to repeat silently.
- `specs/canonical-role-templates/` — origin of the `cost_tier` / `capabilities`
  vocabulary that `mapModel` / `mapCapabilities` translate.

**External**

- OpenAI Codex subagent configuration — `https://learn.chatgpt.com/docs/agent-configuration/subagents`
  (reached via a 308 from the `developers.openai.com/codex/subagents` URL cited in
  `plan.md` §7). Consulted 2026-08-30.
- OpenAI Codex skills — `https://learn.chatgpt.com/docs/build-skills` (308 from
  `developers.openai.com/codex/skills`). Consulted 2026-08-30.
- OpenAI Codex models — `https://developers.openai.com/codex/models`. Consulted
  2026-08-30.
- Context7 library `/openai/codex` (Codex CLI, source reputation High) — corroborating
  evidence straight from the implementation (`agent_role_config.rs`, `agent_roles.rs`,
  `config.schema.json`, `core-skills/src/loader.rs`) rather than prose docs.
- `plan.md` §3 (the per-tool matrix, Jul 2026) and §4 (the `generators/` layout and the
  MCP "future scope" note) — treated throughout as **hypotheses to verify**, per this
  feature's explicit mandate, and corrected in `contract.md`'s discrepancy table.
