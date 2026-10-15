# Agent and Skill Catalog

This is the full shipped distribution, before project-specific pruning. **Filesystem source of truth:** agent files in [`.claude/agents/`](../.claude/agents/) and skill files in [`skills/`](../skills/). The consistency CI job validates every row against those files.

## Agent Catalog (26)

### Core Engineering (10)

| Skill or agent | Responsibility |
|---|---|
| `orchestrator` | Lead orchestration and daily dispatch |
| `architect` | System design and ADRs |
| `planner` | Implementation plans |
| `code-reviewer` | Code quality checks |
| `security-reviewer` | Security-sensitive changes |
| `tdd-guide` | Test-driven development |
| `refactor-cleaner` | Targeted cleanup |
| `build-error-resolver` | Build and type failures |
| `e2e-runner` | End-to-end testing |
| `debugger` | Root-cause investigation |

### Language & Platform Specialists (8)

| Skill or agent | Responsibility |
|---|---|
| `database-reviewer` | PostgreSQL, schema and migration review |
| `go-reviewer` | Go |
| `python-reviewer` | Python |
| `rust-reviewer` | Rust |
| `kotlin-reviewer` | Kotlin / Android |
| `swift-reviewer` | Swift / iOS |
| `flutter-reviewer` | Flutter / Dart |
| `typescript-reviewer` | TypeScript / React / frontend |

### Operational & Domain (8)

| Skill or agent | Responsibility |
|---|---|
| `chief-of-staff` | Communications and coordination |
| `loop-operator` | Autonomous loop safety |
| `doc-updater` | Documentation |
| `harness-optimizer` | Pre-merge pipeline audit |
| `infra-reviewer` | Infrastructure and CI/CD |
| `compliance-reviewer` | Compliance-sensitive work |
| `ai-reviewer` | LLM code and tool safety |
| `performance-profiler` | Measurement and profiling |

## Skill Catalog (20)

### Hard Gates (7)

| Skill or agent | Responsibility |
|---|---|
| `using-a-team` | Mandatory trigger map |
| `verification-before-completion` | Run and inspect verification evidence |
| `test-driven-development` | RED before GREEN |
| `systematic-debugging` | Isolate root cause before fixes |
| `brainstorming` | Design before implementation |
| `api-contract-first` | Contract before an API endpoint |
| `data-migration` | Rollback strategy and safe schema migration |

### Workflow and Meta Skills (13)

| Skill or agent | Responsibility |
|---|---|
| `using-git-worktrees` | Isolate parallel work |
| `subagent-driven-development` | Independent-agent plan execution |
| `executing-plans` | Execute an approved plan |
| `writing-plans` | Implementation planning |
| `dispatching-parallel-agents` | Independent work in parallel |
| `finishing-a-development-branch` | Pre-merge wrap-up |
| `writing-skills` | Meta-skill for new skills |
| `incident-response` | Production incidents |
| `performance-audit` | Baseline, measure, optimize |
| `architecture-audit` | Assess as-built system design |
| `skill-duplication-audit` | Identify overlapping skill packs |
| `smart-init` | ROADMAP-aware initialization |
| `five-whys` | Structured causal analysis |

Gate names describe workflow requirements. Automatic hook enforcement differs between CLIs; see [Platform support](installation.md#platform-support).
