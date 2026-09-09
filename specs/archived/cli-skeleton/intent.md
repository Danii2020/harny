# Intent: cli-skeleton

**Shipped: 2026-07-30**

## Problem Statement

`templates/` now holds the canonical, tool-agnostic SDD pipeline content (5 role
files, the conductor, the 5 spec-schema scaffolds) — shipped and APPROVED by the
`canonical-role-templates` feature on 2026-07-26. But that content has **no
consumer**. There is no `package.json`, no `src/`, no `bin/`: this repo is a folder
of Markdown that a human must copy by hand into `.claude/agents/`, then hand-write
YAML frontmatter for, then repeat per tool.

That leaves three concrete blockers:

1. **No delivery mechanism.** The product promised by `plan.md` §4 is
   `npx harny init` — a CLI that writes the pipeline into *any*
   project for *any* of five agent tools. None of that exists, so the canonical
   templates cannot reach a single user.
2. **No generator contract, so the five per-tool generators cannot be built in
   parallel or safely.** Four targets want Markdown+YAML frontmatter
   (`.claude/agents/<role>.md`, `.cursor/agents/<role>.md`, `.kiro/agents/<role>.md`,
   `.github/agents/<role>.agent.md`) and one wants TOML (`.codex/agents/<role>.toml`).
   Without an interface fixed *first*, each generator will re-derive template
   loading, `cost_tier` → model-ID mapping, and `capabilities` → tool-name mapping —
   and the canonical content will be forked five ways, which is precisely the
   duplication the previous feature existed to eliminate.
3. **Two known defects in the canonical layer have no owner until a CLI exists.**
   The prior audit left them as forward-looking recommendations addressed to exactly
   this feature:
   - **AL-5**: `templates/roles/sdd-architect.md` tells the architect to follow the
     `spec-schema` templates "packaged alongside this role". Once a generator emits
     that role body into a user's `.claude/agents/`, no `spec-schema/` exists there —
     the reference dangles. Something must deploy those schema files into the target
     repo.
   - **AL-7**: the conductor template carries only `id`/`purpose` (no `cost_tier`,
     no `capabilities`), and the auditor's capability list embeds a free-text scope,
     `write-files (audit.md only)`. Any parser written without accounting for both
     will crash or silently drop the auditor's least-privilege scoping.

Who is affected: the workshop audience (`npx harny init` is minute 15–20
of the DevFest Quito agenda), whoever builds the four remaining generators in weeks
3–4, and any team that wants the pipeline without hand-copying eleven files.

## Goals

1. **Bootstrap the CLI project itself.** Create the Node.js + TypeScript package
   scaffolding this repo does not yet have — `package.json`, `tsconfig.json`, test
   config, `bin/harness.js` — such that `npx harny init` is a real,
   runnable entry point with a working `--help` and meaningful exit codes.
2. **Implement the interactive `harness init` flow** covering exactly the five
   configuration questions fixed in `plan.md` §4 (agent tool(s), roles to enable
   with the conductor always on, model per role, active human gates, optional project
   stack), each pre-filled with the production-proven defaults.
3. **Build the template engine**: locate and load the canonical content from
   `templates/`, parse the Role Metadata schema into typed data, and hand
   generators a payload — with `templates/` treated as a strictly read-only input
   that is never copied into, duplicated inside, or forked by `src/`.
4. **Fix the canonical defaults as data, not as constants.** Each role's default
   model tier must be *read from that role's `cost_tier`* in
   `templates/roles/<role>.md`, so the canonical file stays the single source of
   truth for "which tier does this role need" and the CLI cannot drift from it.
5. **Define the generator adapter interface** every per-tool generator will
   implement: target directory, per-role file naming, wrapper format (accommodating
   both Markdown+YAML and TOML), the `cost_tier` → tool-model-ID mapping hook, and
   the `capabilities` → tool-permission mapping hook including scoped capabilities.
   The interface must be provably sufficient for all five known targets, not just
   the one being built.
