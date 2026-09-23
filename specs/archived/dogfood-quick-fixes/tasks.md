# Tasks: dogfood-quick-fixes

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

## Ordering

Phases 1, 2, 3 and 4 are **mutually independent** (roadmap.md § Ordering principle;
contract.md XC-5). They may be executed in any order, in parallel, or one at a time,
and any one may be abandoned without stranding the others. The only ordering
constraints inside this file are:

- within a phase, the red task(s) precede the green task(s);
- Task 1.8 (`npm run build`) precedes any e2e claim about Phase 1;
- Task 4.5 (regenerate this repo's workflow) follows Task 4.3 (change the template);
- all of Phase 5 follows whatever phases were executed.

No task in Phase N reads or writes a file owned by Phase M ≠ N. If a task appears to
need one, stop — that is a scope error, not a dependency.

## Phase 1: Context7 endpoint → `/mcp/oauth` (MO-1 … MO-8)

- [x] Task 1.1: **(RED)** Change the endpoint regex in the `single-literal check`
      describe block from the `/mcp` form to
      `/(['"])https:\/\/mcp\.context7\.com\/mcp\/oauth\1/g`; confirm it fails (0 matches,
      expected 1) before any `src/` change — `tests/mcp.test.ts`
- [x] Task 1.2: **(RED)** Add an `it` asserting the **old** quoted literal occurs zero
      times across every `.ts` under `src/` and across `templates/`. The pattern must be
      quoted-string or end-anchored, never a bare `includes` — the new URL contains the
      old one as a prefix, so a bare check can never fail (MO-2, contract.md § Error
      Handling). Confirm red — `tests/mcp.test.ts`
- [x] Task 1.3: **(RED)** Point every expected-value literal at the new endpoint: the
      `claudeLike`/`cursorLike` fixture entries, the expected JSON and TOML output
      strings, the `jsonSkippedWarning` snippet assertion, and the five `fakeGenerator`
      `mcpConfig` objects. Confirm red — `tests/mcp.test.ts`
- [x] Task 1.4: **(RED)** Update the five-tool MCP config assertions
      (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `.kiro/settings/mcp.json`,
      `.codex/config.toml`) and the pre-existing-entry idempotency fixtures to the new
      endpoint. Confirm red — `tests/init.test.ts`
- [x] Task 1.5: **(RED)** Update each generator's expected `mcpConfig.entry` to the new
      endpoint. Confirm red — `tests/generators/registry.test.ts`
- [x] Task 1.6: **(GREEN)** Change `CONTEXT7_MCP_URL` to
      `'https://mcp.context7.com/mcp/oauth'`. Do not touch any file under
      `src/generators/` — the five imports already carry it (MO-1) —
      `src/mcp.ts`
- [x] Task 1.7: Rewrite `CONTEXT7_MCP_URL`'s doc comment per contract.md § "Public API —
      `src/mcp.ts`" (both endpoints named, the departure from per-client defaults stated,
      ADR 0029 cited, the no-credential claim preserved and explained for the OAuth
      case), and add the 2026-09-22 endpoint re-verification to the module header
      *alongside* the existing 2026-09-15 per-tool-facts date, not replacing it (MO-7) —
      `src/mcp.ts`
- [x] Task 1.8: Correct the three endpoint-dependent prose sites: the published literal
      and its sentence (line 78), behavior item 6's "connects to Context7's hosted
      endpoint anonymously", and § "Using an API key"'s framing. Keep the
      behavior-first / tool-as-attributed-example shape (`AGENTS.md` S7); leave the
      five-file table's paths, root keys and approval-gate column untouched (MO-7, MO-8)
      — `templates/mcp/README.md`
- [x] Task 1.9: Consequential maintenance: update the sample URL in the
      `renderTomlTable` assertion so no stale endpoint remains anywhere in `tests/`.
      Record it in the audit as consequential, not as approved red-phase work —
      `tests/generators/toml.test.ts`
- [x] Task 1.10: `npm run build`, then run `tests/e2e-init.test.ts`. Without the build,
      the e2e suite validates a stale `dist/` and can false-green the endpoint change
      (`AL-20`) — `dist/`, `tests/e2e-init.test.ts`
- [x] Task 1.11: Verify MO-3 by hand on a scratch target: run `npx harny init` with all
      five tools and read the five written config files, confirming path, root key,
      entry shape and the new `url` for each. Record the five observed snippets in
      `audit.md` — scratch directory only

## Phase 2: "Never commit or push" hard rule (GR-1 … GR-9)

