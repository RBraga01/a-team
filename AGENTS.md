# A Team — Agent & Skill Roster v1.3.0

> **Model values below are Claude Code defaults** (`model:` frontmatter). On other platforms (Codex, Cursor, OpenCode, GitHub Copilot CLI), select the equivalent tier in your platform's model settings: Tier 1 = o3/GPT-4o/Gemini 2.5 Pro · Tier 2 = GPT-4o/Gemini Flash · Tier 3 = GPT-4o-mini/Gemini Flash-Lite.

## Core Engineering Agents

| Agent | Tier | Trigger |
|-------|------|---------|
| **orchestrator** | Tier 1 (claude-opus-4-8) | `/orchestrate init\|morning\|tick\|report` |
| **architect** | Tier 1 (claude-opus-4-8) | New feature design, tech decisions |
| **planner** | Tier 2 (claude-sonnet-4-6) | Implementation plan before coding |
| **code-reviewer** | Tier 2 (claude-sonnet-4-6) | After every code change (mandatory) |
| **security-reviewer** | Tier 2 (claude-sonnet-4-6) | Auth, API, input, DB code |
| **tdd-guide** | Tier 2 (claude-sonnet-4-6) | New features, bug fixes |
| **refactor-cleaner** | Tier 2 (claude-sonnet-4-6) | Dead code, duplication cleanup |
| **build-error-resolver** | Tier 2 (claude-sonnet-4-6) | Build or type errors |
| **e2e-runner** | Tier 2 (claude-sonnet-4-6) | Critical user journeys |
| **doc-updater** | Tier 3 (claude-haiku-4-5) | Post-feature docs & codemaps |
| **debugger** | Tier 2 (claude-sonnet-4-6) | Any bug (root-cause first) |

## Language & Platform Specialists

| Agent | Language / Platform | Trigger |
|-------|---------------------|---------|
| **database-reviewer** | PostgreSQL | SQL, migrations, schema |
| **go-reviewer** | Go | All `.go` changes |
| **python-reviewer** | Python | All `.py` changes |
| **rust-reviewer** | Rust | All `.rs` changes |
| **kotlin-reviewer** | Kotlin / Android | All `.kt` changes |
| **swift-reviewer** | Swift / iOS | All `.swift` changes |
| **flutter-reviewer** | Flutter / Dart | All `.dart` changes |
| **typescript-reviewer** | TypeScript / React / Frontend | All `.ts`/`.tsx` changes |

## Operational Agents

| Agent | Tier | Purpose |
|-------|------|---------|
| **chief-of-staff** | Tier 2 (claude-sonnet-4-6) | Email/Slack/Calendar triage |
| **loop-operator** | Tier 2 (claude-sonnet-4-6) | Autonomous loop safety |
| **harness-optimizer** | Tier 3 (claude-haiku-4-5) | Pipeline auditor — detects rule evasion, blocks merge |
| **infra-reviewer** | Tier 2 (claude-sonnet-4-6) | Terraform, Docker, K8s, CI/CD — IaC changes |
| **compliance-reviewer** | Tier 2 (claude-sonnet-4-6) | GDPR, COPPA, PCI-DSS, SOC2, HIPAA |
| **ai-reviewer** | Tier 2 (claude-sonnet-4-6) | LLM code — prompt injection, token cost, tool call safety |
| **performance-profiler** | Tier 3 (claude-haiku-4-5) | Systematic profiling — baseline, bottleneck, validate |

## Skill Library

| Skill | Gate | Purpose |
|-------|------|---------|
| **using-a-team** | Hard | Meta-skill injected every session — enforces all others |
| **verification-before-completion** | Hard | Prove it works before claiming done |
| **brainstorming** | Hard | Design before code — always |
| **test-driven-development** | Hard | RED first, always |
| **systematic-debugging** | Hard | Root cause before fix |
| **subagent-driven-development** | Workflow | Execute plans with fresh subagents + two-stage review |
| **using-git-worktrees** | Workflow | Isolated workspace before development |
| **executing-plans** | Workflow | Run a written plan in current session |
| **dispatching-parallel-agents** | Workflow | 2+ independent problems concurrently |
| **writing-plans** | Workflow | Create structured implementation plans |
| **finishing-a-development-branch** | Workflow | Wrap up a branch before merge |
| **writing-skills** | Meta | Create new A Team skills via TDD |
| **api-contract-first** | Hard | Design OpenAPI/protobuf contract before any endpoint |
| **incident-response** | Workflow | Production incident — detect, contain, diagnose, resolve, post-mortem |
| **data-migration** | Hard | Safe schema migrations with rollback strategy |
| **performance-audit** | Workflow | Baseline → profile → single change → measure again |

## Command Reference

```
/orchestrate init       → Read INIT.md, prune team, generate routing
/orchestrate morning    → Plan today's tasks
/orchestrate tick       → Process completed results
/orchestrate report     → End-of-day telemetry

/plan                   → Create implementation plan
/code-review            → Review staged/recent changes
/security-review        → Security audit
/refactor               → Find & remove dead code
/build-fix              → Fix build errors (minimal diffs)
/debug                  → Systematic root-cause debugging
/e2e                    → Run end-to-end test suite
/quality-gate           → Full pre-merge check (code + security)
/feature                → Full feature workflow (brainstorm→plan→implement→review)
```

## Mandatory Skill Invocation Map

| You are about to... | Required first |
|--------------------|----------------|
| Write a new feature | `brainstorming` |
| Start dev work | `using-git-worktrees` |
| Write any code | `test-driven-development` |
| Fix any bug | `debugger` agent |
| Claim anything is "done" | `verification-before-completion` |
| Review code | `code-reviewer` agent |
| Merge a branch | `harness-optimizer` audit → `/quality-gate` |

## Parallel Dispatch Patterns

For independent problems, dispatch in parallel:
```
# 3 failing test files → 3 parallel debugger agents
# Security + code review → security-reviewer + code-reviewer in parallel
# Go + Python changes in same PR → go-reviewer + python-reviewer in parallel
```

## Cross-Platform Support

| Platform | Config |
|----------|--------|
| Claude Code | `.claude/` (native) |
| Cursor | `.cursor-plugin/plugin.json` |
| Codex | `.codex-plugin/plugin.json` |
| GitHub Copilot CLI | `.copilot-plugin/plugin.json` |
| OpenCode | `.opencode/commands/` |
