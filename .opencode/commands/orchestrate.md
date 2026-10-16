---
description: Initialize a project or run the A Team daily orchestration cycle.
---

A Team orchestrator request: $ARGUMENTS

Read `AGENTS.md` and `.claude/agents/orchestrator.md` as **instructions**, not as a registered native OpenCode agent.
The first argument chooses one of `init`, `morning`, `tick`, `report`. If missing or unknown, show usage and stop.

- `init`: require `INIT.md`; select only relevant agent/skill definitions; write `.agent-sync/TEAM.md` and `.agent-sync/ROUTING.md` following the orchestrator contract. Do not delete unrelated project files.
- `morning`: require `TASKS.md`; review task dependencies, prepare up to three tasks, and present a proposed plan. **STOP and request explicit human approval before dispatching or editing code.**
- `tick`: read task results and update statuses only from recorded evidence.
- `report`: summarize daily execution and unresolved veto items with evidence.

Do not claim native multi-agent dispatch or hook enforcement in OpenCode. Use project files for durable state. Maintain the documented safety and review gates.
