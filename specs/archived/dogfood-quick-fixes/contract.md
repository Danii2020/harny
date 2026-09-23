# Contract: dogfood-quick-fixes

Affected capabilities: **tool-generators** and **cli-init** (item 1, the MCP endpoint
value), **pipeline-roles** and **skill-library** (item 2, the role/skill hard rule),
**feedback-controls** (item 3's `extensions` wording and item 4's CI trigger).

Contract item ids use four feature-local prefixes, one per item, so every guarantee is
traceable to exactly one independent story (intent.md G6):

| Prefix | Item | Intent goal |
|---|---|---|
| `MO-` | 1 — Context7 endpoint → `/mcp/oauth` | G1 |
| `GR-` | 2 — "Never commit or push" hard rule | G2 |
| `DC-` | 3 — AL-11 stale `extensions` wording | G3 |
| `CI-` | 4 — CI push-to-`main` trigger | G4 |
| `XC-` | cross-cutting (dogfood, dependencies, suite) | G5, G6 |

## Interfaces

### Public API — `src/mcp.ts` (MODIFIED) — item 1, G1

One exported constant changes value. Its type, its name, its export, and every
importer are unchanged. The doc comment above it changes with the value, because it
currently asserts a property (`unauthenticated`) that the new value no longer has.

Before:

```ts
/** Context7's hosted, unauthenticated streamable-HTTP endpoint. Literalled exactly
 *  once in `src/` (`SC15`). Verified 2026-09-15 — see `contract.md` § "Verified
 *  per-tool MCP facts". No credential, credential placeholder, or env-var reference
 *  is ever written alongside it (`G9`, `SC11`). */
export const CONTEXT7_MCP_URL = 'https://mcp.context7.com/mcp';
```

