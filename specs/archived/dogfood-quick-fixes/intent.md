# Intent: dogfood-quick-fixes

**Shipped: 2026-09-22**

## Problem Statement

Four unrelated, independently-caused defects share one root property: **the harness
harny ships is subtly wrong**, and every one of them was found by running harny
against real work rather than by reading harny's own code. Three come from dogfooding
harny into a separate production repository (`project-agentcore-app`); the fourth is a
reservation left open by the audit of the feature shipped immediately before this one
(`feedback-path-hygiene`). None is large enough to justify its own pipeline run, and
none depends on any other. They are grouped deliberately, by the human, as one
maintenance feature with four independent verification stories.

### Item 1 — the Context7 MCP endpoint does not work in practice

`src/mcp.ts:32` holds `export const CONTEXT7_MCP_URL = 'https://mcp.context7.com/mcp';`
— literalled exactly once in `src/` by contract (`context7-mcp` · contract.md `MC-13`,
intent.md `SC15`) and imported by all five generators
(`src/generators/claude-code.ts:223`, `cursor.ts:257`, `kiro.ts:253`,
`github-copilot.ts:228`, `codex.ts:285`). Every `npx harny init` run therefore writes
that endpoint into five different tools' MCP configuration files, and harny's own
`templates/mcp/README.md:78` publishes it to users as the endpoint in use.

The reported symptom is that the plain `/mcp` endpoint **did not work correctly in
practice**. Context7's own documentation, re-fetched today (2026-09-22) through the
Context7 MCP server itself (`/upstash/context7`), documents a second endpoint:

- `docs/howto/oauth.mdx`: "Change the client endpoint URL from `/mcp` to `/mcp/oauth`
  to enable OAuth 2.0 authentication. OAuth is only available for remote HTTP
  connections, not stdio transport."
- `docs/resources/all-clients.mdx`: "Context7 MCP server supports OAuth 2.0
  authentication for MCP clients that implement the MCP OAuth specification
  (`https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization`). To
  use OAuth, change the endpoint from `/mcp` to `/mcp/oauth`." The plain `/mcp`
  endpoint works without an API key at an anonymous rate limit, or with an
  `Authorization: Bearer <key>` header.

Context7's own per-client examples (Cursor, Kiro, Codex) still show plain `/mcp`; the
OAuth endpoint is documented as a client-capability-gated opt-in, not the per-client
default. Shipping `/mcp/oauth` for all five tools is therefore a deliberate departure
from the vendor's per-client defaults, made by the human on the strength of the
observed failure. It is recorded here, and earns an ADR, precisely because it is a
departure — not because it is in doubt.

### Item 2 — the `sdd-documentation` role commits without being asked

Real incident, `project-agentcore-app`, `web-feed-ui` feature, 2026-09-18: the
`sdd-documentation` subagent ran `git commit` on its own documentation changes without
ever being asked to. The role runs as the pipeline's one automatic, non-gated handoff,
so nothing stood between it and the repository.

Root cause, verified in this repo today: a repo-wide grep for `never commit`,
`--no-verify`, and `git push` across `templates/`, `.claude/agents/`, and
`.claude/skills/` returns **nothing**. A custom subagent's system prompt is built from
its own role template alone — it does **not** inherit the top-level harness's "never
commit unless the human asks" policy. `templates/roles/sdd-documentation.md` grants
`run-shell` (`capabilities:` line 9), and the live Claude Code frontmatter grants
`Bash` (`.claude/agents/sdd-documentation.md:13`), so a model with shell access, no
git rule, and a finished task falls back to the generic "finish the task → commit it"
pattern. The role template's § "Step 5: Hard Rules" (lines 49–53) carries three rules;
none of them is about git.

### Item 3 — a doc comment still describes pre-amendment semantics (AL-11)

`feedback-path-hygiene`'s post-audit amendment A1 changed the semantics of
`CommandSpec.extensions`: an array with no *valid* entry (e.g. `[null, '']`, `[5]`)
now means "no filter", exactly like an absent, non-array, or empty array. The amended
rule is stated at `specs/archived/feedback-path-hygiene/contract.md` § PH-6 and
implemented correctly by `matchesExtensions`
(`templates/hooks/run-feedback.mjs:176–187`, whose own doc comment states A1 in full).

Two sites still describe only the pre-amendment rule, both saying "Absent, or an empty
array, means no extension filtering":

