# A Team — A Complete Engineering Team in One Folder v1.2.0

Not a marketplace of agents you configure — a pre-configured, pre-enforced team of 26 specialists
with a lead orchestrator, hard quality gates, and a Pipeline Auditor that verifies work was done,
not just reported. Drop this folder into any project and it's operational from the first keystroke.
Works on Claude Code, Codex CLI, Cursor, OpenCode, and GitHub Copilot CLI.

## Quick Start

1. Copy the entire `.claude/` folder and `skills/` folder into your project root.
2. Write a project `INIT.md` (use `INIT_TEMPLATE.md` as a guide).
3. Run `/orchestrate init` — the Lead Orchestrator reads `INIT.md`, evaluates which agents
   and skills are irrelevant to the scope, and prunes them automatically.
4. Every session starts with the `using-a-team` meta-skill injected via the SessionStart hook.

## Folder Layout

```
A Team/
├── CLAUDE.md                  ← This file
├── AGENTS.md                  ← Agent roster & quick reference
├── INIT_TEMPLATE.md           ← Template for project-specific init doc
├── .claude/
│   ├── settings.json          ← Universal permissions, hooks, MCP stubs
│   ├── agents/                ← 26 agent profiles
│   ├── commands/              ← Slash commands
│   └── rules/                 ← Enforced coding & workflow standards
├── skills/                    ← 19 workflow skill modules
├── hooks/
│   └── session-start.md       ← Injected at every session start
├── .cursor-plugin/            ← Cursor IDE integration
├── .codex-plugin/             ← Codex CLI integration
├── .copilot-plugin/           ← GitHub Copilot CLI integration
└── .opencode/                 ← OpenCode integration
```

## Agent Roster (26)

| Agent | Role | Trigger |
|-------|------|---------|
| **orchestrator** | Lead — reads INIT.md, prunes team, dispatches | `/orchestrate` |
| **architect** | System design & ADRs | Architectural decisions |
| **planner** | Implementation plans | Feature requests |
| **code-reviewer** | Code quality & security | After every code change |
| **security-reviewer** | OWASP Top 10, secrets | Auth/API/input code |
| **tdd-guide** | TDD enforcement | New features & bug fixes |
| **refactor-cleaner** | Dead code & duplication | Code maintenance |
| **doc-updater** | Codemaps & README | Post-feature |
| **build-error-resolver** | Build/type failures | Build broken |
| **e2e-runner** | End-to-end test flows | Critical user journeys |
| **database-reviewer** | PostgreSQL & schema | DB queries & migrations |
| **go-reviewer** | Idiomatic Go | Go code changes |
| **python-reviewer** | Pythonic & PEP 8 | Python code changes |
| **rust-reviewer** | Rust idioms & safety | Rust code changes |
| **typescript-reviewer** | TypeScript/React/frontend | All `.ts`/`.tsx` changes |
| **debugger** | Root-cause investigation | Any bug |
| **chief-of-staff** | Communication triage | Email/Slack workflows |
| **loop-operator** | Autonomous loop safety | Agent loops |
| **harness-optimizer** | Pipeline auditor — detects rule evasion, blocks merge | Post-task, pre-merge |
| **kotlin-reviewer** | Kotlin/Android — Coroutines, Compose, MVVM | All `.kt` changes |
| **swift-reviewer** | Swift/iOS — ARC, concurrency, SwiftUI | All `.swift` changes |
| **flutter-reviewer** | Flutter/Dart — null safety, state management | All `.dart` changes |
| **infra-reviewer** | Terraform, Docker, K8s, CI/CD | All IaC changes |
| **compliance-reviewer** | GDPR, COPPA, PCI-DSS, SOC2, HIPAA | Privacy/data/payment code |
| **ai-reviewer** | LLM code — prompt injection, token cost, tool safety | Any LLM API calls |
| **performance-profiler** | Systematic profiling — measure before optimising | Performance regressions |

## Skill Library (19)

| Skill | Use Case | Gate Type |
|-------|---------|-----------|
| **using-a-team** | Meta — enforced at every session start | Hard gate |
| **verification-before-completion** | Prove it works before claiming done | Hard gate |
| **brainstorming** | Before any new feature/component | Hard gate |
| **subagent-driven-development** | Execute plans with per-task subagents | Workflow |
| **systematic-debugging** | Any bug — root-cause first | Hard gate |
| **test-driven-development** | RED before GREEN before REFACTOR | Hard gate |
| **using-git-worktrees** | Isolated workspace before development | Workflow |
| **executing-plans** | Run a written plan in current session | Workflow |
| **dispatching-parallel-agents** | 2+ independent problems simultaneously | Workflow |
| **writing-plans** | Create structured implementation plans | Workflow |
| **finishing-a-development-branch** | Wrap up a branch before merge | Workflow |
| **writing-skills** | Create new A Team skills via TDD | Meta |
| **skill-duplication-audit** | Detect overlapping skills across packs — classify pairs as duplicate / partial overlap / complementary / false positive | Workflow |
| **api-contract-first** | Design API contract before writing any endpoint | Hard gate |
| **incident-response** | Production incident playbook (detect → contain → resolve → post-mortem) | Workflow |
| **data-migration** | Safe schema changes with rollback strategy | Hard gate |
| **performance-audit** | Baseline → profile → optimise → validate with numbers | Workflow |

## Orchestrator Init & Pruning Protocol

When you run `/orchestrate init`:

1. The Lead Orchestrator reads `INIT.md` (your project scope document).
2. It evaluates each agent and skill against the declared scope.
3. It deletes files that are irrelevant (e.g., removes `go-reviewer.md` from a Python-only project).
4. It generates `.agent-sync/TEAM.md` — permanent record of active agents.
5. It generates `.agent-sync/ROUTING.md` — task routing table for this project.

The pruned workspace is leaner and agents no longer have access to context that doesn't apply.

## Session Enforcement

Every session start triggers the `hooks/session-start.md` content via the SessionStart hook.
This injects the `using-a-team` meta-skill into session context, which enforces:
- Skills must be consulted before action
- `verification-before-completion` before any "done" claim
- `code-reviewer` after every code change
- Language-specific reviewers for Go/Python/Rust changes

## Standards

All agents enforce the rules in `.claude/rules/`:

- **orchestration.md** — Orchestrator state machine, init/prune, veto buffer protocol
- **coding-style.md** — Immutability, KISS, DRY, YAGNI, naming conventions
- **security.md** — Secrets, injection, auth, OWASP mandatory checks
- **testing.md** — TDD, 80% coverage, unit + integration + E2E
- **git-workflow.md** — Conventional commits, PR process
- **performance.md** — Model selection, context window management
- **agents.md** — Parallel execution, agent selection rules
- **patterns.md** — Repository pattern, API envelopes, error handling

## Cross-Platform Support

| Platform | Config |
|----------|--------|
| Claude Code | `.claude/` (native) |
| Cursor | `.cursor-plugin/plugin.json` |
| Codex CLI | `.codex-plugin/plugin.json` |
| GitHub Copilot CLI | `.copilot-plugin/plugin.json` |
| OpenCode | `.opencode/commands/` |