After (the doc comment below is the normative text; wording may be re-wrapped to the
file's 90-column comment style but every claim in it must survive):

```ts
/** Context7's hosted streamable-HTTP endpoint, OAuth variant. Literalled exactly once
 *  in `src/` (`SC15`). Context7 serves the same MCP server at two paths: `/mcp`, which
 *  accepts anonymous requests at a shared rate limit or an `Authorization: Bearer
 *  <key>` header, and `/mcp/oauth`, which negotiates OAuth 2.0 with clients
 *  implementing the MCP authorization specification. harny writes `/mcp/oauth` for
 *  every tool — a deliberate departure from Context7's own per-client examples, which
 *  still show `/mcp`, taken because `/mcp` was observed not to work correctly in
 *  practice (see `intent.md` and ADR 0029). Endpoint re-verified 2026-09-22 against
 *  `/upstash/context7` `docs/howto/oauth.mdx` and `docs/resources/all-clients.mdx`.
 *  harny still writes no credential, credential placeholder, or env-var reference
 *  alongside it (`G9`, `SC11`) — the OAuth handshake, if a client performs one, is
 *  entirely between that client and Context7, and harny neither stores nor mediates
 *  any token. */
export const CONTEXT7_MCP_URL = 'https://mcp.context7.com/mcp/oauth';
```

Unchanged in the same file: `MCP_SERVER_NAME`, `McpMergeOutcome`, `McpMergeInput`,
`McpBuildOptions`, `McpBuildResult`, `mergeJsonMcpConfig`, `mergeTomlMcpConfig`,
`buildMcpFiles`, and every warning-message builder. The module doc comment's
"Facts verified 2026-09-15" line gains the 2026-09-22 endpoint re-verification
alongside it; the 2026-09-15 per-tool path/root-key/shape facts are **not** re-dated,
because this feature did not re-verify them.

### Public API — the five generators — item 1, G1

**No change.** All five already import the constant
(`src/generators/claude-code.ts:10`, `cursor.ts:13`, `kiro.ts:12`,
`github-copilot.ts:14`, `codex.ts:22`) and reference it as `CONTEXT7_MCP_URL` inside
their `mcpConfig.entry`. Their `mcpConfig` members keep their current `path`,
`format`, `rootKey`, and entry shapes verbatim:

```ts
// src/generators/claude-code.ts — unchanged
mcpConfig: { path: '.mcp.json',              format: 'json', rootKey: 'mcpServers', entry: { type: 'http', url: CONTEXT7_MCP_URL } },
// src/generators/cursor.ts — unchanged
mcpConfig: { path: '.cursor/mcp.json',       format: 'json', rootKey: 'mcpServers', entry: { url: CONTEXT7_MCP_URL } },
// src/generators/github-copilot.ts — unchanged
mcpConfig: { path: '.vscode/mcp.json',       format: 'json', rootKey: 'servers',    entry: { type: 'http', url: CONTEXT7_MCP_URL } },
// src/generators/kiro.ts — unchanged
mcpConfig: { path: '.kiro/settings/mcp.json', format: 'json', rootKey: 'mcpServers', entry: { url: CONTEXT7_MCP_URL } },
// src/generators/codex.ts — unchanged
mcpConfig: { path: '.codex/config.toml',     format: 'toml', rootKey: 'mcp_servers', entry: { url: CONTEXT7_MCP_URL } },
```

A change to any of these five lines is a contract violation (`AGENTS.md` S5,
`context7-mcp` MC-13): the whole point of item 1 is that one edit in one file reaches
five tools.

### Public API — `src/feedback.ts` (doc comment only) — item 3, G3

`CommandSpec<K>`'s shape, its `extensions?: readonly string[]` member, and
`ReadinessCommand`'s `{ readonly extensions?: never }` narrowing are all unchanged.
One sentence of one doc comment is replaced. This is the only edit item 3 makes to
`src/`:

```ts
export interface CommandSpec<K extends string> {
  readonly id: string;
  readonly kind: K;
  readonly argv: readonly string[];
  readonly pathMode: PathMode;
  /** **(NEW — feedback-path-hygiene.)** File-name suffixes this command accepts,
   *  each including its leading dot (e.g. `'.py'`). Consulted ONLY by the runner's
   *  turn-based `run` mode, and only for `per-file` commands: a touched path is
   *  passed to this command iff it ends with one of these suffixes (case-sensitive).
   *  **(A1.)** A valid entry is a non-empty string. Absent, not an array, empty
   *  (`[]`), or an array with no valid entry (e.g. `[null, '']`, `[5]`) all mean no
   *  extension filtering; when at least one valid entry is present, only the valid
   *  entries are matched and invalid ones are ignored (`[null, '', 5, '.py']` behaves
   *  as `['.py']`). An unusable list means "no filter", never "match nothing", so a
   *  misconfigured list can never silently disable a linter. Ignored by
   *  `whole-project` commands, by `run --whole-project` (whose `.` sentinel bypasses
   *  every path filter), and by the readiness runner. */
  readonly extensions?: readonly string[];
  readonly requires: ToolProbe;
}
```

The replaced sentence is exactly `Absent, or an empty array, means no extension
filtering.` (`src/feedback.ts:51`). Nothing else in the comment or the interface moves.

### Canonical content — `templates/roles/sdd-documentation.md` (MODIFIED) — item 2, G2

§ "Step 5: Hard Rules" gains a fourth bullet, appended after the existing third
("No scope creep"). The three existing bullets, and every other line of the file
including its § Role Metadata block, are byte-unchanged.

The new rule's normative text:

```markdown
- **Never commit or push.** Do not run `git commit`, `git push`, or any equivalent that
  records or publishes history — not for the documentation changes this role just made,
  not for the `Shipped:` stamp, not for the archive move, and never with a
  verification-skipping flag such as `--no-verify`. Leave every change in the working
  tree, staged or unstaged, exactly as this role left it, and list the changed files in
  the Step 6 change summary; deciding what gets committed, and when, is the human's
  call, including after the pipeline has finished. (The archive hand-off's own
  `git mv` is a move, not a commit, and stays allowed.)
```

Four properties this wording must keep (SC6):

1. It forbids `git commit` **and** `git push` explicitly, and rules out the
   `--no-verify` escape by name.
2. It says what to do **instead**: leave the working tree as-is and report the files in
   the Step 6 change summary.
3. It names no coding-agent tool (`AGENTS.md` S7). Naming `git` is not a violation —
   `git` is the version-control system the surrounding steps already assume, and
   `templates/skills/harny-sync/SKILL.md` already names `git mv` and `git ls-files`.
4. It carves out `git mv`, which `harny-sync` archive mode **requires** for rename
   detection. A rule that forbade "all git commands" would break the documented archive
   procedure; this one must not.

### Canonical content — `templates/skills/harny-document/SKILL.md` (MODIFIED) — item 2, G2

§ Guardrails gains a sixth bullet, appended after "Bootstrap mode is bounded and never
a shortcut". Same rule, in this document's own voice (it addresses "this skill" and
refers to `harny-sync`, not to numbered Steps of a role file):

```markdown
- **Never commit or push.** Do not run `git commit`, `git push`, or any equivalent that
  records or publishes history — not for the documentation changes this skill just made,
  not for the `Shipped:` stamp, not for the `harny-sync` archive move, and never with a
  verification-skipping flag such as `--no-verify`. Leave every change in the working
  tree, staged or unstaged, exactly as this skill left it, and list the changed files in
  the step 4 change summary; deciding what gets committed, and when, is the human's
  call, including after the pipeline has finished. (`harny-sync`'s own `git mv` during
  the archive move is a move, not a commit, and stays allowed.)
```

`.agents/skills/harny-document/SKILL.md` receives the **identical** bullet — the same
characters. The two roots' existing three-line difference in step 3.3 is a *declared*
divergence, registered in `tests/skills-fidelity.test.ts`'s `DIVERGENCE_TABLE` as
`'harny-document': { kind: 'diverges', requiredInTemplate: ['rather than assuming any
prior history exists'] }` and verified exhaustively by that file. Because the new bullet
goes into both copies identically, that declared divergence is unchanged and
`DIVERGENCE_TABLE` must **not** be edited (GR-9).

