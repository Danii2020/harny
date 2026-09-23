# Tasks: documentation-role-completion

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

Every task cites the `roadmap.md` phase it belongs to (by position) and the
`contract.md` guarantee id it serves. Red-phase tasks (`R`) are interleaved at their
real positions: they are written and confirmed failing **before** the implementation
task directly beneath them.

## Phase 1: Foundation — the family selector and its three copies

- [x] Task 1.1R: Red — write the selector's behavior suite: `--only` absent reproduces
      today's five-family output; `--only spec-state` emits only family-4 lines; an
      unknown token exits `1`; `--only` with no value exits `1`; two identical runs
      produce byte-identical stdout — `tests/doctor-runner-only.test.ts` (`RC-1`–`RC-4`)
      — pre-written by the test-writer; confirmed red before Task 1.4 landed (every
      `--only` invocation fell into the generic unknown-flag branch and exited 1
      before any family ran, exactly as `tests/doctor-runner-only.test.ts`'s own file
      header predicted), and green afterward.
- [x] Task 1.2R: Red — write the no-child-process assertion for `--only spec-state`.
      Observe that **no process is spawned**, not merely that no test output appears —
      e.g. drive the runner with a `checks.json` whose `commands` entry would create a
      sentinel file, and assert the sentinel does not exist —
      `tests/doctor-runner-only.test.ts` (`RC-2`) — confirmed red then green.
- [x] Task 1.3R: Red — write the shipped-but-unarchived round trip: a temp repo with
      `specs/<fixture>/intent.md` carrying a `Shipped:` header and `audit.md` carrying
      an approved verdict exits `2` and names `spec-state:<fixture>`; after the
      directory is moved under `specs/archived/`, the same invocation exits `0` —
      `tests/doctor-runner-only.test.ts` (`RC-5`; intent SC2) — confirmed red then green.
- [x] Task 1.4: Change `parseArgs` to return `{ checksArg, onlyArg }`; parse
      `--only <family>`; reject a missing value and an unknown token through the
      existing `fail()`; extend the unknown-flag message to mention `--only` —
      `templates/doctor/run-doctor.mjs` (`RC-3`)
- [x] Task 1.5: Add the `FAMILY_TOKENS` array and the `selected(token)` predicate,
      returning `true` whenever `onlyArg` is `undefined` —
      `templates/doctor/run-doctor.mjs` (`RC-1`)
- [x] Task 1.6: Guard all five family blocks in `main()` with `selected(...)`,
      ensuring family 1's `node-version` emit **and** its empty-`commands` notice,
      family 3's label line, and family 5's entire `spawnSync` loop sit inside their
      guards — `templates/doctor/run-doctor.mjs` (`RC-1`, `RC-2`)
- [x] Task 1.7: Confirm `process.exit(failCount > 0 ? 2 : 0)` is unchanged and
      correct for a selector-scoped run — `templates/doctor/run-doctor.mjs` (`RC-3`)
      — confirmed unchanged by inspection; no edit needed.
- [x] Task 1.8: Regenerate `.sdd/doctor/run-doctor.mjs` from the edited template and
      verify byte-identity — `.sdd/doctor/run-doctor.mjs` (`RC-17`) — regenerated via
      a fresh `node bin/harness.js init <scratch> --tools claude-code --stack
      typescript --skills all --yes` (the `--skills all` flag matches this repo's own
      recorded optional-skill selection, which includes `harny-adr`; the bare
      `--yes` default omits it and is not what this repo was initialized with) and
      copied verbatim; `diff` confirms byte-identity against the edited template.
- [x] Task 1.9: Regenerate the third copy and verify byte-identity —
      `tests/fixtures/golden/ci-workflow-root/run-doctor.mjs` (`RC-17`) — copied from
      the edited template; `diff` confirms byte-identity against both other copies.
- [x] Task 1.10R: Red — assert `src/doctor.ts` still spawns the runner with
      `['--checks', checksJson]` and no selector, and that
      `.sdd/doctor/checks.json` is unchanged — `tests/doctor.test.ts` (`RC-6`) —
      declared continuity guard; passed already at red time (no `src/` change in
      this feature) and stays green.
- [x] Task 1.11: Verify no file under `src/` was modified in this phase —
      `src/doctor.ts` (`RC-6`) — `git status --porcelain -- src/` is empty.

## Phase 2: Core Logic — tier, rationale, parity, precondition

- [x] Task 2.1R: Red — assert the role template declares `cost_tier: mid` and that its
      `cost_rationale` no longer contains the "no independent verification of its own"
      claim — `tests/canonical-fidelity.test.ts` (`RC-7`; intent SC9) — pre-written by
      the test-writer; confirmed red then green.
