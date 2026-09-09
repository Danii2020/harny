# Contract: sdd-skill-library

> **This feature's deliverable is content and layout, not application code:** Markdown +
> YAML skill files, symlinks, a directory structure, a `.gitignore` amendment, and one
> `AGENTS.md` section. Accordingly the "interfaces" below are the file manifest, the
> document schemas each new artifact must follow, and the procedures each skill must
> encode. Fenced blocks are `markdown`, `yaml`, `text`, `gitignore` or `sh` because those
> are the actual languages of this deliverable. The single exception is one TypeScript
> guard test (`tests/skill-library.test.ts`), whose signatures appear in `ts`, matching
> the repo's ESM + vitest conventions.
>
> **Traceability:** every section cites the `intent.md` goal it serves as `(Gn)`.
>
> **Verification-channel disclosure (required by the precedent
> `specs/codex-generator/contract.md` set, and by intent G3/SC6):** live docs-lookup
> **was** available while writing this spec and **was** used — Context7
> `/websites/code_claude` plus direct first-party fetches of `code.claude.com/docs`, on
> **2026-09-08**. The `.gitignore` and symlink behavior below was **not** taken from
> documentation or memory: it was executed in a throwaway `git init` sandbox on
> 2026-09-08 and the observed output is recorded in § "Verified facts" rows V10–V12.
> What could **not** be verified in-session: that a *running* Claude Code process
> discovers a symlinked project skill after these files land on disk. Documentation says
> it does (V4); observing it requires a session restart. That check is carried as an
> explicit human-gated task in `tasks.md` and a named reservation in `audit.md`, not
> presented as done.

---

## Verified facts (G3)

Every path, key, limit and behavior this contract pins, with its source. `plan.md` is
not an accepted source for any row.

| # | Fact | Value | Source | Consulted |
|---|---|---|---|---|
| V1 | Claude Code project skill location | `.claude/skills/<name>/SKILL.md` at repo root | code.claude.com/docs/en/skills | 2026-09-08 |
| V2 | Complete set of Claude Code skill discovery locations | enterprise, personal `~/.claude/skills/`, project `.claude/skills/`, nested `<subdir>/.claude/skills/`, `--add-dir` `.claude/skills/`, plugin `<plugin>/skills/`, claude.ai account | code.claude.com/docs/en/skills | 2026-09-08 |
| V3 | Claude Code does **not** read `.agents/skills/`, and has no configurable skill path | absent from V2's list | code.claude.com/docs/en/skills | 2026-09-08 |
| V4 | **Symlinked skill folders are supported** — Claude Code reads `SKILL.md` from the symlink target, and loads the skill once even if several locations point at the same target | supported | code.claude.com/docs/en/skills § Symlinks | 2026-09-08 |
| V5 | Frontmatter fields that are part of the portable **Agent Skills spec** | `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` | code.claude.com/docs/en/skills § "Frontmatter fields for distribution outside Claude Code" | 2026-09-08 |
| V6 | Claude-Code-only frontmatter keys cause an "Unexpected key(s)" packaging/upload failure elsewhere | e.g. `disable-model-invocation`, `context`, `agent`, `paths`, `model`, `effort`, `hooks`, `shell`, `argument-hint`, `arguments`, `user-invocable`, `when_to_use`, `disallowed-tools` | code.claude.com/docs/en/skills | 2026-09-08 |
| V7 | `description` (+ `when_to_use`) character cap, after which it is truncated in the skill listing | **1,536 characters** | code.claude.com/docs/en/skills | 2026-09-08 |
| V8 | Reserved skill folder name | `synced` (any capitalization) | code.claude.com/docs/en/skills | 2026-09-08 |
| V9 | Subagent frontmatter `skills:` preloads full skill content into the subagent's context at startup; runtime invocation stays available; **a skill with `disable-model-invocation` cannot be preloaded**; a missing or policy-disabled skill is **skipped and logged as a warning** | as stated | code.claude.com/docs/en/sub-agents § "Preload skills into subagents" (via Context7 `/websites/code_claude`) | 2026-09-08 |
| V10 | `specs/*` + `!specs/current/` + `!specs/archived/` tracks the two knowledge-base directories while leaving every other `specs/` child ignored | confirmed | executed in a sandbox `git init`; `git ls-files -s` listed `specs/current/_index.md` and `specs/archived/cli-skeleton/intent.md`, `git status --porcelain --ignored` listed `!! specs/in-flight-feature/` | 2026-09-08 |
| V11 | `.claude/*` + `!.claude/skills/` + `.claude/skills/*` + `!.claude/skills/harny-*` tracks only the `harny-*` bridge entries, leaving `.claude/agents/`, `.claude/settings.local.json`, `.claude/skills/sdd-conductor/` and `.claude/skills/high-value-tests/` ignored | confirmed | same sandbox run; ignored list was exactly those four paths | 2026-09-08 |
| V12 | Git stores a directory symlink as a blob of mode `120000` containing the link text, so the bridge survives clone/checkout | confirmed | same sandbox run: `git ls-files -s` reported `120000 … .claude/skills/harny-propose`; `git cat-file -p` returned `../../.agents/skills/harny-propose` | 2026-09-08 |
| V13 | Git cannot re-include a path whose parent **directory** is excluded, so a bare `!specs/current/` under a `specs/` exclusion does not work | confirmed | git ignore semantics; V10/V11 are the working formulations | 2026-09-08 |
| V14 | `.agents/skills/` is already this repo's shipped position for a tool-neutral skill directory | "`.agents/skills/` is a shared, tool-neutral directory — unlike `.claude/`, `.cursor/`, `.kiro/` and `.github/`, it is not namespaced to one tool. Another agent tool that adopts the same convention will read this file too." | `src/generators/codex.ts:149` (shipped) | 2026-09-08 |
| V15 | `npx harny init --tools codex` writes a conductor artifact into `.agents/skills/` in the **target** repo | `.agents/skills/sdd-conductor/SKILL.md` | `src/generators/codex.ts:165`; `tests/e2e-init.test.ts:295` | 2026-09-08 |

### Discrepancies and coexistence notes (G3)