### Canonical content — `templates/ci/harny-feedback.yml` (MODIFIED) — item 4, G4

The `on:` block, which sits **outside** the `harny:begin`/`harny:end generated project
configuration` markers and is therefore canonical, copied verbatim into every generated
repo:

```yaml
on:
  pull_request:
  push:
    branches:
      - main
```

Replacing the current:

```yaml
on:
  pull_request:
```

The file's header comment additionally gains a short paragraph explaining the two
triggers and the hardcoded branch, in the header's existing voice, so the user reading
the generated workflow learns why `main` is there and how to change it. Normative
content of that paragraph:

```yaml
# Two triggers, both canonical: `pull_request` checks a change before integration, and
# `push` to `main` checks it after — a change merged or pushed straight to the default
# branch would otherwise never be checked at all. `main` is written literally because
# `harny init` cannot know a repository's default branch; if yours is named something
# else (`master`, `trunk`, `develop`), change it here — this is the one value in this
# file harny expects a project to adjust by hand. A pull-request branch never
# double-runs: `push` is filtered to `main`, so the two triggers never match the same
# commit on a topic branch.
```

Nothing inside the generated block changes; no `src/engine.ts` change; `renderCiWorkflow`
and `spliceGeneratedYamlBlock` are byte-unchanged.

### Archived artifact correction — `specs/archived/feedback-path-hygiene/contract.md` — item 3, G3

Two edits to a shipped, archived document, both textual:

1. § Interfaces' copy of the `CommandSpec.extensions` doc comment (line 39) has its
   sentence `Absent, or an empty array, means no extension filtering.` replaced with
   the same amended text `src/feedback.ts` receives, marked `**(A1.)**` in that file's
   own existing convention for post-audit text.
2. A dated correction note is added immediately **after** the existing
   `> **Post-audit amendment A1 (2026-09-22).**` block, not inside it:

```markdown
> **Text correction (2026-09-22, `dogfood-quick-fixes`).** A1's own note above lists the
> four sites it rewrote; § Interfaces' inline copy of the `CommandSpec.extensions` doc
> comment was not among them and still stated only the pre-A1 rule. That sentence is now
> brought in line with **PH-6** as amended below. This is a text alignment only: no
> guarantee, no behavior, and no audit finding changes, and A1's own record above is
> left exactly as written. Closes `audit.md` finding **AL-11**.
```

The `## Post-audit amendment A1` section at the end of that file, PH-6 itself, the
Error Handling rows, the `matchesExtensions` reference body, and every audit-log row
are **not** edited. The amendment's history is recorded, not rewritten.

### Data Models

**No new or modified data structure in any of the four items.** `CommandSpec<K>`,
`FeedbackCommand`, `ReadinessCommand`, `McpConfig`, `McpMergeOutcome`, `Generator`,
`StackProfile`, and every other exported type keep their current shape. The only
type-level fact this feature relies on is that `CONTEXT7_MCP_URL` is `string`, so
changing its value is not a typing event.

### State Changes

| Path | Change | Item | Notes |
|---|---|---|---|
| `src/mcp.ts` | MODIFIED | 1 | Constant value + its doc comment + module-header verification date |
| `templates/mcp/README.md` | MODIFIED | 1 | Published URL literal (line 78) and the surrounding endpoint/anonymity prose |
| `templates/roles/sdd-documentation.md` | MODIFIED | 2 | One appended bullet in § Step 5 |
| `templates/skills/harny-document/SKILL.md` | MODIFIED | 2 | One appended bullet in § Guardrails |
| `.agents/skills/harny-document/SKILL.md` | MODIFIED | 2 | Identical appended bullet (tracked) |
| `.claude/agents/sdd-documentation.md` | NOT MODIFIED | 2 | Thin pointer; gitignored; its behavior comes from the skill above, which is where the rule lands. See § "Why the live agent file is not edited" |
| `src/feedback.ts` | MODIFIED | 3 | One doc-comment sentence |
| `specs/archived/feedback-path-hygiene/contract.md` | MODIFIED | 3 | One doc-comment sentence + one correction note |
| `templates/ci/harny-feedback.yml` | MODIFIED | 4 | `on:` block + header paragraph |
| `.github/workflows/harny-feedback.yml` | REGENERATED | 4 / G5 | This repo's own dogfood copy, FC-13 |
| `package.json` | NOT MODIFIED | — | Out of scope by human decision |
| `src/engine.ts`, `src/generators/*`, `src/init.ts`, `src/writer.ts` | NOT MODIFIED | — | No mechanism changes |
| `templates/hooks/run-feedback.mjs`, `.sdd/feedback/run-feedback.mjs` | NOT MODIFIED | 3 | Already state A1 correctly; item 3 aligns the other two sites *to* this file |
| `.mcp.json` (this repo) | NOT CREATED | 1 | Absent today, not in FC-13's enumerated set; see intent.md |

