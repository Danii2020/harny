# Roadmap: dogfood-quick-fixes

## Ordering principle

Four items, four independent stories (intent.md G6, contract.md XC-5). **Phases 1–4
each own exactly one item and none depends on any other**: their file sets are
disjoint, and any one can be built, reviewed, reverted, or rejected without touching
the other three. The numbering is a presentation order (roughly: most code first, least
code last), not a dependency chain. Phase 5 is the only phase with real dependencies.

Every phase is test-first (`AGENTS.md` § Working conventions): a red assertion before
the change that makes it green. Phase 3 is the one deliberate exception, and says why.

| Phase | Item | Contract ids | Depends on |
|---|---|---|---|
| 1 | Context7 endpoint → `/mcp/oauth` | MO-1 … MO-8 | None |
| 2 | "Never commit or push" hard rule | GR-1 … GR-9 | None |
| 3 | AL-11 `extensions` wording | DC-1 … DC-5 | None |
| 4 | CI push-to-`main` trigger + dogfood regeneration | CI-1 … CI-6, XC-1 | None |
| 5 | Whole-set validation and hand-off | XC-1 … XC-6 | Phases 1–4 |

## Implementation Phases

### Phase 1: Context7 endpoint → `/mcp/oauth`

**Goal**: harny writes `https://mcp.context7.com/mcp/oauth` into all five tools' MCP
configuration files, from a single literal, with every piece of prose that describes
the endpoint corrected in the same change.
**Dependencies**: None
**Estimated complexity**: Low (one value) / Medium (test surface — five test files
literal the old URL)

1. **Red — update the single-literal check.** In `tests/mcp.test.ts`'s
   `single-literal check: MCP_SERVER_NAME and CONTEXT7_MCP_URL are each literalled
   exactly once in src/` describe block, change the endpoint test's regex from
   `/(['"])https:\/\/mcp\.context7\.com\/mcp\1/g` to the `/mcp\/oauth` form. Confirm it
   goes **red** against current `src/` (0 matches, expected 1).
2. **Red — add the no-stale-literal assertion (MO-2).** A new `it` in the same block
   asserting the *old* quoted literal occurs zero times across `src/` **and** across
   `templates/`. Write the pattern as a **quoted-string** match
   (`/(['"])https:\/\/mcp\.context7\.com\/mcp\1/`) or an end-anchored match for the
   template's Markdown backtick form — never a bare `.includes('https://mcp.context7.com/mcp')`,
   which the new URL contains as a prefix and which would therefore be permanently and
   invisibly wrong (contract.md § Error Handling). Confirm red.