- **D1 — The canonical location is one Claude Code cannot read.** V3 and V4 together are
  the whole basis for the design: canonical content at `.agents/skills/` (portable, and
  already this repo's stated position per V14), reachable by Claude Code only through the
  documented symlink mechanism. This contract does **not** claim Claude Code supports
  `.agents/skills/`; it claims Claude Code supports symlinks, which is a different and
  documented fact.
- **D2 — `.agents/skills/` is a shared namespace, by design and already in production.**
  Per V15, running `npx harny init --tools codex` against *this* repo would write
  `.agents/skills/sdd-conductor/SKILL.md` alongside `.agents/skills/harny-*/`. The names
  do not collide, but the coexistence is real and is disclosed in
  `.agents/skills/README.md` (manifest item 9).
- **D3 — `.claude/skills/` will contain three different kinds of entry** after this
  feature: eight tracked `harny-*` symlinks, and two untracked regular directories
  (`sdd-conductor`, `high-value-tests`). This asymmetry is deliberate (G9 keeps the
  conductor where it is; the non-goal keeps `high-value-tests` in place) and is stated in
  the shape contract so a reader does not conclude the pattern is inconsistent.
- **D4 — `plan.md` §2's table describes five monolithic agents.** After this feature that
  section is historically accurate but no longer describes the live pipeline. `plan.md` is
  a planning record and is **not** edited by this feature (same treatment
  `specs/codex-generator/` gave it); the divergence is recorded here instead.

---

## SUPERSEDES — "archive the spec in place" (G11, SC16)

Three shipped artifacts state that a feature's spec directory is never moved:

| Artifact | Text | In scope? |
|---|---|---|
| `.claude/agents/sdd-documentation.md:44` | "Do NOT move, rename, or delete the `/specs/<feature-name>/` directory" | **Yes** — superseded |
| `AGENTS.md:49–50` | "The spec directory is never moved, renamed, or deleted — it stays in place as a record of what shipped." | **Yes** — superseded |
| `templates/roles/sdd-documentation.md:43` | same as the first row | **No** — `templates/` is a fixed non-goal; left untouched and now divergent |
| `specs/canonical-role-templates/contract.md` fixed-design item 4 | "archive the spec **in place** … (do NOT move the spec directory)" | **No** — an archived historical record; never edited |

**Superseded, scoped to the live Claude Code pipeline only:** the `Shipped: <date>` stamp
still happens **in place**, exactly as today; what changes is that the stamped directory
is then moved by `harny-sync` archive mode to `specs/archived/<feature>/`, byte-identical.
The prohibition therefore becomes: *never move a spec directory except through
`harny-sync` archive mode, and never edit an artifact once archived.*

**Accepted consequence:** the live pipeline and the portable `templates/` layer disagree
on this rule until a follow-up feature reconverges them. A pipeline generated by
`npx harny init` keeps today's archive-in-place behavior and has no `harny-*` skills.

**Named follow-up (not this feature):** `templates-skill-library-parity` — propagate the
skill-library shape and the archived/current lifecycle into `templates/` and the five
generators. Recorded in `roadmap.md` § Deferred work.

---

## Interfaces

### Public API — the file manifest (G1, G2, G3, G7, G8)

The feature MUST produce exactly this tree. `CREATE` / `MODIFY` / `MOVE` / `UNCHANGED`
are binding.

```text
.agents/skills/                                   CREATE  (canonical, tool-neutral, git-tracked)
├── README.md                                     CREATE  (the harny-* shape contract — G2)
├── harny-propose/SKILL.md                        CREATE  (from sdd-architect)
├── harny-test/SKILL.md                           CREATE  (from sdd-test-writer)
├── harny-implement/SKILL.md                      CREATE  (from sdd-executor)
├── harny-audit/SKILL.md                          CREATE  (from sdd-auditor)
├── harny-document/SKILL.md                       CREATE  (from sdd-documentation)
├── harny-sync/SKILL.md                           CREATE  (new — lookup + archive)
├── harny-adr/SKILL.md                            CREATE  (new)
│   └── adr-template.md                           CREATE  (bundled resource)
└── harny-standards/SKILL.md                      CREATE  (new)

.claude/skills/                                           (bridge — git-tracked symlinks)
├── harny-propose    -> ../../.agents/skills/harny-propose        CREATE (symlink)
├── harny-test       -> ../../.agents/skills/harny-test           CREATE (symlink)
├── harny-implement  -> ../../.agents/skills/harny-implement      CREATE (symlink)
├── harny-audit      -> ../../.agents/skills/harny-audit          CREATE (symlink)
├── harny-document   -> ../../.agents/skills/harny-document       CREATE (symlink)
├── harny-sync       -> ../../.agents/skills/harny-sync           CREATE (symlink)
├── harny-adr        -> ../../.agents/skills/harny-adr            CREATE (symlink)
├── harny-standards  -> ../../.agents/skills/harny-standards      CREATE (symlink)
├── sdd-conductor/SKILL.md                        UNCHANGED  (byte-identical — G9)
└── high-value-tests/SKILL.md                     UNCHANGED  (byte-identical)

.claude/agents/                                           (thinned — G1)
├── sdd-architect.md                              MODIFY  (255 -> <=25 body lines)
├── sdd-test-writer.md                            MODIFY  (105 -> <=25)
├── sdd-executor.md                               MODIFY  ( 84 -> <=25)
├── sdd-auditor.md                                MODIFY  (144 -> <=25)
└── sdd-documentation.md                          MODIFY  ( 58 -> <=25)

specs/                                                    (knowledge base — G7, G8)
├── sdd-skill-library/{intent,contract,roadmap,tasks,audit}.md   (this feature, in-flight)
├── current/                                      CREATE  (git-tracked)
│   ├── _index.md                                 CREATE
│   ├── spec-workflow/capability.md               CREATE
│   ├── pipeline-roles/capability.md              CREATE
│   ├── skill-library/capability.md               CREATE
│   ├── cli-init/capability.md                    CREATE
│   └── tool-generators/capability.md             CREATE
└── archived/                                     CREATE  (git-tracked)
    ├── README.md                                 CREATE  (the path-redirect rule)
    ├── canonical-role-templates/{5 files}        MOVE    (byte-identical)
    ├── cli-skeleton/{5 files}                    MOVE    (byte-identical, incl. AUDIT PASS 2)
    ├── cursor-kiro-copilot-generators/{5 files}  MOVE    (byte-identical, incl. pass-2 verdict)
    └── codex-generator/{5 files}                 MOVE    (byte-identical)

AGENTS.md                                         MODIFY  (+ "## Coding standards"; SUPERSEDES edit)
.gitignore                                        MODIFY  (V10/V11 pattern set)
tests/skill-library.test.ts                       CREATE  (the bridge/shape guard)
tests/helpers/frontmatter.ts                      CREATE  (minimal frontmatter reader)
tests/canonical-fidelity.test.ts                  MODIFY  (T41 non-mutation check only —
                                                           see § Amendment A1; lines 176-185
                                                           and the header comment, nothing else)

templates/**                                      UNCHANGED  (byte-identical — non-goal)
src/**, bin/**, package.json, package-lock.json   UNCHANGED  (byte-identical — non-goal)
README.md, CHANGELOG.md                           UNTOUCHED by this feature (sdd-documentation's job)
plan.md                                           UNTOUCHED (historical record — D4)
```

Counts bound by this contract: **9** files under `.agents/skills/`, **8** symlinks,
**5** modified agent files, **6** new files under `specs/current/`, **1** new file under
`specs/archived/`, **20** moved files, **2** new test-tier files, **1** modified test file
(§ Amendment A1), **2** modified root files. No other file is created or modified.

---

### The `harny-*` skill shape contract (G2, SC4)

Published as `.agents/skills/README.md`. **This is the extension point**: a user adds a
ninth skill by satisfying this and nothing else.

```yaml
---
# The six portable Agent Skills fields (V5). NO OTHER KEY IS PERMITTED.
name: harny-<action>                 # REQUIRED. kebab-case, `harny-` prefix, verb-shaped.
description: >-                      # REQUIRED. <= 1536 chars (V7). Must state WHAT it
  ...                                #   does AND WHEN to use it — Claude selects on this.
license: MIT                         # OPTIONAL.
compatibility: >-                    # OPTIONAL, <= 500 chars. Prerequisites, e.g. which
  ...                                #   directories must exist.
allowed-tools: Read, Glob, Grep      # OPTIONAL. Least privilege. Omit to inherit.
metadata:                            # OPTIONAL free-form map.
  author: daniel
  version: "1.0"
  harny-role: sdd-architect          # the pipeline role that invokes it, or `shared`
  harny-writes: specs/<feature>/**   # every path the skill may write, or `none`
---
```

Body structure — five required sections, in this order:

```markdown
# <Title>

<One paragraph: what this skill is for and who invokes it.>

## When to use this
<Bulleted triggers, including automatic invocations by name.>

## Inputs
<Every file/artifact read, by path, and what is required vs. optional.>

## Steps
<Numbered, imperative. The substance of the skill.>

## Guardrails
<Hard rules — what this skill must never do, and what it hands off instead.>
```

Binding rules:

1. **Portable frontmatter only.** Only the six V5 keys. Any V6 key is a violation, because
   the canonical file lives in the tool-neutral `.agents/skills/` where other harnesses
   read it. Enforced by `tests/skill-library.test.ts`.
2. **`disable-model-invocation` is specifically forbidden**, both by rule 1 and because it
   would block subagent preloading (V9) — which is the mechanism thin agents depend on.
   Destructive skills (`harny-sync` archive mode) are protected by **preconditions in the
   `## Guardrails` section**, not by an invocation flag.
3. **Canonical location, always.** Content lives at `.agents/skills/<name>/SKILL.md`. The
   `.claude/skills/<name>` entry is a **relative** symlink (`../../.agents/skills/<name>`)
   and never a regular directory or a copy.
4. **Name discipline.** `harny-` prefix; never `synced` (V8); never colliding with an
   existing agent `name:` (`sdd-*`).
5. **Reference other skills by name, never by path** — e.g. "run the `high-value-tests`
   skill", not `.claude/skills/high-value-tests/SKILL.md`. A tool-neutral file must not
   hardcode one tool's directory (the rule `specs/canonical-role-templates/audit.md` AL-9
   established).
