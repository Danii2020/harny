# Intent: cursor-kiro-copilot-generators

**Shipped: 2026-08-30**

## Problem Statement

`specs/cli-skeleton/` (Shipped 2026-07-30; verdict APPROVED WITH RESERVATIONS after
two audit passes) built the whole delivery machine — template loading, config
resolution, the `Generator` adapter interface, the shared Markdown+YAML wrapper
layer, the writer, and the `init` composition root — but deliberately shipped
**one** generator. Its Non-Goals say so in as many words:

> **The four remaining per-tool generators** (Cursor, Kiro, GitHub Copilot, Codex
> CLI). Only the Claude Code reference generator ships here; the others are weeks
> 3–4 and get their own specs. The *interface* must accommodate them; the
> *implementations* must not appear.

The consequence today is concrete and user-visible:

1. **Four of the five advertised tools cannot be scaffolded at all.**
   `availableToolIds()` returns exactly `['claude-code']`. `npx harny init --tools
   cursor` exits 4 (`NO_GENERATOR`) having written nothing; in an interactive run the
   four unimplemented tools are offered with the hint `generator not shipped yet`.
   `plan.md` §4 promises a CLI that writes the pipeline "into any project, for any of
   the 5 tools", and §6's minute 45–52 workshop block is *specifically* the
   portability demo — "the same 6 roles running as native subagents on Cursor, Kiro,
   GitHub Copilot, and Codex CLI". None of that is currently demonstrable.
2. **The interface's sufficiency claim is still only evidence, not proof.**
   `cli-skeleton` Behavior Guarantee 11 is discharged by `tests/generators/registry.test.ts`
   building *fake* `Generator` objects for the four unshipped targets. That proves the
   type signatures compose; it does not prove a real adapter for a real tool can be
   written without reshaping the interface, nor that `src/generators/markdown-yaml.ts`
   is genuinely reusable rather than Claude-Code-shaped.
3. **`plan.md`'s per-tool matrix (§3) is a planning artifact with two openly
   unconfirmed cells and, as of Aug 2026, several stale ones.** It flags GitHub
   Copilot's file extension as "exact extension to confirm" and its model field as
   "to confirm in week 1". Building three generators from that table without
   re-verifying against current vendor docs would ship generators that write to
   locations the tools never read — a failure mode that is completely silent: the
   files appear, the exit code is 0, and nothing works.
4. **Two forward-looking findings from `specs/cli-skeleton/audit.md` are addressed to
   exactly this feature** (see Prior Art). AL-5's *deployment* half is closed
   (`.sdd/spec-schema/` is written into the target repo), but the residual half — a
   generated **role artifact** carries no pointer to where those schema files landed —
   is still open for every generator, including Claude Code. AL-7's two shape
   tolerances (the conductor's `id`/`purpose`-only metadata; the auditor's free-text
   `write-files (audit.md only)` scope) are closed at the *parser*, and each new
   generator must independently honor them at the *renderer*, because that is where a
   scope qualifier gets silently swallowed.

Who is affected: the DevFest Quito workshop audience (the portability block is a third
of the runtime and the strongest argument in the talk); anyone whose team standardizes
on Cursor, Kiro, or Copilot rather than Claude Code; and whoever writes the Codex CLI
(TOML) generator next, who needs a proven multi-target adapter pattern rather than a
single-instance one.

## Goals

1. **Ship the Cursor generator** — `.cursor/agents/<role>.md`, Markdown + YAML
   frontmatter, per this feature's own verification of Cursor's current subagent
   documentation rather than `plan.md`'s table.
2. **Ship the Kiro generator** — `.kiro/agents/<role>.md`, Markdown + YAML
   frontmatter, likewise verified.
3. **Ship the GitHub Copilot generator** — `.github/agents/<role>.agent.md`, likewise
   verified, resolving `plan.md` §3's explicitly open extension and model questions.
4. **Verify every per-tool fact against current vendor documentation before pinning
   it, and record the evidence in the spec, not just the conclusion.** Every folder,
   extension, frontmatter key, accepted model value and scope level in `contract.md`
   carries a source (Context7 library id or doc URL) and a verification date, and every
   discrepancy from `plan.md` §3/§4 is called out explicitly rather than silently
   followed or silently overridden.
5. **Reuse the shared layer instead of forking it.** All three are Markdown+YAML
   targets, so all three consume `src/generators/markdown-yaml.ts`
   (`renderFrontmatter`, `yamlQuote`, `renderProvenance`, `renderProjectConfigBlock`)
   exactly as `claude-code.ts` does. Anything a second generator needs is added to the
   shared module, never duplicated into a per-tool file.
6. **Build against the shipped `Generator` interface without redesigning it**, and
   report — as an explicit, first-class finding rather than a quiet patch — any place
   where it proves genuinely insufficient for one of these three tools.