3. **Red — update the generated-output assertions.** Point every existing assertion
   that names the old endpoint at the new one:
   `tests/mcp.test.ts` (fixture entries, expected JSON/TOML text, the skipped-warning
   snippet assertion, the five `fakeGenerator` configs), `tests/init.test.ts` (the
   five-tool MCP config assertions and the idempotency fixtures),
   `tests/generators/registry.test.ts` (each generator's `mcpConfig.entry`). Confirm
   they all go red.
4. **Green — change the value.** `src/mcp.ts`: `CONTEXT7_MCP_URL` becomes
   `'https://mcp.context7.com/mcp/oauth'`. **No generator file is touched** (MO-1; the
   five imports already exist). Re-run: steps 1–3 go green.
5. **Correct the prose that the value invalidates (MO-7).** Rewrite
   `CONTEXT7_MCP_URL`'s doc comment per contract.md § "Public API — `src/mcp.ts`"; add
   the 2026-09-22 endpoint re-verification to the module header alongside — not
   replacing — the 2026-09-15 per-tool facts date.
6. **Correct `templates/mcp/README.md` (MO-7, MO-8).** Three sites: the published
   literal (line 78 and its sentence), behavior item 6's "connects to Context7's hosted
   endpoint anonymously" claim, and § "Using an API key"'s framing. Keep the
   behavior-first / tool-as-attributed-example shape (`AGENTS.md` S7); leave the
   five-file table's paths, root keys and approval-gate column untouched.
7. **Consequential test maintenance.** `tests/generators/toml.test.ts` uses the old URL
   as a sample value in a generic `renderTomlTable` assertion. It is not an assertion
   about what harny emits, but leaving a stale endpoint in the repo is confusing —
   update it to the new value. Record this as consequential maintenance, not part of
   the approved red phase (same convention `context7-mcp`'s executor used for
   `tests/canonical-fidelity.test.ts`).
8. **Build, then verify end to end.** `npm run build` before running
   `tests/e2e-init.test.ts`, which spawns `bin/harness.js` → `dist/` and would otherwise
   validate a stale build (standing reservation `AL-20`).

### Phase 2: "Never commit or push" hard rule

**Goal**: the `sdd-documentation` role cannot reach a commit or push on its own
initiative, in a scaffolded repo (via the canonical role body) or in harny's own
thinned pipeline (via the `harny-document` skill body).
**Dependencies**: None
**Estimated complexity**: Low

1. **Red — canonical body reaches all five tools (GR-5).** New describe in
   `tests/canonical-fidelity.test.ts` asserting that a distinctive substring of the new
   rule (e.g. `Never commit or push.`) appears in each of the five generators' rendered
   `sdd-documentation` artifact — for Codex, inside the decoded
   `developer_instructions` TOML string, following the existing
   `tests/canonical-fidelity.test.ts` pattern for that generator. Confirm red.
2. **Red — exactly one role has it (GR-4).** Same file: assert the substring appears in
   the `sdd-documentation` artifact and in **none** of `sdd-architect`,
   `sdd-test-writer`, `sdd-executor`, `sdd-auditor` for the same generator. This is the
   testable form of "the other four templates are byte-unchanged"; the byte-unchanged
   claim itself is verified at audit by `git diff`.
3. **Red — both skill roots carry it (GR-6).** New targeted assertion in
   `tests/skills-fidelity.test.ts` (the file that already owns the two-root
   relationship): the rule's distinctive substring is present in **both**
   `.agents/skills/harny-document/SKILL.md` and
   `templates/skills/harny-document/SKILL.md`. Follow the existing precedent in that
   file for prose commitments (the `harny-doctor` / `harny-document` bootstrap-mode
   substring blocks): a substring check plays the role a behavioral test plays for
   executable code. Confirm red.
4. **Green — role template.** Append the bullet to
   `templates/roles/sdd-documentation.md` § "Step 5: Hard Rules", after "No scope
   creep", using contract.md's normative text. Touch nothing else in the file — not the
   `capabilities:` line (GR-7), not Step 6.
5. **Green — both skill roots.** Append the skill-voice bullet to
   `templates/skills/harny-document/SKILL.md` § Guardrails and the **byte-identical**
   bullet to `.agents/skills/harny-document/SKILL.md` § Guardrails.
6. **Confirm `DIVERGENCE_TABLE` needs no edit (GR-9).** `tests/skills-fidelity.test.ts`'s
   `'harny-document'` entry is `{ kind: 'diverges', requiredInTemplate: ['rather than
   assuming any prior history exists'] }`; an identical addition to both copies leaves
   that declared divergence intact. Run the exhaustive divergence sweep and confirm it
   is green **without** editing the table. If it is red, the two bullets are not
   identical — fix the bullets, never the table.
7. **Verify the vendor limits (GR-8).** Confirm the lengthened role body contains no
   `'''`, no bare `\r`, no control character (Codex TOML, TG-7) and stays far below
   GitHub Copilot's 30,000-character body cap. The existing generator tests cover both;
   confirm they are green rather than adding new ones.

### Phase 3: AL-11 — align the stale `extensions` wording

**Goal**: close `feedback-path-hygiene`'s AL-11 by making the two remaining sites state
amendment A1's rule, with zero behavior change.
**Dependencies**: None
**Estimated complexity**: Low

1. **No red test, deliberately.** DC-4 requires that item 3 change *nothing* observable:
   no statement, no output, no test outcome. A test that could go red for a doc-comment
   edit would have to assert on comment text, which pins prose to a literal and rots
   immediately. Verification is by reading the three sites side by side (DC-5) and by
   confirming the suite's pass/fail set is unchanged. This exception is recorded here,
   per `AGENTS.md` § Working conventions ("default to test-first … unless a feature's
   roadmap says otherwise"), and is the reason the roadmap says otherwise.
2. **Edit `src/feedback.ts`.** Replace the single sentence `Absent, or an empty array,
   means no extension filtering.` in `CommandSpec.extensions`'s doc comment with
   contract.md's amended text, marked `**(A1.)**`. Change no code.
3. **Edit `specs/archived/feedback-path-hygiene/contract.md`.** Replace the same
   sentence in its § Interfaces copy, and add the dated correction note immediately
   after the existing `> **Post-audit amendment A1 (2026-09-22).**` block — never inside
   it. Touch nothing else in that file or in any other file of that archived feature
   (DC-3).
4. **Verify the three sites agree (DC-5).** Read `src/feedback.ts`'s comment,
   `templates/hooks/run-feedback.mjs`'s `matchesExtensions` comment, and the archived
   contract's § Interfaces copy together; confirm the same four claims (four no-filter
   cases, "valid entry" = non-empty string, mixed lists match only valid entries,
   unusable ⇒ no filter never match-nothing).
5. **Verify zero drift.** `npm run typecheck` clean; `npm test` pass/fail set identical
   to the baseline; `git diff --stat` shows exactly two files and only comment/prose
   lines; `templates/hooks/run-feedback.mjs` and `.sdd/feedback/run-feedback.mjs`
   byte-unchanged.

### Phase 4: CI push-to-`main` trigger, and this repo's own workflow

**Goal**: a direct push to `main` is checked by the `harny-feedback` workflow, in every
scaffolded repo and in harny itself.
**Dependencies**: None
**Estimated complexity**: Low

1. **Red — the generated workflow declares both triggers (CI-1).** New describe in
   `tests/engine.test.ts`, alongside the existing `buildFeedbackFiles — the CI workflow
   triggers on pull_request …` block: assert the rendered workflow's `on:` region
   declares a `push` trigger whose `branches` list is exactly `main`, and still declares
   `pull_request`. Assert it for at least two configurations (a resolved `typescript`
   profile and an unresolved stack) to prove it is canonical, not profile-derived.
   Confirm red.
2. **Red — the triggers are outside the generated block (CI-4).** Same describe: extract
   the region between `harny:begin`/`harny:end generated project configuration` and
   assert it contains no `push` and no `on:` — i.e. the change is canonical content, not
   generated content. The existing `generatedBlockOf` helper is nested inside the
   describe at `tests/engine.test.ts:657` and is not reachable from a sibling describe;
   nest the new assertions there, or lift the helper to module scope as a labelled
   refactor. Confirm red or,
   if this half is already green today, mark it as a declared regression guard in the
   test's own header (the `A1.2` precedent in
   `specs/archived/feedback-path-hygiene/audit.md`).
