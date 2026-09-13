Shipped: 2026-09-13

# Intent: templates-skill-library-parity

## Problem Statement

harny's own repo and the pipeline harny *ships* have diverged, and the divergence is
already recorded as an open reservation rather than discovered as drift.

**What the dogfood repo runs today.** The five SDD pipeline roles are thin agent files
that preload action-shaped skills. `.claude/agents/sdd-architect.md` is 26 lines —
frontmatter plus a pointer body — and every instruction lives in
`.agents/skills/harny-propose/SKILL.md`, bridged to `.claude/skills/harny-propose` by a
git-tracked relative symlink. Eight `harny-*` skills exist, each satisfying a published
six-key frontmatter contract and a five-section body contract.

> **Source:** `specs/current/pipeline-roles.md` PR-8 ("Role instructions extracted into
> harny-* skills"); `specs/current/skill-library.md` SL-1, SL-2, SL-3; observed
> `.claude/agents/sdd-architect.md:1–26`, `.agents/skills/README.md:14–85`.

**What `npx harny init` scaffolds today.** One monolithic role file per pipeline role per
selected tool, and nothing else instruction-bearing:

| Tool | Role artifacts written | Conductor artifact |
|---|---|---|
| `claude-code` | `.claude/agents/<role>.md` | `.claude/skills/sdd-conductor/SKILL.md` |
| `cursor` | `.cursor/agents/<role>.md` | `.cursor/skills/sdd-conductor/SKILL.md` |
| `kiro` | `.kiro/agents/<role>.md` | `.kiro/skills/sdd-conductor/SKILL.md` |
| `github-copilot` | `.github/agents/<role>.agent.md` | `.github/skills/sdd-conductor/SKILL.md` |
| `codex` | `.codex/agents/<role>.toml` | `.agents/skills/sdd-conductor/SKILL.md` |

With all five tools selected that is 30 tool artifacts, plus one copy each of the five
spec-schema files and `.sdd/harness.json`. Zero `harny-*` skills. Zero thin agents. The
canonical `templates/` tree holds exactly eleven files: five role bodies, one conductor,
five spec-schema scaffolds — no `templates/skills/` directory exists.

> **Source:** `specs/current/tool-generators.md` TG-1, TG-6, TG-10;
> `specs/current/cli-init.md` CLI-8, CLI-10; observed `src/generators/{claude-code,
> cursor,kiro,github-copilot,codex}.ts` (`agentsDir`/`conductorPath` fields);
> `templates/` file listing.

**The gap is already named.** `specs/current/skill-library.md` carries open reservation
`templates-parity`: *"a pipeline scaffolded by `npx harny init` still gets today's
five-monolith shape with no `harny-*` skills"*, naming `templates-skill-library-parity`
as the follow-up that closes it. `specs/current/spec-workflow.md` SW-7 records the same
supersession from the other side: "archive in place" was superseded **for the live Claude
Code pipeline only**, leaving `templates/roles/sdd-documentation.md` still mandating the
old rule. This feature is that named follow-up.

> **Source:** `specs/current/skill-library.md` § Open reservations, row `templates-parity`;
> `specs/current/spec-workflow.md` SW-7.

Five concrete consequences, each observable today:

1. **A scaffolded repo cannot run the workflow harny demonstrates.** The DevFest
   portability demo shows a thin agent invoking `harny-propose`, and `harny-propose`
   Step 0 is a mandatory `harny-sync` lookup (`skill-library.md` SL-7). A repo scaffolded
   by `npx harny init` has no `harny-sync`, so the very first step of the documented
   procedure is unrunnable there. The scaffolded architect instead carries the whole
   procedure inlined in `.claude/agents/sdd-architect.md` — the exact monolith shape the
   dogfood repo abandoned.

2. **The `.agents/skills/` opportunity is already paid for and unused.** `codex.ts`
   already writes `.agents/skills/sdd-conductor/SKILL.md` and already ships the note that
   this directory "is not namespaced to one tool" (`tool-generators.md` TG-9;
   `src/generators/codex.ts:148–149`). Fresh first-party verification (2026-09-09, see
   § Constraints) confirms Cursor and GitHub Copilot read the same directory. Three of
   five targets already share a skill root that harny writes to and puts nothing
   reusable in.

3. **Kiro's skills support is unrecorded, and TG-6 is now incomplete.**
   `tool-generators.md` TG-6 pins Kiro facts verified 2026-08-12 — role files, a `tools`
   category-tag field, a conductor at `.kiro/skills/`, a 1,024-char `description` cap.
   That statement predates Kiro's documented Agent Skills support entirely and says
   nothing about `.kiro/skills/<name>/SKILL.md` as a *general* skill root, its folder-name
   rule, or its frontmatter field set. TG-6 must be corrected and extended, not worked
   around.

4. **The two duplicate-content failures this repo has already paid for are about to
   recur.** `canonical-role-templates` AL-2/C9 found that the architect's inlined copy of
   the spec templates and `templates/spec-schema/` had silently diverged
   (`spec-workflow.md` SW-3 records the reconciliation). `sdd-skill-library`'s
   problem statement item 2 cites the same incident as the predicted cost of duplication,
   "already paid once." Introducing `templates/skills/` alongside `.agents/skills/`
   creates a *third* pair of near-identical instruction copies. The relationship between
   them must be contracted and machine-checked up front, not left to discipline.

5. **The dogfood skills are not verbatim shippable, and nothing says so.**
   `.agents/skills/harny-standards/SKILL.md:53–61` instructs the executor to confirm
   "S1 (TypeScript/ESM/`.js` specifiers/`node:` prefix)… S6 (tests mirror `src/`, carry a
   `Spec:`/`Covers:` header)" — harny's own stack, meaningless in a scaffolded Go or
   Python repo. Copying `.agents/skills/` byte-for-byte into a target repo would ship
   harny's TypeScript conventions as if they were the user's. Which parts are portable
   and which are harny-specific is currently written down nowhere.