#### Why the live agent file is not edited

`.claude/agents/sdd-documentation.md` is a 34-line thin pointer whose body says "this
file adds no rules of its own and never contradicts it", delegating wholly to the
`harny-document` skill preloaded through its `skills:` frontmatter. Adding a hard rule
to that body would contradict the body's own sentence and would be a local, gitignored,
undiffable change. The rule reaches this repo's live `sdd-documentation` agent through
`.agents/skills/harny-document/SKILL.md` (symlinked as `.claude/skills/harny-document`),
which is tracked, which is where all of that agent's actual instructions live, and which
is loaded into its context at startup. **GR-6 below makes this an explicit guarantee
rather than an omission.**

If the human prefers the live file also carry a local reminder, that is a one-line
manual edit outside this contract; it is not required for the fix to take effect and is
not specified here.

## Behavior Guarantees

### Item 1 — Context7 endpoint (G1)

1. **MO-1 — One literal, new value.** `CONTEXT7_MCP_URL` is
   `'https://mcp.context7.com/mcp/oauth'`, defined in `src/mcp.ts` and nowhere else.
   The quoted string `'https://mcp.context7.com/mcp/oauth'` (or its double-quoted form)
   occurs **exactly once** across all `.ts` files under `src/`, in `src/mcp.ts`.
2. **MO-2 — No stale literal survives.** The quoted string
   `'https://mcp.context7.com/mcp'` occurs **zero** times under `src/` and zero times
   under `templates/` after this feature. (The new URL contains the old one as a
   substring; every check for the old literal must therefore be a *quoted-string* or
   end-anchored check, never a bare `includes`, or it will false-positive forever.)
3. **MO-3 — All five tools get the new endpoint.** An `init` run selecting all five
   tools writes, at each tool's verified path and root key, an entry whose `url` is
   the new value and whose other fields are unchanged: `.mcp.json` →
   `{"type":"http","url":…}` under `mcpServers`; `.cursor/mcp.json` → `{"url":…}` under
   `mcpServers`; `.vscode/mcp.json` → `{"type":"http","url":…}` under `servers`;
   `.kiro/settings/mcp.json` → `{"url":…}` under `mcpServers`; `.codex/config.toml` →
   `url = "https://mcp.context7.com/mcp/oauth"` under `[mcp_servers.context7]`.
4. **MO-4 — Merge semantics unchanged.** `mergeJsonMcpConfig` and `mergeTomlMcpConfig`
   behave exactly as they do today at the new value: an existing `context7` entry is
   left `unchanged` without `--force`, replaced with `--force` on the JSON path and
   never on the TOML path (`MC-9`), an unparseable JSON file is `skipped` with the
   by-hand snippet in the warning, and re-running converges to byte-identical output
   (`cli-init.md` CLI-4).
5. **MO-5 — An existing `/mcp` entry is not migrated.** A repo already carrying a
   `context7` entry pointing at the old endpoint is reported `unchanged` (no `--force`)
   or replaced wholesale (`--force`, JSON only), by the existing rules. This feature
   adds **no** migration path, no detection of the old value, and no upgrade warning.
   Upgrading an existing repo is `npx harny init --force`, or a hand edit.
6. **MO-6 — Still no credential.** No generated MCP config contains an API key, a
   placeholder, an `Authorization` header, an `env`/`headers` key, or an
   environment-variable reference. `context7-mcp` G9 / SC11 hold verbatim at the new
   value.
7. **MO-7 — Prose matches the value.** No shipped file describes harny as writing
   Context7's "unauthenticated" endpoint while it writes `/mcp/oauth`. The two sites
   that do today — `src/mcp.ts`'s `CONTEXT7_MCP_URL` doc comment and
   `templates/mcp/README.md` (the literal at line 78, behavior item 6's
   "connects to Context7's hosted endpoint anonymously", and § "Using an API key"'s
   framing) — are corrected together with the value, in the same change.
8. **MO-8 — `templates/mcp/README.md` stays tool-neutral-first.** Its corrections keep
   `AGENTS.md` S7's shape: behavior stated first, each tool named only afterward as an
   attributed example. The five-file table's paths, root keys and approval-gate column
   are unchanged; only the endpoint sentence beneath it and the anonymity claims change.

### Item 2 — never commit or push (G2)

9. **GR-1 — The rule exists in the canonical role body.**
   `templates/roles/sdd-documentation.md` § "Step 5: Hard Rules" contains a bullet that
   forbids `git commit`, forbids `git push`, and names `--no-verify`.
10. **GR-2 — The rule says what to do instead.** The same bullet directs the role to
    leave the changes in the working tree and to list them in the Step 6 change summary.
