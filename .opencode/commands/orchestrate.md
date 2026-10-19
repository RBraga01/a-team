---
description: Initialize a project or run the A Team daily orchestration cycle.
---

A Team orchestrator request: $ARGUMENTS

Read `AGENTS.md` and `.claude/agents/orchestrator.md` as **instructions**, not as a registered native OpenCode agent.
The first argument chooses one of `init`, `morning`, `tick`, `report`. If missing or unknown, show usage and stop.

- `init`: require `INIT.md`; evaluate the installed agents and skills, then compile active/inactive selections via `python scripts/roster.py init --agents ... --skills ...` and run `verify`. Never delete any agents or skills. Existing rosters require explicit user approval and `--replace`.
- `morning`: require `TASKS.md` and a passing `python scripts/roster.py verify`; assign only eligible active agents from `ROUTING.md`, review dependencies, prepare up to three tasks, and present a proposed plan. **STOP and request explicit human approval before dispatching or editing code.**
- `tick`: read task results and update statuses only from recorded evidence.
- `report`: summarize daily execution and unresolved veto items with evidence.

Do not claim native multi-agent dispatch or hook enforcement in OpenCode. Use project files for durable state. Maintain the documented safety and review gates.