3. **Green — edit the canonical template.** `templates/ci/harny-feedback.yml`: replace
   the `on:` block with contract.md § CI-1's exact shape, and add the header paragraph
   explaining both triggers, the hardcoded `main`, and the no-double-run reasoning. No
   `src/engine.ts` change.
4. **Verify the existing assertions still hold.** `tests/engine.test.ts`'s current
   `expect(workflow?.contents).toMatch(/pull_request/)` and its "byte-identical whether
   one tool or all five are selected" test must both stay green (CI-5), as must
   `tests/canonical-fidelity.test.ts`'s non-mutation sweep — `templates/ci/**` is
   already allowlisted there, so **no allowlist edit** (XC-4).
5. **Regenerate this repo's own workflow (XC-1, FC-13).** Under the Phase-4
   authorization the human granted at the gate (contract.md § Questions resolved 2),
   regenerate
   `.github/workflows/harny-feedback.yml` from the changed template — by running
   `npx harny init` against a scratch directory with
   `--tools claude-code --stack typescript` and copying the result, or by driving
   `buildPayload` + `buildFeedbackFiles` directly, the two mechanisms
   `feedback-path-hygiene`'s executor used and recorded. Never hand-edit it: a
   hand-edited file that happens to match is not evidence of FC-13.
6. **Prove byte-identity.** `diff` this repo's regenerated
   `.github/workflows/harny-feedback.yml` against a fresh scratch `harny init` output;
   the diff must be empty. Confirm the other seven FC-13 paths are byte-unchanged by
   this feature.

### Phase 5: Whole-set validation and hand-off

**Goal**: the four items are jointly green, jointly independent, and the record is
complete.
**Dependencies**: Phases 1–4
**Estimated complexity**: Low

1. `npm run typecheck` — clean.
2. `npm run build` — clean (required before any e2e claim about item 1; `AL-20`).
3. `npm test` — 1 failure and exactly 1: `tests/packaging.test.ts`'s vitest pin
   (XC-3). Every test this feature added passes.