- `src/feedback.ts:51` — the `CommandSpec.extensions` doc comment.
- `specs/archived/feedback-path-hygiene/contract.md:39` — the copy of that same doc
  comment inside § Interfaces.

The audit recorded this as **AL-11 (LOW)**, accepted as a reservation with the explicit
resolution "Documentation/archive pass: align the wording with the amended PH-6". This
feature closes it. The statements are *incomplete*, not false; no behavior is wrong and
no code changes.

### Item 4 — a push straight to `main` produces no CI run at all

`templates/ci/harny-feedback.yml:20–21` declares `on:` with only `pull_request:`.
Consequence, observed yesterday: shipping `feedback-path-hygiene` directly to `main`
produced **no `harny-feedback` run at all**, so that feature's audit finding AL-5
(confirm a green `harny-feedback` run reporting "N of 2 command(s) ran" with N ≥ 1)
could not be closed by evidence. The post-integration feedback sensor
(`AGENTS.md` § "Feedforward vs. feedback", `feedback-controls.md` FC-7) is simply
absent on the one integration path a small team uses most.

The workflow's own header comment states that "This structure (triggers, checkout) is
canonical and copied verbatim by every run", and the `on:` block sits **outside** the
`harny:begin/end generated project configuration` markers that `renderCiWorkflow`
splices into (`src/engine.ts:264–287`). So this is a canonical-content change with no
`src/` change, and every repo ever scaffolded by a later harny gets it.

## Corrections to the brief's stated premises

Two premises the task brief asserted were checked against the repository and one is
wrong. Neither changes the scope; both change how the work must be done, so they are
recorded here rather than discovered by the executor.

1. **`.claude/agents/sdd-documentation.md` does NOT carry the template's body.** The
   brief states "its body currently matches the template's body". It does not. The live
   file is a **thin pointer** (34 lines): Claude Code YAML frontmatter, then "Your
   instructions live in the `harny-document` skill, preloaded into this context. Follow
   it exactly. It is the single source of truth for this role's behavior; this file
   adds no rules of its own and never contradicts it." Its `skills:` frontmatter
   preloads `harny-document`, `harny-sync`, `harny-adr`. This is the thinned-agent shape
   `skill-library.md` SL-5 describes, and ADR 0013 explicitly records that the live
   pipeline is thinned while `templates/roles/` stays full-body.

   The consequence is material: adding the rule **only** to
   `templates/roles/sdd-documentation.md` fixes every *scaffolded* repo (the generated
   role artifact carries `template.body` verbatim and no `skills:` key — see
   `src/generators/claude-code.ts` `renderRole`), which is exactly the
   `project-agentcore-app` failure mode. But it would **not** reach harny's own
   `sdd-documentation` agent, whose behavior comes from
   `.agents/skills/harny-document/SKILL.md` § Guardrails. Both layers must carry the
   rule. ADR 0013's own "Accepted costs" already anticipates this: "The repository's own
   code maintainers must update both places if they customize a role (the role file and
   the skill)."

2. **`.mcp.json` does not exist in this repo, and FC-13 does not require it.** The
   brief asks to "check whether this repo has its own `.mcp.json` that must follow".
   It does not have one (`ls .mcp.json` → no such file), it is not gitignored, and
   `feedback-controls.md` FC-13 enumerates exactly eight dogfood paths
   (`.claude/settings.json`, `.github/workflows/harny-feedback.yml`,
   `.sdd/feedback/run-feedback.mjs`, `.sdd/shared/probes.mjs`,
   `.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`, `.sdd/harness.json`,
   `.sdd/spec-schema/*.md`) — no MCP config among them. `context7-mcp` never claimed a
   dogfood MCP artifact for harny itself. **Item 1 therefore creates no dogfood
   lockstep obligation**, and creating one here is a non-goal (below).

## Goals

1. **G1 — The Context7 endpoint harny writes is `/mcp/oauth`, everywhere, from one
   literal.** `CONTEXT7_MCP_URL` becomes `https://mcp.context7.com/mcp/oauth`, all five
   generators pick it up through the existing import, and the URL still appears exactly
   once in `src/`. The prose that describes it — `src/mcp.ts`'s own doc comment, which
   currently calls the endpoint "hosted, unauthenticated", and
   `templates/mcp/README.md`, which publishes the literal to users — changes with the
   value, so no shipped sentence describes an endpoint harny no longer writes.
