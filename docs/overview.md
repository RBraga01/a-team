# A Team — Overview

> Drop this folder into any project. Get an immediately operational team of specialists with zero configuration drift.

---

## What A Team is

A Team is a **portable multi-agent infrastructure** for AI coding assistants. It works with any model — Claude, GPT-4o, Gemini, or others — through any supported platform. It turns a single general-purpose model into a coordinated team of specialists — each with a defined role, tool access, and quality gate — that enforces the same engineering standards on every project it's deployed to.

```
Without A Team                        With A Team
─────────────────────────────────     ─────────────────────────────────────
One model                             25 specialist agents
Does everything                       Each has one responsibility
No enforcement                        Hard gates that can't be bypassed
Forgets standards between sessions    Standards re-injected every session
Manual routing                        Orchestrator dispatches automatically
No audit trail                        DAILY.md + Veto Buffer + AUDIT.md
```

---

## Architecture — 5 Layers

```mermaid
graph TB
    subgraph P["🖥️  PLATFORM LAYER — works on all CLIs"]
        direction LR
        CC["Claude Code\n.claude/"]
        CX["Codex CLI\n.codex-plugin/"]
        CU["Cursor\n.cursor-plugin/"]
        OC["OpenCode\n.opencode/"]
    end

    subgraph E["⚡  ENFORCEMENT LAYER — fires automatically"]
        direction LR
        SH["SessionStart Hook\ninjects using-a-team"]
        PH["PostToolUse Hook\nreminds after every edit"]
    end

    subgraph O["🧭  ORCHESTRATION LAYER"]
        direction TB
        ORCH["orchestrator\nTier 1 model"]
        DAILY["DAILY.md\nstate machine"]
        TASKS["TASKS.md\nbacklog"]
        ROUTING["ROUTING.md\nrouting + file claims"]
        ORCH <--> DAILY
        ORCH <--> TASKS
        ORCH <--> ROUTING
    end

    subgraph A["👥  SPECIALIST AGENTS — 25 total"]
        direction LR
        subgraph QUALITY["Quality"]
            QA["code-reviewer\narchitect\nplanner\nsecurity-reviewer\ntdd-guide\nrefactor-cleaner\nbuild-error-resolver\ndebugger"]
        end
        subgraph LANG["Languages"]
            LA["go · python · rust\nkotlin · swift · flutter\ndatabase · infra · ai"]
        end
        subgraph OPS["Operations"]
            OP["harness-optimizer\nperformance-profiler\ncompliance-reviewer\nloop-operator\nchief-of-staff\ndoc-updater\ne2e-runner"]
        end
    end

    subgraph S["🔒  SKILL LAYER — 19 skills"]
        direction LR
        subgraph HARD["Hard Gates\n(cannot skip)"]
            HG["verification-before-completion\ntest-driven-development\nbrainstorming\nsystematic-debugging\napi-contract-first\ndata-migration"]
        end
        subgraph WORK["Workflow Skills"]
            WS["using-git-worktrees\nsubagent-driven-dev\ndispatching-parallel\nexecuting-plans\nwriting-plans\nfinishing-branch\nincident-response\nperformance-audit\nwriting-skills"]
        end
    end

    P --> E
    E --> O
    O --> A
    A --> S
    S --> O

    classDef layer fill:#1e293b,color:#f1f5f9,stroke:#334155
    classDef platform fill:#0f172a,color:#94a3b8,stroke:#1e293b
```

---

## The Daily Cycle

```mermaid
sequenceDiagram
    actor H as Human
    participant O as Orchestrator
    participant A as Agents
    participant V as Veto Buffer

    Note over H,V: Every morning
    H->>O: /orchestrate morning
    O->>O: Read TASKS.md + ROUTING.md
    O->>O: Check for ambiguous tasks → AMB-NNN
    O->>H: Present plan + AMB items
    H->>O: Approve (with AMB decisions)

    Note over H,V: Work in progress
    O->>A: Dispatch wave 1 (parallel, no depends_on)
    A->>A: Work in isolated worktrees
    A->>O: Result + decisions_made
    O->>V: Log ambiguous decisions (DEC-NNN)
    O->>A: Dispatch wave 2 (unblocked tasks)

    Note over H,V: Pre-merge
    O->>A: harness-optimizer (pipeline audit)
    A->>O: AUDIT.md verdict
    O->>A: Parallel quality-gate reviews
    A->>O: All PASS
    H->>O: Approve merge

    Note over H,V: End of day
    H->>O: /orchestrate report
    O->>H: Evening telemetry + Veto Buffer review
```

