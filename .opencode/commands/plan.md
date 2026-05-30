# /plan

Create a structured implementation plan.

Invokes the `planner` agent. Reads INIT.md for project context, analyzes existing codebase, produces a phased plan saved to `docs/plans/YYYY-MM-DD-<feature>.md`.

Run before any implementation work. The plan is consumed by `executing-plans` or `subagent-driven-development`.
