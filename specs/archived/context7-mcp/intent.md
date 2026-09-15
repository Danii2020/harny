# Intent: context7-mcp

Shipped: 2026-09-15

## Problem Statement

Three of the five canonical roles (`sdd-architect`, `sdd-executor`, `sdd-test-writer`)
declare the `docs-lookup` capability, and `specs/current/pipeline-roles.md` **PR-4**
makes it mandatory: a role declaring `docs-lookup` "SHALL … instruct verifying
library/API usage via Context7 (or the target tool's equivalent docs-lookup MCP) before
pinning a signature." The canonical templates say so in prose
(`templates/roles/sdd-architect.md:22`, `sdd-executor.md:24`, `sdd-test-writer.md:37`;
`templates/skills/harny-propose/SKILL.md:59–60`, `harny-implement/SKILL.md:54`,
`harny-test/SKILL.md:68–69`), and two generators go further and emit tool-native
references to a *specific named server*:

- `src/generators/claude-code.ts:30` maps `docs-lookup` to the literal tool tokens
  `mcp__context7__resolve-library-id` and `mcp__context7__query-docs`, which land in the
  `tools:` frontmatter of every generated architect/executor/test-writer role file.
- `src/generators/kiro.ts:33` maps `docs-lookup` to the tool-category tag `@context7`,
  which lands in the generated `tools:` flow sequence.

**No generator writes the MCP server configuration those references point at.**
`src/generators/kiro.ts:40` says so in a note that ships into every generated Kiro role
file: *"docs-lookup maps to the Context7 MCP server (@context7); harny does not write
MCP configuration — see plan.md §4 'future scope'."*

The consequence is a silent, exit-code-0 failure of exactly the class `AL-30` already
warns about — an artifact pointing at something the tool never loads:

- On Claude Code, a subagent whose `tools:` frontmatter names
  `mcp__context7__resolve-library-id` when no `context7` server is configured gets a
  `tools:` allowlist naming tools that do not exist. The role's own prose then instructs
  it to "verify library APIs via Context7 … do not trust memory," and it cannot. The
  fallback is the exact behavior `PR-4` exists to prevent: pinning a library signature
  from memory.
- On Kiro, `@context7` in a `tools:` category list resolves to no connected server.
- On Cursor, Codex and GitHub Copilot the capability is advisory-only (no
  tool-allowlist field exists on any of the three), so nothing *breaks* — but the
  instruction is equally unbacked, and `docs-lookup` is the one capability in the
  vocabulary whose satisfaction depends on a server rather than on a built-in tool.

`plan.md:138` already states the intended end state plainly: `docs-lookup` "defaults to
Context7 MCP, **wired up automatically by the generator so it works out of the box**."
Only the follow-on — letting users add *their own* servers — was deferred. The default
wiring was never built.

This feature builds exactly that default wiring, and nothing more: `npx harny init`
writes a `context7` MCP server entry into whichever of the five tools' native MCP config
files correspond to the tools the user selected.

### Why this is not just "one more generated file"

Every artifact harny writes today is **wholly harny's own**: `.claude/agents/*.md`,
`.codex/agents/*.toml`, `.sdd/**`, `.github/workflows/harny-feedback.yml`. `CLI-5`'s
conflict rule (write nothing if any planned path exists, unless `--force`) is safe
precisely because a pre-existing file at one of those paths means a previous `harny
init`, not a user's own content.

The five MCP config paths are the first artifacts harny **co-owns with the user and with
other tools**:

- `.vscode/mcp.json` is VS Code's file, not Copilot's — any MCP server the user already
  uses in VS Code lives there.
- `.codex/config.toml` is not an MCP file at all. It is Codex CLI's *entire* project
  configuration — model, approval policy, sandbox settings, hooks. Overwriting it
  wholesale to add one server would destroy unrelated settings, and `--force` (the flag
  users reach for when re-running `init` on an already-scaffolded repo) would do it
  silently.
- This repo's own `plan.md:138` names a future `harny mcp add <server>` that must
  *extend* these same files, so the write model chosen here is the one that command will
  inherit.

So the write path, not the per-tool facts, is the real architectural question this
feature has to answer. See § Constraints, "The write model".

## Goals

1. **G1 — `docs-lookup` works out of the box.** After `npx harny init` in a repo with no
   pre-existing MCP configuration, each selected tool has a `context7` MCP server
   configured at its own native path, so the `mcp__context7__*` tokens `claude-code.ts`
   already emits and the `@context7` tag `kiro.ts` already emits resolve to a real
   server without any manual step.

2. **G2 — All five tools, shipped together.** Claude Code, Cursor, GitHub Copilot
   (VS Code), Kiro and Codex CLI all get their MCP config written in this feature,
   following the `AL-30` precedent established by `cursor-kiro-copilot-generators` and
   `codex-generator`: per-tool facts are verified against first-party documentation,
   recorded with their source and date, shipped together, and carried as an open,
   human-gated reservation where a live-install confirmation is missing — never blocked
   on one.

3. **G3 — Never destroy a file harny does not wholly own.** Writing the `context7` entry
   must never remove, reorder-away, or clobber any other MCP server, any unrelated
   Codex setting, or any other top-level key in a pre-existing config file. A file harny
   cannot safely extend is left **byte-identical** and reported, never mangled.

4. **G4 — Re-running `init` on a scaffolded repo stays possible.** A pre-existing MCP
   config file must not make the whole `init` run refuse under `CLI-5`. The MCP paths
   are exempted from the conflict rule by an explicit, narrow mechanism; every other
   generated path keeps `CLI-5` exactly as it is today.

5. **G5 — Idempotent.** Running `npx harny init` twice leaves each MCP config file
   byte-identical after the first run. No duplicated server entry, no duplicated TOML
   table, no accumulating whitespace.

6. **G6 — Trust posture: config file only, never auto-trust.** harny writes the server
   entry and stops. It never writes Claude Code's `enabledMcpjsonServers`, never writes
   Kiro's `autoApprove`, never writes Codex's trust designation, and never touches any
   other approve/trust mechanism. Each tool's own native first-use approval prompt stays
   the gate — consistent with `TG-8` ("harny may narrow permissions, never widen them")
   and with this repo's human-gate philosophy.

7. **G7 — One serializer, one source of facts.** The Context7 endpoint, the server name,
   and the merge algorithm live in exactly one module and are imported, never
   re-literalled (`S5`). All JSON comes from `src/generators/json.ts` and all TOML from
   `src/generators/toml.ts` (`TG-5` and `tool-generators.md` invariant 1) — including a
   new TOML table-header helper, since `toml.ts` today emits only top-level key/value
   lines and comments and has no table support at all.

8. **G8 — The stale claim in shipped output is retracted.** `kiro.ts`'s
   `DOCS_LOOKUP_NOTE` currently ships the sentence "harny does not write MCP
   configuration" into every generated Kiro role file. After this feature that sentence
   is false in every scaffolded repo, so it must be rewritten in the same change, not
   left to a later docs pass.

9. **G9 — Context7 works without credentials, and the upgrade path is documented, not
   automated.** The generated configuration uses Context7's unauthenticated hosted
   endpoint. harny never reads `process.env.CONTEXT7_API_KEY` at generation time and
   never writes a credential, a credential placeholder, or an env-var reference into a
   committed file; the higher-rate-limit path is documented prose the human opts into.

## Success Criteria

- [ ] **SC1** — With all five tools selected in an empty repo, `runInit` writes exactly
      five additional artifacts beyond today's set: `.mcp.json`, `.cursor/mcp.json`,
      `.vscode/mcp.json`, `.kiro/settings/mcp.json`, `.codex/config.toml` (`G1`, `G2`).
- [ ] **SC2** — Each written file contains a `context7` server entry pointing at
      `https://mcp.context7.com/mcp`, under that tool's own root key — `mcpServers` for
      Claude Code, Cursor and Kiro; `servers` for GitHub Copilot's `.vscode/mcp.json`;
      the `[mcp_servers.context7]` table for Codex (`G1`).
- [ ] **SC3** — Selecting a subset of tools writes only that subset's MCP config files;
      a tool with no generator (`CLI-7` skip path) contributes none.
- [ ] **SC4** — Given a pre-existing `.vscode/mcp.json` holding two unrelated servers,
      the post-`init` file still holds both, plus `context7` — and no other top-level
      key of that file is added, removed, or reordered (`G3`).
- [ ] **SC5** — Given a pre-existing `.codex/config.toml` holding unrelated Codex
      settings and no `[mcp_servers.context7]` table, the post-`init` file contains the
      original bytes as a prefix, followed by the appended table (`G3`).
- [ ] **SC6** — Given a pre-existing config file that already contains a `context7`
      entry, `init` without `--force` leaves that file **byte-identical** and emits one
      `io.warn` naming the path (`G3`, `G5`).
- [ ] **SC7** — Given a pre-existing config file whose contents `JSON.parse` rejects
      (e.g. a `.vscode/mcp.json` written as JSONC with comments), `init` writes nothing
      to that path, emits one `io.warn` naming the path and carrying the exact snippet
      to paste, and **still completes successfully**, writing every other artifact
      (`G3`, `G4`).
- [ ] **SC8** — `runInit` on a repo that already has all five MCP config files present
      succeeds without `--force` — the MCP paths never appear in `WritePlan.conflicts`
      — while a pre-existing `.claude/agents/sdd-architect.md` still raises
      `HarnessError('CONFLICT')` exactly as today (`G4`, `CLI-5` preserved).
- [ ] **SC9** — Running `runInit` twice in a row over the same target directory leaves
      all five MCP config files byte-identical between run 1 and run 2 (`G5`).
- [ ] **SC10** — `--dry-run` writes nothing to any MCP config path and lists all five in
      its planned-paths output (`CLI-5` second clause preserved).
- [ ] **SC11** — No generated MCP artifact contains an `Authorization` header, a
      `bearer_token_env_var`, an `env` block, a `${CONTEXT7_API_KEY}` placeholder, or any
      other credential reference; no code path under `src/` reads
      `process.env.CONTEXT7_API_KEY` (`G9`).
- [ ] **SC12** — No generated MCP artifact contains `enabledMcpjsonServers`,
      `autoApprove`, `disabledTools`, `trust_level`, or any other approve/trust key; and
      no code path under `src/` writes to `.claude/settings.json`'s
      `enabledMcpjsonServers` (`G6`). `.claude/settings.json` continues to carry only
      the two hook registrations `agent-feedback-controls` put there.
- [ ] **SC13** — Every generator declares the new MCP member; a generator that omits it
      is a `tsc` compile error, so a sixth generator cannot skip the question — the same
      device `TG-12` established for `guidancePath` (`G2`).
- [ ] **SC14** — No MCP-related JSON or TOML syntax literal appears outside
      `src/generators/json.ts` and `src/generators/toml.ts`: no hand-written `{`/`}`
      JSON string, no `[mcp_servers.` literal in any generator file (`G7`, `TG-5`).
- [ ] **SC15** — The Context7 endpoint URL and the server name `context7` each appear as
      a literal exactly once in `src/`, in their owning module, and are imported
      everywhere else (`G7`, `S5`).
- [ ] **SC16** — `src/generators/kiro.ts`'s `DOCS_LOOKUP_NOTE` no longer contains the
      string "harny does not write MCP configuration"; the replacement names the file
      harny now writes and states that the first tool call still prompts for approval
      (`G8`, `G6`).
- [ ] **SC17** — `tests/generators/registry.test.ts`-style coverage asserts every one of
      the five per-tool facts (path, root key, entry shape) against the table in
      `contract.md` § "Verified per-tool MCP facts", so a silent drift in one generator
      fails a test rather than shipping (`G2`).
- [ ] **SC18** — `src/vocabulary.ts` still imports nothing and no two `src/` modules
      import each other at runtime (`CLI-11` preserved) after the new module is added.
- [ ] **SC19** — Every written MCP artifact is a relative path resolving inside
      `targetDir` and ends in exactly one `\n` (`CLI-4`, `S3` preserved). No code path
      writes to `~/.codex/config.toml`, `~/.kiro/settings/mcp.json`, `~/.cursor/mcp.json`
      or any other path outside the target repo.
- [ ] **SC20** — `templates/mcp/README.md` describes the mechanism tool-neutrally,
      naming the behavior first and each tool as an attributed example (`S7`), and the
      packaged tarball's `templates/**` count moves from thirty to thirty-one
      (`CLI-10` amendment).

## Non-Goals

- **No `harny mcp add <server>` command.** Explicitly deferred (`plan.md` §4). This
  feature ships no new CLI verb.
- **No arbitrary user-chosen MCP servers, and no new `init` prompt.** No Jira, Linear,
  Figma, or "which servers would you like?" question. `context7` is the only server this
  feature can write, and it is not optional or selectable.
- **No auto-trust, no auto-approve, no permission widening.** Not
  `enabledMcpjsonServers`, not `autoApprove`, not `disabledTools`, not a Codex trust
  designation. See `G6`; see also § Constraints, "What is deliberately *not* decided
  here".
- **No writes outside the target repository.** No `~/.codex/config.toml`,
  `~/.kiro/settings/mcp.json`, `~/.cursor/mcp.json`, `~/.claude.json`. Every harny write
  stays inside `targetDir` (`CLI-4` containment, `writer.ts:19–29`).
- **No shelling out to a vendor CLI.** No `claude mcp add`, no `codex mcp add`, no
  `npx ctx7 setup`. Those write user-global state, are non-deterministic, require the
  tool to be installed, and are untestable offline (`S6`: the default test run is
  offline).
- **No local/stdio transport.** harny does not configure
  `npx -y @upstash/context7-mcp` as a child process. The hosted HTTP endpoint needs no
  Node install step, no package download at agent start-up, and no `command` string to
  quote — and it is what Context7's own client documentation leads with.
- **No OAuth flow, no `codex mcp login`, no credential storage.**
- **No general-purpose TOML or JSON parser.** `toml.ts` gains a table-header *writer*
  only. TOML *reading* is a line-level presence scan, deliberately not a parse; see
  § Constraints, "The write model".
- **No full merge/update semantics for an entry that already exists.** If a `context7`
  entry is already present, harny leaves it alone and says so. Updating a stale entry in
  place — including replacing a stale Codex `[mcp_servers.context7]` table — belongs to
  the deferred `harny mcp add`, which is where a real parser will have to be justified.
- **No new readiness-check (`harny doctor`) entries for the MCP config files.** A
  must-have entry would be wrong (`SC7`'s bail-out path legitimately leaves the file
  absent, which would then report a green repo as not ready); a recommended entry would
  be a `warn` the human cannot act on from the doctor's own output. The `repoReadiness`
  and `require` families are untouched.
- **No change to any role's `capabilities:` line, to `src/vocabulary.ts`'s capability
  set, or to how any generator maps `docs-lookup` to tokens.** The tokens already
  emitted are correct; only the server behind them was missing. The one role-facing edit
  is `kiro.ts`'s note text (`G8`).
- **No Copilot CLI surface.** `github-copilot.ts` targets VS Code custom agents
  (`.github/agents/<role>.agent.md`, `TG-6`); its MCP file is therefore VS Code's
  `.vscode/mcp.json`. GitHub Copilot CLI's own separate MCP configuration is out of
  scope.
- **Not closing `AL-30` or `CG-1`/`O4`.** The new per-tool facts are documentation-
  verified, not live-install-verified, and join those reservations rather than
  resolving them.

## Constraints

### Amends five shipped current-truth statements — declared, not silent

`harny-sync` lookup returned `specs/current/tool-generators.md`,
`specs/current/cli-init.md` and `specs/current/pipeline-roles.md`. Five statements
change; `contract.md` restates each as a first-class guarantee so archive mode carries
the amendment into the capability docs rather than leaving contradictions on disk.

- **`TG-1`** enumerates the `Generator` interface's members. The amended list adds one
  declarative member for the tool's MCP configuration — continuing the `skillsDir`
  (ADR 0011) / `guidancePath` (ADR 0025) lineage, **not** the `renderHook` method
  departure (ADR 0014). Justification: the per-tool variation here is a *fixed path and
  shape fact* known at module load with no payload input, exactly like `hooksPath` and
  `guidancePath`; every byte of serialization is done by the shared merger, so there is
  nothing for a `render*` method to render. (ADR 0025's own reasoning, verbatim: "a path
  fact, so it follows `skillsDir`, not `renderHook`.")
- **`TG-10`** fixes the full artifact count. The amended count adds **one MCP config
  artifact per resolved generator that declares one** — five more files with all five
  tools selected, minus any path where the bail-out of `SC6`/`SC7` applies.
- **`CLI-1`**'s step 11 ("render role + conductor artifacts per available generator")
  has already been widened three times (skills, hooks + CI, doctor + shared probes)
  without becoming a fourteenth step. MCP config building joins step 11 the same way.
  The **13-step sequence is unchanged**; step 11 becomes the first step in it that
  *reads* from the target directory as well as writing to it.
- **`CLI-4`**'s determinism clause reads "two runs with the same config and templates
  produce byte-identical output." The amended form is **"the same config, the same
  templates, and the same pre-existing contents at the merge-owned paths."** The
  containment and single-trailing-newline clauses are unchanged and must stay true. No
  MCP output may depend on the clock, the environment, or the filesystem beyond the
  contents of the one file being extended.
- **`CLI-5`**'s conflict rule gets one narrow exemption: paths explicitly marked as
  merge-owned never enter `WritePlan.conflicts`. Every other planned path keeps today's
  behavior exactly, and `--dry-run` still writes nothing at all. This is the minimum
  change that satisfies `G4`; a blanket relaxation of `CLI-5` is not on the table.

### The write model

**Recommendation: build the merge-write path now, in this feature. Do not take the
whole-file "v1 simplification".**

The brief offers a v1 simplification — reuse the existing whole-file
`Generator`/`writer.ts` model and rely on `CLI-5` + `--force`, on the grounds that a
*fresh* `harny init` has no pre-existing file. That reasoning holds for four of the five
paths and fails decisively on the fifth:

1. **`.codex/config.toml` is not an MCP file.** It is Codex CLI's whole project
   configuration. Under whole-file semantics, `harny init --force` on a repo with an
   existing Codex config silently replaces the user's model choice, approval policy,
   sandbox settings and hooks with a four-line file. That is a data-loss bug with a
   plausible trigger, not a theoretical edge case — and `--force` is precisely the flag
   documentation tells users to reach for when re-running `init`.
2. **Whole-file semantics also make `G4` impossible.** Without `--force`, a single
   pre-existing `.vscode/mcp.json` — overwhelmingly likely in any repo whose team
   already uses MCP in VS Code — would make the *entire* `init` run refuse, blocking all
   thirty-plus unrelated artifacts over one file harny does not own.
3. **The deferred `harny mcp add` inherits this decision.** `plan.md:138` describes it as
   adding servers "on top of that default." If the default is written whole-file, that
   command has to invent the merge path anyway, and its first job will be undoing this
   one. Building the merge path here, scoped to one server, is the cheaper order.

The merge path is deliberately kept small enough not to need a dependency (`S4`):

- **JSON (four tools).** `JSON.parse` / `JSON.stringify` are language builtins, already
  used this way by `src/generators/json.ts` ("a language builtin, NOT a new dependency").
  Absent file → write fresh. Parses to an object → set only
  `<rootKey>.context7`, preserving every other key, and re-serialize through the shared
  `renderJson`. Already has a `context7` entry → leave byte-identical and warn (unless
  `--force`, which replaces that one entry and nothing else). Does not parse, or parses
  to a non-object → write nothing, warn with the exact snippet. Accepted cost: on a
  file that *does* parse, comments cannot survive (`JSON.parse` rejects them, so a
  commented JSONC file takes the warn-and-skip branch instead and is never mangled) and
  key formatting is normalized to `renderJson`'s 2-space form.
- **TOML (Codex).** There is no TOML parser in this codebase and adding one is a new
  dependency (`S4`) for a feature that needs to insert exactly one table. Instead:
  absent file → write fresh; present and a `[mcp_servers.context7]` table header already
  occurs at the start of a line → leave byte-identical and warn; present and it does not
  → **append** the rendered table after a blank line. Appending a new `[table]` header
  is safe at the TOML grammar level regardless of what precedes it (a table header ends
  the preceding table's key/value scope), so this needs presence detection, not parsing.
  Accepted cost and deliberate asymmetry: `--force` does **not** rewrite an existing
  Codex `context7` table, because removing it safely would require the parser this
  feature refuses to add. That asymmetry is stated in `contract.md` and surfaced as an
  open question below rather than hidden.

### Verified external facts (2026-09-15) — sources recorded in `contract.md`

The per-tool table in `contract.md` § "Verified per-tool MCP facts" is normative. The
facts that materially shaped this intent:

- **Context7's hosted endpoint is `https://mcp.context7.com/mcp`**, and an API key is
  **optional**: "Without an API key, the plugin connects anonymously and shares the
  anonymous rate limits." Auth, when used, is an `Authorization: Bearer <key>` header.
  `CONTEXT7_API_KEY` is the conventional env-var name in Context7's own tooling.
  (Source: Context7's own `docs/resources/all-clients.mdx` and
  `plugins/copilot/context7/README.md`, retrieved via the Context7 MCP server itself on
  2026-09-15 — i.e. the fact was verified with the mechanism this feature exists to
  enable, not from memory, per `PR-4`.) This is what makes `G9` possible: the
  unauthenticated endpoint genuinely works out of the box.
- **GitHub Copilot's `.vscode/mcp.json` uses the root key `servers`**, not `mcpServers`
  — the only one of the five that differs, and already flagged in `plan.md:144`. This is
  the single highest-value fact to cover with a test (`SC17`).
- **Claude Code `.mcp.json` supports `${VAR}` and `${VAR:-default}` expansion**, and an
  unset variable with no default is left **unexpanded** and still loaded. This is a
  reason *against* writing a `${CONTEXT7_API_KEY}` placeholder: with the variable unset,
  Claude Code would send the literal string `Bearer ${CONTEXT7_API_KEY}` as a bearer
  token — strictly worse than sending no header and connecting anonymously. Hence `G9`'s
  "no placeholder" clause, not just "no secret".
- **Codex project-scope config requires trust, and trust is not self-granted.** Codex
  loads project `.codex/` layers "only when you trust the project"; when trusted,
  project config takes precedence *over* user config. The brief's working assumption —
  that the file must itself set `trust_level = "trusted"` — is not what current
  first-party documentation describes; trust is a user-side decision Codex prompts for.
  That is the better outcome for this feature: project scope is both the containment-
  compatible choice (`SC19`) and the one already gated by a native human approval,
  exactly as `G6` wants. `codex mcp add` writes to `~/.codex/config.toml` and is
  therefore not usable here.

### Everything else that must keep holding

- **Coding standards S1–S7** (`AGENTS.md` § "Coding standards"): TypeScript/ESM with
  `.js` specifiers and `node:` prefixes (S1); `HarnessError` as the only deliberate
  error (S2) — note that *none* of the MCP bail-out paths is an error, they are
  `io.warn` plus a skipped file; determinism, containment, single trailing newline (S3);
  **no new runtime or dev dependency** (S4) — none is added, which is what rules out a
  TOML parser; shared constants imported from their owning module, never re-literalled
  (S5) — what `SC15` enforces; vitest tests mirroring `src/`, `Spec:`/`Covers:` headers,
  no contract id in a test name (S6); no single tool's mechanic named as the only
  possibility in tool-neutral content (S7) — governs `templates/mcp/README.md`.
- **`TG-3`/`TG-4` are untouched.** MCP config artifacts are generated, not sliced from a
  template body, exactly like hook and CI artifacts (`TG-3`'s own scope sentence).
- **`tool-generators.md` invariant 3** — "adding a generator must not change any existing
  generator's file" — is about *adding a generator*, not about amending the interface,
  and is not violated here. But its spirit applies: all five generator files change by
  exactly one declarative member each (plus `kiro.ts`'s one note string, `G8`), and no
  generator gains merge logic.
- **`CLI-11`** — no runtime import cycles, `src/vocabulary.ts` imports nothing. The new
  module imports the two shared serializers and `src/errors.ts`; the generators import
  the new module's constants the same way they already import `FEEDBACK_RUNNER_PATH`
  from `src/feedback.ts`.
- **`CLI-8`/`CLI-10`** — the MCP files are per-tool, not tool-neutral, so they are *not*
  single-write-per-run like `.sdd/spec-schema/*`; but `CLI-10`'s packaged
  `templates/**` count moves 30 → 31 for `templates/mcp/README.md`, which needs the
  same one-line packaging-test amendment `agent-feedback-controls` and
  `readiness-doctor` each made.
- **Skill parity (`FC-11`)** — no `harny-*` skill body changes in this feature, so no
  parity obligation is triggered. If the spec-review gate decides `harny-propose`'s
  docs-lookup line should mention the now-guaranteed server, that edit must land in
  `.claude/skills/` and `templates/skills/` in the same change.

### What is deliberately *not* decided here — open questions for the spec gate

- **OQ1 — The write model (recommendation stated above).** This is the largest
  decision in the feature and the one with the widest blast radius (`CLI-4`, `CLI-5`,
  `GeneratedFile`, and the future `harny mcp add`). The recommendation is merge-write;
  the rejected alternative and its failure mode are documented above so the gate can
  overrule with full information rather than by default.
- **OQ2 — Should there be any API-key affordance at all in v1?** The recommendation is
  none: anonymous endpoint, documented manual upgrade. A future `--context7-api-key-env
  <VAR>` flag (emitting Codex's `bearer_token_env_var` and the other four tools'
  `headers` with a `${VAR}` reference) is a coherent design, but it adds CLI surface
  this feature's scope explicitly excludes, and on Claude Code an unset variable
  degrades *worse* than absence. Confirm "none in v1" or redirect.
- **OQ3 — The `--force` asymmetry.** Under the recommendation, `--force` replaces an
  existing `context7` entry in the four JSON files but never rewrites an existing
  `[mcp_servers.context7]` TOML table. Acceptable (documented, no parser), or should
  `--force` be made uniformly a no-op for all five so the semantics are one sentence?
- **OQ4 — The JSONC bail-out.** A `.vscode/mcp.json` with comments takes the
  warn-and-skip path, so a user who comments their VS Code MCP config gets no Context7
  wiring on that tool. Acceptable (never mangle a file we cannot parse), or is a
  comment-tolerant reader worth the complexity?
- **OQ5 — Should these files be gitignored or committed?** Committed is assumed
  (they are repo-scoped configuration and that is how Claude Code's project-scope trust
  model is designed to work), but many repos gitignore `.vscode/`, in which case the
  Copilot wiring silently does not reach teammates. Worth one line in the README either
  way; flagging rather than deciding.
- **OQ6 — Reconsidering auto-trust.** Per the brief, harny writes the config file only
  and touches no trust mechanism, and this spec does **not** re-litigate that. Surfacing
  it once, as instructed: the cost of the decision is that on Kiro, every single
  Context7 tool call prompts (Kiro prompts per tool call unless `autoApprove` names the
  tool), which is materially more friction than Claude Code's once-per-workspace
  approval. If that friction is judged unacceptable in practice, the narrowest possible
  reversal would be `autoApprove` naming only Context7's two read-only lookup tools on
  Kiro alone — still not a general permission widening. Recorded as an open question;
  **not** implemented by this feature.

### Two `AL-30`-class reservations carried in, not resolved

- **R-Cursor** — one unverified, low-confidence secondary claim reports that MCP support
  in some Cursor installs sits behind a settings toggle that defaults off. Cursor's own
  documentation was unreachable during this exploration (connection refused); the
  `.cursor/mcp.json` path, the `mcpServers` root key and the bare-`url` remote shape were
  confirmed from Context7's first-party client documentation and corroborated by
  `plan.md:143`. If the toggle claim is true, the generated file is correct but inert
  until the user flips a switch — the exact `AL-30` failure mode (exit 0, nothing
  loaded). Ship with the reservation recorded; do not block.
- **R-Codex** — open upstream issue `openai/codex#13025` reports that Codex Desktop
  ignores project `.codex/config.toml` MCP servers and loads only the global file. If
  accurate, the Codex CLI surface works and the Desktop surface does not. The mitigation
  is documentation (`templates/mcp/README.md` naming the global-file fallback as a
  manual step), not a change of scope: writing outside the repo is barred by `SC19`.

## Prior Art

**In this codebase:**

- `src/generators/types.ts:42–62` — `skillsDir` (**ADR 0011**), `hooksPath`, and
  `guidancePath` (**ADR 0025**): three precedents for a *declarative* per-generator
  member holding a fixed per-tool fact, each with a written justification for not being
  a method. The new MCP member is the fourth and follows the same argument.
- `src/doctor.ts:130–150` and `src/doctor.ts:266–280` (`buildDoctorFiles`) — the
  established pattern for deriving artifacts per *resolved* `Generator` from a
  tool-neutral module outside `src/generators/`, rather than from a hard-coded tool list
  or from inside each generator. `buildMcpFiles` is the same shape.
- `src/engine.ts:184–189` (`buildRuntimeSharedFiles`) and `src/init.ts:248–258` — the
  precedent for joining a new artifact family into `runInit` step 11 without adding a
  fourteenth step, and for gating it so a lean templates root contributes nothing rather
  than erroring.
- `src/generators/json.ts:10–12` — `renderJson`, and its explicit note that
  `JSON.stringify` is "a language builtin, NOT a new dependency". The same sentence
  covers `JSON.parse` on the read side.
- `src/generators/toml.ts` — owns "every TOML syntax literal in the codebase" and is
  "deliberately not a general-purpose TOML serializer". It emits comments and top-level
  key/value lines only; a table header (`[mcp_servers.context7]`) is a shape it has
  never had to emit, so it gains exactly one helper.
- `src/writer.ts:31–47` (`planWrites`) and `51–61` (`applyWrites`) — the conflict rule
  this feature narrowly exempts, and the one place the exemption can live.
- `src/generators/kiro.ts:39–41` — the `DOCS_LOOKUP_NOTE` that this feature falsifies
  (`G8`), and the general pattern of a capability note travelling to rendered output via
  `CapabilityMapping.notes` (`CLI-9`).
- `src/generators/claude-code.ts:30` — the `mcp__context7__*` tokens that motivated the
  whole feature, and (per Claude Code's own MCP documentation) the reason no per-role
  change is needed there: subagents do not inherit MCP tools automatically, and these
  explicit `tools:` entries are already the correct wiring.
- `specs/archived/cursor-kiro-copilot-generators/` and `specs/archived/codex-generator/`
  — the `AL-30` / `CG-1` precedent for shipping all tool facts together with dated
  first-party sources and an open, human-gated live-verification reservation.
- `specs/archived/ai-sdlc-readiness/contract.md` § "Verified per-tool root instruction
  files" — the exact table format `contract.md` § "Verified per-tool MCP facts" copies.
- `templates/hooks/README.md` and `templates/doctor/README.md` — the precedent for a
  tool-neutral, behavior-first mechanism document under `templates/`, and the `S7`
  discipline it is written under.

**External (all retrieved 2026-09-15; full citations in `contract.md`):**

- Context7's own client documentation (`docs/resources/all-clients.mdx`) — the per-client
  configuration snippets and the `https://mcp.context7.com/mcp` endpoint.
- Context7's Copilot CLI plugin README — the statement that an API key is optional and
  that an absent key means anonymous rate limits.
- Claude Code MCP documentation — `.mcp.json` shape, `${VAR}` expansion semantics,
  workspace-trust approval, `enabledMcpjsonServers` (named here only to record that
  harny will not write it).
- VS Code MCP configuration documentation — `.vscode/mcp.json` with the `servers` root
  key.
- Kiro MCP configuration documentation — `.kiro/settings/mcp.json` workspace file,
  `~/.kiro/settings/mcp.json` user file, workspace precedence, `mcpServers` root key,
  remote `url` support, and per-tool-call approval absent `autoApprove`.
- Codex configuration and MCP documentation — `[mcp_servers.<name>]`, the streamable-HTTP
  keys (`url`, `bearer_token_env_var`, `http_headers`, `env_http_headers`), project-trust
  gating of `.codex/config.toml`, and `codex mcp add`'s user-global write target.
- `openai/codex#13025` — the open Codex Desktop project-config issue behind `R-Codex`.
- `plan.md:138–146` — this repo's own statement of the intended default wiring and the
  five-row config-file table it is checked against.