2. **G2 — The `sdd-documentation` role can never commit or push on its own
   initiative.** An explicit hard rule covering commit *and* push, saying what to do
   instead, reaches both the canonical role body
   (`templates/roles/sdd-documentation.md` § "Step 5: Hard Rules") and the skill body
   that the thinned live agents actually execute (`templates/skills/harny-document/`
   and `.agents/skills/harny-document/` § Guardrails), in tool-neutral language and in
   the voice of the rules already there.
3. **G3 — AL-11 is closed: no shipped text still states only the pre-A1 `extensions`
   rule.** `src/feedback.ts:51` and
   `specs/archived/feedback-path-hygiene/contract.md:39` are brought in line with
   PH-6's amended wording, which `templates/hooks/run-feedback.mjs`'s own comment
   already states correctly. Prose only: no code, no behavior, no test outcome changes.
4. **G4 — A direct push to `main` is checked by CI.**
   `templates/ci/harny-feedback.yml`'s canonical `on:` block gains a push trigger
   scoped to `main`, so the post-integration sensor fires on the integration path that
   today produces nothing, without producing a duplicate run for an ordinary
   pull-request branch.
5. **G5 — This repo's own harness stays in lockstep (FC-13).** Item 4 changes a
   canonical template that FC-13 names, so this repo's
   `.github/workflows/harny-feedback.yml` is regenerated from the changed template in
   the same feature and stays byte-identical to a fresh `harny init` output. Item 2's
   rule reaches this repo's own live `sdd-documentation` agent path.
6. **G6 — Four items, four independent verification stories.** Every contract guarantee
   traces to exactly one item; no task in one item's phase depends on another item's
   phase; the audit can approve or reject any one item without touching the other three.

## Success Criteria

### Item 1 — `/mcp/oauth`

- [ ] **SC1** — `CONTEXT7_MCP_URL` in `src/mcp.ts` equals
      `'https://mcp.context7.com/mcp/oauth'`.
- [ ] **SC2** — The existing single-literal check in `tests/mcp.test.ts`
      ("the quoted Context7 endpoint URL appears exactly once in `src/`") still passes
      against the new value: the quoted URL occurs exactly once across all of `src/`,
      in `src/mcp.ts`, and no generator re-literals it.
- [ ] **SC3** — A run selecting all five tools writes the new endpoint into all five
      native MCP configs: `.mcp.json` (`{type:'http', url}`), `.cursor/mcp.json`
      (`{url}`), `.vscode/mcp.json` under `servers` (`{type:'http', url}`),
      `.kiro/settings/mcp.json` (`{url}`), and `.codex/config.toml` as
      `url = "https://mcp.context7.com/mcp/oauth"` under `[mcp_servers.context7]`.
- [ ] **SC4** — No shipped prose still calls the endpoint "unauthenticated" while harny
      writes the OAuth endpoint: `src/mcp.ts`'s `CONTEXT7_MCP_URL` doc comment and
      `templates/mcp/README.md` (the literal at line 78, and every surrounding claim
      that depends on it) state what harny actually writes and why.
- [ ] **SC5** — Still no credential, credential placeholder, or environment-variable
      reference is written alongside the URL in any generated file (`context7-mcp` G9 /
      SC11 unchanged).

### Item 2 — never commit or push

- [ ] **SC6** — `templates/roles/sdd-documentation.md` § "Step 5: Hard Rules" carries a
      fourth rule that (a) forbids `git commit`, (b) forbids `git push`, (c) names what
      to do instead — leave the changes on disk for the human and report them in the
      Step 6 change summary — and (d) names no tool, matching `AGENTS.md` S7 and the
      voice of the three rules already present.
- [ ] **SC7** — The same rule, in the same words as far as each document's voice allows,
      appears in `templates/skills/harny-document/SKILL.md` § Guardrails and in
      `.agents/skills/harny-document/SKILL.md` § Guardrails, so the thinned live agent
      (which reads the skill, not the role body) is covered too.
- [ ] **SC8** — The rule reaches all five tools' generated role artifacts verbatim, by
      the existing canonical-body mechanism — no generator change, verified by
      `tests/canonical-fidelity.test.ts`'s existing byte-for-byte checks plus one new
      assertion that the rule's distinctive sentence is present in each generator's
      output.
- [ ] **SC9** — Only `sdd-documentation` gains the rule. `templates/roles/sdd-architect.md`,
      `sdd-test-writer.md`, `sdd-executor.md`, and `sdd-auditor.md` are byte-unchanged.

### Item 3 — AL-11