6. **Ship exactly one reference generator — Claude Code — to prove the interface
   end to end.** Chosen because (a) the canonical content was extracted from a
   working Claude Code instance whose files still sit in this repo's `.claude/`,
   giving a free correctness oracle to diff generated output against; (b) its
   Markdown+YAML frontmatter is the format four of the five targets share, so the
   reference maximizes reuse for weeks 3–4; and (c) its conductor does **not** live
   in the agents directory (`.claude/skills/sdd-conductor/SKILL.md`), which forces
   the interface to treat conductor placement as a first-class, per-tool concern
   instead of an afterthought.
7. **Guarantee canonical fidelity in generated output.** A role's canonical body
   must appear byte-for-byte in what the generator writes; only the wrapper and
   clearly delimited, machine-marked generated blocks may differ. Configuration
   (disabled roles, disabled gates) must never be applied by silently editing
   canonical prose.
8. **Provide a non-interactive escape hatch** (`--yes`, per-question flags, and
   `--config <file>`) plus `--dry-run`, so the flow is runnable in CI, scriptable,
   and testable without a TTY — and so the red-phase tests can exercise the whole
   `init` path without driving a terminal UI.
9. **Deploy the tool-neutral shared artifacts** into the target repo — the five
   `spec-schema` templates and the resolved configuration — so that generated role
   bodies' schema references actually resolve (closing AL-5) and a later
   `harness mcp add` can read back what `init` decided.
10. **Keep packaging correct for `npx` distribution without publishing**: the
    tarball must contain the runnable CLI *and* all eleven canonical template files,
    and must exclude sources, tests, and this repo's own `specs/`.

## Success Criteria

- [ ] From a clean checkout, `npm install && npm run build && npm test` succeeds,
      and `node bin/harness.js --help` prints usage listing the `init` command.
- [ ] `node bin/harness.js init` in a TTY asks exactly the five `plan.md` §4
      questions, in that order, with these defaults pre-selected: all five roles
      enabled; all three gates (`post-specs`, `post-red-tests`, `post-audit`)
      active; and each role's model tier equal to the `cost_tier` declared in its
      canonical template (architect/auditor `most-capable`, test-writer/executor
      `mid`, documentation `cheapest`). (G2, G4)
- [ ] Those tier defaults are demonstrably derived from `templates/roles/*.md` at
      runtime: editing a canonical `cost_tier` value changes the CLI's default with
      no source change, and a test asserts this. (G4)
- [ ] `init --yes --tools claude-code` run against an empty temp directory
      completes with exit code 0 and no TTY, and produces exactly:
      `.claude/agents/sdd-{architect,test-writer,executor,auditor,documentation}.md`,
      `.claude/skills/sdd-conductor/SKILL.md`,
      `.sdd/spec-schema/{intent,contract,roadmap,tasks,audit}.md`, and
      `.sdd/harness.json`. (G6, G8, G9)
- [ ] Every generated role file parses as YAML frontmatter + Markdown, and its
      frontmatter carries `name`, `description`, `model`, and `tools` with values
      derived from that role's canonical metadata — `model` being `opus` for
      `most-capable`, `sonnet` for `mid`, `haiku` for `cheapest`. (G6)
- [ ] For all five roles, the canonical `## Role body` content appears byte-for-byte
      in the generated file: a test extracts the post-frontmatter region and asserts
      exact equality with the canonical body. (G7)
- [ ] The auditor's scoped capability `write-files (audit.md only)` survives
      generation: the scope text is present in the generated `.claude/agents/sdd-auditor.md`
      rather than silently discarded. (G5, closes AL-7)
- [ ] `.sdd/spec-schema/` contains all five schema files byte-identical to
      `templates/spec-schema/*.md`, so the architect role's schema references
      resolve inside the target repo. (G9, closes AL-5)
- [ ] Loading the canonical templates succeeds for all six files including the
      conductor, whose metadata block legitimately lacks `cost_tier`/`capabilities`;
      a test covers that case explicitly. (G3, closes AL-7)
- [ ] Deselecting roles or gates changes only the delimited generated block in the
      conductor output — never the canonical prose — and selecting fewer than three
      gates emits a visible warning. (G7)
- [ ] **(ADDED after the first audit)** `--roles` actually deselects: `init --yes
      --tools claude-code --roles sdd-architect` writes exactly one
      `.claude/agents/sdd-*.md` file, not five — asserted on the emitted file set
      itself, independently of the conductor's generated block. Added because the
      original criterion above was satisfiable by the gates half alone, which let a
      wholly non-functional `--roles` (AL-2) pass review. (G8)
