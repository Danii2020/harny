# The canonical hook behavior

This directory holds the canonical, tool-neutral source for harny's computational
**feedback** control (Fowler's harness-engineering vocabulary — see `AGENTS.md`'s
feedforward/feedback split): a lint- and type-check pass that runs on the agent's own
edits and reports findings back to the agent, closing the loop that harny's
feedforward controls (roles, standards, gates) leave open.

The behavior below is what every per-tool generator's hook artifact must implement.
It is stated first as behavior, independent of any tool; each tool is named only
afterward, as an attributed example of how that behavior is realized on its own hook
surface (`AGENTS.md` S7 — no single tool's mechanic is the only possibility described
here).

## The behavior

1. **The turn is the unit of work, not the edit.** An agent's turn may touch a file
   once or many times; the hook that runs feedback commands does so **once per turn**,
   never once per edit. A hook wired to a per-edit event and executing a mapped
   command directly is a contract violation, not a matter of style — it would run a
   linter or type-checker N times for N edits instead of once.

2. **Touched files accumulate across the turn, deduped, then run once.** Because no
   tool's turn-completion event enumerates which files the turn touched, every tool
   pairs two registrations: a lightweight accumulator that appends a touched path
   each time the agent edits a file, and a runner that fires once the turn ends,
   reads back the accumulated paths, and deduplicates them to an absolute-path set.
   A command that takes paths receives only the members of that set that match the
   file types it declares (an unfiltered command takes every member) and that still
   exist on disk when the turn ends — a path a later step in the same turn moved or
   deleted is dropped rather than handed to a command that can no longer read it. A
   command left with no matching, surviving path is skipped silently: it is never
   run without path arguments, since that would re-check the whole project instead
   of the turn's own files. A command that must see the whole project regardless of
   which files changed — a type checker, for instance — runs once with no path
   arguments at all, exactly as before.

3. **An empty turn produces no output.** A turn that touched no files runs no
   command and prints nothing. Silence, not a passing report, is the no-op case.

4. **A command absent from the target repo is skipped, never failed.** Each command
   carries its own presence probe (a script, a binary, a marker file). When the probe
   fails, the runner skips that command with a one-line notice and the skip never
   changes the run's outcome — a generated hook cannot know in advance what a given
   repo will install, and a hook that fails outright when a linter is merely absent
   trains people to delete it.

5. **Findings reach the agent before it yields control.** Every tool's hook surface
   offers some channel — blocking or non-blocking — for returning text to the agent
   before its turn is considered complete. The runner always uses that tool's
   documented channel so the agent sees findings before its turn ends, not "without
   ever costing a turn": some tools' only channel is itself a forced continuation,
   and this behavior accepts that as their documented ceiling rather than pretending
   otherwise.

6. **Re-entry never drives a tool's runaway guard.** Because returning findings can
   itself trigger another turn on some tools, every runner invocation checks that
   tool's own re-entry signal (where the tool exposes one) and suppresses any
   blocking response when it is set, so this feedback loop can never trip a tool's
   own consecutive-block override.

7. **A touched path is resolved to exactly one declared component, and that
   component's commands run from that component's directory.** A repository may
   declare more than one component (a directory and the stack it is written in);
   a touched path is matched to the single longest-matching declared component
   directory, never to more than one and never to an arbitrary default, and the
   commands that see that path run with that component's own directory as their
   working directory. A repository that declares no components behaves exactly as
   behaviors 1–6 above describe, unchanged: it is the one-component, install-root
   case of this same rule, not a separate mode.

8. **A delegated sub-agent's completion checks the turn's paths without consuming
   them.** When a tool lets an agent hand work to a sub-agent and exposes an event
   for that sub-agent finishing, the runner also fires on that event, so the
   sub-agent sees findings on its own work while it can still fix them. That run is
   the ordinary run described above — same commands, filters, probes, components and
   exit codes — with one difference: it leaves the accumulated paths in place. The
   enclosing agent's own turn-completion run then reads the same paths again and
   clears them as usual. Delivery is therefore at-least-once: a finding may reach
   the sub-agent and then the enclosing agent, but a check made early can never
   swallow a finding the enclosing turn still has to report. A tool that exposes no
   such event, or whose event is not documented, is simply not wired for it and
   behaves exactly as behaviors 1–7 describe.

## Attributed examples

The behavior above is realized differently on each tool's own hook surface — this is
per-tool adaptation, not a shared schema:

