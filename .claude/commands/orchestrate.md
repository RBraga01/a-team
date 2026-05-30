# /orchestrate

Invoke the Lead Orchestrator.

**Usage:**
```
/orchestrate init          Initialize team from INIT.md; prune irrelevant agents and skills
/orchestrate morning       Plan today's tasks from TASKS.md backlog
/orchestrate tick          Process completed task results and dispatch dependents
/orchestrate report        Compile end-of-day telemetry
```

**What the orchestrator does:**

- `init`: Reads INIT.md, evaluates every agent and skill, deletes irrelevant ones, writes `.agent-sync/TEAM.md` and `.agent-sync/ROUTING.md`.
- `morning`: Reads TASKS.md, selects up to 3 tasks for today, presents plan, waits for approval, dispatches first wave.
- `tick`: Reads completed results, marks tasks done, dispatches dependents, adds Veto Buffer entries.
- `report`: Compiles Evening Telemetry section in DAILY.md.

**Prerequisites:**
- `INIT.md` must exist (copy from `INIT_TEMPLATE.md` and fill in)
- `TASKS.md` must exist for morning/tick/report modes

**The orchestrator never writes product code. It only dispatches sub-agents.**