- [x] Task 2.1: **(RED)** New describe asserting the rule's distinctive substring
      (`Never commit or push.`) appears in each of the five generators' rendered
      `sdd-documentation` artifact, including inside the decoded
      `developer_instructions` string for Codex (follow this file's existing Codex
      pattern). Confirm red (GR-5) — `tests/canonical-fidelity.test.ts`
- [x] Task 2.2: **(RED)** Same file: assert the substring is present in the
      `sdd-documentation` artifact and absent from `sdd-architect`, `sdd-test-writer`,
      `sdd-executor` and `sdd-auditor` artifacts for the same generator. Confirm red
      (GR-4) — `tests/canonical-fidelity.test.ts`
- [x] Task 2.3: **(RED)** New targeted assertion that the rule's distinctive substring is
      present in **both** `.agents/skills/harny-document/SKILL.md` and
      `templates/skills/harny-document/SKILL.md`, following this file's existing
      prose-commitment precedent (the `harny-doctor` / `harny-document` bootstrap-mode
      substring blocks). Confirm red (GR-6) — `tests/skills-fidelity.test.ts`
- [x] Task 2.4: **(GREEN)** Append the fourth bullet to § "Step 5: Hard Rules", after
      "No scope creep", using contract.md's normative text verbatim. It must forbid
      `git commit` and `git push`, name `--no-verify`, say to leave the working tree and
      report in the Step 6 change summary, and carve out `git mv` (GR-1, GR-2, GR-3).
      Change nothing else — not `capabilities:` (GR-7), not Step 6 —
      `templates/roles/sdd-documentation.md`
- [x] Task 2.5: **(GREEN)** Append the skill-voice bullet to § Guardrails, after
      "Bootstrap mode is bounded and never a shortcut" —
      `templates/skills/harny-document/SKILL.md`
- [x] Task 2.6: **(GREEN)** Append the **byte-identical** bullet to § Guardrails in the
      dogfood copy. `diff` the two new bullets and confirm they are character-for-character
      the same — `.agents/skills/harny-document/SKILL.md`
- [x] Task 2.7: Run the exhaustive divergence sweep and confirm it is green **without**
      editing `DIVERGENCE_TABLE`. If red, the two bullets differ — fix the bullets, never
      the table (GR-9) — `tests/skills-fidelity.test.ts`
- [x] Task 2.8: Confirm the lengthened role body contains no `'''`, no bare carriage
      return and no control character, and stays under GitHub Copilot's 30,000-character
      cap, by running the existing Codex and Copilot generator tests green rather than
      adding new ones (GR-8) — `tests/generators/codex.test.ts`,
      `tests/generators/github-copilot.test.ts`
