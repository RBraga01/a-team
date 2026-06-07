# Changelog

All notable changes to A Team are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-06-02

### Added

**2 new workflow skills** (total: 16 → 18):
- `five-whys` — Root cause analysis skill for structured 5-Why chains; guides agents to escalate through causal layers before proposing a fix
- `smart-init` — ROADMAP-aware session initialisation; reads ROADMAP.md at session start to set context, runs an interview script when none exists, and writes INIT.md

**Observability stack:**
- `scripts/metrics.py` — Shared module with `append_metric` and `read_events` for structured event logging
- `scripts/metrics-report.py` — CLI with `parse`, `report`, and log rotation subcommands
- `scripts/status.py` — Cross-platform status line script with staleness detection; wired into Claude Code `statusLine` and all platform `SessionStart` hooks

**Safety guard:**
- Pre-tool-use hook with session export — prevents silent failures on tool calls (merged from imports-v1)

---

## [1.0.0] — 2026-05-30

### First public release

**25 specialist agents** across five categories:
- Leadership: orchestrator, architect, planner
- Quality: code-reviewer, security-reviewer, tdd-guide, debugger, refactor-cleaner, build-error-resolver
- Language specialists: go, python, rust, kotlin (Android), swift (iOS), flutter (Dart), database (PostgreSQL)
- Domain: infra-reviewer (IaC), compliance-reviewer (GDPR/COPPA/PCI/SOC2/HIPAA), ai-reviewer (LLM code), performance-profiler
- Operations: e2e-runner, doc-updater, chief-of-staff, loop-operator, harness-optimizer

**18 workflow skills** — 6 hard gates + 12 workflow skills:
- Hard gates: verification-before-completion, test-driven-development, brainstorming, systematic-debugging, api-contract-first, data-migration
- Workflow: using-git-worktrees, subagent-driven-development, executing-plans, writing-plans, dispatching-parallel-agents, finishing-a-development-branch, incident-response, performance-audit, writing-skills, using-a-team (meta), five-whys, smart-init

**Key capabilities:**
- Orchestrator init + prune protocol (INIT.md → automatic team sizing)
- File Lock Protocol with worktree path normalisation (prevents parallel agent collisions)
- Pipeline Auditor (harness-optimizer) with merge blocking on rule evasion
- Surgical Changes enforcement across all agents
- Model-agnostic tier system: Claude, OpenAI (GPT-4.1/o3/GPT-5.5), Google (Gemini 2.5)
- Cross-platform support: Claude Code, Codex CLI, Cursor, OpenCode

**Platforms supported:**
- Claude Code (full: hooks, slash commands, sub-agent dispatch)
- Codex CLI (full: agents, skills, rules, session hook)
- Cursor (strong: agents, skills, rules, session hook)
- OpenCode (good: 10 command aliases)