- [ ] Selecting a tool with no generator yet (cursor, kiro, github-copilot, codex)
      reports that tool as skipped with a clear "not shipped yet" message instead of
      crashing or writing partial output; if *no* selected tool has a generator, the
      command exits non-zero and writes nothing. (G5)
- [ ] `init --dry-run` prints the full list of files it would write and writes
      nothing to disk. (G8)
- [ ] Re-running `init` over existing output fails with a conflict report listing
      the colliding paths and a non-zero exit, unless `--force` is given. (G8)
- [ ] Running `init` in a non-TTY without `--yes` or `--config` exits non-zero with
      a message naming both escape hatches, rather than hanging. (G8)
- [ ] `npm pack --dry-run` lists `bin/`, `dist/`, and all eleven `templates/**` files,
      and lists no file under `src/`, `tests/`, or `specs/`. (G10)
- [ ] `templates/` and `.claude/` are byte-for-byte unchanged by this feature
      (`git diff --stat` touches neither). (G3)
- [ ] `npx tsc --noEmit` and the test suite both pass with zero errors. (G1)

## Non-Goals

- **The four remaining per-tool generators** (Cursor, Kiro, GitHub Copilot, Codex
  CLI). Only the Claude Code reference generator ships here; the others are weeks
  3–4 and get their own specs. The *interface* must accommodate them; the
  *implementations* must not appear.
- **`harness mcp add` and any MCP config generation** (`.mcp.json`,
  `.cursor/mcp.json`, `.vscode/mcp.json`, `.kiro/settings/mcp.json`,
  `.codex/config.toml`) — explicitly future scope per `plan.md` §4.
- **The agnostic layer** (`templates/agnostic-layer/`: CI workflows, git hooks,
  gitleaks). The `stack` answer is *captured only*; nothing consumes it in this
  feature, by design.
- **The `harny-demo` repo** or any demo application.
- **Publishing to the npm registry.** Packaging correctness is in scope; `npm
  publish`, version tagging, and release automation are not.
- **Editing the canonical content.** `templates/` is a read-only input. If a
  canonical file is found to be wrong, that is a finding for `audit.md`, not an edit
  in this feature.
- **Modifying this repo's live `.claude/` pipeline** to be CLI-generated. The
  generated output is *compared* against it as an oracle; it is not replaced by it.
- **Any `harness` command other than `init`** (no `update`, `doctor`, `list`,
  `eject`).
- **Repo tooling beyond the build/test toolchain**: no ESLint/Prettier config, no
  GitHub Actions workflow, no release pipeline for this repo.
- **Rewriting canonical prose to reflect configuration.** Disabling a gate does not
  rewrite the conductor's gate narrative; see G7.

## Constraints

- **Stack is fixed by the human** (`plan.md` §4) and not open to re-litigation:
  Node.js + TypeScript, distributed for `npx`, entry point in `bin/`, source in
  `src/`, per-tool generators under `src/generators/`.
- **ESM only**, `"type": "module"`, `engines.node >= 20.19.0`. Local toolchain is
  Node v24.16.0 / npm 11.13.0.
- **Runtime dependency budget: at most two.** `commander` (command/flag parsing and
  `--help`) and `@clack/prompts` (interactive prompts). Everything else — config
  validation, Markdown/metadata parsing, YAML frontmatter emission, file planning —
  is hand-written against `node:` builtins. Rationale: `npx` pays install cost on
  every invocation, and the validation surface here is a small closed set of string
  unions where a schema library earns little.
- **No bundler.** Build is plain `tsc` to `dist/`; `bin/harness.js` is a hand-written
  ESM shim. This keeps `templates/` shipping as literal Markdown files rather than
  being inlined into a bundle — which is what makes "one canonical source" verifiable
  at rest inside the published tarball.
- **Verified library versions** (checked Jul 2026, must be pinned as verified, not
  from memory): `commander@15.0.0`, `@clack/prompts@1.7.0`, `vitest@4.1.10`,
  `typescript@7.0.2`, `@types/node@26.1.2`.