- [x] Task 2.9: Confirm `git diff --stat` shows the other four role templates untouched
      (GR-4's byte-unchanged half) — `templates/roles/`

## Phase 3: AL-11 — align the stale `extensions` wording (DC-1 … DC-5)

> No red test in this phase, deliberately (roadmap.md Phase 3 step 1). DC-4 requires
> zero observable change, so there is nothing a test could legitimately turn red on.

- [x] Task 3.1: Replace exactly the sentence `Absent, or an empty array, means no
      extension filtering.` in `CommandSpec.extensions`'s doc comment with contract.md's
      amended text, marked `**(A1.)**`. Change no executable statement (DC-1, DC-4) —
      `src/feedback.ts`
- [x] Task 3.2: Replace the same sentence in § Interfaces' copy of that doc comment,
      marked `**(A1.)**` in the file's own convention (DC-2) —
      `specs/archived/feedback-path-hygiene/contract.md`
- [x] Task 3.3: Add the dated correction note **immediately after** the existing
      `> **Post-audit amendment A1 (2026-09-22).**` block — never inside it — naming
      AL-11 and stating plainly that this is a text alignment to PH-6 as amended later
      in the same file (DC-2, DC-3) —
      `specs/archived/feedback-path-hygiene/contract.md`
- [x] Task 3.4: Read the three sites side by side and confirm they make the same four
      claims (DC-5) — `src/feedback.ts`, `templates/hooks/run-feedback.mjs`,
      `specs/archived/feedback-path-hygiene/contract.md`
- [x] Task 3.5: Confirm zero drift: `npm run typecheck` clean; `npm test` pass/fail set
      identical to the 624/625 baseline; `git diff --stat` shows exactly two files and
      only comment/prose lines; `templates/hooks/run-feedback.mjs` and
      `.sdd/feedback/run-feedback.mjs` byte-unchanged; no other file of the archived
      feature touched (DC-3, DC-4) — repo-wide
- [x] Task 3.6: Confirm `specs/archived/feedback-path-hygiene/audit.md` is byte-unchanged
      — AL-11 is closed by *this* feature's record, not by editing that feature's audit
      log (DC-3) — `specs/archived/feedback-path-hygiene/audit.md`

## Phase 4: CI push-to-`main` trigger (CI-1 … CI-6, XC-1)

- [x] Task 4.1: **(RED)** New describe asserting the rendered workflow's `on:` region
      declares `pull_request` **and** a `push` trigger whose `branches` list is exactly
      `main`. Assert it for at least two configurations (resolved `typescript` profile
      and unresolved stack) to prove the triggers are canonical, not profile-derived.
      Confirm red (CI-1) — `tests/engine.test.ts`
- [x] Task 4.2: **(RED, or declared regression guard)** Same describe: extract the region
      between the `harny:begin`/`harny:end generated project configuration` markers and
      assert it contains neither `push` nor `on:`. **Note:** the existing
      `generatedBlockOf` helper is a *nested* function, scoped to the describe block at
      `tests/engine.test.ts:657`, so it is not reachable from a new sibling describe —
      either nest the new assertions inside that block or lift the helper to module
      scope in a separate, clearly-labelled refactor. Do not silently duplicate it. If
      this half is already green today, declare it in the test file's header as a
      regression guard, following the `A1.2` precedent in
      `specs/archived/feedback-path-hygiene/audit.md` (CI-4) — `tests/engine.test.ts`
- [x] Task 4.3: **(GREEN)** Replace the `on:` block with contract.md § CI-1's exact shape
      (`pull_request:` then `push:` → `branches:` → `- main`), and add the header
      paragraph explaining both triggers, why `main` is a literal, which line to change
      for a different default branch, and why a PR branch never double-runs. No
      `src/engine.ts` change (CI-1, CI-2, CI-3, CI-4) — `templates/ci/harny-feedback.yml`
- [x] Task 4.4: Confirm the pre-existing assertions stay green: the
      `toMatch(/pull_request/)` check, the "byte-identical whether one tool or all five"
      check (CI-5), and `tests/canonical-fidelity.test.ts`'s non-mutation sweep —
      **without** adding an allowlist entry, because `templates/ci/**` is already
      allowlisted (XC-4) — `tests/engine.test.ts`, `tests/canonical-fidelity.test.ts`
- [x] Task 4.5: Regenerate this repo's own workflow from the changed template, under the
      Phase-4 authorization the human granted at the gate (contract.md § Questions
      resolved 2). Use the
      generator — a scratch `npx harny init --tools claude-code --stack typescript` and
      copy, or `buildPayload` + `buildFeedbackFiles` directly. **Never hand-edit it**
      (XC-1) — `.github/workflows/harny-feedback.yml`
- [x] Task 4.6: Prove FC-13: `diff` the regenerated file against a fresh scratch
      `harny init` output and confirm the diff is empty; confirm the other seven FC-13
      paths (`.claude/settings.json`, `.sdd/feedback/run-feedback.mjs`,
      `.sdd/shared/probes.mjs`, `.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`,
      `.sdd/harness.json`, `.sdd/spec-schema/*.md`) are byte-unchanged by this feature
      (XC-1) — `.github/workflows/harny-feedback.yml`, `.sdd/`, `.claude/settings.json`
- [x] Task 4.7: Record in `audit.md` who applied Task 4.5 and under what authorization,
      following the precedent `feedback-path-hygiene`'s executor set ("Task 4.3 — who
      applied `.claude/settings.json`") — `specs/dogfood-quick-fixes/audit.md`

## Phase 5: Whole-set validation and hand-off (XC-1 … XC-6)

- [x] Task 5.1: `npm run typecheck` — clean — repo-wide
- [x] Task 5.2: `npm run build` — clean; required before any e2e claim about Phase 1 —
      `dist/`
- [x] Task 5.3: `npm test` — exactly one failure, `tests/packaging.test.ts`'s
      `devDependencies` vitest pin; every test added by this feature passes (XC-3) —
      repo-wide
- [x] Task 5.4: Confirm `package.json` and `tests/packaging.test.ts` are byte-unchanged
      (XC-2, the human's explicit exclusion) — `package.json`,
      `tests/packaging.test.ts`
- [x] Task 5.5: Independence check: confirm the four phases' file sets are disjoint, and
      that reverting any one phase's diff leaves the other three phases' new tests green
      (XC-5) — repo-wide
- [x] Task 5.6: Confirm no allowlist or divergence-table entry was added anywhere
      (XC-4, GR-9) — `tests/canonical-fidelity.test.ts`, `tests/skills-fidelity.test.ts`
- [x] Task 5.7: Confirm `plan.md` is byte-unchanged and `CHANGELOG.md` is untouched by
      the executor (documentation-role territory, and the `feedback-path-hygiene`
      changelog wording is an explicit non-goal) — `plan.md`, `CHANGELOG.md`
- [x] Task 5.8: Record the two earned ADRs for `harny-adr` in the hand-off summary —
      **0029** (Context7 `/mcp/oauth` for all five tools; capability `cli-init`;
      triggers a, c, d) and **0030** (hardcode `main` in the CI push trigger; capability
      `feedback-controls`; triggers a, b) — plus the two candidates deliberately not
      promoted (item 2's role scoping, item 3's text correction), per `harny-adr` step 7.
      ADR files are written **after** the archive move, not by the executor —
      `specs/dogfood-quick-fixes/audit.md`
- [x] Task 5.9: Record the carried reservations in `audit.md`: `R-OAuth` (the OAuth
      endpoint was never exercised against a live install of any of the five tools —
      AL-30 / CG-1 class) and SC17 (a green `harny-feedback` run on a push to `main`,
      observable only after this feature is pushed) —
      `specs/dogfood-quick-fixes/audit.md`

## Blocked Items

- **SC17** — "a green `harny-feedback` run exists on a push to `main`" cannot be
  satisfied before this feature is itself pushed to `main`. It is a post-merge
  observation, carried as a reservation at audit time (Task 5.9). It is the evidence
  `feedback-path-hygiene`'s AL-5 could not produce, which is exactly why item 4 exists.
- **`R-OAuth`** — confirming `/mcp/oauth` actually connects requires a live install of
  each of the five tools. Out of scope by the same standing decision that keeps `AL-30`
  and `CG-1`/`O4` open. Not blocking; recorded.

## Notes

**For the executor:**

- `templates/` is read-only canonical source **to `src/` code**, not to a human or an
  agent editing the repo. Phases 2 and 4 edit `templates/` files deliberately;
  `cli-init.md` invariant 1 ("no code path in `src/` writes to `templates/`") is about
  the CLI's runtime behavior and is not violated by an authored change.
- Both `templates/` paths this feature edits are **already allowlisted** in
  `tests/canonical-fidelity.test.ts`'s `isContractedEntry` (`templates/ci/` by prefix,
  `templates/roles/sdd-documentation.md` by exact match, `templates/skills/` by prefix).
  If that test goes red, something *else* leaked — investigate, never widen the
  allowlist.
- The new URL contains the old one as a prefix. Any check for "the old URL is gone"
  must be quoted-string or end-anchored. This is the single most likely way to ship a
  permanently-passing, permanently-useless test in this feature.
- `harny-sync` archive mode uses `git mv` when the source is tracked. The Phase 2 rule
  must not forbid it (GR-3).
- `.claude/agents/sdd-documentation.md` is a thin pointer and is gitignored. It is
  intentionally **not** edited (contract.md § "Why the live agent file is not edited").
  The human confirmed this at the gate (contract.md § Questions resolved 1): there is no
  Task 2.10, and adding one is out of scope.
- Phase 4's regeneration writes into harny's own harness. The human authorized it at
  the gate (contract.md § Questions resolved 2) on the `feedback-path-hygiene` terms:
  generator-produced, never hand-edited, `diff`-proven. Record who ran it (Task 4.7).
- `AGENTS.md` S6: contract ids never appear in test **names**. Every existing test file
  in this repo puts them in the `Spec:` / `Covers:` header comment instead, and several
  put them in `describe` titles (a standing LOW finding, `AL-4`). Follow the header
  convention for the new tests; do not introduce new id-bearing `it` titles.
- `AGENTS.md` S4: no dependency is added. If any task seems to need one, it is a scope
  error.

**For the test-writer:**

- Six red tests are specified: 1.1, 1.2, 1.3, 1.4, 1.5 (Phase 1), 2.1, 2.2, 2.3
  (Phase 2), 4.1 and possibly 4.2 (Phase 4). Phase 3 has none, by explicit roadmap
  decision.
- Tasks 1.3–1.5 and 1.9 are *updates* to existing assertions rather than new tests; they
  still go red before Task 1.6 and are the primary MO-3 evidence.
- Task 4.2 may already be green today. If so, declare it in the test file's header as a
  regression guard rather than silently presenting it as red-phase work — the
  `feedback-path-hygiene` `A1.2` precedent.

## Completion

All five phases completed by `harny-implement` (sdd-executor) on 2026-09-22. `npm test`: 633 passed, 1 failed (the pre-existing, out-of-scope `tests/packaging.test.ts` vitest-pin failure — unchanged, untouched). `npm run typecheck` and `npm run build`: clean.