6. **Bundled resources are allowed** next to `SKILL.md` and are referenced by bare
   filename (`adr-template.md`), loaded on demand.
7. **One action per skill.** If a skill's `## Steps` splits cleanly into two independent
   outcomes, it is two skills — except where the two share all their preconditions and
   state, which is the documented reason `harny-sync` carries two modes rather than
   splitting into `harny-lookup` / `harny-archive`.

---

### Skill inventory and ownership (G1, G4, G5, G6)

| Skill | Carries | Invoked by | Writes |
|---|---|---|---|
| `harny-propose` | `sdd-architect.md:8–255` | `sdd-architect`; humans | `specs/<feature>/**` |
| `harny-test` | `sdd-test-writer.md:8–105` | `sdd-test-writer`; humans | test files; `specs/<feature>/audit.md` Test Coverage |
| `harny-implement` | `sdd-executor.md:16–84` | `sdd-executor`; humans | source; `specs/<feature>/tasks.md` |
| `harny-audit` | `sdd-auditor.md:16–144` | `sdd-auditor`; humans | `specs/<feature>/audit.md` only |
| `harny-document` | `sdd-documentation.md:16–58` | `sdd-documentation`; humans | `README.md`, `CHANGELOG.md`, `AGENTS.md`, `specs/<feature>/intent.md` header |
| `harny-sync` | new (G4) | `harny-propose` (lookup); `sdd-documentation` (archive); humans; any agent | lookup: `none`. archive: `specs/**` |
| `harny-adr` | new (G5) | `sdd-documentation` hand-off; humans | `specs/archived/<feature>/decisions/**` |
| `harny-standards` | new (G6) | `sdd-executor`, `sdd-auditor`; humans | `none` (read-only) |

**Extraction fidelity (G1, SC2).** Extraction is a *move*, not a rewrite. Each role's
instructions must survive semantically intact; the only permitted edits are: (a) fitting
the five required body sections, (b) applying shape rule 5 (path → skill name), (c)
inserting the new cross-skill invocations named in this contract. Every other change is a
deliberate drop and must appear in `roadmap.md`'s reconciliation table with a
justification. Specifically preserved, because prior audits established each as
load-bearing: the architect's one-file-at-a-time human review and its
"never a placeholder language" rule; the test-writer's red-first ordering, its
docstring-not-test-name spec linkage, and its offline-by-default rule; the executor's
"contract is law / no scope creep" and "make red tests pass without editing them";
the auditor's 7 steps, verdict enum, 4 severity ratings and "report, don't fix";
documentation's "document only what the auditor verified" and "never touch code comments".

**Two additions made during extraction, and only these two:**

- `harny-propose` gains a **Step 0**: invoke `harny-sync` in lookup mode and treat its
  brief as binding context; a draft that contradicts a returned current-truth statement
  must say so explicitly and justify it, in `intent.md`. (G4)
- `harny-implement` and `harny-audit` each gain a step invoking `harny-standards` — the
  executor to follow, the auditor to check. (G6)

---

### Thin agent file shape (G1, SC1)

Every `.claude/agents/sdd-*.md` becomes frontmatter plus a body of **at most 25 lines**:

```yaml
---
name: sdd-architect                  # UNCHANGED — the conductor addresses roles by name (G9)
description: |                       # UNCHANGED
  ...
model: opus                          # UNCHANGED
color: cyan                          # UNCHANGED
tools: "..."                         # UNCHANGED
skills:                              # NEW — preloads full skill content at startup (V9)
  - harny-propose
  - harny-sync
---
```

```markdown
You are ... <one-paragraph role identity>.

Your instructions live in the `harny-propose` skill, preloaded into this context.
Follow it exactly. It is the single source of truth for this role's behavior;
this file adds no rules of its own and never contradicts it.

## Skills this role uses
- `harny-propose` — the full propose procedure (explore, then emit the five spec
  files one at a time with human review between them).
- `harny-sync` (lookup mode) — run first, per `harny-propose` Step 0.

## If a skill is missing
A missing or disabled skill is skipped with a warning, not an error (V9), which would
leave this role running with no instructions. If `harny-propose` is not in context,
STOP and report it; do not improvise the role from this file.
```

Binding rules: `name`, `description`, `model`, `color` and `tools` values are unchanged
(G9/SC14). The `skills:` list is added. Per V9, `Skill` need not be in `tools` for
preloading; a role that must invoke a skill *at runtime* rather than at startup declares
it in `tools`. The "If a skill is missing" guard is **mandatory in all five files** — it
is the only defense against V9's silent-degradation failure mode.

Per-role `skills:` lists:

| Agent | `skills:` |
|---|---|
| `sdd-architect` | `harny-propose`, `harny-sync` |
| `sdd-test-writer` | `harny-test`, `high-value-tests` |
| `sdd-executor` | `harny-implement`, `harny-standards` |
| `sdd-auditor` | `harny-audit`, `harny-standards` |
| `sdd-documentation` | `harny-document`, `harny-sync`, `harny-adr` |

`sdd-test-writer` preloading `high-value-tests` **by name** is the resolution of intent
contradiction 4: the rubric stays a `.claude/skills/` regular directory with unchanged
content, and the hardcoded path at `sdd-test-writer.md:27` disappears.

---

### `harny-sync` — modes, triggers, procedures (G4, SC7, SC8)

**Trigger matrix — all three are contractual:**

| # | Trigger | Mode | Blocking? |
|---|---|---|---|
| T1 | A human or any agent invokes `harny-sync` directly | either (caller states which; default `lookup`) | no |
| T2 | `harny-propose` Step 0, before drafting any spec file | `lookup` | yes — proposing without it is a violation |
| T3 | `sdd-documentation`'s existing post-audit hand-off | `archive` | yes — **additive**, never a replacement for that role's README/CHANGELOG/AGENTS.md duties |

#### Mode `lookup` (read-only)

1. Read `specs/current/_index.md` in full. If absent → report "no knowledge base"
   and return an empty brief; never fabricate.
