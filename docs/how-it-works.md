# How A Team Works

Detailed guide formerly in the root README. Start with the [quick start](../README.md#quick-start) and [full catalog](catalog.md).

## Initialization in Detail

### INIT.md

The project's scope declaration. The orchestrator reads it once to decide which agents and skills are relevant. Fill it out before running `/orchestrate init`.

Key sections:
- **Primary programming languages** — controls which language-specialist agents become active
- **Tech stack** — controls database-reviewer, e2e-runner, etc.
- **Communication tools** — controls chief-of-staff
- **Scope boundaries** — autonomous loops, E2E tests, documentation needs
- **Special constraints** — domain-specific guardrails enforced across all agents

### Logical pruning (non-destructive)

**No agent or skill file is deleted during initialization.** The orchestrator evaluates `INIT.md`, then passes an explicit list of selected agents and skills to the deterministic compiler:

```bash
python scripts/roster.py init --agents "orchestrator,planner,code-reviewer" --skills "using-a-team,verification-before-completion,writing-plans"
python scripts/roster.py verify
```

The lists above are *examples*; the real selection must cover the intended project scope. `TEAM.md` lists **all** installed agents and skills as active or inactive, and `ROUTING.md` contains exactly the eligible active agents. Matching fingerprints prevent stale or partial state from being trusted. The mandatory `orchestrator`, `using-a-team`, and `verification-before-completion` cannot be deactivated.

On supported hosts, `PreToolUse` blocks direct `Agent`/`Task` dispatch and `Skill` invocation for inactive components. It rejects missing, legacy, or inconsistent roster state (except the bootstrap orchestrator and meta-skills required to repair it). Because inactive files remain discoverable, the orchestrator **must verify** the roster before routing any task. This hook does not prove enforcement in every CLI or block indirect textual requests.

Reinitializing an existing roster requires explicit approval and `init --replace`. The compiler refuses replacement while file claims are in progress. Do not edit the roster or routing file independently.

### ROUTING.md

Generated during init. Two sections:

1. **Eligible Agents** — exactly the active profiles from TEAM.md; task routing must pick only from these names.
2. **File Claims table** — starts empty; populated at dispatch time to prevent parallel agents from colliding on the same source files.

---

## The Session Lifecycle

### Session Start (automatic)

The `SessionStart` hook fires `cat skills/using-a-team/SKILL.md` at the beginning of every session. This injects the mandatory trigger map into context before any work begins.

The `PostToolUse` hook fires after every `Write` or `Edit`, reminding: use `code-reviewer` before committing, use `verification-before-completion` before claiming done.

### Session Start Checklist (enforced by the meta-skill)

1. Is `INIT.md` present? If not → fill it out first.
2. Does `python scripts/roster.py verify` pass? If not → run `/orchestrate init` or repair/reinitialize the roster.
3. What is the current task? → identify which skills and agents apply before starting.

---

## The Orchestrator Daily Cycle

The orchestrator operates as a stateless machine. It never assumes what happened in a prior session — it derives all state from files.

### `/orchestrate morning`

1. Reads `TASKS.md` — selects up to 3 tasks for today respecting `depends_on` constraints.
2. Assigns tasks only to active agents from the verified `TEAM.md`/`ROUTING.md` roster.
3. Writes `DAILY.md` Sections 1 + 2 (intent + execution plan).
4. **Presents the plan. Stops. Waits for explicit human approval.**
5. On approval: dispatches the first wave — all tasks with no dependencies.

### `/orchestrate tick` (after each async task completes)

1. Reads `DAILY.md` + all `.agent-sync/results/*.json`.
2. Marks completed tasks `[x]` with commit hash and test summary.
3. Adds ambiguous decisions to the Veto Buffer (Section 3).
4. Dispatches newly unblocked PENDING tasks.

### `/orchestrate report` (end of day)

1. Processes remaining results.
2. Compiles Evening Telemetry — tasks complete, commits, tests, veto items, proposed first task tomorrow.

### Veto Buffer

Every ambiguous autonomous decision gets a Veto Buffer entry: context, choice made, branch it's isolated on, action options. Only a human resolves Veto Buffer items. The orchestrator never resolves them.

---

## File Lock Protocol

Prevents parallel agents from colliding on the same source files before either merges.

### How it works

When the orchestrator dispatches an agent, it writes a row to the `## File Claims` table in `ROUTING.md` for each source file that agent will modify:

```
| File | Agent | Task | Status |
| src/auth/login.ts | code-reviewer | TASK-004 | in-progress |
```

Before dispatching a second agent, the orchestrator reads the table. If any target file is `in-progress` by a different agent, the new task is added to PENDING with a `depends_on` — not dispatched in parallel.

### Path normalization (worktree safety)

Because each parallel agent runs inside its own worktree directory (e.g., `../project-task-001/`), the same file appears at a different absolute path in every worktree. All paths written to or read from the File Claims table must be **relative to the git repository root** — never absolute, never worktree-local.

```bash
# Normalize from any worktree before every read or write
REPO_ROOT=$(git worktree list --porcelain | awk 'NR==1 {print $2}')
RELATIVE=$(realpath --relative-to="$REPO_ROOT" "$ABSOLUTE_PATH")
```

Without this, agent A locks `../project-task-001/src/auth/login.ts` while agent B looks up `src/auth/login.ts` — the lock is invisible to B and the collision happens anyway.

When a task completes without blockers, its File Claims rows are released. The next agent can then claim those files.

The `code-reviewer` also checks the File Claims table before starting any review. If a file it needs to review is claimed by a different active agent, it blocks and reports rather than proceeding.

**Scope:** source files only (`.ts`, `.kt`, `.py`, `.go`, `.rs`, etc.). Config files, docs, and test fixtures are not claimed.

---

## Pipeline Audit (harness-optimizer)

The harness-optimizer runs as a pipeline auditor before any branch merge. It reads terminal command history and task result files to verify agents actually ran required checks — not just reported that they did.

### What it checks

1. **verification-before-completion compliance** — For every completed task, the history must contain an actual test or build command (`npm test`, `pytest`, `go test ./...`, etc.) run after the last code change. If not → `EVASION`.

2. **code-reviewer compliance** — For every task that modified source files, a code-reviewer result must exist in `.agent-sync/results/`. If not → `EVASION`.

3. **File Claim hygiene** — If any File Claim row is still `in-progress` for a task already marked done in DAILY.md → `STALE CLAIM`.

### On evasion

The auditor writes `.agent-sync/AUDIT.md` with a `BLOCK MERGE` verdict. The orchestrator reads this file before dispatching `finishing-a-development-branch`. If it contains `BLOCK MERGE`, the branch cannot be finished — the failing tasks are routed back to their original agents for re-execution with proper compliance.

---

## Coding Standards (`.claude/rules/`)

All agents enforce these rules. Key principles with examples:

**Immutability**
```js
// [INVALID] — mutates in place
user.verified = true

// [VALID] — returns new copy
return { ...user, verified: true }
```

**Early returns** (max 4 nesting levels)
```js
// [INVALID] — nested conditionals
if (user) { if (user.active) { if (user.role === 'admin') { doWork() } } }

// [VALID] — early returns
if (!user) return
if (!user.active) return
if (user.role !== 'admin') return
doWork()
```

**Error handling — never silent**
```ts
// [INVALID]
try { await send() } catch (_) {}

// [VALID]
try { await send() } catch (err) { logger.error('send failed', { err }); throw err }
```

Full standards: `.claude/rules/coding-style.md`, `security.md`, `testing.md`, `orchestration.md`.

---