7. **Decide and state, per tool, how the conductor is represented.** Claude Code's
   conductor is a Skill, not a subagent, precisely because it must run in the main
   thread and pause for the human. Each of the three tools either has an equivalent
   main-thread, human-facing mechanism — in which case the generator targets it and
   `conductorPath` says so — or it does not, in which case `contract.md` states the
   omission and its consequence explicitly. No tool gets a conductor by accident and
   none loses one silently. (Closes the conductor half of AL-7 for these tools.)
8. **Honor the canonical layer as it actually is, at the renderer.** Each generator
   renders the conductor from `id`/`purpose` alone, and surfaces the auditor's
   free-text `write-files (audit.md only)` scope in its output — no crash, no dropped
   qualifier, no "tidying" of the canonical files. (Closes the capability half of AL-7
   for these tools.)
9. **Close the residual half of AL-5: make the architect's schema reference resolve
   from inside a generated role artifact.** `templates/roles/sdd-architect.md` points
   at schema templates "canonically packaged at `templates/spec-schema/` alongside this
   role" and delegates reachability to "a per-tool deployment of this role". The
   tool-neutral `buildSharedFiles` already deploys them to `.sdd/spec-schema/`, but no
   generated role artifact names that path, so a subagent reading only its own file
   still cannot find them. Every generated role artifact must carry that pointer in a
   delimited, machine-marked block.
10. **Make the three tools genuinely selectable end to end.** `getGenerator` resolves
    them, `availableToolIds()` returns four ids, `codex` remains the only skipped tool,
    a multi-tool run emits every selected tool's artifacts with the shared `.sdd/`
    artifacts still written exactly once, and the existing tests that used `cursor` as
    a stand-in for "unimplemented tool" are re-pointed at `codex` rather than deleted.
11. **Preserve every guarantee `cli-skeleton` established, across four generators
    rather than one** — canonical fidelity, wrapper-only variation, configuration
    quarantined between markers, nothing silently dropped, determinism, path
    containment, trailing newline, no new runtime dependency, `templates/` untouched.

## Success Criteria

- [ ] `getGenerator('cursor')`, `getGenerator('kiro')` and `getGenerator('github-copilot')`
      each return a `Generator`, and `availableToolIds()` is exactly
      `['claude-code', 'cursor', 'kiro', 'github-copilot']` — `codex` alone still
      resolves to `undefined`. (G1, G2, G3, G10)
- [ ] `init --yes --tools cursor` into an empty temp dir exits 0 and produces exactly
      `.cursor/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md`,
      the Cursor conductor artifact at its contracted path, `.sdd/spec-schema/*.md`
      (5 files) and `.sdd/harness.json` — and nothing else. (G1, G7, G10)
- [ ] `init --yes --tools kiro` produces the equivalent set under `.kiro/`, and
      `init --yes --tools github-copilot` under `.github/`, with role files named
      `<role>.agent.md` for Copilot and `<role>.md` for Kiro. (G2, G3)
- [ ] `init --yes --tools claude-code,cursor,kiro,github-copilot` emits all four tools'
      artifacts in one run while `.sdd/spec-schema/*` and `.sdd/harness.json` are
      written exactly **once**, byte-identical to `templates/spec-schema/*.md`.
      (G10, G11)
- [ ] For all five roles × all four generators, the canonical `## Role body` appears
      byte-for-byte as a contiguous substring of the generated artifact, asserted
      against the **raw canonical file text** rather than the parser's own `body`
      (the non-self-referential technique `cli-skeleton` audit pass 2 established after
      AL-6). (G11)
- [ ] Every generated artifact for the three new tools parses as YAML frontmatter +
      Markdown, carries that tool's *verified* frontmatter keys (not `plan.md`'s), and
      ends in exactly one `\n`. (G1, G2, G3, G11)
- [ ] Each generator's `mapModel` returns that tool's own verified model identifier per
      tier, and returns a `modelOverride` verbatim and untranslated. (G4, G11)
- [ ] The auditor's `write-files (audit.md only)` scope text is present in the
      generated auditor artifact for **each** of the three tools, and an unknown
      capability token is preserved and surfaced rather than dropped. (G8)
- [ ] Each of the three generators renders the conductor from `id`/`purpose` alone,
      with no reference to `cost_tier`/`capabilities`/`invocation`/`handoff`, and a
      test drives each with the real canonical conductor template. (G7, G8)
- [ ] Every generated **role** artifact — for all four generators — contains a
      delimited, machine-marked block naming `.sdd/spec-schema`, so the architect's
      schema reference resolves inside the target repo from the role artifact alone.
      (G9)
- [ ] `contract.md` states, per tool, either the conductor artifact's exact path and
      the tool-native mechanism it uses, or an explicit statement that the conductor is
      intentionally omitted for that tool and what the user loses. (G7)
