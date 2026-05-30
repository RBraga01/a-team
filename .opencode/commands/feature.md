# /feature

Full feature development workflow from brainstorming to merged code.

**Workflow (sequential):**
1. `brainstorming` skill — explore requirements, propose approaches, write spec
2. `planner` agent — create phased implementation plan with file paths and risks
3. `subagent-driven-development` skill — dispatch implementer per task with two-stage review
4. `/quality-gate` — pipeline audit + code review + security review before merge
5. `finishing-a-development-branch` skill — verify tests, update docs, commit

**Hard gates:**
- Cannot start implementation without approved spec
- Cannot merge without passing quality gate