11. **GR-3 — The rule does not break the archive hand-off.** The bullet explicitly
    exempts `git mv`, which `harny-sync` archive mode uses when the source directory is
    tracked. An implementation that forbids all `git` invocations violates this
    guarantee.
12. **GR-4 — Exactly one role gains the rule.** `templates/roles/sdd-architect.md`,
    `sdd-test-writer.md`, `sdd-executor.md`, and `sdd-auditor.md` are byte-identical
    before and after this feature.
13. **GR-5 — The rule reaches all five tools verbatim.** Because the bullet is inside
    the canonical role body, `tool-generators.md` TG-3/TG-4 carry it unchanged into
    `.claude/agents/sdd-documentation.md`, `.cursor/agents/sdd-documentation.md`,
    `.kiro/agents/sdd-documentation.md`, `.github/agents/sdd-documentation.agent.md`,
    and (inside the `developer_instructions` TOML string)
    `.codex/agents/sdd-documentation.toml` of any scaffolded repo. **No generator
    changes.**
14. **GR-6 — The rule reaches the thinned live agent.** The identical rule is present in
    `templates/skills/harny-document/SKILL.md` § Guardrails **and** in
    `.agents/skills/harny-document/SKILL.md` § Guardrails, byte-identical to each other.
    This is what makes the fix effective for a repo whose `sdd-documentation` agent is a
    thin pointer — including harny's own.
15. **GR-7 — No frontmatter, metadata or capability change.** The role template's
    `capabilities: read-files, write-files, run-shell` line is unchanged, and the skill's
    `allowed-tools: Read, Write, Edit, Glob, Bash` is unchanged. The rule is an
    instruction, not a permission narrowing: removing `Bash` would break the role's
    legitimate need to read the real diff (its own § Step 2 input 3).
16. **GR-8 — Codex's TOML limits still hold.** The added bullet contains no `'''`, no
    bare carriage return, and no control character, so `tool-generators.md` TG-7's
    unrepresentable-TOML check cannot fire; and the lengthened role body stays far under
    GitHub Copilot's 30,000-character body cap.
17. **GR-9 — The declared skill divergence is unchanged.** Because the new bullet is
    byte-identical in both skill roots, `harny-document`'s `DIVERGENCE_TABLE` entry in
    `tests/skills-fidelity.test.ts` (`requiredInTemplate: ['rather than assuming any
    prior history exists']`) still holds with no edit, and
    `tests/skills-fidelity.test.ts` passes unchanged. Editing `DIVERGENCE_TABLE` as part
    of this feature is a contract violation.

### Item 3 — AL-11 (G3)

18. **DC-1 — `src/feedback.ts` states the amended rule.** The
    `CommandSpec.extensions` doc comment states all four no-filter cases (absent, not an
    array, empty, no valid entry), defines "valid entry" as a non-empty string, and
    states the mixed-list behavior (only valid entries match).
19. **DC-2 — The archived contract's § Interfaces copy says the same**, carries the
    `**(A1.)**` marker, and is accompanied by a dated correction note that names AL-11
    and states plainly that it is a text alignment to PH-6 as amended later in the same
    file.
20. **DC-3 — A1's own record is untouched.** The `> **Post-audit amendment A1
    (2026-09-22).**` block, the `## Post-audit amendment A1` section, PH-6 itself, the
    Error Handling rows and every `## Audit Log` row in that feature's archived files are
    byte-unchanged. No audit finding is re-graded and no verdict is restated.
21. **DC-4 — Zero behavior change.** No executable statement in `src/feedback.ts`
    changes; `templates/hooks/run-feedback.mjs` and `.sdd/feedback/run-feedback.mjs` are
    byte-unchanged; the set of passing and failing tests is identical before and after
    item 3 in isolation; `npm run typecheck` is clean.
22. **DC-5 — Three sites now agree.** `src/feedback.ts`'s comment,
    `templates/hooks/run-feedback.mjs`'s `matchesExtensions` comment, and the archived
    contract's § Interfaces copy make the same four claims about `extensions`. They are
    allowed to differ in wrapping and voice, never in content.

### Item 4 — CI push trigger (G4)

23. **CI-1 — Both triggers, exact shape.** `templates/ci/harny-feedback.yml` declares
    `on:` with `pull_request:` (no filters, unchanged) and `push:` with
    `branches:` containing exactly `main`. Both are inside the canonical region, outside
    the generated-block markers.
24. **CI-2 — `main` is hardcoded, deliberately.** The branch name is a literal, not
    derived. *Rationale, and the alternative rejected:* `harny init` cannot know a
    target repository's default branch without either asking the user (a new prompt and
    a new `HarnessConfig` field — disproportionate for a one-line default) or shelling
    out to git (`git symbolic-ref refs/remotes/origin/HEAD`, which fails in a repo with
    no remote, a fresh `git init` with no commits, or no git at all, and would make
    generated output non-deterministic across machines, violating `AGENTS.md` S3 and
    `cli-init.md` CLI-4). Deriving it would also require moving `on:` inside the
    generated block, contradicting the template header's own statement that the trigger
    structure "is canonical and copied verbatim by every run" and adding a second YAML
    construction site (`ADR 0015`: no YAML dependency). `main` is GitHub's default for
    new repositories, so it is correct for the common case; it is wrong only for a repo
    using a different default branch, and that case is handled by the header comment
    telling the reader exactly which line to change. **This decision earns ADR 0030.**