Who is affected: **every user of `npx harny init`** (they get a demonstrably older
architecture than the tool's own repo runs, and cannot reproduce the documented
procedure); **the maintainer** (two instruction trees drifting with no fidelity check —
the AL-2 failure mode, at twice the surface area); and **the DevFest Quito workshop
audience**, for whom "here is the thin-agent + skills architecture" followed by
"…which the scaffolder does not produce" is the single most damaging inconsistency in
the demo.

### One current-truth statement this feature contradicts (declared, not silent)

`harny-sync` lookup returned `skill-library.md` **SL-4**: *"The system SHALL cap a
skill's `description` (plus `when_to_use`) at 1,536 characters — the field Claude uses
to decide when to apply a skill."*

Fresh first-party verification on **2026-09-09** (https://agentskills.io/specification)
states the portable Agent Skills standard caps `description` at **1,024 characters**, and
Kiro's skills documentation (https://kiro.dev/docs/skills/, verified 2026-09-09)
independently states "max 1024 chars". SL-4's 1,536 figure is a Claude-Code-specific
allowance; it is *wider* than the portable cap, so a skill authored to SL-4 can be
spec-invalid and Kiro-invalid while passing harny's own guard
(`tests/skill-library.test.ts:46`, `DESCRIPTION_MAX_LENGTH = 1536`).

**Position taken:** this feature does not repeal SL-4 for the dogfood repo; it adds a
*stricter* 1,024-character cap on anything written into `templates/skills/` and therefore
scaffolded into a target repo, since those files land in Kiro and in spec-compliant
runtimes. No live violation exists today — the longest of the eight descriptions is
`harny-sync` at **735 characters**, and the longest `compatibility` is `harny-sync` at
**231** against the spec's 500-character cap — so this is a guard against future
authoring, not a repair. Recorded here per `harny-propose` Step 0's requirement to state
any contradiction of a `harny-sync` brief explicitly rather than silently.

## Goals

1. **G1 — Introduce `templates/skills/` as the canonical, target-repo-neutral source for
   the scaffolded skill library.** Eight `harny-*` skill directories, each with a
   `SKILL.md` satisfying the same six-key frontmatter contract and five-section body
   contract the dogfood skills satisfy (`skill-library.md` SL-1, SL-3), plus the two
   bundled resources those skills reference by bare filename
   (`harny-sync/capability-template.md`, `harny-adr/adr-template.md`) and the shape
   contract itself so a scaffolded repo can add a ninth skill.

2. **G2 — Contract the relationship between `.agents/skills/` (dogfood) and
   `templates/skills/` (shipped), and machine-check it.** Name the exact classes of
   permitted divergence (harny-specific stack conventions, harny-specific repo paths),
   forbid every other divergence, and add a fidelity test in the shape of
   `tests/canonical-fidelity.test.ts`. This is the direct mitigation for the AL-2 drift
   failure named in problem-statement item 4.

3. **G3 — Write skills as real per-tool file copies, never symlinks, deduped by unique
   skill root.** A scaffolded repo is not guaranteed to be a Unix system or to be harny
   itself, so the git-tracked symlink bridge that serves the dogfood repo
   (`skill-library.md` SL-2, ADR 0001) is explicitly not reused. Placement follows each
   tool's verified discovery root: `.agents/skills/` for `cursor`/`codex`/`github-copilot`
   (written at most once per run), `.claude/skills/` for `claude-code`, `.kiro/skills/`
   for `kiro`. The dedup must be a natural generalization of the single-write-per-run
   pattern `.sdd/spec-schema/` already uses (`cli-init.md` CLI-8), not a bespoke
   mechanism.

4. **G4 — Verify every new per-tool skill-discovery fact against first-party
   documentation, dated, before pinning it** — per `pipeline-roles.md` PR-4, and per the
   precedent `tool-generators.md` TG-6 set. Specifically: correct and extend TG-6's Kiro
   statement (which predates Kiro's skills support); resolve what a Kiro parser does with
   the `allowed-tools` key its documentation does not enumerate; and freshly re-verify the
   Cursor and Copilot `.agents/skills/` claims rather than compounding the never-live-
   verified risk that `tool-generators.md` AL-30 and CG-1/O4 already carry.

5. **G5 — Ship a selection mechanism for the two opt-in skills.** The five pipeline-role
   skills plus `harny-sync` are always scaffolded; `harny-adr` and `harny-standards` are
   selectable, with defaults chosen on evidence and justified in `contract.md`. The
   mechanism must be shaped like the existing `--roles` / `RoleSelection` precedent
   (`cli-init.md` CLI-3), including its non-interactive `USAGE` error and its interactive
   preset-skip behavior, rather than inventing a second selection idiom.

6. **G6 — Decide, and record, what happens to the five monolithic role files for a tool
   that now also gets skills.** Either `templates/roles/sdd-*.md` continues to ship
   unchanged for every tool, or `templates/` gains its own thinned-role layer mirroring
   `.claude/agents/sdd-*.md`'s pointer shape (`pipeline-roles.md` PR-8). The choice must
   be argued in `contract.md` against the missing-skill silent-degradation failure mode
   `skill-library.md` SL-5 documents, not settled by preference.

7. **G7 — Extend the existing CLI invariants to the new artifact class rather than
   exempting it.** Determinism, path containment and the single-trailing-newline rule
   (`cli-init.md` CLI-4); conflict detection before any write, `--dry-run`, `--force`
   (CLI-5); partial generator availability (CLI-7). Every one applies unchanged to skill
   artifacts, and `--dry-run` must list them.

8. **G8 — Amend `cli-init.md` CLI-10's closed tarball manifest explicitly.** CLI-10 pins
   "all eleven `templates/**` files" and `tests/packaging.test.ts:20–32` enumerates them.
   Adding `templates/skills/**` changes that count; the amendment is a contract line and
   a test update, never a silent drift.

9. **G9 — State the `Generator`-interface decision explicitly.** `tool-generators.md`
   TG-1 asserts the interface is "deliberately sufficient for all five targets without
   amendment." Skills are a new artifact class that assertion never covered. Whether the
   interface gains a member or skill emission runs beside it must be decided, argued, and
   recorded as an amendment to TG-1's scope — not slipped in.

10. **G10 — Reconverge `templates/` with SW-7's stamp-then-archive lifecycle.** The
    supersession `sdd-skill-library` recorded was scoped to the live pipeline only, and
    `templates/roles/sdd-documentation.md` still mandates "archive in place." A scaffolded
    repo that receives `harny-sync` (whose archive mode *moves* the directory) alongside a
    role file that forbids moving it would ship a self-contradiction. Closing the
    `templates-parity` reservation means closing this half of it too.

11. **G11 — Change nothing about the existing 30 tool artifacts.** Role and conductor
    rendering, `mapModel`, `mapCapabilities`, the wrapper serializers, the
    `harny:begin`/`harny:end` blocks, and the byte-for-byte canonical-body guarantee
    (`tool-generators.md` TG-3, TG-4) are untouched. This feature is additive to the write
    plan; a run that selects no skills must produce byte-identical output to today's.

12. **G12 — Be reflexively correct.** This feature's own spec set follows the schema
    (`spec-workflow.md` SW-1, SW-2), cites every fact to a current-state document section
    or a dated first-party source, and is archivable by `harny-sync` on approval.

## Success Criteria

- [ ] **SC1 (G1)** `templates/skills/` exists containing eleven files: eight
      `harny-<action>/SKILL.md`, `harny-sync/capability-template.md`,
      `harny-adr/adr-template.md`, and a shape-contract `README.md`. `templates/**` goes
      from 11 files to 22.
- [ ] **SC2 (G1)** Every `templates/skills/harny-*/SKILL.md` declares only the six
      portable Agent Skills frontmatter keys (`name`, `description`, `license`,
      `compatibility`, `metadata`, `allowed-tools`) and carries the five required body
      sections in order (`# <Title>`, `## When to use this`, `## Inputs`, `## Steps`,
      `## Guardrails`), per `skill-library.md` SL-1/SL-3 and `.agents/skills/README.md`.
- [ ] **SC3 (G1)** Every `templates/skills/harny-*/SKILL.md` has a `description` of at
      most **1,024** characters and a `compatibility` of at most **500**, satisfying the
      portable spec and Kiro simultaneously — a strictly tighter bound than
      `skill-library.md` SL-4's 1,536 (see § Problem Statement, declared contradiction).
- [ ] **SC4 (G1)** Each `templates/skills/harny-*/SKILL.md`'s folder name equals its
      `name:` field, is 1–64 characters of lowercase letters, digits and hyphens, and
      neither starts, ends, nor doubles a hyphen — the constraint Kiro and the portable
      spec both impose.
- [ ] **SC5 (G2)** `contract.md` carries a divergence table with one row per
      `.agents/skills/harny-*` ↔ `templates/skills/harny-*` pair, stating either
      "byte-identical" or the exact permitted divergence and its justification. A test
      fails if a pair diverges outside its declared class.
- [ ] **SC6 (G3)** A run selecting `claude-code`, `cursor`, `kiro`, `github-copilot` and
      `codex` writes each selected skill's files exactly three times — once under
      `.agents/skills/`, once under `.claude/skills/`, once under `.kiro/skills/` — never
      five times and never once.
- [ ] **SC7 (G3)** A run selecting only `cursor`, `codex` and `github-copilot` writes
      each selected skill's files exactly **once**, under `.agents/skills/`.
- [ ] **SC8 (G3)** No skill artifact written by any run is a symlink; every one is a
      regular file whose contents are byte-identical to its `templates/skills/` source.
- [ ] **SC9 (G4)** `contract.md` carries a "Verified facts" table in which every skill
      discovery path, folder-naming rule, frontmatter field set and character limit
      carries a first-party source URL and the verification date `2026-09-09`, and in
      which the `allowed-tools`-under-Kiro question is answered explicitly rather than
      assumed.
- [ ] **SC10 (G4)** `contract.md` states, in a section the auditor can find by heading,
      that `tool-generators.md` TG-6's Kiro row is superseded-and-extended by this
      feature, naming what TG-6 said and what now replaces it.
- [ ] **SC11 (G5)** A CLI flag selects the opt-in skills; naming an always-on skill
      through it is a `USAGE` error non-interactively and an `io.warn` interactively,
      matching CLI-3's established shape. `--help` documents it.
- [ ] **SC12 (G5)** With no flags, a default `npx harny init .` run writes exactly the
      skill set `contract.md` names as the default, and `.sdd/harness.json` round-trips
      that selection through `serializeConfig` → `loadConfigFile` unchanged.
- [ ] **SC13 (G6)** `contract.md` records the decision on `templates/roles/sdd-*.md` with
      its argument, and whichever branch is chosen, no scaffolded pipeline can reach a
      state where a role's instructions exist in neither its role file nor a written
      skill.
- [ ] **SC14 (G7)** Skill artifacts appear in `--dry-run` output; a pre-existing skill
      path is a `CONFLICT` (exit 3) without `--force` and is overwritten with it; two runs
      with identical config produce byte-identical skill trees; every skill artifact path
      is relative, resolves inside `targetDir`, and ends in exactly one `\n`.
- [ ] **SC15 (G8)** `tests/packaging.test.ts`'s expected-file list is updated to the new
      count, `npm pack --dry-run` contains every `templates/skills/**` file, and still
      contains nothing under `src/`, `tests/` or `specs/`.
- [ ] **SC16 (G9)** `contract.md` states the `Generator`-interface decision and, if the
      interface changes, records the amendment to `tool-generators.md` TG-1 by name.
      Every one of the five generators still resolves via `availableToolIds()` (TG-2).
- [ ] **SC17 (G10)** `templates/roles/sdd-documentation.md`'s archive instruction and the
      shipped `harny-sync`/`harny-document` skills agree on one lifecycle; `grep` finds no
      surviving "archive in place / do NOT move" instruction contradicting SW-7 anywhere
      in `templates/`.
- [ ] **SC18 (G11)** For a run selecting zero skills, the set of written paths and every
      file's bytes are identical to the pre-change build. `tests/canonical-fidelity.test.ts`
      and `tests/generators/*.test.ts` pass unmodified except where G8/G9 explicitly
      amend them.
- [ ] **SC19 (G11)** `npm run typecheck` and `npm test` pass; `src/vocabulary.ts` still
      imports nothing and no import cycle exists (`cli-init.md` CLI-11).
- [ ] **SC20 (G12)** This feature's five spec files satisfy SW-2 traceability and
      `specs/templates-skill-library-parity/` is archivable by `harny-sync` on approval.

## Non-Goals

- **Changing the dogfood `.agents/skills/` library's behavior.** Its eight skills, the
  symlink bridge, and `skill-library.md` SL-1..SL-10 stay in force. Where
  `templates/skills/` must diverge, the divergence is declared in this feature's
  `contract.md`; it does not edit the dogfood skills to match.
- **Repealing `skill-library.md` SL-4.** The 1,536-character cap continues to govern
  `.agents/skills/`. This feature only imposes a *tighter* 1,024 bound on
  `templates/skills/`, and states why (§ Problem Statement).
- **Replacing the symlink bridge with copies in the dogfood repo.** ADR 0001 stands for
  harny's own repo; copies are for scaffolded targets only.
- **Renaming the scaffolded skills to `sdd-*`.** They keep the `harny-*` brand,
  unchanged, matching the dogfood names — a decision already taken by the human.
- **Moving the conductor.** `sdd-conductor` stays a per-tool artifact at each tool's own
  conductor path (`tool-generators.md` TG-1's `conductorPath`), is not renamed to
  `harny-*`, and is not deduped into `.agents/skills/` alongside the new skills — even
  though that would save two copies for `cursor` and `github-copilot`. Doing so would
  change 30 shipped tool artifacts for a benefit outside this feature's goals
  (`pipeline-roles.md` PR-9). The resulting asymmetry — conductor per-tool, `harny-*`
  shared — is recorded in `contract.md` as deliberate, with a named follow-up.
- **A sixth generator, or any change to `mapModel` / `mapCapabilities` / the wrapper
  serializers.** `tool-generators.md` TG-5's shared-serialization rule is untouched;
  skills carry no frontmatter harny generates, so no serializer is involved.
- **Emitting a `harny:begin`/`harny:end` configuration block into a skill file.** Skill
  files are copied whole, so there is no rendered region for one. Config-derived facts
  continue to reach the user only through role and conductor artifacts and
  `.sdd/harness.json`.
- **A `harny sync` / `harny adr` CLI subcommand,** or any runtime execution of a skill by
  the CLI. `npx harny init` writes files; it does not run skills. Carried forward
  unchanged from `sdd-skill-library`'s non-goals.
- **New runtime or dev dependencies.** `dependencies` and `devDependencies` stay
  byte-identical, per `cli-init.md` invariant 3 and `tests/packaging.test.ts:86–92`.
- **Publishing `.agents/skills/` (the dogfood copies) to npm.** `package.json` `files`
  gains nothing; `templates/` is already listed, so `templates/skills/**` ships by
  inclusion, and `.agents/` stays out.
- **Live end-to-end verification inside a running Cursor, Kiro, Copilot or Codex
  install.** That is the standing, human-gated reservation `tool-generators.md` AL-30 and
  CG-1/O4 already carry. This feature verifies against first-party documentation to the
  same standard and inherits the same reservation; it does not pretend to close it.
- **README.md and CHANGELOG.md updates.** Those are `harny-document`'s automatic
  post-audit step (`pipeline-roles.md` PR-5), listed in `roadmap.md` as such.
- **MCP provisioning.** Unchanged standing non-goal from `plan.md` §4.

## Constraints

### Verified per-tool facts (all re-fetched from first-party docs on 2026-09-09)

| Tool | Skill discovery root(s) | Source |
|---|---|---|
| Claude Code | `.claude/skills/<name>/SKILL.md` only — project, personal, nested, enterprise, `--add-dir` and plugin locations are all `.claude/skills/`-shaped; **`.agents/skills/` is not read at all** | https://code.claude.com/docs/en/skills |
| Cursor | `.agents/skills/` **and** `.cursor/skills/` (project-level), `~/.agents/skills/` and `~/.cursor/skills/` (user-level) | https://cursor.com/docs/skills |
| GitHub Copilot | "Project skills, stored in your repository (`.github/skills`, `.claude/skills`, or `.agents/skills`)" | https://docs.github.com/en/copilot/concepts/agents/about-agent-skills |
| Kiro | `.kiro/skills/<name>/SKILL.md` (workspace, takes priority) and `~/.kiro/skills/<name>/SKILL.md` (global). `.agents/skills/` is **not** listed | https://kiro.dev/docs/skills/ |
| Codex | `.agents/skills/`, walked from cwd up to the repo root | `tool-generators.md` TG-9 (verified 2026-09-02); `src/generators/codex.ts:148–149` |

Consequences that bind the design:

- **Three of five targets share `.agents/skills/`.** Cursor, Copilot and Codex all read
  it, so one copy serves all three — which is what makes the CLI-8-style
  single-write-per-run dedup the right mechanism rather than an optimization.
- **Claude Code needs its own copy.** It reads only `.claude/skills/`, which is precisely
  why the dogfood repo needs a symlink bridge at all (`skill-library.md` SL-2). In a
  scaffolded repo the answer is a real file, not a link.
- **Kiro needs its own copy.** Its documented roots are `.kiro/skills/` and
  `~/.kiro/skills/`; `.agents/skills/` is absent from that list.
- **Copilot also reads `.claude/skills/`.** A `--tools claude-code,github-copilot` run
  therefore has two viable roots for Copilot. Whichever `contract.md` picks must be
  stated, because the choice changes the written-file count.

### Portable Agent Skills specification (https://agentskills.io/specification, 2026-09-09)

- Exactly six frontmatter fields exist: `name` and `description` **required**; `license`,
  `compatibility`, `metadata`, `allowed-tools` optional. This is the same six-key set
  `skill-library.md` SL-3 and ADR 0005 already pin — the standard confirms them rather
  than adding to them.
- `name`: 1–64 characters, lowercase letters/digits/hyphens only, must not start or end
  with a hyphen, no consecutive hyphens, **must match the parent directory name**.
- `description`: 1–1,024 characters. `compatibility`: ≤500 characters. `metadata`: a map
  from string keys to string values. `allowed-tools`: a **space-separated string**, marked
  *Experimental*, "support for this field may vary between agent implementations."
- Recommended body budget: SKILL.md under 500 lines, instructions under ~5,000 tokens.
  The largest current skill, `harny-sync`, is 139 lines / 8,093 bytes — within budget.

### The `allowed-tools` question, unresolved by documentation alone

Kiro's skills documentation lists `name` and `description` as required and `license`,
`compatibility` and `metadata` as optional; **`allowed-tools` does not appear**, and the
page does not state whether an unrecognized frontmatter key is ignored or is a validation
failure (verified 2026-09-09). Two facts bear on it and pull in the same direction:
`allowed-tools` is a *first-party portable-spec field*, not a Claude-Code-only key, so
Kiro's list appears to be a documented subset rather than an exhaustive allowlist; and
`.agents/skills/harny-standards/SKILL.md` already omits `allowed-tools` entirely,
proving the field is optional in practice. Claude Code's own documentation, by contrast,
states that for spec-compliant *distribution* an out-of-spec key fails with a hard error
("Unexpected key(s) in SKILL.md frontmatter… Allowed properties are: allowed-tools,
compatibility, description, license, metadata, name") — an allowlist that *includes*
`allowed-tools`. `contract.md` must resolve this explicitly rather than assume: either
every copy keeps `allowed-tools` (preserving byte-identity across roots, at an unverified
Kiro risk) or the Kiro copy is stripped (forking content, breaking the byte-identity
guarantee G3/SC8 wants). The unverified half must be recorded as a reservation either way.

### Existing contracts that bind this feature

- **`cli-init.md` CLI-1** — `runInit`'s 13-step sequence is normative. Skill planning must
  fit an existing step (11, "render"; or 12, "plan writes") or the sequence itself must be
  amended by an explicit contract line, as amendment round 1 did when it grew 12 steps to
  13.
- **`cli-init.md` CLI-4** — determinism, containment, exactly one trailing `\n`. Note that
  every current `.agents/skills/harny-*/SKILL.md` already ends in exactly one newline, so
  this is a copy-preserving property, not a transform.
- **`cli-init.md` CLI-5** — conflict detection completes before the first write; a
  scaffolded repo that already has `.agents/skills/harny-propose/SKILL.md` (e.g. it *is*
  harny, or a prior run) must be a `CONFLICT`, exit 3, nothing written.
- **`cli-init.md` CLI-7** — if at least one selected tool has a generator the run
  succeeds; the skill roots derive from *resolved* generators only, so a skipped tool
  contributes no root.
- **`cli-init.md` CLI-10 / `tests/packaging.test.ts:20–32`** — the tarball manifest is a
  closed, enumerated set. It must be amended, not extended by accident.
- **`cli-init.md` CLI-11** — `src/vocabulary.ts` imports nothing. A new `SKILL_IDS`
  vocabulary belongs there and must not introduce an import.
- **`cli-init.md` invariant 1** — no code path in `src/` writes to, renames or deletes
  anything under `templates/`. `templates/skills/` is a read-only source like every other
  template.
- **`tool-generators.md` TG-2** — `availableToolIds()` stays exactly the five ids.
- **`tool-generators.md` TG-3/TG-4** — byte-for-byte canonical-body preservation and
  per-tool-diff-only. Skills have no wrapper and no rendered region, so the parallel
  guarantee available for them is *stronger* (whole-file identity, not substring
  containment). Whether TG-3/TG-4 extend as-is or gain a parallel statement is an open
  question `contract.md` must close.
- **`spec-workflow.md` SW-6** — `.sdd/spec-schema` is single-sourced from
  `src/engine.ts`'s `SPEC_SCHEMA_DIR`, never re-literalled. Note that
  `.agents/skills/harny-propose/SKILL.md` Step 3 *already* names both
  `templates/spec-schema/*.md` and `.sdd/spec-schema/*.md` in prose, so the shipped
  skill is already deployment-portable on this point — a genuine head start, and a prose
  string that must not drift from the constant.
- **`skill-library.md` SL-5** — a missing or policy-disabled skill is skipped with a
  *warning*, not an error, which is why every thin agent carries a "STOP and report"
  guard. Any scaffolded thin-role branch of G6 inherits this failure mode.
- **`pipeline-roles.md` PR-3, PR-7 / standard S7** — canonical content may not name one
  tool's mechanic as the only possibility. `templates/skills/` is tool-neutral content by
  definition and is held to this.
- **Toolchain unchanged:** Node ≥ 20.19.0, TypeScript 7.0.2, vitest 4.1.10, ESM,
  `nodenext` with `.js` import specifiers (`AGENTS.md` § Coding standards S1).

### Compatibility

- `tests/e2e-init.test.ts` asserts exact written-path sets for several tool combinations
  and a 30-tool-artifact total for all five tools. Every one of those expectations changes
  the moment skills are written by default; the updates are in scope and must be
  enumerated, not discovered.
- `tests/fixtures/templates/{well-formed,missing-file,malformed-metadata,mutated-cost-tier}/`
  each mirror the canonical `templates/` shape. If `loadCanonicalTemplates` is extended to
  require `skills/`, every fixture must gain one or the loader must tolerate its absence —
  a decision with a test-suite-wide blast radius that `contract.md` must make deliberately.
- `.sdd/harness.json` is a versioned artifact (`CONFIG_VERSION = 1`). Adding a persisted
  skill selection either round-trips within version 1 or requires a version bump; the
  round-trip test (`serializeConfig` → `loadConfigFile`) must keep passing.
- The two bundled resources (`capability-template.md`, `adr-template.md`) are referenced
  from their skills by **bare filename** (`.agents/skills/README.md` rule 6). They must
  land in the same directory as their `SKILL.md` in every root, or the reference dangles —
  the same class of failure `canonical-role-templates` AL-5 found for `spec-schema/`.

### Business

- The DevFest Quito workshop is **2026-09-26**. `plan.md` §6 gives the portability demo
  minutes 45–52 — the segment where a scaffolded repo is shown next to harny's own. This
  feature is what makes those two look like the same architecture.
- The extension point must survive scaffolding: a user who runs `npx harny init` should be
  able to add a ninth `harny-*` skill from the shipped shape contract alone, exactly as
  `skill-library.md` SL-1's contract promises inside harny.

## Prior Art

**In this codebase**

- `specs/current/cli-init.md` **CLI-8** and `src/engine.ts:76–85`
  (`buildSharedFiles`) — the single-write-per-run pattern this feature generalizes.
  `.sdd/spec-schema/*` is written once regardless of tool count because its path is a
  constant; skills are written once *per unique skill root* for exactly the same reason.
- `specs/current/tool-generators.md` **TG-9** and `src/generators/codex.ts:148–149` — this
  repo's own shipped statement that `.agents/skills/` is a shared, tool-neutral directory,
  with the coexistence caveat already written for users. This feature puts eight more
  files in a directory harny already writes to and already documents.
- `specs/archived/sdd-skill-library/` — the direct predecessor. Its `contract.md`
  § "Verified facts" (V1–V13) and its § "The harny-* skill shape contract" are the shape
  this feature ports; its § SUPERSEDES is what named `templates-skill-library-parity` in
  the first place; ADR 0001 (symlink bridge) is the decision this feature deliberately
  *does not* reuse, and ADR 0005 (six portable keys) is the one it does.
- `specs/archived/cursor-kiro-copilot-generators/` and `specs/archived/codex-generator/` —
  the precedent for a "Verified facts" table with per-row first-party sources and a
  verification date, and for a discrepancy table where fresh verification contradicts an
  earlier record. G4/SC9/SC10 adopt both; the Kiro correction is exactly such a
  discrepancy.
- `specs/archived/canonical-role-templates/` — the closest structural analog for a
  content-heavy feature, and the origin of the three findings that bind this one: AL-2
  (two copies of the same content drift), AL-5 (a reference must still resolve after
  deployment — the bundled-resource risk above is its exact shape), and AL-9 (a
  tool-specific mechanic must not be the only one named in portable content).
- `tests/canonical-fidelity.test.ts` — the existing model for a non-self-referential
  fidelity check between `templates/` and generated output. G2's `.agents/skills/` ↔
  `templates/skills/` check is the same idea applied to a new pair.
- `src/config.ts` `RoleSelection` / `PartialHarnessConfig` and `src/prompts.ts`'s
  preset-skip pattern — the established selection idiom G5 must imitate, including
  `mergeConfig`'s "naming a member outside the enabled set is a `USAGE` error" rule
  (`cli-init.md` CLI-3) and `runInit` step 6's interactive `io.warn` counterpart.
- `.agents/skills/README.md` — the published shape contract, the single document a
  scaffolded repo needs in order to make the extension point real there too.

**External** (all consulted 2026-09-09; full citations with URLs in `contract.md`)

- **Agent Skills specification**, https://agentskills.io/specification — the six
  frontmatter fields, the `name` and `description` constraints, the 500-character
  `compatibility` cap, and the *Experimental* status of `allowed-tools`.
- **Kiro skills documentation**, https://kiro.dev/docs/skills/ — workspace and global
  skill roots, workspace-takes-priority, the folder-name-equals-`name` rule, the required
  and optional field lists, and the 1,024-character `description` cap. This is the source
  that supersedes-and-extends `tool-generators.md` TG-6's Kiro row.
- **Cursor skills documentation**, https://cursor.com/docs/skills — the four discovery
  locations including `.agents/skills/`, quoted verbatim in `contract.md`.
- **GitHub Copilot agent-skills documentation**,
  https://docs.github.com/en/copilot/concepts/agents/about-agent-skills — project skills
  in `.github/skills`, `.claude/skills`, or `.agents/skills`.
- **Claude Code skills documentation**, https://code.claude.com/docs/en/skills — the
  discovery-location table proving `.agents/skills/` is not read, and the hard-error
  behavior for out-of-spec frontmatter keys during spec-compliant distribution.
