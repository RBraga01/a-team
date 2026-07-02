<!-- Status line output on session start -->
Run: `python scripts/status.py 2>/dev/null || python3 scripts/status.py 2>/dev/null || py scripts/status.py 2>/dev/null || echo '⚡ A Team · instala Python para ver o estado'`

---

# /orchestrate

Invoke the Lead Orchestrator.

**Usage:**
```
/orchestrate init          Initialize team from INIT.md; prune irrelevant agents and skills
/orchestrate morning       Plan today's tasks from TASKS.md backlog
/orchestrate tick          Process completed task results and dispatch dependents
/orchestrate report        Compile end-of-day telemetry
```

**Prerequisites:**
- `INIT.md` must exist (copy from `INIT_TEMPLATE.md` and fill in)
- `TASKS.md` must exist for morning/tick/report modes

The orchestrator never writes product code. It only dispatches sub-agents.