2. Match the request against § Keyword lookup → **at most 3** capabilities.
3. Read `specs/current/<capability>/capability.md` in full for each match.
4. Return a brief: matched capabilities; the relevant current-behavior statements
   **quoted verbatim with their IDs**; invariants; open reservations; related ADR numbers;
   and the archive paths to read *only if* the caller needs the underlying "why".
5. **Bounded reads:** lookup reads at most **4** files (`_index.md` + ≤3 capability docs)
   and never globs `specs/archived/**`. This bound is what makes it a *fast* lookup and is
   testable by inspection of the brief's cited sources.
6. If nothing matches, say so explicitly, name the nearest capability, and tell the caller
   to fall back to full codebase exploration.
7. Writes nothing, ever.

#### Mode `archive` (destructive — preconditions are mandatory)

Preconditions, **all** required; on any failure, refuse and report without moving anything:

- `specs/<feature>/audit.md` has a final verdict of `APPROVED` or
  `APPROVED WITH RESERVATIONS` (never `REJECTED`);
- the human has signed off at the post-audit gate;
- all five spec files exist and are non-empty;
- `specs/<feature>/intent.md` carries a `Shipped:` header;
- `specs/archived/<feature>/` does **not** already exist;
- `<feature>` is neither `current` nor `archived`.

Procedure:

1. Record SHA-256 of all five files.
2. Move `specs/<feature>/` → `specs/archived/<feature>/` as a whole directory.
3. Re-compute SHA-256; on any mismatch, restore and abort.
4. Determine affected capabilities from the feature's `contract.md`.
5. For each, update `specs/current/<capability>/capability.md`: add/modify/retire
   current-behavior statements, **merging rather than overwriting** — a statement not
   mentioned by this feature is left untouched; carry forward the feature's open
   reservations; add the feature to § Contributing features with its `Shipped:` date.
6. Regenerate `_index.md`'s five tables from the capability docs and the ADR files on disk.
7. Report: capabilities touched, statements added/modified/retired, ADRs registered.

**Ordering inside the `sdd-documentation` hand-off (T3) is contractual**, because step 1
writes into a path that step 3 moves:

```text
1. harny-document : README.md, CHANGELOG.md, AGENTS.md; stamp `Shipped:` into
                    specs/<feature>/intent.md  (IN PLACE — unchanged behavior)
2. (human sign-off already given at the post-audit gate)
3. harny-sync     : archive preconditions + move + checksum re-verify   (steps 1-3)
4. harny-adr      : write ADRs into specs/archived/<feature>/decisions/
5. harny-sync     : update capability docs + regenerate _index.md       (steps 4-7)
6. harny-document : present one combined change summary (optional human review)
```

---

### `harny-adr` — storage, numbering, template (G5, SC9)

**Storage decision, with reasoning.** Two locations were considered:

| Option | Why not / why |
|---|---|
| Shared `specs/decisions/NNNN-*.md` | Classic Nygard shape and trivially scannable, **but** it splits a shipped feature's artifact set across two trees, so archiving stops being one atomic move and the "full historical artifact set" promise (intent G8) breaks. |
| **`specs/archived/<feature>/decisions/NNNN-<slug>.md`** ✅ | Keeps the artifact set self-contained and archiving atomic; matches the tree the human approved. Its only weakness — discovery requires knowing which feature decided — is removed by the ADR registry in `_index.md`. |

**Chosen: per-feature storage, global numbering, central registry.** `NNNN` is a
zero-padded 4-digit number, **monotonic across the whole repo** (not per-feature), so
supersession chains read correctly; allocate by scanning
`specs/archived/*/decisions/*.md` for the current maximum. Because ADRs are written
*after* the archive move (step 4 above), the directory always exists when written.

**"Significant" is defined, so the skill is not arbitrary.** A decision earns an ADR if it
meets **at least one** of: (a) the contract or roadmap records a choice between two or more
named viable options; (b) it constrains future features (a rule, invariant, or reserved
name others must obey); (c) it supersedes or diverges from a previously shipped decision;
(d) it deliberately accepts a known cost, reservation, or unverifiable claim. **Cap: 7 ADRs
per feature** — anything below the bar stays in the archived contract, where it already is.

**No backfill.** The four migrated features get **no** ADRs. Reconstructing rationale for
shipped work retroactively risks inventing it; their reasoning already exists in their
archived contracts and audit logs, and the capability docs cite it by provenance. ADRs
apply to features approved from `sdd-skill-library` forward — and this feature is the
first, which is how G12's end-to-end exercise is satisfied.

Template (bundled at `.agents/skills/harny-adr/adr-template.md`):

```markdown
# ADR <NNNN>: <Title in the imperative>

- **Status**: Accepted | Superseded by ADR <NNNN> | Deprecated
- **Date**: <YYYY-MM-DD>
- **Feature**: <feature-name>
- **Capability**: <capability-id>
- **Source**: contract.md § <section> | roadmap.md Phase <n>
- **Trigger**: <which of the four significance criteria (a)-(d) this meets>

## Context
<The forces at play. What made a decision necessary.>

## Decision
<The choice, stated in one or two sentences, in the present tense.>

## Alternatives considered
| Option | Why not |
|---|---|
| <option> | <reason> |

## Consequences
**Positive**: <what this buys>
**Accepted costs**: <what this gives up, including any known reservation>

## Follow-ups
<Named future work this defers, or "None".>
```

---

### `harny-standards` — source of truth and minimum coverage (G6, SC10)

**Location decision:** a new `## Coding standards` section in **`AGENTS.md`**, not a new
document. Reasoning: (1) `AGENTS.md:3–4` already declares itself "the source of truth for
how this repo works" and `CLAUDE.md` defers to it — a rival document would create the
second source of truth this goal exists to prevent; (2) `AGENTS.md` is git-tracked and
shipped in the npm tarball (`package.json` `files`), whereas anything under `specs/` is
neither, and a conventions doc that vanishes on clone cannot be a source of truth;
(3) `sdd-documentation` already maintains `AGENTS.md`, so it stays current for free;
(4) the existing § "Working conventions" covers *process* only, so the extension is
additive and does not contradict it.

`harny-standards/SKILL.md` is a **pointer plus a checklist**. It MUST NOT restate the
rules — it names the document, tells the caller to read it, and provides the per-role
checklist below. Duplication here would recreate the drift failure this feature exists to
remove.