- [ ] **SC10** — `src/feedback.ts`'s `CommandSpec.extensions` doc comment states the
      amended PH-6 rule (absent, not an array, empty, or no valid entry ⇒ no filter;
      valid entries are non-empty strings; with at least one valid entry only the valid
      entries match), consistent with `templates/hooks/run-feedback.mjs`'s
      `matchesExtensions` comment.
- [ ] **SC11** — `specs/archived/feedback-path-hygiene/contract.md`'s § Interfaces copy
      of that comment says the same, with a plainly-stated note that this is a
      text-alignment correction bringing § Interfaces in line with amendment A1 already
      stated later in that same document — the amendment's own history is not rewritten.
- [ ] **SC12** — Item 3 changes zero behavior: no `.ts`/`.mjs` statement changes, the
      test suite's pass/fail set is identical before and after, and `npm run typecheck`
      is clean.

### Item 4 — CI push trigger

- [ ] **SC13** — `templates/ci/harny-feedback.yml`'s `on:` block declares both
      `pull_request:` (unchanged, unfiltered) and a push trigger restricted to `main`.
- [ ] **SC14** — A generated workflow for any stack and any tool selection carries both
      triggers, and the `on:` block remains outside the generated-block markers (no
      `src/engine.ts` change).
- [ ] **SC15** — Pushing a pull-request branch does not double-run: the push trigger's
      branch filter excludes every branch but `main`, so the `push` event and the
      `pull_request` event never both fire for the same commit on a PR branch.
- [ ] **SC16** — This repo's own `.github/workflows/harny-feedback.yml` is regenerated
      and is byte-identical to a fresh `npx harny init --tools claude-code --stack
      typescript` output (FC-13).
- [ ] **SC17** — A green `harny-feedback` run exists on a push to `main` after this
      feature lands — the evidence AL-5 could not produce.

### Cross-cutting

- [ ] **SC18** — `npm test` reports 1 failure, and exactly one: the pre-existing,
      out-of-scope `tests/packaging.test.ts` vitest pin. Baseline confirmed today at
      624 of 625 passing.
- [ ] **SC19** — No new runtime or dev dependency (`AGENTS.md` S4); `package.json` is
      byte-unchanged.
- [ ] **SC20** — Each of the four items is verifiable on its own: the audit can mark
      any one PASS or FAIL without inspecting the other three.

## Non-Goals

- **Re-litigating `/mcp/oauth`.** The human has decided: `/mcp/oauth` for all five
  tools. This supersedes `plan.md`'s own queue entry for this feature ("verify MCP OAuth
  support per tool; fall back to `/mcp` only where unsupported"). Per-tool fallback is
  explicitly not built. The known cost — that `/mcp/oauth` is documented as gated on a
  client implementing the MCP OAuth specification, and that none of the five tools was
  tested against it in a live install — is accepted and carried as a reservation, in
  the same AL-30 / CG-1 class this repo already carries for every per-tool fact.
- **Giving the "never commit or push" rule to all five roles.** The human scoped it to
  `sdd-documentation` alone. `sdd-executor` and `sdd-test-writer` also hold `run-shell`;
  extending the rule to them is a separate decision, not made here.
- **Building a rules layer.** Item 2 deliberately writes the same rule twice — into the
  canonical role body and into the `harny-document` skill body — because that is the only
  way to reach both a scaffolded full-body role and a thinned live agent today (GR-5,
  GR-6; ADR 0013's recorded accepted cost). That duplication is expected to be
  single-sourced by the queued **`rules-layer`** feature (`plan.md` spec queue item 6),
  which was confirmed viable on 2026-09-22: all five tools have an always-on rules
  mechanism (`.claude/rules/**/*.md`; `.cursor/rules/*.mdc` with `alwaysApply`;
  `.kiro/steering/*.md` with `inclusion:`; `.github/copilot-instructions.md` plus
  `.github/instructions/*.instructions.md` with `applyTo:`; Codex has no rules directory
  — its equivalent is the nested `AGENTS.md`/`AGENTS.override.md` chain). That feature is
  advisory-only and **not in this scope**; *enforcement* of "never commit" (a
  `PreToolUse` deny riding the existing per-generator `hooksPath`) belongs to the queued
  `commit-checks` feature, because rules are context, not enforced configuration, in all
  five tools. Nothing here anticipates either feature's design.
- **Retiring or consolidating `sdd-documentarian`.** `plan.md` raises it; it has never
  existed in harny's `templates/` (confirmed: `templates/roles/` holds exactly the five
  `sdd-*` roles), so there is nothing here to retire.
