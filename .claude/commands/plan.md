# /plan

Create a structured implementation plan for a feature or refactor.

**Invokes:** `planner` agent

**Usage:**
```
/plan Add Stripe subscription billing with free/pro/enterprise tiers
/plan Refactor the auth middleware to meet new compliance requirements
/plan Break the UserService (1200 lines) into focused modules
```

**Output format:**
- Overview (2-3 sentences)
- Requirements list
- Architecture changes with file paths
- Implementation steps with phases, file paths, risk ratings
- Testing strategy
- Risks and mitigations
- Success criteria (checkboxes)

**After the plan is approved**, use `/orchestrate morning` to dispatch it, or invoke
`subagent-driven-development` skill to execute it immediately in this session.