25. **CI-3 — No duplicate run on a pull-request branch.** GitHub evaluates `push` and
    `pull_request` independently; with `push.branches: [main]` the push trigger matches
    only commits pushed to `main`, and a topic branch backing a PR is by definition not
    `main`. So a PR branch produces exactly one `harny-feedback` run (from
    `pull_request`), and a merge or direct push to `main` produces exactly one (from
    `push`). Verified against `docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax`
    § `on.push.branches` and § `on.<pull_request>.branches`, re-fetched 2026-09-22.
26. **CI-4 — No `src/` change.** `renderCiWorkflow`, `spliceGeneratedYamlBlock`,
    `renderInstallGateChain`, `renderRunnerInvocation` and `buildFeedbackFiles` in
    `src/engine.ts` are byte-unchanged, and the generated block's contents are
    byte-identical to what they are today for the same config.
27. **CI-5 — One workflow, still byte-identical across tool selections.**
    `feedback-controls.md` FC-7's "exactly one workflow file, byte-identical across all
    selections" holds at the new trigger shape.
28. **CI-6 — The workflow remains valid YAML** with the `on:` mapping carrying two keys,
    `pull_request` with an empty (null) value as today and `push` with a `branches`
    sequence. The markers `harny:begin`/`harny:end generated project configuration`
    remain at the same nesting depth inside `steps:`, so `spliceGeneratedYamlBlock`'s
    indentation derivation is unaffected.

### Cross-cutting (G5, G6)

29. **XC-1 — FC-13 dogfood byte-identity.** After this feature, this repo's
    `.github/workflows/harny-feedback.yml` is byte-identical to the file a fresh
    `npx harny init --tools claude-code --stack typescript` writes into a scratch
    directory. The other seven FC-13 paths (`.claude/settings.json`,
    `.sdd/feedback/run-feedback.mjs`, `.sdd/shared/probes.mjs`,
    `.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`, `.sdd/harness.json`,
    `.sdd/spec-schema/*.md`) are byte-unchanged by this feature and remain identical.
30. **XC-2 — No new dependency.** `package.json`'s `dependencies` and `devDependencies`
    are byte-unchanged (`AGENTS.md` S4). No TOML parser, no YAML parser, no HTTP client
    is added. `tests/packaging.test.ts` is not edited.
31. **XC-3 — Exactly one pre-existing failure.** `npm test` after this feature reports
    624 passing and 1 failing, the failure being `tests/packaging.test.ts`'s
    `devDependencies` pin (`vitest: '4.1.10'` vs `^4.1.11`) — plus however many tests
    this feature itself adds, all of which must pass.
32. **XC-4 — The non-mutation sweep needs no allowlist change.**
    `tests/canonical-fidelity.test.ts`'s `isContractedEntry` already returns true for
    `templates/ci/**` and for the exact path `templates/roles/sdd-documentation.md`.
    Adding an allowlist entry for either is a contract violation — it would mask a real
    leak. `templates/skills/**` is likewise already allowlisted, covering item 2's skill
    edit.
33. **XC-5 — Four independent verification stories.** Each of MO-*, GR-*, DC-*, CI-* is
    verifiable with the other three items reverted. No task in one item's phase reads or
    writes a file another item's phase touches. (Verified: the four items' file sets are
    disjoint.)