- [x] Task 2.2R: Red — assert each of the five generators resolves the
      `sdd-documentation` template to its own `mid`-tier model id via
      `generator.renderRole({ template, tier: template.metadata.costTier })`, and that
      no file under `src/generators/` differs — `tests/canonical-fidelity.test.ts`
      (`RC-8`; intent SC10) — confirmed red then green.
- [x] Task 2.3R: Red — assert the role template names all three hand-off sub-steps in
      order (`harny-sync` archive, `harny-adr`, `harny-sync` capability/index update).
      Note the current baseline: `grep -c harny-adr templates/roles/sdd-documentation.md`
      returns **0** — `tests/canonical-fidelity.test.ts` (`RC-10`; intent SC11) —
      confirmed red then green.
- [x] Task 2.4R: Red — assert the completion precondition's four required elements are
      present in the role template and in **both** `harny-document/SKILL.md` copies —
      `tests/skills-fidelity.test.ts`, `tests/canonical-fidelity.test.ts` (`RC-9`;
      intent SC4) — confirmed red then green.
- [x] Task 2.5R: Red — assert the precondition text reaches all five generators'
      `sdd-documentation` artifact verbatim and is **absent** from the other four
      roles' artifacts, reusing the GR-5/GR-4 shape at
      `tests/canonical-fidelity.test.ts:543` — `tests/canonical-fidelity.test.ts`
      (`RC-11`; intent SC5) — confirmed red then green.
- [x] Task 2.6: Set `cost_tier: mid` and replace the `cost_rationale` with the text in
      `contract.md` § Interfaces item 2 —
      `templates/roles/sdd-documentation.md` (`RC-7`)
- [x] Task 2.7: Restructure the hand-off to name all three sub-steps in order, closing
      the F2 divergence — `templates/roles/sdd-documentation.md` (`RC-10`) —
      landed as a new Step 5 ("Hand Off to the Knowledge-Base Skills"), between the
      renumbered Bootstrap step and the new completion-precondition step; Step 3
      item 4 now stamps only, no longer bundling the hand-off.
- [x] Task 2.8: Add the completion precondition with all four elements, stated
      generically with an attributed example per `S7`/`PR-7` —
      `templates/roles/sdd-documentation.md` (`RC-9`) — landed as new Step 6
      ("Verify Before Reporting Completion").
- [x] Task 2.9: Add the same precondition in skill voice —
      `templates/skills/harny-document/SKILL.md` (`RC-9`)
- [x] Task 2.10: Add **byte-identical** precondition text to the dogfood copy, in the
      same change as Task 2.9 — `.agents/skills/harny-document/SKILL.md` (`RC-9`,
      `RC-12`) — landed in the same change; `diff` of both `SKILL.md` copies shows
      only the pre-existing declared divergence (the `_index.md` bootstrap-template
      sentence).
- [x] Task 2.11: Confirm `DIVERGENCE_TABLE`'s `'harny-document'` entry is **not**
      edited and its `requiredInTemplate: ['rather than assuming any prior history
      exists']` still holds — `tests/skills-fidelity.test.ts` (`RC-12`; intent SC12)
      — not edited; `tests/skills-fidelity.test.ts` passes.
- [x] Task 2.12: Regenerate so `sdd-documentation`'s recorded tier becomes `mid`;
      verify byte-identity against fresh `npx harny init` output —
      `.sdd/harness.json` (`RC-17`) — regenerated from the same scratch init as
      Task 1.8; `diff` confirms byte-identity.
- [x] Task 2.13: Confirm the `cheapest` fixtures are left untouched — they are test
      inputs, not the shipped default —
      `tests/fixtures/templates/well-formed/roles/sdd-documentation.md` (`RC-8`) —
      not touched; `git status --porcelain` shows no change under
      `tests/fixtures/templates/`.

## Phase 3: Integration — the orchestrator

- [x] Task 3.1R: Red — assert `templates/conductor/sdd-conductor.md` requires
      verifying the archive before declaring the pipeline complete, and says the
      verdict comes from running the check rather than from the role's report —
      `tests/canonical-fidelity.test.ts` (`RC-14`; intent SC6) — confirmed red then
      green.
- [x] Task 3.2R: Red — write the presence-gated live-conductor guard with the exact
      semantics `RC-16` fixes: existence check on the path; absent ⇒ **reported skip**
      (observable in the report, never a silently-passing empty assertion);
      present-but-empty ⇒ **fail**; present-and-missing-an-element ⇒ **fail naming the
      element** — `tests/conductor-parity.test.ts` (`RC-16`; intent SC8) — pre-written
      by the test-writer; the direct assertion against the real, locally-present
      `.claude/skills/sdd-conductor/SKILL.md` was genuinely red (missing all four
      RC-15 elements); confirmed green after Tasks 3.4–3.6.
