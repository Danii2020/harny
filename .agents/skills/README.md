# The `harny-*` skill shape contract

This directory, `.agents/skills/`, is the **canonical, tool-neutral home** for every
`harny-*` skill in this repo. It is not namespaced to one tool — the same convention
Codex CLI already documents (`src/generators/codex.ts:148–149`) — so any harness that
reads `.agents/skills/` picks these up unchanged. Claude Code specifically does not read
this directory directly; it reaches these skills only through the relative symlinks
bridged into `.claude/skills/` (see `specs/current/skill-library.md`).

**This is the extension point.** A user adds a ninth `harny-*` skill (or a tenth, or a
completely unrelated skill) by satisfying this document and nothing else — no other file
in this repo needs to change.

## Frontmatter — the six portable keys, and no others

```yaml
---
# The six portable Agent Skills fields. NO OTHER KEY IS PERMITTED.
name: harny-<action>                 # REQUIRED. kebab-case, `harny-` prefix, verb-shaped.
description: >-                      # REQUIRED. <= 1536 chars. Must state WHAT it
  ...                                #   does AND WHEN to use it — the harness selects on this.
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

`name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools` are the
only frontmatter keys a `harny-*/SKILL.md` may declare. They are the fields that are part
of the portable Agent Skills spec; any other key (for example
`disable-model-invocation`, `context`, `agent`, `paths`, `model`, `when_to_use`) is a
Claude-Code-only key that causes a packaging/upload failure elsewhere, and this file's
canonical home is the tool-neutral `.agents/skills/`, where other harnesses read it
directly.

## Body — five required sections, in this order

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

## Binding rules

1. **Portable frontmatter only.** Only the six fields above. Any other key is a
   violation, because the canonical file lives in the tool-neutral `.agents/skills/`
   where other harnesses read it. Enforced by `tests/skill-library.test.ts`.
2. **`disable-model-invocation` is specifically forbidden**, both by rule 1 and because it
   would block subagent preloading, which is the mechanism thin agents depend on.
   Destructive skills (e.g. `harny-sync` archive mode) are protected by **preconditions
   in the `## Guardrails` section**, not by an invocation flag.
3. **Canonical location, always.** Content lives at `.agents/skills/<name>/SKILL.md`. The
   `.claude/skills/<name>` entry is a **relative** symlink
   (`../../.agents/skills/<name>`) and never a regular directory or a copy.
4. **Name discipline.** `harny-` prefix; never `synced` (a reserved skill folder name);
   never colliding with an existing agent `name:` (`sdd-*`).
5. **Reference other skills by name, never by path** — e.g. "run the `high-value-tests`
   skill", not `.claude/skills/high-value-tests/SKILL.md`. A tool-neutral file must not
   hardcode one tool's directory.
6. **Bundled resources are allowed** next to `SKILL.md` and are referenced by bare
   filename (e.g. `adr-template.md`), loaded on demand.
7. **One action per skill.** If a skill's `## Steps` splits cleanly into two independent
   outcomes, it is two skills — except where the two share all their preconditions and
   state, which is the documented reason `harny-sync` carries two modes rather than
   splitting into `harny-lookup` / `harny-archive`.

## Adding a ninth skill

1. Create `.agents/skills/harny-<action>/SKILL.md` following the frontmatter and body
   shape above.
2. From inside `.claude/skills/`, create the relative bridge symlink:
   `ln -s ../../.agents/skills/harny-<action> harny-<action>`.
3. If a role should preload it at startup, add it to that agent's `skills:` frontmatter
   list — see `.claude/agents/sdd-*.md` for the pattern.
4. Nothing else in this repo needs to change.