34. **XC-6 — Every capability statement this feature does not amend still holds.**
    `cli-init.md` CLI-1, CLI-4, CLI-5, CLI-8, CLI-10, CLI-11; `tool-generators.md`
    TG-1, TG-3, TG-4, TG-5, TG-6, TG-10, TG-12; `feedback-controls.md` FC-1 through
    FC-6, FC-8 through FC-12, FC-14 through FC-24; `skill-library.md` SL-1 through
    SL-10 are unchanged in content and remain true. In particular the packaged
    `templates/**` file count stays at thirty-one (CLI-10): this feature creates and
    deletes no template file.

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| A tool's MCP client does not implement the MCP OAuth specification, so `/mcp/oauth` fails to connect | Not detected by harny: `init` writes the entry and exits 0. The tool reports its own connection error at first use | The `docs-lookup` capability's tokens resolve to a failing server in that tool. **Accepted, carried as reservation `R-OAuth`** (intent.md § Non-Goals); remedy is a hand edit of that one tool's config back to `/mcp` |
| A repo already carries a `context7` entry at the old `/mcp` endpoint | `unchanged` outcome, `io.warn` names the path and suggests `--force` (existing `jsonUnchangedWarning`/`tomlUnchangedWarning`) | User re-runs with `--force` (JSON tools) or hand-edits (Codex TOML); MO-5 — no automatic migration |
| A generator is found re-literalling the endpoint instead of importing it | `tests/mcp.test.ts`'s single-literal check fails | Caught at test time, before any release (MO-1) |
| A grep for the old literal is written as a bare substring check | It matches the new URL (which contains the old as a prefix) and reports a false positive forever | Prevented by MO-2's requirement that any such check be quoted-string or end-anchored |
| The `sdd-documentation` role is invoked in a repo with no git | The hard rule is a prohibition, not an action, so nothing is attempted and nothing fails | No impact |
| The role runs with the hard rule present but without `Bash` in its tool set | It cannot read the real diff (§ Step 2 input 3) and reports that limitation | Unchanged by this feature; GR-7 forbids narrowing tools as the fix |
| A scaffolded repo's default branch is not `main` | The `push` trigger never matches, so behavior is exactly today's (PR-only checking) — a silent no-op, never an error or a failed workflow | The header comment names the line to change (CI-2). Documented degradation, not a failure |
| A repo has no `.github/workflows/` (e.g. GitLab, Bitbucket) | Unchanged: the workflow is written and simply never read, as today | No impact |
| Amending `specs/archived/feedback-path-hygiene/contract.md` breaks its recorded checksums | Not possible: `harny-sync` archive mode records and verifies SHA-256 **during the move**, not afterward, and stores no checksum file | No impact; item 3's edit is a normal post-archive correction (DC-3 bounds it) |
| `npm test` is run without `npm run build` after item 1 | `tests/e2e-init.test.ts` validates a stale `dist/` and can false-green the endpoint change (standing reservation `AL-20`) | Mitigated by tasks.md sequencing `npm run build` before e2e verification |

## Dependencies

- **Internal (item 1):** `src/mcp.ts` ← imported by all five `src/generators/*.ts`;
  `src/generators/json.ts`, `src/generators/toml.ts` (unchanged consumers).
- **Internal (item 2):** `templates/roles/sdd-documentation.md` ← read by
  `src/templates.ts`, rendered by all five generators' `renderRole`;
  `templates/skills/harny-document/SKILL.md` ← copied to each generator's `skillsDir`;
  `.agents/skills/harny-document/SKILL.md` ← symlinked as
  `.claude/skills/harny-document`, preloaded by `.claude/agents/sdd-documentation.md`'s
  `skills:` frontmatter.
- **Internal (item 3):** `src/feedback.ts` (comment only);
  `specs/archived/feedback-path-hygiene/contract.md` (prose only). Neither is imported
  by the other.
- **Internal (item 4):** `templates/ci/harny-feedback.yml` ← loaded by
  `src/templates.ts` as `payload.ciWorkflowTemplate`, spliced by
  `src/engine.ts`'s `renderCiWorkflow`.
- **External packages:** **none added, none changed, none removed.** Runtime stays
  `commander@15.0.0`, `@clack/prompts@1.7.0`; dev stays `typescript@7.0.2`,
  `vitest@^4.1.11`, `@types/node@26.1.2` (`AGENTS.md` S4; `cli-init.md` invariant 3 —
  note that invariant still records `vitest@4.1.10`, a pre-existing inaccuracy this
  feature is forbidden from fixing).
- **Documentation sources re-verified for this contract (2026-09-22):** Context7
  `/upstash/context7` `docs/howto/oauth.mdx`, `docs/resources/all-clients.mdx`;
  GitHub Actions `/websites/github_en_actions`
  `docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax`,
  `docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow`.

## Integration Points

- **`src/mcp.ts` → five generators → `buildMcpFiles` → `runInit` step 11 → write plan.**
  Item 1 rides this existing path end to end with no structural change; its correctness
  is entirely a matter of one value and the single-literal invariant.
- **`templates/roles/` → `loadCanonicalTemplates` → `renderRole` → five tool outputs.**
  Item 2's role-body change rides `tool-generators.md` TG-3's byte-for-byte guarantee;
  `tests/canonical-fidelity.test.ts` is the existing enforcement.
- **`templates/skills/` → each generator's `skillsDir`; `.agents/skills/` → `.claude/skills/`
  symlink bridge → this repo's own thinned agents.** Item 2's skill-body change rides
  both, and is what makes the fix real for harny itself (GR-6).
- **`templates/ci/` → `payload.ciWorkflowTemplate` → `renderCiWorkflow` →
  `.github/workflows/harny-feedback.yml`.** Item 4 changes only the canonical half of
  this path.
- **`feedback-controls.md` FC-7 / FC-13 → this repo's own workflow.** Item 4 forces the
  dogfood regeneration; the regeneration is what keeps FC-13 true.