4. **Independence check (XC-5).** Confirm by inspection that the four items' file sets
   are disjoint, and that reverting any one phase's diff leaves the other three phases'
   tests green.
5. **`git status` hygiene.** Confirm `tests/canonical-fidelity.test.ts`'s non-mutation
   sweep is green and that no allowlist entry was added (XC-4).
6. **Record the two earned ADRs for `harny-adr`** (written post-archive, not now):
   - **ADR 0029 — Context7 `/mcp/oauth` for all five tools.** Triggers (a) a choice
     between two named viable options (`/mcp` vs `/mcp/oauth`, and per-tool fallback vs
     uniform), (c) it diverges from `context7-mcp`'s shipped endpoint fact and from
     Context7's own per-client examples, and (d) it accepts a known unverifiable claim
     (no live tool was tested against the OAuth endpoint). Capability: `cli-init`.
   - **ADR 0030 — Hardcode `main` in the CI push trigger.** Triggers (a) hardcode vs
     derive-from-git vs prompt, and (b) it constrains every repo harny will ever
     scaffold. Capability: `feedback-controls`.
   - **Deliberately not promoted**: item 2's scoping ("only `sdd-documentation`") — it
     is a scope decision recorded in intent.md § Non-Goals, and the two-layer placement
     is an *application* of ADR 0013's already-recorded accepted cost, not a new
     decision. Item 3 is a text correction with no decision in it at all. Both are
     listed in the hand-off summary as candidates not promoted, per `harny-adr` step 7.
7. **Reservations to carry into the audit**: `R-OAuth` (the OAuth endpoint was never
   exercised against a live install of any of the five tools — AL-30 / CG-1 class), and
   SC17 (a green `harny-feedback` run on a push to `main`) which is only observable
   after this feature is pushed.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A stale-literal check is written as a bare substring match, so it matches the new URL forever and never catches a regression | **High** | Medium | MO-2 mandates a quoted-string or end-anchored pattern; Phase 1 step 2 calls it out; the auditor must re-derive that the check can actually fail |
| `/mcp/oauth` is gated on the client implementing MCP OAuth, and one or more of the five tools does not — the config is written correctly but is inert or erroring | Medium | **High** | Out of scope to detect (intent.md § Non-Goals); carried as reservation `R-OAuth`; the Error Handling Contract names the per-tool hand-edit remedy; the human owns this trade-off and has already taken it |
| The rule lands only in the role template, so harny's own thinned `sdd-documentation` agent still has no git rule and the incident can recur here | Medium | **High** | This is the exact premise error the exploration caught; GR-6 makes the skill-layer landing a guarantee and Phase 2 step 3 makes it a red test |
| The executor "fixes" `tests/canonical-fidelity.test.ts`'s allowlist or `tests/skills-fidelity.test.ts`'s `DIVERGENCE_TABLE` to make something pass | Medium | **High** | XC-4 and GR-9 make both edits explicit contract violations; Phase 2 step 6 and Phase 4 step 4 tell the executor what "green without editing" looks like |
| The scaffolded repo's default branch is not `main`, so the push trigger silently never fires | Medium | Low | Accepted and documented: CI-2's rationale, the template header comment naming the line to change, and the Error Handling Contract row |
| Adding a `push` trigger causes double runs and doubles CI minutes | Low | Medium | CI-3, verified against GitHub's own trigger-filter documentation (re-fetched 2026-09-22); the branch filter makes the two events disjoint for a topic branch |
| FC-13 drifts because item 4 changes a canonical template and this repo's copy is not regenerated | Medium | **High** | Phase 4 steps 5–6 regenerate and then `diff`-prove byte-identity against a fresh scratch `init` |
| Item 3's edit to an archived, shipped artifact is mistaken for rewriting audit history | Low | Medium | DC-3 forbids touching A1's record, PH-6, the Error Handling rows and the audit log; the correction note is added *after* A1's block and says plainly what it is |
| The e2e suite false-greens item 1 against a stale `dist/` | Medium | Medium | Standing reservation `AL-20`; Phase 1 step 8 and Phase 5 step 2 order `npm run build` before any e2e claim |
| Scope creep into `package.json`, the `CHANGELOG.md` wording, or the `sdd-documentarian` question | Medium | Medium | All three are explicit non-goals in intent.md; the auditor checks `git diff --stat` against this roadmap's File Change Map |
| Item 2's bullet forbids `git mv` and thereby breaks `harny-sync` archive mode | Low | **High** | GR-3 makes the carve-out a guarantee and contract.md's normative text contains it explicitly |