- [x] Task 3.3: Require the conductor to confirm the archive landed before declaring
      the pipeline complete, in § "Closing the loop" and § "Conductor mechanics",
      as an application of the existing "Verify, don't trust" rule —
      `templates/conductor/sdd-conductor.md` (`RC-14`)
- [x] Task 3.4: Repair the drift — add `sdd-documentation` to the pipeline diagram
      (it appears **0** times today) —
      `.claude/skills/sdd-conductor/SKILL.md` (`RC-15`)
- [x] Task 3.5: Add the post-audit hard rule matching the template's rule #4, taking
      the live file from four numbered hard rules to five —
      `.claude/skills/sdd-conductor/SKILL.md` (`RC-15`)
- [x] Task 3.6: Add `auditor → documentation` to the automatic-flow list and the
      archive verification to "Closing the loop" —
      `.claude/skills/sdd-conductor/SKILL.md` (`RC-15`)
- [x] Task 3.7: Confirm the guard passes with the live file present and complete, and
      skips when it is renamed away — `tests/conductor-parity.test.ts` (`RC-16`) —
      the "present and complete" case is the direct assertion against the real file,
      now passing; the "skips when absent" case is covered by the pre-existing
      fixture-driven sub-test (not by renaming the real file, which the test file's
      own header explains would corrupt a real developer's local, untracked file).

## Phase 4: Testing & Validation

- [x] Task 4.1: Confirm every Phase 1–3 red test now passes and that each failed at
      red time for the right reason (missing behavior/text, not a test bug) —
      `tests/doctor-runner-only.test.ts`, `tests/conductor-parity.test.ts` — verified;
      see the per-task notes above.
- [x] Task 4.2: Verify the three `run-doctor.mjs` copies are byte-identical to one
      another — `templates/doctor/run-doctor.mjs`, `.sdd/doctor/run-doctor.mjs`,
      `tests/fixtures/golden/ci-workflow-root/run-doctor.mjs` (`RC-17`) — confirmed
      via pairwise `diff` and via `tests/canonical-fidelity.test.ts`'s T23 block.
- [x] Task 4.3: Verify `.sdd/doctor/checks.json` is unchanged and `DoctorChecksFile`
      gained no field — `.sdd/doctor/checks.json`, `src/doctor.ts` (`RC-5`, `RC-6`) —
      `git status --porcelain -- .sdd/doctor/checks.json` is empty; `src/doctor.ts`
      untouched.
- [x] Task 4.4: Verify FC-13 — `.sdd/`, `.claude/settings.json` and
      `.github/workflows/harny-feedback.yml` are byte-identical to fresh
      `npx harny init` output; confirm the latter two are untouched —
      `.sdd/`, `.claude/settings.json`, `.github/workflows/harny-feedback.yml`
      (`RC-17`; intent SC14) — `diff -rq` against a fresh scratch init (matched to
      this repo's optional-skill selection via `--skills all`) shows no difference
      under `.sdd/` other than the runtime-only `.sdd/feedback/.turns/` directory;
      `.claude/settings.json` and the CI workflow are untouched
      (`git status --porcelain` shows no entry for either).
- [x] Task 4.5: Run the full suite and confirm the baseline: new tests green, no
      previously-passing test regressed, `tests/packaging.test.ts` the single
      pre-existing failure — `tests/` (`RC-18`; intent SC13) — 730 passing / 1
      failing (`tests/packaging.test.ts`, the pre-existing pin unrelated to this
      feature). See notes below on the two consequential test updates this required.
- [x] Task 4.6: Dogfood the result — run
      `node .sdd/doctor/run-doctor.mjs --only spec-state` against this repo with
      `specs/documentation-role-completion/` unstamped, and confirm it exits `0`
      (nothing stranded) — `.sdd/doctor/run-doctor.mjs` (`RC-2`, `RC-3`) — confirmed:
      exit 0, `0 ok, 0 skipped, 0 warned, 0 failed` (this feature's own spec is not
      yet shipped/approved, so it contributes no spec-state line).
- [x] Task 4.7: Confirm every `Spec:`/`Covers:` header on new and modified test files
      names this feature and the ids it covers, per `S6` —
      `tests/doctor-runner-only.test.ts`, `tests/conductor-parity.test.ts` —
      confirmed; both carry `Spec: specs/documentation-role-completion` headers
      naming their covered contract/behavior ids.

## Blocked Items

None.

## Notes

**For the executor:**

1. **The one failure mode that matters most is a green run that evaluated nothing.**
   An unknown `--only` value must exit `1`, never `0`. A selector whose typo silently
   disables the check would be strictly worse than shipping nothing, because it would
   read as verification. Task 1.4 and the Risk Assessment both single this out.
2. **Family 5 must not spawn under `--only spec-state`** (`RC-2`). Task 1.2R asserts
   the absence of a spawn, not the absence of output — the two differ, and only the
   former proves the run is cheap enough to sit at the end of every documentation
   turn.
3. **Tasks 2.9 and 2.10 land together.** A commit in which only one
   `harny-document/SKILL.md` copy carries the new text is a red
   `tests/skills-fidelity.test.ts`. Do **not** edit `DIVERGENCE_TABLE` to make a
   half-finished state pass (`RC-12`).
4. **Do not touch `src/`.** `RC-6` and `RC-8` are both "no diff" guarantees. If the
   tier change appears to require a generator edit, stop — it does not, and that
   would mean the tier→model map is being bypassed.
5. **Do not edit `tests/fixtures/templates/**`.** Those `cheapest` values are
   deliberate test inputs. `tests/config.test.ts` and `tests/cli.test.ts` read them,
   not the real template, which is why the tier change does not break them.
6. **`tests/fixtures/golden/ci-workflow-root/run-doctor.mjs` is the easy one to
   forget.** It sits outside `.sdd/` and outside FC-13's named set, but the same edit
   breaks it (Task 1.9).
7. **Do not update `AGENTS.md`'s "six-step hand-off ordering" prose.** It goes stale
   against `RC-10`, and correcting it is the documentation role's job at ship time,
   not the executor's — noted in `contract.md` § Integration Points.
8. **Do not commit or push.** Leave changes in the working tree per this repo's
   convention.

**Deviations found and corrected during implementation (not anticipated by the spec):**

12. **Two pre-existing tests outside this feature's named File Change Map broke as a
    direct, mechanical consequence of the contracted `RC-7`/`RC-14` content changes,
    and required updates to preserve `RC-18`'s baseline:**
    - `tests/canonical-fidelity.test.ts`'s non-mutation guard (`T41`, "templates/ and
      .claude/ are byte-for-byte unchanged") allowlists specific contracted
      `templates/` modifications by exact relative path; it did not yet know about
      `templates/conductor/sdd-conductor.md` (`RC-14`'s canonical-body change).
      Added one allowlist entry, following the file's own established pattern (the
      same treatment `templates/roles/sdd-documentation.md` already received from an
      earlier feature).
    - `tests/generators/claude-code.test.ts`'s live-oracle structural comparison
      (`T24`, "generated role files carry the same frontmatter keys as the live
      oracle") hardcodes an `expectedModelByRole` table asserting
      `'sdd-documentation': 'haiku'` — a fact of the pre-`RC-7` `cheapest` tier, now
      `'sonnet'` (the same model `sdd-executor`'s `mid` tier resolves to for this
      generator). Updated the one table entry, with a comment citing `RC-7`.

    Neither is a red-phase test for this feature (both were passing before this
    feature's changes and are outside `tasks.md`'s named red-phase deliverables), so
    neither was edited to weaken an assertion — both updates make a previously-true
    assertion true again under the contracted new state, the same class of change
    `roadmap.md`'s Risk Assessment already anticipated for `tests/config.test.ts` /
    `tests/cli.test.ts` (which turned out not to need it, since they read fixtures)
    but did not enumerate exhaustively. Flagged here for the auditor rather than
    silently folded into the "Modified — tests" file list, since `roadmap.md`'s File
    Change Map did not name either file.

**For the auditor:**

9. **`RC-13` is a guarantee about a limit, and should be audited as one.** The
   contract states plainly that this feature does **not** guarantee the archive always
   happens — L1's judgment is deterministic but its invocation is an agent
   instruction. An audit that reports this feature as having closed the tail-drop risk
   outright would be overstating it. The honest finding is: the detection is now
   deterministic and cheap; the invocation remains advisory; the backstop is unchanged.
10. **The generalization question is deliberately open.** Whether the other four roles
    carry the same tail-drop risk is a registered reservation, not an omission
    (`intent.md` § Non-Goals).
11. **This feature's own archive is the first live test of the thing it builds.** If
    the documentation role drops the archive step while shipping
    `documentation-role-completion`, that is a finding of the highest possible
    relevance and must be recorded in `audit.md`, not quietly re-run.

## Completion

Implementation completed: 2026-09-23. All tasks above are `[x]`. Full suite: 730
passing / 1 failing (`tests/packaging.test.ts`, pre-existing, out of scope, unchanged
by this feature). `npm run build` and `npm run typecheck` both clean. No file under
`src/` was modified.