- **`harny-audit` Step 6 → CI status.** With item 4 in place, an auditor checking "the
  CI gate is green" (FC-12) has a run to check on a direct-to-`main` ship, which is the
  gap AL-5 recorded.

## Amendments to current-truth statements

Applied by `harny-sync` archive mode after this feature ships.

| Statement | Amendment |
|---|---|
| `feedback-controls.md` **FC-7** ("triggering on `pull_request`"; scenario "the workflow declares `on: pull_request`") | Rewrite to: triggers on `pull_request` **and** on `push` to `main`; the scenario's assertion becomes "declares both a `pull_request` trigger and a `push` trigger filtered to `main`". Everything else in FC-7 (exactly one workflow, byte-identical across tool selections, two step kinds) is unchanged |
| `feedback-controls.md` **FC-23** | No content change. Confirm its wording still matches the now-aligned `src/feedback.ts` comment and PH-6 (it already states the A1 rule correctly) |
| `feedback-controls.md` § Contributing features | Add `dogfood-quick-fixes` with its `Shipped:` date and "FC-7 push-to-`main` trigger; AL-11 `extensions` wording alignment" |
| `feedback-controls.md` § Open reservations | No change. (AL-11 lived in the feature's own `audit.md`, not in this capability's reservation table.) |
| `tool-generators.md` **TG-1**, **TG-10** | No content change; the `mcpConfig` member and the artifact counts are unaffected by an endpoint value change. Add `dogfood-quick-fixes` to § Contributing features noting the endpoint value change |
| `cli-init.md` **CLI-4**, **CLI-5**, **CLI-10** | No content change. Record in § Contributing features that the Context7 endpoint value changed to `/mcp/oauth` and that the packaged template count is unchanged at thirty-one |
| `pipeline-roles.md` | Add a statement (or extend the nearest existing one) that the `sdd-documentation` role's canonical body carries a hard rule forbidding commit and push, and that this rule is the only per-role git-safety rule in the set — the other four roles deliberately do not carry it |
| `skill-library.md` | Record that `harny-document`'s § Guardrails carries the same rule, and that it is the layer the thinned live agents actually execute (SL-5's degradation mode made concrete) |
| `_index.md` § Keyword lookup | Add rows: `git commit / push (role safety)` → `pipeline-roles`; `push trigger / main branch` → `feedback-controls`; `OAuth / mcp/oauth` → `cli-init` |
| `_index.md` § Decisions | Register **ADR 0029** (Context7 `/mcp/oauth` for all five tools; capability `cli-init`) and **ADR 0030** (hardcode `main` in the CI push trigger; capability `feedback-controls`) |
| `_index.md` § Open reservations | Add **`R-OAuth`** — MEDIUM (human-gated): `/mcp/oauth` is documented as gated on a client implementing the MCP OAuth specification and was never loaded into a live install of any of the five tools; same AL-30 / CG-1 class. No other reservation is added — the `.agents/skills/` ↔ `templates/skills/` differences observed during this feature are **declared** divergences, already covered by `tests/skills-fidelity.test.ts`'s `DIVERGENCE_TABLE`, not open drift |

## Questions resolved at the human gate

> All three were raised for the post-specs gate and all three are now answered. The
> human approved all four items as specced on 2026-09-22. Nothing below reopens a
> guarantee — these are decisions the executor may rely on.

1. **RESOLVED — NO. The live `.claude/agents/sdd-documentation.md` is not edited.**
   The human took this contract's recommendation: the rule lands in
   `templates/roles/sdd-documentation.md` and in both `harny-document/SKILL.md` copies
   only, and the gitignored thin-pointer agent file is deliberately left alone (the
   reasons already recorded in § "Why the live agent file is not edited", plus GR-6).
   The human added a second reason: a separate `rules-layer` feature is now queued
   which is expected to single-source this kind of rule, so adding a *third* copy now
   would be churn that feature would immediately have to undo. **Consequence for
   `tasks.md`:** no Task 2.10 is added; the File Change Map's "NOT MODIFIED" entry for
   `.claude/agents/sdd-documentation.md` stands as written.
2. **RESOLVED — AUTHORIZED. The executor may regenerate this repo's
   `.github/workflows/harny-feedback.yml` (XC-1).** On exactly the terms
   `feedback-path-hygiene` set: produced **by running the generator**, never
   hand-edited; then `diff`-proven byte-identical against a fresh scratch
   `npx harny init --tools claude-code --stack typescript`; with provenance recorded in
   `audit.md` (Task 4.7). Tasks 4.5 and 4.6 are unblocked as written.
3. **RESOLVED — accepted as stated. SC17 is a post-merge observation.** The human
   accepts that a green `harny-feedback` run on a push to `main` cannot exist before
   this feature is pushed, and that it will be a carried reservation at audit time
   rather than a pre-merge check — exactly as `audit.md` § "Expected carried
   reservations" already pre-declares it. No change to SC17, R17, or the Blocked Items
   list.
