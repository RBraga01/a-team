# /feature

Full feature development workflow from brainstorming to merged code.

**Usage:**
```
/feature "Add user subscription billing with Stripe"
```

**Workflow (sequential):**
1. **Brainstorm** — `brainstorming` skill: explore requirements, propose 2-3 approaches, write spec
2. **Plan** — `planner` agent: create phased implementation plan with file paths and risks
3. **Implement** — `subagent-driven-development` skill: dispatch implementer per task with two-stage review
4. **Quality Gate** — `/quality-gate`: code review + security review before merge
5. **Finalize** — `finishing-a-development-branch` skill: verify tests, update docs, commit

**Hard gates:**
- Cannot start implementation without approved spec
- Cannot merge without passing quality gate
- Each phase must be independently mergeable

Use `/plan` alone if you already have a spec and just need the implementation plan.
