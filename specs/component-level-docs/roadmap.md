# Roadmap: Component-Level Docs

## Implementation Phases

### Phase 1: Discovery module — CL-1, CL-2, CL-9. Complexity: Medium.
### Phase 2: Generator member and init bridges — CL-5, CL-6, CL-7. Complexity: Medium.
### Phase 3: Doctor entries — CL-3, CL-4. Complexity: Medium.
### Phase 4: Skill, docs, dogfood, validation — CL-8, CL-10. Complexity: Low.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Heuristic finds noise directories | Med | Low | Ignore list, `minFiles`, recommended tier |
| Kiro steering syntax differs from search-sourced facts | Med | Med | Reservation; inert if wrong, never destructive |
| A root `CLAUDE.md`-less repo reads `AGENTS.md` twice | Low | Low | Claude Code docs: an imported `AGENTS.md` is never read twice |

## File Change Map

- `templates/shared/components.mjs` — CREATE
- `src/component-docs.ts` — CREATE
- `src/generators/types.ts`, five generators — MODIFY (`componentBridge`)
- `src/engine.ts`, `src/init.ts`, `src/doctor.ts`, `src/templates.ts` — MODIFY
- `templates/doctor/run-doctor.mjs`, `templates/doctor/README.md` — MODIFY
- `templates/skills/harny-document/SKILL.md`, `.agents/skills/harny-document/SKILL.md` — MODIFY
- tests (new + counts/goldens), `src/generators/AGENTS.md`, `src/generators/CLAUDE.md`, `.sdd/*`, README — dogfood/docs