- [ ] `contract.md` carries a verification table with, for every pinned per-tool fact,
      the source (doc URL or Context7 library id) and verification date, plus a
      dedicated subsection listing each discrepancy found against `plan.md` §3/§4.
      (G4)
- [ ] `src/templates.ts`, `src/engine.ts`, `src/writer.ts`, `src/prompts.ts`,
      `src/config.ts`, `src/cli.ts`, `src/init.ts`, `src/errors.ts` and
      `src/vocabulary.ts` are **unmodified** by this feature — proving `cli-skeleton`'s
      Integration Points claim that a new generator needs one new file plus one
      registry entry. Any deviation is a reported finding, not a silent edit. (G5, G6)
- [ ] No new runtime or dev dependency is added; `package.json`'s dependency block is
      byte-identical. (G11)
- [ ] Two `init` runs with identical inputs produce byte-identical trees for all four
      tools (`diff -r` clean). (G11)
- [ ] `templates/` and `.claude/` are byte-for-byte unchanged (`git status --porcelain
      -- templates .claude` empty after a full exercise). (G11)
- [ ] `npx tsc --noEmit` and the full `vitest run` suite pass with zero errors, zero
      skipped/todo/only tests. (G11)

## Non-Goals

- **The Codex CLI generator.** Codex is the one TOML target (`.codex/agents/<role>.toml`)
  and is structurally the odd one out — a different serialization format entirely,
  needing a sibling `src/generators/toml.ts` wrapper helper that does not exist. It gets
  its own spec. `codex` therefore remains the single `ToolId` that resolves to
  `undefined` after this feature.