---

## The 25 Agents at a Glance

```mermaid
mindmap
  root((A Team\n25 Agents))
    Orchestration
      orchestrator
    Planning
      architect
      planner
    Quality
      code-reviewer
      security-reviewer
      tdd-guide
      debugger
      refactor-cleaner
      build-error-resolver
    Mobile
      kotlin-reviewer
      swift-reviewer
      flutter-reviewer
    Backend Languages
      go-reviewer
      python-reviewer
      rust-reviewer
      database-reviewer
    Domain
      infra-reviewer
      compliance-reviewer
      ai-reviewer
      performance-profiler
    Operations
      harness-optimizer
      loop-operator
      e2e-runner
      doc-updater
      chief-of-staff
```

---

## How a Feature Gets Built

```mermaid
journey
    title Feature: idea → production
    section Design
      brainstorming skill: 5: Human, Orchestrator
      writing-plans skill: 4: Planner
      api-contract-first: 4: Planner
    section Development
      using-git-worktrees: 5: Agent
      test-driven-development: 5: TDD Guide
      subagent-driven-development: 4: Subagents
    section Review
      code-reviewer: 5: Code Reviewer
      language specialist: 4: Go/Python/Kotlin/…
      security-reviewer: 5: Security Reviewer
    section Gate
      harness-optimizer audit: 5: Harness Optimizer
      quality-gate: 5: All Reviewers
    section Ship
      finishing-a-development-branch: 4: Agent
      Human approval: 5: Human
```

---

## Installation — 3 Steps

```bash
# 1. Copy infrastructure into your project
cp -r "A Team/.claude"  your-project/
cp -r "A Team/skills"   your-project/
cp -r "A Team/hooks"    your-project/

# 2. Declare your project scope
cp "A Team/INIT_TEMPLATE.md" your-project/INIT.md
# edit INIT.md — languages, stack, compliance scope, CLI(s)

# 3. Initialize — orchestrator prunes irrelevant agents automatically
/orchestrate init
```

After init: `.agent-sync/TEAM.md` lists what's active. Everything else is pruned.

---

## Key Design Principles

| Principle | How A Team implements it |
|-----------|-------------------------|
| **Stateless** | Every agent reads from files; no memory between sessions |
| **Prunable** | Orchestrator removes irrelevant agents at init; lean by default |
| **Portable** | Works on Claude Code, Codex, Cursor, OpenCode — same files |
| **Enforceable** | Hard gates via hooks; skills injected every session |
| **Auditable** | DAILY.md, Veto Buffer, AUDIT.md — full trail of decisions |
| **Surgical** | Every agent has a single responsibility; no scope creep |
| **Parallel** | Independent tasks dispatched simultaneously; worktrees prevent collision |

---

## What Gets Pruned (example: Python API project)

```
Active after /orchestrate init          Pruned
─────────────────────────────────       ──────────────────────────
orchestrator                            go-reviewer
architect                               rust-reviewer
planner                                 kotlin-reviewer
code-reviewer                           swift-reviewer
security-reviewer                       flutter-reviewer
tdd-guide                               e2e-runner (if E2E = no)
debugger                                chief-of-staff (if no comms tools)
build-error-resolver                    loop-operator (if no auto loops)
python-reviewer        ←── kept
database-reviewer      ←── kept (PostgreSQL declared)
infra-reviewer         ←── kept (Docker declared)
compliance-reviewer    ←── kept (GDPR declared)
harness-optimizer
performance-profiler
```

The team that runs is the team the project needs. Nothing more.