- **Claude Code** pairs a `PostToolUse` registration (matching `Edit`/`Write`) that
  accumulates with a `Stop` registration that runs; findings are delivered through
  `hookSpecificOutput.additionalContext` when non-blocking, or a block response when
  not, and the `stop_hook_active` field is the re-entry signal.
- **Cursor** pairs `afterFileEdit` with `stop`; a `stop` hook has no non-blocking
  channel, so findings are always delivered as a `followup_message`, and the runaway
  guard is Cursor's own `loop_limit`.
- **Kiro** pairs `postToolUse` with `agentStop`; a Kiro hook returns findings on
  stdout for a non-blocking notice, or a non-zero exit for a warning.
- **GitHub Copilot** pairs `postToolUse` with `agentStop` (aliased `Stop`); like
  Cursor, its only channel on that event is a blocking `decision` response, capped by
  Copilot's own consecutive-block override.
- **Codex CLI** pairs `PostToolUse` with `Stop`, offering both
  `hookSpecificOutput.additionalContext` and a blocking `decision`/exit-2 form, and
  exposes the same `stop_hook_active` re-entry signal Claude Code does.

Behavior 8 (sub-agent completion), as verified against each tool's first-party
documentation on 2026-09-23:

- **Claude Code** registers `SubagentStop` beside `Stop`, running the same runner
  with `--keep-turn`; findings go through `hookSpecificOutput.additionalContext`
  with `hookEventName` set to `"SubagentStop"`, since Claude Code pins that field
  per event. Confirmed live: a sub-agent's edits accumulate under the parent
  session's turn key.
- **Cursor** registers `subagentStop` beside `stop`, with the same
  `followup_message` channel and `loop_limit` guard. Whether `afterFileEdit` fires
  inside a sub-agent is not yet confirmed.
- **Codex CLI** registers `SubagentStop` beside `Stop`, with the same channel and
  timeout. Whether a sub-agent's edits and its stop share one `turn_id` is not
  documented and not yet probed.
- **Kiro** and **GitHub Copilot** are not wired for behavior 8: no sub-agent
  completion event was confirmed in their first-party documentation.

## `--whole-project` — the CI-only flag (A1)

The generated GitHub Actions workflow (`.github/workflows/harny-feedback.yml`) has
no turn to scope to: there is no agent, no edit stream, no `Stop` event. It invokes
the same runner in `run` mode with one additional boolean flag, `--whole-project`,
never a third mode — the `accumulate | run` vocabulary above is otherwise untouched.
Under the flag: no STDIN turn key is read or required, `.sdd/feedback/.turns/` is
never read, written, or deleted, and every mapped command runs exactly once,
unconditionally. A `per-file` command receives exactly one argument, `.` (the repo
root **is** the whole project), in place of the turn's touched paths — passed
unconditionally, regardless of which file types the command declares: neither the
file-type filter nor the existence check from behavior 2 applies under this flag.
The `requires` probe (behavior 4 above) is evaluated through the identical code
path, so absent tooling is skipped in CI exactly as it is in a per-turn hook.

**The two-way rule.** No generated hook config may ever pass `--whole-project` — a
hook that ignored the turn's touched files would silently re-check the entire
project on every turn, defeating the one-run-per-turn design above. Conversely,
the CI workflow always passes it, since CI has no turn to scope to. Both halves
are contract violations if breached.

**Exit code, unmediated.** In CI, a mapped command's finding always exits the
runner with `2`, and that becomes the CI step's (and therefore the job's) exit
code — `stop_hook_active` is never read or honored under `--whole-project`,
because CI has no re-entry/loop-guard concept to protect. This is the deliberate
inverse of every per-tool hook wrapper, which always exits `0` itself and
re-expresses a finding on that tool's own channel instead (behavior 5 above): a
PR gate's entire purpose is to be red when there is a finding, and there is no
agent turn to protect from a hard failure.

## What lives here

- `run-feedback.mjs` — the shared runner script implementing the behavior above in
  its two modes (accumulate, run — plus `run`'s `--whole-project` flag). It is
  copied **verbatim** into every scaffolded project at
  `.sdd/feedback/run-feedback.mjs`; its bytes never vary by tool. The per-tool
  wiring — which event maps to which mode, and how findings are returned — lives
  entirely in each tool's own generated hook config, never in this script. Its
  presence-probe logic (behavior 4 above) is imported from the sibling
  `../shared/probes.mjs`, the same module `templates/doctor/run-doctor.mjs` (the
  readiness runner — see `templates/doctor/README.md`) imports; see that document
  for the `feedback/`/`doctor/`/`shared/` layout convention.
