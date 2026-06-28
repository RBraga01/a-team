# Command Reference

Every slash command A Team provides, what it does, and when to reach for it.

> **Platform note:** Slash commands are native on **Claude Code**. On **OpenCode** they exist as command aliases in `.opencode/commands/`. On **Cursor** and **Codex CLI** slash commands are not available — invoke the corresponding skill directly instead.

---

## Orchestration commands

These drive the lead orchestrator's stateless daily cycle. The orchestrator never assumes what happened in a previous session; it derives all state from files (`TASKS.md`, `DAILY.md`, `ROUTING.md`, and `.agent-sync/results/`).

### `/orchestrate init`

Reads `INIT.md`, prunes agents and skills outside the declared scope, and generates `.agent-sync/TEAM.md` (active roster) and `.agent-sync/ROUTING.md` (routing + file-claims tables).

- **Run it:** once, right after installing and filling out `INIT.md`.
- **After it runs:** review `TEAM.md` and restore any agent pruned by mistake.

### `/orchestrate morning`

Plans the day. Selects up to three tasks from `TASKS.md` (respecting `depends_on` constraints), assigns each to the right agent via `ROUTING.md`, writes the intent and execution plan into `DAILY.md`, then **stops and waits for explicit human approval**. On approval it dispatches the first wave — every task with no unmet dependency.

- **Run it:** at the start of a working session.
- **Note:** nothing is dispatched until you approve the plan.

### `/orchestrate tick`

Processes completed work. Reads `DAILY.md` and all `.agent-sync/results/*.json`, marks finished tasks done with their commit hash and test summary, records ambiguous autonomous decisions in the Veto Buffer, and dispatches any newly unblocked tasks.

- **Run it:** after an async task reports back, to advance the pipeline.
- **Veto Buffer:** only a human resolves its entries — the orchestrator never does.

### `/orchestrate report`

End-of-day wrap-up. Processes remaining results and compiles the Evening Telemetry: tasks completed, commits, tests, outstanding veto items, and a proposed first task for tomorrow.

- **Run it:** at the end of a working session.

---

## Workflow commands

### `/plan`

Produces a structured implementation plan from a spec, before any code is written.

- **Run it:** when you have a feature or change defined and want a written plan to execute against.

### `/feature`

The full feature pipeline end to end: **brainstorm → plan → implement → review**. Chains the design, planning, implementation, and review stages together.

- **Run it:** for a new feature you want carried through every gate in one workflow.

### `/code-review`

Runs the `code-reviewer` agent over staged or recent changes for quality, security, and maintainability.

- **Run it:** after any code change, before committing.

### `/security-review`

A focused security audit (OWASP Top 10, secrets, injection) via the `security-reviewer` agent.

- **Run it:** whenever you touch authentication, APIs, user input, or database code.

### `/debug`

Systematic root-cause debugging. Enforces reproduce-and-isolate **before** any fix is proposed.

- **Run it:** for any bug. Don't jump to a fix until the first phase is complete.

### `/build-fix`

Resolves build and type failures using minimal diffs only.

- **Run it:** when the build is broken and you want the smallest change that makes it green.

### `/e2e`

Runs the end-to-end test suite over critical user journeys.

- **Run it:** to validate complete user flows, not just units.

### `/refactor`

Finds and removes dead code and duplication.

- **Run it:** during maintenance passes.

### `/quality-gate`

The full pre-merge check: code review + security review + pipeline audit together.

- **Run it:** before merging a branch. If the auditor finds an evasion it writes a `BLOCK MERGE` verdict to `.agent-sync/AUDIT.md` and the branch can't be finished until the failing tasks are re-run properly.

---

## Quick lookup

| Command               | One-line purpose                                  | Typical moment            |
| --------------------- | ------------------------------------------------- | ------------------------- |
| `/orchestrate init`   | Prune team, generate `TEAM.md` + `ROUTING.md`     | Once, after install       |
| `/orchestrate morning`| Plan today's tasks (needs approval to dispatch)   | Session start             |
| `/orchestrate tick`   | Process results, dispatch unblocked tasks         | After a task completes     |
| `/orchestrate report` | End-of-day telemetry                              | Session end               |
| `/plan`               | Create an implementation plan                     | Before coding             |
| `/feature`            | brainstorm → plan → implement → review            | New feature               |
| `/code-review`        | Review staged/recent changes                      | After any code change     |
| `/security-review`    | Security audit                                    | Auth / API / input / DB   |
| `/debug`              | Root-cause debugging (reproduce first)            | Any bug                   |
| `/build-fix`          | Fix build errors with minimal diffs               | Build broken              |
| `/e2e`                | Run end-to-end suite                              | Critical user journeys    |
| `/refactor`           | Remove dead code and duplication                  | Maintenance               |
| `/quality-gate`       | Full pre-merge check (code + security + audit)    | Before merge              |

> Commands map onto agents and skills whose exact roster can change between releases. If a command here behaves differently from what you see, check [`.claude/commands/`](../.claude/commands/) and [`AGENTS.md`](../AGENTS.md) as the source of truth.