- **The generator interface must be validated against all five real target
  formats**, whose facts are settled: `.claude/agents/<role>.md`,
  `.cursor/agents/<role>.md`, `.kiro/agents/<role>.md`,
  `.github/agents/<role>.agent.md` (Markdown+YAML), and `.codex/agents/<role>.toml`
  (project-scoped TOML). A design that cannot express the TOML wrapper or the
  `.agent.md` double extension is a failed design even though neither generator
  ships here.
- **Canonical parsing must tolerate the canonical layer as it actually is**, not as
  a tidier version of it: the conductor's metadata block has only `id` and
  `purpose`; the auditor's `capabilities` value ends in a free-text parenthetical
  scope. Both are contract-sanctioned in `canonical-role-templates` and must not be
  "fixed" upstream.
- **Gate-configurability tension, resolved deliberately.** `AGENTS.md` states the
  three human gates "are not optional", while `plan.md` §4 question 4 asks the user
  which gates are active. These apply to different subjects: `AGENTS.md` governs
  *this repo's own* pipeline; question 4 configures the harness generated into
  *someone else's* repo. The CLI therefore permits fewer than three gates but must
  warn when it happens, and must never present a reduced set as the recommended
  configuration.
- **Traceability discipline applies reflexively** to this feature's own spec set,
  per `AGENTS.md`.
- **Pre-existing, out of scope, noted for the reader:** this repo's `.gitignore`
  excludes `specs/`, `.claude/`, `plan.md`, and `CLAUDE.md`, so this spec set is not
  version-controlled. Flagged in the prior audit's recommendations; unchanged here.
  It does mean packaging must not *rely* on `.gitignore` to exclude `specs/` from the
  tarball — an explicit `files` allowlist is required.

## Prior Art

- **`specs/canonical-role-templates/`** (Shipped 2026-07-26, verdict APPROVED) — the
  producer of the content this CLI consumes. Its `contract.md` fixes the Role
  Metadata schema, the `cost_tier` enum, and the `capabilities` vocabulary that the
  template engine parses; its `audit.md` findings AL-5 and AL-7 and its
  forward-looking recommendations are direct inputs to G5, G7, and G9 here.
- **`plan.md` §4** — the two-repo architecture, the `bin/`+`src/`+`src/generators/`
  sketch, and the five `harness init` questions verbatim. **§3** — the per-tool
  folder/format/model matrix the generator interface must satisfy. **§5** — places
  this feature in week 2 (Jul 23–29).
- **This repo's live `.claude/` instance** — `.claude/agents/sdd-*.md` and
  `.claude/skills/sdd-conductor/SKILL.md` are the empirical ground truth for the
  Claude Code wrapper: which frontmatter keys exist (`name`, `description`, `model`,
  `tools`, optional `color`), that `tools` is a comma-separated string, that model
  values are `opus`/`sonnet`/`haiku`, and that the conductor is a Skill at
  `.claude/skills/sdd-conductor/SKILL.md` with `name`/`description`/`metadata`
  frontmatter. Generated output is expected to be structurally equivalent to these
  files, which is what makes the reference generator falsifiable.
- **The product name is `harny`** — the repo's own name, chosen by the human at the
  spec-review gate in place of the earlier `create-sdd-harness`. This is a branding
  decision, not a technical one, and it has one technical consequence worth recording
  rather than discovering later: npm's `create-*` shorthand (`npm create <x>` /
  `npm init <x>`) resolves only to a package literally named `create-<x>`, so
  `npm create harny` will **not** work. `npx harny init` is therefore the single
  documented invocation, and the package declares exactly one `bin` entry, `harny`.
  The registry name `harny` was verified unclaimed (registry 404) on 2026-07-30 —
  informational only, since publishing is a Non-Goal here.
- **Note on the word "harness".** It survives the rename as a *generic noun* for the
  generated pipeline — `plan.md`'s own title is "SDD Harness for AI Coding Agents" and
  `AGENTS.md` uses it the same way. Two internal paths therefore keep it without being
  orphaned: `bin/harness.js` (the file behind the `harny` command, per `plan.md` §4's
  layout, which the human's rename pass deliberately left in place) and
  `.sdd/harness.json` (the resolved configuration of the generated harness). Users
  never type either path; if aligning them to `harny` is later preferred, it is a
  one-line, non-breaking change to `package.json`'s `bin` value.
