# Changelog

All notable changes to A Team are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-05-30

### First public release

**25 specialist agents** across five categories:
- Leadership: orchestrator, architect, planner
- Quality: code-reviewer, security-reviewer, tdd-guide, debugger, refactor-cleaner, build-error-resolver
- Language specialists: go, python, rust, kotlin (Android), swift (iOS), flutter (Dart), database (PostgreSQL)
- Domain: infra-reviewer (IaC), compliance-reviewer (GDPR/COPPA/PCI/SOC2/HIPAA), ai-reviewer (LLM code), performance-profiler
- Operations: e2e-runner, doc-updater, chief-of-staff, loop-operator, harness-optimizer

**16 workflow skills** — 6 hard gates + 10 workflow skills:
- Hard gates: verification-before-completion, test-driven-development, brainstorming, systematic-debugging, api-contract-first, data-migration
- Workflow: using-git-worktrees, subagent-driven-development, executing-plans, writing-plans, dispatching-parallel-agents, finishing-a-development-branch, incident-response, performance-audit, writing-skills, using-a-team (meta)

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