- **MCP configuration wiring** — `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`,
  `.kiro/settings/mcp.json`, `.codex/config.toml`, and any `harness mcp add` command.
  Explicitly future scope per `plan.md` §4. Where a tool's *capability allowlist*
  syntax can name an MCP server (Kiro's `@server` form), naming it in the allowlist is
  in scope; writing any MCP server configuration file is not.
- **The agnostic layer** (`templates/agnostic-layer/`: CI, git hooks, gitleaks).
  `plan.md` §5 places it in week 4, separate from this work. `config.stack` remains
  captured and unread.
- **`harny-demo`** or any demo application — separate repo, separate future work.
- **Redesigning the `Generator` adapter interface.** `src/generators/types.ts` is
  consumed as shipped. If research proves it genuinely insufficient for one of these
  three tools, that is surfaced as an explicit finding in `contract.md` with a proposed
  amendment — never a quiet reshaping.
- **Modifying the engine, config, prompt, writer, CLI or template-parsing modules.**
  If one of them must change, that is a finding first and a change second, with the
  reason recorded in `contract.md`.
- **Editing canonical content.** `templates/` stays a read-only input. A canonical file
  that is wrong is an `audit.md` finding, not an edit here.
- **Any new `harny` command**, and any change to the five interactive questions.
- **Publishing to npm**, release automation, or CI for this repo.
- **Byte-level equivalence with any tool's own scaffolding output.** Unlike Claude
  Code, these three tools leave no oracle inside this repo; correctness is established
  against vendor documentation, not against a local example instance.
- **Retrofitting `plan.md`.** Discrepancies are recorded in this feature's
  `contract.md`; `plan.md` is a planning artifact and is not edited by this feature
  (documentation updates after an approved audit are `sdd-documentation`'s call).

## Constraints

- **Stack fixed and unchanged**: Node.js + TypeScript, ESM (`"type": "module"`),
  `engines.node >= 20.19.0`, build is plain `tsc` to `dist/`, tests are `vitest run`.
- **Dependency budget is closed.** Runtime dependencies stay exactly `commander@15.0.0`
  and `@clack/prompts@1.7.0`; dev stays `typescript@7.0.2`, `vitest@4.1.10`,
  `@types/node@26.1.2`. No YAML library, no TOML library, no schema validator. YAML
  frontmatter is emitted by the existing hand-written helpers.
- **Documentation-derived correctness, dated.** Every per-tool fact must be verified
  against the vendor's current documentation at spec time (Context7 first per this
  repo's standing convention, `WebSearch`/`WebFetch` against official docs as fallback)
  and recorded with its source in `contract.md`. Verification date for this spec set:
  **2026-08-12**.
- **Model identifiers are the most volatile surface in this feature.** Each tool's
  tier → model-id table is a snapshot of a vendor catalogue that changes monthly.
  The design must therefore (a) confine each table to one place per generator,
  (b) leave the existing per-role literal escape hatch (`--model <role>=<literal>`,
  Behavior Guarantee 10) as the documented user remedy, and (c) never let a stale
  table become an implicit correctness claim in the tests.
- **`plan.md` is not authoritative where it conflicts with current docs.** It was
  written with two openly unconfirmed cells. Where verification contradicts it, this
  spec follows verification and records the discrepancy.
- **The canonical layer must be tolerated as-is**, per `specs/canonical-role-templates/contract.md`:
  the conductor's metadata block carries only `id`/`purpose`; the auditor's
  `capabilities` value ends in a free-text parenthetical scope; unknown capability
  tokens must survive as `known: false`. No generator may "fix" any of this upstream.
- **Guarantee 3 (configuration quarantine) binds the new AL-5 pointer block.** The
  spec-schema pointer is config-adjacent content and therefore must live inside the
  existing `harny:begin`/`harny:end` markers, never interleaved with canonical prose.
- **Test integrity discipline carried forward from `cli-skeleton` audit pass 2.**
  Fidelity assertions must be non-self-referential (compare against raw canonical file
  text, never against the parser's own `body`), and new tests are expected to be
  mutation-tested — broken deliberately in `src/` to confirm they can fail. Three of
  `cli-skeleton`'s shipped defects survived a green suite; that is the standing reason.
- **Traceability discipline applies reflexively** to this feature's own spec set, per
  `AGENTS.md`.
- **Pre-existing, unchanged, noted for the reader:** this repo's `.gitignore` excludes
  `specs/`, `.claude/`, `plan.md` and `CLAUDE.md`, so this spec set is not
  version-controlled, and packaging must keep relying on `package.json`'s explicit
  `files` allowlist rather than `.gitignore`.

## Prior Art

- **`specs/cli-skeleton/`** (Shipped 2026-07-30, APPROVED WITH RESERVATIONS after a
  second pass) — the direct predecessor and the producer of everything this feature
  consumes: `src/generators/types.ts` (the adapter interface), `src/generators/markdown-yaml.ts`
  (the shared wrapper layer built explicitly "so weeks 3-4 reuse rather than
  re-derive"), `src/generators/claude-code.ts` (the reference implementation this
  feature has three siblings of), `buildPayload`/`buildSharedFiles`, and the `init`
  composition root. Its `intent.md` Non-Goals name this feature's contents as deferred;
  its Integration Points predict that each new generator is "one file plus one registry
  entry", a prediction this feature is the first real test of.
- **`specs/cli-skeleton/audit.md`, forward-looking items addressed here:**
  - **AL-5** (originating in `specs/canonical-role-templates/audit.md`, verified closed
    at the deployment level by `cli-skeleton` C42/AL-12) — `.sdd/spec-schema/` is
    deployed and byte-identical, and the conductor's generated block names it. The
    residual gap this feature closes is that a **role** artifact still names no path.
  - **AL-7** (same origin, verified closed at the parser by `cli-skeleton` R7/R9/C42) —
    `parseConductorTemplate` accepts `id`/`purpose` only, and `Capability.scope` gives
    the auditor's free-text qualifier a structured home. Each new generator must honor
    both at the renderer; `claude-code.ts` shows the shape (`# capability note:
    write-files is scoped to audit.md only`).
  - **Standing note "a second per-tool generator sneaking in because the interface
    makes it cheap"** was `cli-skeleton`'s risk #3 and did not materialize there. This
    feature is that risk's sanctioned realization — for exactly three tools, with
    `codex` still fenced off.
  - **Test-integrity findings AL-19/AL-20/AL-21/AL-22/AL-23** — the mutation-testing
    requirement, the `dist/`-staleness trap for end-to-end tests (`npm test` does not
    build), and the "green test whose name overstates its coverage" failure mode all
    apply directly to this feature's own tests.
- **`specs/canonical-role-templates/`** (Shipped 2026-07-26, APPROVED) — fixes the Role
  Metadata schema, the `cost_tier` enum, and the `capabilities` vocabulary that each
  generator maps from. Its `templates/conductor/sdd-conductor.md` deliberately omits
  `cost_tier`/`capabilities`/`invocation`/`handoff` and says so in an authoring note:
  "a per-tool wrapper is free to deliver it as whatever native orchestration mechanism
  that tool supports". This feature is the first to exercise that latitude three ways.
- **`plan.md` §3** — the per-tool folder/format/scope/model matrix, written Jul 2026
  with GitHub Copilot's extension and model field openly marked "to confirm", and
  **§4** — the two-repo architecture, the per-generator file layout
  (`src/generators/{cursor,kiro,github-copilot}.ts`), and the note that the cost/quality
  argument "now applies to all 5 tools". **§5** places this work in week 3
  (Jul 30 – Aug 5); it is being specified on 2026-08-12.
- **Vendor documentation verified for this spec set (2026-08-12)** — Cursor subagents
  and skills, Kiro custom agents / configuration reference / models / skills, GitHub
  Copilot custom agents configuration reference and agent skills. Exact URLs, the
  facts each one settles, and the resulting corrections to `plan.md` are tabulated in
  `contract.md` § "Verified per-tool facts".