## File Change Map

### Phase 1 — item 1

- `src/mcp.ts` — MODIFY — `CONTEXT7_MCP_URL`'s value, its doc comment, and the module
  header's verification-date line.
- `templates/mcp/README.md` — MODIFY — the published endpoint literal (line 78 and its
  sentence), behavior item 6's anonymity claim, § "Using an API key"'s framing.
- `tests/mcp.test.ts` — MODIFY — the single-literal endpoint regex; a new zero-occurrence
  assertion for the old literal; every fixture and expected-output literal.
- `tests/init.test.ts` — MODIFY — the five-tool MCP config assertions and the
  idempotency fixtures.
- `tests/generators/registry.test.ts` — MODIFY — each generator's expected
  `mcpConfig.entry`.
- `tests/generators/toml.test.ts` — MODIFY — consequential: the sample URL in the
  `renderTomlTable` assertion.
- `src/generators/{claude-code,cursor,kiro,github-copilot,codex}.ts` — **NOT MODIFIED**
  (MO-1). Listed here because "no change" is the guarantee.

### Phase 2 — item 2

- `templates/roles/sdd-documentation.md` — MODIFY — one appended bullet in § "Step 5:
  Hard Rules".
- `templates/skills/harny-document/SKILL.md` — MODIFY — one appended bullet in
  § Guardrails.
- `.agents/skills/harny-document/SKILL.md` — MODIFY — the byte-identical appended
  bullet.
- `tests/canonical-fidelity.test.ts` — MODIFY — new describe for GR-5 (all five
  generators) and GR-4 (only this role). **Its `isContractedEntry` allowlist is not
  edited** (XC-4).
- `tests/skills-fidelity.test.ts` — MODIFY — new targeted assertion for GR-6. **Its
  `DIVERGENCE_TABLE` is not edited** (GR-9).
- `templates/roles/{sdd-architect,sdd-test-writer,sdd-executor,sdd-auditor}.md` —
  **NOT MODIFIED** (GR-4).
- `.claude/agents/sdd-documentation.md` — **NOT MODIFIED** — thin pointer, gitignored;
  covered through the skill layer (contract.md § "Why the live agent file is not
  edited"). Settled at the gate: the human answered **no** (contract.md § Questions
  resolved 1) — this file stays unedited, and a queued `rules-layer` feature is expected
  to single-source the rule rather than add a third copy.

### Phase 3 — item 3

- `src/feedback.ts` — MODIFY — one doc-comment sentence in `CommandSpec.extensions`.
- `specs/archived/feedback-path-hygiene/contract.md` — MODIFY — the same sentence in
  § Interfaces, plus one dated correction note after the A1 block.
- `templates/hooks/run-feedback.mjs`, `.sdd/feedback/run-feedback.mjs` — **NOT
  MODIFIED** — they already state A1 correctly and are the alignment target (DC-4).
- `specs/archived/feedback-path-hygiene/{intent,roadmap,tasks,audit}.md` — **NOT
  MODIFIED** (DC-3).

### Phase 4 — item 4

- `templates/ci/harny-feedback.yml` — MODIFY — the `on:` block and the header paragraph.
- `tests/engine.test.ts` — MODIFY — new describe for CI-1 and CI-4.
- `.github/workflows/harny-feedback.yml` — REGENERATE — this repo's own dogfood copy
  (XC-1, FC-13). Produced by running the generator, never hand-edited.
- `src/engine.ts` — **NOT MODIFIED** (CI-4).

### Cross-cutting

- `specs/dogfood-quick-fixes/{intent,contract,roadmap,tasks,audit}.md` — CREATE — this
  spec set (already written).
- `specs/dogfood-quick-fixes/decisions/0029-*.md`, `0030-*.md` — CREATE **later**, by
  `harny-adr`, after `harny-sync` archive mode has moved this feature to
  `specs/archived/dogfood-quick-fixes/`. Not created by the executor.
- `package.json`, `tests/packaging.test.ts` — **NOT MODIFIED** (XC-2, human's explicit
  exclusion).
- `CHANGELOG.md`, `README.md`, `AGENTS.md`, `specs/current/**` — written by the
  documentation role after the audit is approved, not by the executor.
- `plan.md` — **NEVER MODIFIED**. Untracked, read-only background.
