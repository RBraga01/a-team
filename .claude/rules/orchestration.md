# Orchestration Rules

## Lead Orchestrator Authority

The Lead Orchestrator (`orchestrator` agent) has final authority over:
- Which agents and skills are active in this workspace
- Task dispatch decisions based on ROUTING.md
- Veto Buffer management

## INIT Protocol (Mandatory on New Projects)

Before doing any work in a new project:
1. Run `/orchestrate init`
2. The orchestrator reads `INIT.md` and prunes irrelevant agents and skills
3. The orchestrator writes `.agent-sync/TEAM.md` (active roster) and `.agent-sync/ROUTING.md`
4. Only proceed with work after `TEAM.md` exists

If `INIT.md` does not exist: instruct the user to fill out `INIT_TEMPLATE.md` first.

## State Machine Protocol

The orchestrator operates as a stateless machine. Every invocation must:
1. Read `.agent-sync/DAILY.md` before any action
2. Read `TASKS.md` for backlog
3. Read `git log --oneline -10` for repo state
4. Never assume what happened in a prior session

## Human Approval Gates (Cannot Be Bypassed)

- Morning plan MUST be approved before dispatching any task
- Veto Buffer items MUST be reviewed by a human before resolving
- Branch merges are NEVER done by the orchestrator

## Veto Buffer Protocol

The Veto Buffer (`DAILY.md` Section 3) captures autonomous decisions that could have
been made differently. Rules:
- Every ambiguous architectural decision gets a Veto Buffer entry
- Format: context, choice made, branch it's isolated on, action options
- Only the human resolves Veto Buffer items — the orchestrator never resolves them

## File Lock Protocol

Prevents logical file collisions between parallel agents before merge.

### Structure (in `.agent-sync/ROUTING.md`)

```markdown
## File Claims
| File | Agent | Task | Status |
|------|-------|------|--------|
| src/auth/login.ts | code-reviewer | TASK-004 | in-progress |
| src/screens/ParentGateScreen.kt | compose-ui | TASK-007 | in-progress |
```

### Path Normalization (Critical)

Every file path written to or read from the File Claims table **must be relative to the git repository root** — never an absolute path, never a worktree-local path.

Because each parallel agent runs in its own worktree directory (e.g., `../project-task-001/`), the same file appears at different absolute paths in different worktrees. Without normalization, one agent locks `../project-task-001/src/auth/login.ts` and another looks up `src/auth/login.ts` — the lock is invisible and the collision happens anyway.

**Normalize before every read or write:**

```bash
# Get the repository root from any worktree
REPO_ROOT=$(git worktree list --porcelain | awk 'NR==1 {print $2}')

# Express an absolute path as repo-relative
# Option A — works for tracked and untracked files
RELATIVE=$(realpath --relative-to="$REPO_ROOT" "$ABSOLUTE_PATH")

# Option B — works for already-tracked files (simpler)
RELATIVE=$(git ls-files --full-name "$ABSOLUTE_PATH")
```

All rows in the File Claims table use the normalized form: `src/auth/login.ts`, never `/home/user/project-task-001/src/auth/login.ts`.

### Rules

1. **Claim on dispatch** — When the orchestrator dispatches an agent, it adds a row for every file that agent will modify. Normalize paths before writing. Status = `in-progress`.
2. **Block on conflict** — Before dispatching a second agent, read File Claims. Normalize the candidate file paths, then compare. If any normalized path already has `in-progress` status from a different agent, add the new task to `depends_on` instead of dispatching. Log the reason in DAILY.md.
3. **Release on done** — When a task result arrives with no `blockers`, remove or set its File Claims rows to `done`. Only then can the file be claimed by the next agent.
4. **Scope** — Apply to source files only (`.ts`, `.kt`, `.py`, `.go`, `.rs`, etc.). Do NOT claim config files, docs, or test fixtures.
5. **Override** — If two agents claim the same file and both are legitimate (e.g., one reads, one writes), escalate to Veto Buffer — never silently merge conflicting parallel changes.

### Why

Git worktrees isolate physical file changes. File Claims resolve *logical* collisions — two agents writing to the same file from separate worktrees before either merges. Without claims, merge conflicts are discovered too late and require manual resolution.

## Parallel Dispatch (Performance Rule)

ALWAYS dispatch independent tasks in parallel. Never dispatch sequentially when:
- Tasks operate on different files/subsystems
- Tasks have no shared state
- Tasks have no `depends_on` relationship

## Agent Routing Principles

Route tasks based on `.agent-sync/ROUTING.md` (generated during init).
Default routing when ROUTING.md is absent:
- Code quality → `code-reviewer`
- Security concerns → `security-reviewer`
- Build failures → `build-error-resolver`
- New features → `planner` then `subagent-driven-development`
- Bug investigation → `debugger`
- Architecture decisions → `architect`