**Portability rule:** the skill names the target as "this project's conventions document
(`AGENTS.md`, `CLAUDE.md`, or the project's equivalent)" with `AGENTS.md` as this repo's
concrete answer — the phrasing pattern `specs/canonical-role-templates/audit.md` AL-4
established. A harny user pointing it at their own repo's `AGENTS.md` needs no edit.

`AGENTS.md` § "Coding standards" MUST cover at minimum these seven, each currently
unwritten outside a feature contract:

| # | Standard | Established by |
|---|---|---|
| S1 | TypeScript, ESM, `nodenext` resolution; relative imports carry the `.js` specifier; Node builtins use the `node:` prefix | `src/engine.ts:5–11`, `tsconfig.json` |
| S2 | `HarnessError(code, message, details?)` is the only error thrown deliberately; the `HarnessErrorCode`→exit-code map lives in `src/errors.ts`; anything else reaching `main` is a bug mapping to `EXIT.UNEXPECTED` | `src/errors.ts:1–3, 28–31` |
| S3 | Determinism and containment: identical inputs produce byte-identical output; every written path is relative and inside the target directory; every generated artifact ends in exactly one `\n` | `src/writer.ts:16–28`; `specs/archived/cli-skeleton/contract.md` guarantees 13, 19 |
| S4 | Adding a runtime or dev dependency requires an explicit line in that feature's `contract.md`; the default is none | `tests/packaging.test.ts` |
| S5 | A shared constant is imported from its owning module, never re-literalled at a call site (e.g. `SPEC_SCHEMA_DIR` from `src/engine.ts:45`) | `specs/archived/cursor-kiro-copilot-generators/contract.md` guarantee 8 |
| S6 | Tests: vitest; `tests/` mirrors `src/`; every test file opens with a `Spec:` / `Covers:` header naming the feature and the ids it covers; contract ids never appear in test names; the default run is offline | `tests/packaging.test.ts:1–10`; `.claude/skills/high-value-tests/SKILL.md` |
| S7 | In tool-neutral content, no single tool's mechanic may be named as the only possibility; name the behavior first and the tool as an attributed example | `specs/archived/canonical-role-templates/audit.md` AL-9 |

Per-role checklist inside the skill: **executor** — S1, S2, S3, S4, S5, S6 before marking
a task done; **auditor** — all seven, reported as findings under the existing severity
ratings, never fixed in place.

---

## Data Models — the knowledge base (G7)

### The capability taxonomy, and why this one (SC11)

Derived by partitioning the **shipped surface** (not the feature history) into the units a
future architect would look up before proposing. Cross-checks applied: every archived
feature maps to ≥1 capability; every capability owns ≥1 real directory in the repo; no
file belongs to two capabilities.

| Capability | ID prefix | Owns | Contributing archived features |
|---|---|---|---|
| `spec-workflow` | `SW-` | the 5-file schema, traceability rules, task states, verdict enum, the in-flight→archived lifecycle, `templates/spec-schema/`, `.sdd/spec-schema/` deployment | canonical-role-templates, cli-skeleton |
| `pipeline-roles` | `PR-` | the five roles + conductor: duties, cost tiers, capability vocabulary, the three gates, hand-offs, `templates/roles/`, `templates/conductor/` | canonical-role-templates |
| `skill-library` | `SL-` | `harny-*` skills, the shape contract, the `.agents/skills` + `.claude/skills` bridge, sync/adr/standards, the knowledge base itself | *(sdd-skill-library — this feature)* |
| `cli-init` | `CLI-` | `npx harny init`: flags, prompts, config resolution, exit codes, write planning, packaging — `src/{cli,config,prompts,init,writer,errors,engine,templates,vocabulary}.ts` | cli-skeleton |
| `tool-generators` | `TG-` | the `Generator` interface, five per-tool adapters, the markdown-yaml and toml wrappers, verified per-tool facts — `src/generators/**` | cli-skeleton, cursor-kiro-copilot-generators, codex-generator |

Rejected alternatives, recorded so this is not re-litigated: **one capability per shipped
feature** (they are changes, not capabilities — `tool-generators` would fragment into
three); **one per top-level directory** (`src/`, `templates/`, `.claude/` — cuts across
what an architect actually asks about, and puts the CLI and the generators in one bucket);
**two coarse capabilities** (product / pipeline — too coarse for the ≤3-capability lookup
bound to mean anything).

### `specs/current/_index.md` (SC11)

Fast lookup is achieved by **routing, not summarizing**: one bounded file read tells an
agent exactly which capability doc to open next. Five required tables, ≤150 lines total.

```markdown
# Current specifications — index

> Current truth for this repo. Maintained by `harny-sync`; do not hand-edit.
> Last synced: <YYYY-MM-DD> by <who>

## Capabilities
| Capability | Path | Purpose | Statements | Last synced |

## Keyword lookup
> If your question mentions a term on the left, read the capability on the right first.
| Term | Capability |

## Shipped features
| Feature | Shipped | Verdict | Capabilities | Archive |

## Decisions (ADR registry)
| ADR | Title | Status | Capability | Path |

## Open reservations
> Non-blocking findings accepted at ship time and still open.
| ID | Reservation | Severity | Source | Capability |
```

§ Keyword lookup MUST contain at least 20 rows drawn from the vocabulary of the archived
contracts (e.g. `cost_tier`, `capabilities`, `frontmatter`, `TOML`, `exit code`,
`--tools`, `determinism`, `spec-schema`, `gate`, `verdict`, `symlink`, `ADR`). It is the
mechanism that makes step 2 of lookup mode deterministic rather than a guess.

§ Open reservations MUST be seeded from the archived audits, which currently carry at
minimum: **AL-19** (stale test field name), **AL-20** (e2e suite validates built `dist/`,
so a `src/`-only regression escapes), **AL-30** (per-tool facts unverifiable in the audit
environment) and **CG-1** (Codex live-install check never performed). These are today
reachable only by reading three audit files; surfacing them is a large part of this
capability's value.

### `specs/current/<capability>/capability.md` (SC12)

Required entry point per capability; additional files may sit beside it.

```markdown
# Capability: <capability-id>

> Last synced: <YYYY-MM-DD>. Owned artifacts: <real repo paths/globs>.

## Purpose
<2-3 lines.>

## Current behavior
> Present tense. Stable IDs — never renumbered; retired statements are struck, not deleted.
| ID | Statement | Provenance |
| SW-1 | ... | canonical-role-templates · contract.md § ... |

## Invariants
<Numbered. What must not break, and what breaks if it does.>

## Open reservations
| ID | Reservation | Severity | Source |

## Contributing features
| Feature | Shipped | What it established |

## Related ADRs
| ADR | Title | Status |
```

**Provenance is mandatory on every current-behavior statement** and cites an *archived*
artifact (`<feature> · <file> § <section>`). That citation is the bridge from "what is
true" to "why", and is what lets lookup mode stay within its 4-file bound while still
being able to point a caller at the reasoning.

**Statement IDs are stable and monotonic per capability.** A superseded statement is
marked `~~retired, see SW-9~~` and kept, never deleted or renumbered — future contracts
cite these IDs.

### `specs/archived/README.md` — the redirect rule

Archived artifacts are never edited, so their ~48 internal `specs/<feature>/…` citations,
and the ~44 in `tests/**`, `src/vocabulary.ts`, `src/templates.ts` and `CHANGELOG.md`,
remain literal. This file states the single resolution rule once:

> A path of the form `specs/<feature>/<file>` appearing in any archived artifact, source
> comment, test header or changelog entry resolves to `specs/archived/<feature>/<file>`
> for the four features archived on <date>. Archived artifacts are historical records and
> are not rewritten.

---

## State Changes (G10, SC15)

`.gitignore` becomes (patterns and ordering verified in V10–V13; ordering is
load-bearing — a later pattern wins):

> **AMENDED by § Amendment A2 (2026-09-09).** The `specs/` half of this section is
> superseded: **all** of `specs/` is now tracked, including in-flight feature work. The
> `.claude/` half below is unchanged and still current.

```gitignore
# (No `specs/` exclusion — the whole tree is tracked. See § Amendment A2.)

# Local agent config stays local; the harny-* skill bridge is tracked.
.claude/*
!.claude/skills/
.claude/skills/*
!.claude/skills/harny-*

plan.md
CLAUDE.md
node_modules/
dist/
scratch-smoke-test.sh
```

Resulting tracked/untracked split (V11; `specs/` rows per § Amendment A2):

| Path | Before | After |
|---|---|---|
| `specs/current/**`, `specs/archived/**` | n/a | **tracked** |
| `specs/<feature>/**` (in-flight) | ignored | **tracked** (A2 — was "ignored (unchanged)") |
| `.claude/skills/harny-*` (symlinks) | n/a | **tracked** (mode `120000`, V12) |
| `.agents/skills/**` | n/a | **tracked** (never matched by any pattern) |
| `.claude/agents/**`, `.claude/settings.local.json` | ignored | ignored (unchanged) |
| `.claude/skills/{sdd-conductor,high-value-tests}/**` | ignored | ignored (unchanged) |
| `plan.md`, `CLAUDE.md` | ignored | ignored (unchanged) |

A fresh `git clone` therefore yields a working pipeline with **no bootstrap step**: the
canonical skills and the bridge symlinks both arrive. `.claude/agents/*.md` remain
untracked, which is pre-existing repo-wide behavior this feature does not change.

`package.json` `files` is **not** modified, so neither `.agents/` nor `specs/` enters the
npm tarball and `tests/packaging.test.ts` continues to pass unchanged.

---

## Behavior Guarantees

1. **Canonical-single-source** (G3): every `harny-*` skill body exists exactly once, at
   `.agents/skills/<name>/SKILL.md`. No copy exists under `.claude/skills/`.
2. **Bridge bijection** (G3): the set of `.claude/skills/harny-*` symlinks and the set of
   `.agents/skills/harny-*` directories are equal; every symlink is relative and resolves
   to its namesake.
3. **Portable frontmatter** (G2): no `harny-*/SKILL.md` frontmatter contains a key outside
   the six V5 fields; every `description` is non-empty and ≤1,536 characters.
4. **Thin agents** (G1): each of the five agent files has a body of ≤25 lines, declares a
   `skills:` list, and carries the "If a skill is missing" guard.
5. **Name stability** (G9): the five agents' `name:`, `model:`, `color:` and `tools:`
   values are byte-identical to their pre-change values.
6. **Conductor untouched** (G9): `.claude/skills/sdd-conductor/SKILL.md` is byte-identical;
   it is not renamed, moved, or preloaded into any agent.
7. **Extraction completeness** (G1): every instruction line in the five pre-change agent
   files is either present in exactly one skill or listed as a justified drop.
8. **No template drift** (non-goal): `templates/**`, `src/**`, `bin/**`, `package.json`
   and `package-lock.json` are byte-identical after this feature.
9. **Archive integrity** (G8): for every archived file, SHA-256 immediately before the
   move equals SHA-256 immediately after; no archived artifact is ever edited afterwards.
10. **Audit history preserved** (G8): every pass of a multi-pass audit survives migration
    intact — including `cli-skeleton`'s `AUDIT PASS 2` and
    `cursor-kiro-copilot-generators`' pass-2 verdict.
11. **Lookup is read-only and bounded** (G4): lookup mode writes nothing and reads at most
    four files.
12. **Archive is precondition-gated and atomic** (G4): if any precondition fails, nothing
    moves; a checksum mismatch restores and aborts.
13. **Sync is additive** (G4): `sdd-documentation` retains every README / CHANGELOG /
    AGENTS.md / `Shipped:`-stamp duty it has today; `harny-sync` and `harny-adr` are added
    to that hand-off, and the `Shipped:` stamp still happens before the move.
14. **Merge, never overwrite** (G4): updating a capability doc leaves untouched any
    statement the incoming feature does not mention.
15. **Provenance completeness** (G7): every current-behavior statement cites an archived
    artifact; no capability doc is a placeholder.
16. **Stable statement IDs** (G7): IDs are never reused or renumbered; retirement is by
    marking, not deletion.
17. **ADR discipline** (G5): every ADR meets a named significance criterion, conforms to
    the template, carries a globally unique monotonic number, and appears in the registry;
    at most seven per feature.
18. **Reserved names** (G7): no feature directory may be named `current` or `archived`;
    no skill may be named `synced`.
19. **Durability** (G10) — *as amended by § Amendment A2 (2026-09-09)*: after the
    `.gitignore` change, `git ls-files` includes **all** of `specs/**` — `current/`,
    `archived/` **and in-flight `specs/<feature>/**`** — plus `.agents/skills/**` and the
    eight symlinks, and excludes `.claude/agents/**`, `.claude/settings.local.json`, both
    untouched skills, `plan.md` and `CLAUDE.md`.
    *(Superseded clause, retained for traceability: this guarantee previously required
    `git ls-files` to **exclude** in-flight `specs/<feature>/**`. That clause is void.)*
20. **Toolchain neutrality** (G9): `npm run typecheck` and `npm test` pass, with no change
    to `dependencies` or `devDependencies`.
21. **Amended non-mutation check** (G9, G10 — added by § Amendment A1): after the permitted
    edit, `tests/canonical-fidelity.test.ts`'s T41 non-mutation check still fails if any
    `runInit` call in the suite mutates `templates/` or `.claude/`, and passes when the only
    difference is the pre-existing, contracted state this feature legitimately introduces.
    The file's other **eight** describe blocks are byte-identical.

---

## Error Handling Contract

| Condition | Behavior | User impact |
|---|---|---|
| A `.claude/skills/harny-*` symlink is missing or dangling | Claude Code skips the skill with a warning (V9); the thin agent's mandatory "If a skill is missing" guard makes it STOP and report instead of improvising; `tests/skill-library.test.ts` fails | Loud stop instead of a role silently running with no instructions |
| `git config core.symlinks` is false (some Windows/checkout setups), so a symlink checks out as a text file | The guard test's `lstat` check fails, naming the path and the remedy | "`.claude/skills/harny-*` is not a symlink — run `git config core.symlinks true` and re-checkout" |
| A `harny-*/SKILL.md` declares a Claude-only frontmatter key, or a `description` over 1,536 chars | Guard test fails, naming the file and the offending key or measured length | Portability regression caught before it reaches another harness |
| `harny-sync` lookup finds no matching capability | Reports "no current-truth coverage for X", names the nearest capability, instructs full exploration | Architect proceeds honestly rather than on a fabricated brief |
| `specs/current/_index.md` is absent or unreadable | Lookup returns an empty brief and says so; it does **not** fall back to globbing `specs/archived/**` | Caller knows the knowledge base is missing, not that there are no decisions |
| `_index.md` disagrees with a capability doc | The capability doc wins — `_index.md` is derived. Sync regenerates the index; it never edits a capability doc to match the index | One direction of truth; no silent corruption of the detailed record |
| Archive precondition fails (verdict `REJECTED`, no sign-off, missing file, absent `Shipped:` header) | Refuse; move nothing; report which precondition failed | No half-archived feature |
| `specs/archived/<feature>/` already exists | Refuse; report | History is never overwritten |
| Post-move checksum mismatch | Restore the directory to `specs/<feature>/` and abort with the differing paths | Guarantee 9 cannot fail silently |
| Feature named `current` or `archived` | Refuse at propose time and at archive time | Namespace collision prevented at both ends |
| An ADR number is already taken | Rescan `specs/archived/*/decisions/` for the maximum and allocate the next | Supersession chains stay readable |
| No decision in an approved feature meets a significance criterion | Write no ADR; record "no ADR-worthy decisions" in the hand-off summary | No filler ADRs |
| More than seven candidate decisions | Write the seven highest-impact; list the remainder in the summary as deliberately not promoted | ADR log stays scannable |
| `AGENTS.md` § "Coding standards" is missing or unreadable when `harny-standards` runs | Report it as a finding and fall back to observed codebase conventions, stating that the fallback was used | Executor/auditor never invent conventions and never hide having guessed |
| Extraction would drop an instruction with no home | Record it in `roadmap.md`'s reconciliation table with a justification before dropping | Guarantee 7 is auditable, not assumed |

---

## Dependencies

**Internal (read/modified):** `.claude/agents/sdd-*.md`; `.claude/skills/sdd-conductor/`
and `.claude/skills/high-value-tests/` (read-only); the four shipped `specs/*/`
directories (moved, never edited); `AGENTS.md`; `.gitignore`; `src/errors.ts`,
`src/engine.ts`, `src/writer.ts`, `tsconfig.json`, `tests/packaging.test.ts` (read-only —
the evidence behind S1–S6).

**External packages:** **none added.** `dependencies` stays `{commander 15.0.0,
@clack/prompts 1.7.0}` and `devDependencies` stays `{typescript 7.0.2, vitest 4.1.10,
@types/node 26.1.2}`, byte-identical. The guard test parses frontmatter with a minimal
local reader (`tests/helpers/frontmatter.ts`), the exact analogue of the existing
hand-rolled `tests/helpers/toml-decode.ts`, rather than adding a YAML dependency.

**Test-tier interface** (the only TypeScript in this feature):

```ts
/** Minimal top-level YAML frontmatter reader — no dependency, mirrors
 *  `tests/helpers/toml-decode.ts`. Returns the raw text of each top-level key. */
export function readFrontmatterKeys(source: string): Map<string, string>;
```

**Why this test earns its place** (per `.claude/skills/high-value-tests/SKILL.md`): a
dangling symlink or a rogue frontmatter key produces a *silent* failure — V9 says a
missing skill is skipped with a warning, so a thin agent would run with no instructions
and nothing else would notice. It is a guard on an invariant this repo owns, it discovers
both sets by glob rather than a hand-maintained list (so it is not a scaffold registry),
and it stays green through any content refactor. It asserts structure and resolution only
— never skill prose.

---

## Integration Points

- **`sdd-conductor`** — unaffected. It addresses the five roles by `name:` and those are
  unchanged (guarantees 5, 6). The three gates keep their positions; `harny-sync` lookup
  runs *inside* the architect's turn, before the post-specs gate, and archive runs *after*
  the post-audit gate, so no gate is added, removed, or relocated.
- **`sdd-documentation` hand-off** — extended, not replaced: the six-step ordering above
  wraps its existing duties.
- **`npx harny init` and the five generators** — untouched. A generated pipeline keeps
  today's monolithic shape; parity is the named follow-up.
- **`.agents/skills/` coexistence** — shared with the `sdd-conductor` artifact a
  `--tools codex` run writes into a target repo (V15, D2).
- **`templates/`** — deliberately divergent on the archive rule until the follow-up
  (§ SUPERSEDES).
- **Future user-authored agents** — the intended consumer of `.agents/skills/README.md`:
  a new role points its `skills:` at `harny-standards` and any subset of the eight,
  without reading the other seven.

---

## Amendment A1 — the T41 non-mutation check (post-implementation, human-approved 2026-09-08)

> **Status:** approved by the human during Phase 5.3; does **not** reopen the post-specs
> gate. Recorded here so the contract accurately reflects the approved change *before* the
> executor applies it. Follows this repo's own precedent for post-implementation amendment
> rounds — `tests/canonical-fidelity.test.ts`'s header already documents an "AL-6 amendment
> round" and an "AL-4 amendment round" from `cli-skeleton`.

### What surfaced

`tests/canonical-fidelity.test.ts:176–185` — the `non-mutation: templates/ and .claude/ are
byte-for-byte unchanged (R16, guarantee 5) (T41)` block, owned by the archived
`cli-skeleton` feature — asserts:

```ts
const { stdout } = await execFileAsync(
  'git', ['status', '--porcelain', '--', 'templates', '.claude'], { cwd: REPO_ROOT },
);
expect(stdout.trim()).toBe('');
```

It now fails. **Verified directly, 2026-09-08:** `git status --porcelain -- templates .claude`
returns `?? .claude/`, and `--untracked-files=all` resolves that to exactly the eight new
bridge symlinks (`.claude/skills/harny-{adr,audit,document,implement,propose,standards,sync,test}`),
none of which is staged yet. `templates/` contributes nothing.

### Root cause: an overloaded proxy, not a defect in either feature

The assertion was written to prove one thing — *`runInit` does not leak writes into the
source `templates/` and `.claude/` directories* (`cli-skeleton` guarantee 5 / R16). Because
`.claude/` was **entirely** gitignored at the time, "no mutation occurred" and "no
uncommitted state exists at all" were indistinguishable, and the cheaper assertion was
chosen. This feature's approved G10/SC15 `.gitignore` change un-ignores
`.claude/skills/harny-*`, which separates the two meanings for the first time. The test now
reports contracted, intended state as a mutation — a **false positive**: nothing wrote to
`.claude/` during the suite; new tracked content simply exists there, exactly as this
contract's own manifest specifies.

This is a genuine cross-feature interaction, not a defect in `cli-skeleton` (correct when
written) or in this feature's spec (unforeseeable without running the suite post-change).
Note also that the current failure is **commit-state dependent** — it would disappear once
the symlinks are committed and reappear for the next contributor with uncommitted
knowledge-base state. A check that passes or fails based on whether someone has committed
yet is not a reliable guard, which is an independent reason to change the mechanism rather
than merely re-baseline it.

### The permitted change — exactly this, and nothing else

**File:** `tests/canonical-fidelity.test.ts` — **only** the describe block at lines 176–185,
plus a header-comment line recording the amendment round.

**Mechanism:** replace the absolute assertion with a **before/after differential**. Snapshot
`git status --porcelain -- templates .claude` *before* the suite's `runInit` calls execute,
snapshot it again after, and assert the two are equal — i.e. assert that **no change
occurred**, not that no uncommitted state exists.

**Header comment:** add a line in the same style as the existing rounds, e.g.
`sdd-skill-library amendment round: T41's non-mutation check is now a before/after
differential — see specs/.../sdd-skill-library/contract.md § Amendment A1.`

### Why guarantee 5 / R16 is not weakened

| Failure the check must catch | Old form | New form |
|---|---|---|
| `runInit` writes a new file into `templates/` or `.claude/` | caught (`??` appears) | caught (snapshot differs) |
| `runInit` modifies a tracked file in `templates/` | caught (` M` appears) | caught (snapshot differs) |
| `runInit` modifies a tracked `.claude/skills/harny-*` symlink | **not caught** — `.claude/` was fully ignored, so nothing surfaced | **caught** — those paths are now tracked |
| `runInit` modifies a gitignored file under `.claude/` (e.g. `agents/`) | not caught | not caught (unchanged, pre-existing) |
| Legitimate pre-existing uncommitted state | **false positive** | correctly ignored |

The differential form is **strictly stronger** for `.claude/` than the assertion it
replaces, because un-ignoring `harny-*` makes a class of mutation visible that was
invisible before. The one remaining blind spot — mutations to still-gitignored paths under
`.claude/` — is pre-existing and unchanged by this amendment; it is recorded here rather
than left implicit.

### What must NOT change

`tests/canonical-fidelity.test.ts` is shared by **three** archived features
(`cli-skeleton`, `cursor-kiro-copilot-generators`, `codex-generator`) and contains **nine**
describe blocks. The eight below are byte-identical after this amendment, and the auditor
must confirm it:

1. `canonical fidelity across all five roles and the conductor (R6, guarantees 1, 2) (T40)` — :59
2. `conductor body completeness, verified non-self-referentially (AL-6, guarantee 23) (T5.14)` — :92
3. `no bare tier-literal fallback remains in src/ (AL-4, guarantees 4, 7) (T5.18)` — :125
4. `single-source: src/ carries no literal copy of canonical prose (guarantee 4) (T41)` — :153
5. `canonical fidelity across all five generators … (guarantee 12; AL-6/AL-23) (Task 4.1)` — :266
6. `no per-tool YAML machinery outside the shared module (guarantee 3) (Task 4.2)` — :338
7. `the AL-5 spec-schema pointer block reaches all 5 x 5 role artifacts (guarantee 8) (Task 4.3)` — :367
8. `no regression: the four shipped generators … are byte-identical (guarantee 12) (Task 4.2)` — :403

**Precision warning for the executor:** blocks 4 and 9 (the amended one) *both* carry the
`(T41)` tag. Only the block at **line 176** — the one whose description begins
`non-mutation:` — is in scope. The `single-source:` block at line 153, which also says
`(T41)`, must not be touched. Matching on the tag alone will edit the wrong block.

Also unchanged: `tests/skill-library.test.ts` and `tests/helpers/frontmatter.ts` remain this
feature's only *new* test-tier files, and every other file under `tests/` — in particular
`tests/packaging.test.ts` — stays byte-identical (guarantee 8, as amended).

---

## Amendment A2 — track all of `specs/` (human decision, 2026-09-09)

> **Status:** a direct human decision, not a discovered defect. Approved 2026-09-09; does
> **not** reopen the post-specs gate. Same recording pattern as § Amendment A1.

### The change

`intent.md`'s git-tracking question (Contradiction 2) offered two options. The originally
selected one was *"un-ignore `specs/current/` and `specs/archived/`, leaving in-flight
`specs/<feature>/` ignored as today"* (`intent.md:355`). **The human now selects the other
option: track all of `specs/`, including in-flight feature work, for this and every future
feature.**

Concretely, the `.gitignore` `specs/` block is removed outright:

```diff
-specs/*
-!specs/current/
-!specs/archived/
```

**Verified on disk, 2026-09-09:** the block is gone; `git status --porcelain -- specs`
returns `?? specs/`; `git check-ignore -v` reports **no** match for
`specs/sdd-skill-library/intent.md`, `specs/current/_index.md` or
`specs/archived/cli-skeleton/intent.md`. The `.claude/` half of the pattern set is
untouched and still behaves as V11 recorded.

### Why this is coherent with the rest of the contract

The G10 goal was *durability* — "a 'current truth' index that vanishes on `git clone` is
not current truth." Tracking strictly more than G10 required cannot weaken that goal. It
also removes an asymmetry the original split created: in-flight specs were the only
pipeline artifact a reviewer could not see in a PR, even though they are the artifact the
three human gates actually review.

### What this supersedes

| Location | Old text | Now |
|---|---|---|
| Guarantee 19 | `git ls-files` … "excludes in-flight `specs/<feature>/**`" | Corrected in place above — in-flight specs are **tracked** |
| § State Changes `.gitignore` block | carried the three-line `specs/` block | Block removed; section carries an AMENDED banner |
| § State Changes split table | `specs/<feature>/**` → "ignored (unchanged)" | → **tracked** |
| V10 (verified fact) | records the sandbox result for `specs/*` + two negations | **Still factually true as an observation**, and V13's git semantics still govern the `.claude/` negations. V10 simply no longer describes the *applied* `specs/` configuration. Not rewritten — it is a dated measurement, and this repo does not retro-edit verified-fact rows |

### Corresponding corrections the executor and auditor must apply

The contract states the new correct behavior; these locations still describe the old split
and need updating or re-verification. None is a spec defect — each was correct when written.

| File | Location | Required correction |
|---|---|---|
| `roadmap.md` | Phase 1.9 / 1.10 | 1.9 no longer applies the `specs/` block. 1.10's ignore-list check drops in-flight specs from the *expected-ignored* set; the security-adjacent `.claude/settings.local.json` check is unchanged and still required |
| `roadmap.md` | Phase 5.4 | "excludes in-flight `specs/<feature>/**`" → in-flight specs are tracked |
| `tasks.md` | Task 1.13 | Applies a `.gitignore` with no `specs/` block |
| `tasks.md` | Task 1.14 | Drop in-flight specs from the expected-ignored list; keep every `.claude/` assertion |
| `tasks.md` | Task 5.4 | Assert `git ls-files` includes **all** of `specs/**`; drop the in-flight exclusion assertion |
| `audit.md` | R15, C19, T13 | Already filled from the previous audit pass — must be **re-verified**, not edited to match. Their current evidence explicitly records "in-flight specs … excluded", which is now the wrong expectation |

**Note for the auditor:** AL-S8 (recorded against R15 — that "no bootstrap step" is
overstated because `.claude/agents/*.md` stay untracked) is **unaffected** by this
amendment. A2 changes only `specs/`; `.claude/agents/` remains ignored by deliberate,
unchanged design.

### Forward-looking consequence for `harny-sync` archive mode

Archive mode moves `specs/<feature>/` → `specs/archived/<feature>/`. `tasks.md` Task 3.2
notes the four migrated directories were untracked, "so `git mv` does not apply." Once
`specs/` is committed, future archive moves operate on **tracked** files, where `git mv`
preserves rename detection and keeps the artifact's history continuous.

The skill must therefore tolerate both states rather than hardcode either: **use `git mv`
when the source path is tracked, plain `mv` otherwise.** The SHA-256 before/after check
(guarantee 9) remains the invariant that actually proves integrity in both cases, so this
is a history-quality improvement, not a correctness dependency. Relevant immediately —
this feature's own Task 5.9 archives `specs/sdd-skill-library/`, whose tracked-vs-untracked
state depends on whether the human has committed by then.

### Explicitly verified as unaffected

**npm packaging is driven by `package.json` `files`, not `.gitignore`** — verified
empirically on 2026-09-09 rather than assumed, because npm *does* fall back to `.gitignore`
when no `.npmignore` exists, which would have made this a real hazard:

- No `.npmignore` exists in the repo.
- `package.json` `files` is `["bin", "dist", "templates", "README.md", "CHANGELOG.md", "AGENTS.md"]`
  and is **not** modified by this feature.
- `npm pack --dry-run --json` after the `.gitignore` change yields **34** files whose
  top-level entries are exactly `AGENTS.md, CHANGELOG.md, README.md, bin, dist,
  package.json, templates` — `specs/`, `.agents/`, `.claude/`, `src/` and `tests/` all
  absent.
- `npx vitest run tests/packaging.test.ts` → **4/4 passing**, including its
  `excludes src/, tests/, and specs/ entirely` case.

An allowlist `files` field takes precedence over the `.gitignore` fallback, so removing the
`specs/` exclusion cannot leak specs into the tarball. Guarantee 20 and
`tests/packaging.test.ts` are unaffected and stay byte-identical.

Also unaffected: guarantees 1–18 and 21; § Amendment A1 (a `.claude`/`templates`-scoped
change with no `specs/` dependency); the `.agents/skills/**` tracking, which was never
matched by any pattern; and every reserved-name and archive-integrity rule.