- **Fixing `CHANGELOG.md`'s `feedback-path-hygiene` wording** (it misattributes the
  `E902` errors). Deliberately excluded by the human.
- **Fixing `tests/packaging.test.ts`'s vitest pin.** Pre-existing, unrelated, from
  commit `c8a3bd4`. `package.json` and `tests/packaging.test.ts` are both left alone.
- **Adding a `.mcp.json` to this repo.** Not in FC-13's enumerated dogfood set, never
  claimed by `context7-mcp`, and not created by this feature. (That harny's own repo
  has no `.mcp.json` while `harny init --tools claude-code` would write one is a real
  pre-existing observation, recorded here and left open.)
- **Deriving the CI push branch from the target repo's actual default branch.** See
  contract § CI-2 for the decision and its justification; `main` is hardcoded.
- **Any change to `src/engine.ts`, `src/generators/*`, or the `Generator` interface.**
  All four items land in a constant's value, two prose bodies, two doc comments, and one
  canonical YAML template.
- **Closing the other open reservations these files touch** (R8, R-Cursor, R-Codex,
  AL-1's unstat-able-path row, AL-30, CG-1/O4). None is in scope.

## Constraints

- **`AGENTS.md` is the source of truth** for this repo's conventions and the 5-file spec
  schema; `CLAUDE.md` covers only what is Claude-Code-specific. Coding standards S1–S7
  apply, with S4 (no dependency without a contract line), S5 (a shared constant is
  imported, never re-literalled), S6 (test header conventions; contract ids never in
  test *names*) and S7 (tool-neutral content names behavior first) all directly load-
  bearing here.
- **The single-literal invariant survives item 1.** `context7-mcp` MC-13 / SC15 and
  `AGENTS.md` S5: the endpoint appears exactly once in `src/`. Changing the value must
  not tempt anyone into inlining it at a generator.
- **No new dependencies.** `src/` still has no TOML parser and this feature adds none;
  Codex's MCP table is still detected by a line-start scan, never parsed.
- **`package.json` is untouchable in this feature**, so the one known
  `tests/packaging.test.ts` failure stays red and is the only red.
- **FC-13 dogfood byte-identity.** Item 4 changes a canonical template FC-13 names, so
  this repo's `.github/workflows/harny-feedback.yml` must be regenerated in the same
  feature. Regenerating that file in this repo is exactly the class of action
  `feedback-path-hygiene`'s executor performed under explicit human pre-authorization
  (`specs/archived/feedback-path-hygiene/audit.md`, "Task 4.3 — who applied
  `.claude/settings.json`"); the same authorization is requested at this spec's gate.
- **`tests/canonical-fidelity.test.ts`'s non-mutation sweep already allowlists both
  paths this feature edits under `templates/`.** Verified: `isContractedEntry` returns
  true for any path starting `templates/ci/` and for the exact path
  `templates/roles/sdd-documentation.md`. Items 2 and 4 therefore need no change to that
  test's allowlist — a fact worth stating because it is the one test most likely to be
  wrongly "fixed".
- **`.claude/agents/*` is gitignored** (`.gitignore` line 2: `.claude/*`, with only
  `.claude/settings.json` and `.claude/skills/harny-*` re-included). Any update to
  `.claude/agents/sdd-documentation.md` is a local, untracked dogfood change that will
  never appear in a diff or in CI — which is precisely why the durable fix must live in
  `templates/` and `.agents/skills/`, both of which are tracked.
- **The two `harny-document` skill copies differ today, and that difference is
  contracted, not drift.** `.agents/skills/harny-document/SKILL.md` and
  `templates/skills/harny-document/SKILL.md` differ by three lines in step 3.3 (about
  bootstrapping capability docs). Six of the ten `harny-*` skills differ this way, and
  every one of those differences is **declared** in `tests/skills-fidelity.test.ts`'s
  `DIVERGENCE_TABLE` and verified exhaustively — `harny-document`'s entry is
  `{ kind: 'diverges', requiredInTemplate: ['rather than assuming any prior history
  exists'] }`, an additive divergence class established by `templates-skill-library-parity`
  (Gu 11 / SC5). Adding the **identical** new guardrail bullet to both copies leaves that
  declared divergence exactly as declared, so `DIVERGENCE_TABLE` needs no edit and the
  test stays green. Editing `DIVERGENCE_TABLE` for item 2 would be a defect, not a fix.
- **ADR numbering is globally monotonic**; `specs/current/_index.md` records 0028 as the
  highest. The next number is **0029**. ADRs are written by `harny-adr` after the archive
  move, not by this spec set.
- **`plan.md` is untracked and is never edited** by this feature; it is read-only
  background.
- **Build coupling (AL-20).** `tests/e2e-init.test.ts` spawns `bin/harness.js`, which
  imports `dist/`, not `src/`. Item 1 is the only item that changes `src/`, so
  `npm run build` must precede any e2e-level verification of the new endpoint.

## Prior Art

- **`specs/archived/context7-mcp/`** — established `src/mcp.ts`, the `mcpConfig`
  declarative `Generator` member (ADR 0027), merge-write for co-owned config (ADR 0026),
  the single-literal invariant (MC-13 / SC15), and the five verified per-tool MCP facts.
  Item 1 changes exactly one value inside that shipped design and nothing else.
- **`specs/archived/feedback-path-hygiene/`** — the immediately-preceding feature; the
  source of item 3 (finding AL-11, accepted as a reservation with an explicit
  documentation-pass resolution) and of item 4's motivating evidence (finding AL-5,
  uncloseable because no CI run existed). Its post-audit amendment A1 is the
  authoritative wording item 3 aligns to.
- **`specs/archived/agent-feedback-controls/`** — established
  `templates/ci/harny-feedback.yml`, the canonical-vs-generated split its header comment
  describes, ADR 0015 (no YAML dependency in the canonical workflow) and ADR 0017.
  Item 4 edits only the canonical half, so ADR 0015 holds unchanged: nothing parses or
  re-serializes this YAML.
- **ADR 0013** (`templates-skill-library-parity`) — records that `templates/roles/` stays
  full-body while the live pipeline is thinned, and names as an accepted cost that a
  maintainer must update *both* the role file and the skill. Item 2 is the first
  feature to actually pay that cost.
- **`specs/current/feedback-controls.md` FC-7** — today's statement that the workflow
  triggers "on `pull_request`"; item 4 amends it. **FC-13** — the dogfood byte-identity
  requirement item 4 must honor. **FC-23** — the `extensions` statement item 3's
  wording must stay consistent with.
- **`AGENTS.md` § "Feedforward vs. feedback"** — classifies the CI workflow as the
  post-integration computational-feedback sensor. Item 4 restores that sensor on the
  `main` integration path.
- **GitHub Actions workflow-trigger syntax**, re-verified 2026-09-22 via Context7
  (`/websites/github_en_actions`, `docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax`
  and `.../choose-when-workflows-run/trigger-a-workflow`): `on.push.branches` restricts
  a push trigger to matching refs, and `on.pull_request` is filtered independently — the
  basis for SC15's no-double-run claim.
- **Context7 documentation**, re-verified 2026-09-22 via the Context7 MCP server
  (`/upstash/context7`, `docs/howto/oauth.mdx`, `docs/resources/all-clients.mdx`) — the
  basis for item 1.

## Deviations from `harny-sync`'s returned brief

`harny-sync` lookup mode was run first, matching three capabilities (`cli-init`,
`feedback-controls`, `tool-generators`) from the § Keyword lookup rows
`docs-lookup / Context7 / MCP`, `CI / GitHub Actions` + `feedback`, and
`canonical fidelity`. Two current-truth statements it returned are **contradicted by
this feature, deliberately and openly**:

1. **`feedback-controls.md` FC-7** states the workflow triggers "on `pull_request`", and
   its scenario says the workflow "declares `on: pull_request`". Item 4 makes that
   incomplete. FC-7 is amended by this feature (contract § Amendments), not silently
   left standing.
2. **`templates/mcp/README.md`'s published endpoint** and `src/mcp.ts`'s
   "hosted, unauthenticated" characterization are contradicted by item 1. No
   `specs/current/` statement literals the URL (verified by grep), so no capability doc
   requires a value change — but `cli-init.md` CLI-4's determinism scenario and
   `tool-generators.md` TG-1/TG-10's MCP-config statements all remain true, unchanged,
   at the new value, and the contract says so explicitly rather than assuming it.

No other statement `harny-sync` returned is contradicted. In particular `cli-init.md`
CLI-5 (merge-marked paths never enter the conflict set), CLI-10 (thirty-one packaged
`templates/**` files — unchanged; this feature creates and deletes no template file),
and `tool-generators.md` TG-3/TG-4 (canonical bodies reach every generator byte-for-byte)
are all relied upon by this feature rather than altered by it.
