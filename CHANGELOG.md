# Changelog

All notable changes to A Team are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

**Consistency shield — counts can no longer drift silently:**
- `packs.json` — single truth source for the builder-* domain packs
  (name, repo, pages URL, version, skill/agent counts).
- `check_consistency.py` extended from 23 to 75 checks: agent count is now
  enforced from the real truth source (`.claude/agents/*.md` file count) across
  23 references, skill-count coverage extended to `CLAUDE.md`, the claude plugin
  manifest, `marketplace.json`, and `CITATION.cff`, and packs.json is enforced
  against README, `docs/index.html` ecosystem cards, and `marketplace.json`
  (roster, versions, and advertised skill/agent counts).
- `scripts/check_packs_remote.py` + `packs-sync` workflow — daily cron,
  `workflow_dispatch`, and `repository_dispatch` (type `pack-updated`) compare
  packs.json against the LIVE builder-* repos: roster, real file-tree
  skill/agent counts, manifest version, and GitHub description. Drift opens
  (or updates) a `pack-drift` issue automatically and closes it when resolved.

### Fixed

- builder-growth was advertised as "6 skills and 3 agents, v1.0.0" in
  `marketplace.json` and the landing-page ecosystem card; the repo actually
  ships 14 skills and 5 agents at v1.1.0. Corrected everywhere, including the
  builder-growth GitHub repo description.

---

## [1.4.0] — 2026-07-19

### Added

**1 new skill** (total: 19 → 20):
- `architecture-audit` — systematic architecture review workflow. Maps the system
  as-built (not as-documented), identifies load-bearing decisions, dispatches parallel
  specialist reviews (architect, security-reviewer, performance-profiler,
  database-reviewer, infra-reviewer), and produces evidence-backed findings with
  severity verdicts (SOUND / SOUND-WITH-RISKS / INTERVENTION-REQUIRED). Every finding
  requires a file reference and a consequence. Registered in `using-a-team` under
  Architectural Decisions.

### Changed

- Skill count updated to 20 across `README.md`, `CLAUDE.md`, `docs/index.html`,
  `docs/overview.md`, `CITATION.cff`, and all plugin manifests.

### Fixed

- Corrected unsupported sparse-checkout arguments in both installers and added
  end-to-end regression coverage for Bash and PowerShell.
- Restored runtime enforcement scripts to the installed `scripts/` directory while
  keeping generated project state under `.agent-sync/`.
- Made watcher process detection safe on Windows.

---

## [1.3.0] — 2026-06-16

### Added

**Platform: GitHub Copilot CLI** (4 → 5 supported platforms):

- New `.copilot-plugin/plugin.json` declaring A Team's agents (`../.claude/agents/`)
  and skills (`../skills/`) for Copilot CLI auto-install.
- New `.copilot-plugin/hooks/hooks.json` carrying `SessionStart`, `PreToolUse`,
  `PostToolUse`, and `SessionEnd` hooks — full enforcement parity with Claude Code's
  `.claude/settings.json` (not just SessionStart like Codex CLI today).
- Install command: `copilot plugin install RBraga01/a-team:.copilot-plugin`.
- No new agents, skills, or rules — purely additive platform plumbing.

### Changed

- `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, and the PR template
  updated to reference Copilot CLI as a supported platform.
- Version bumped to `1.3.0` across all plugin manifests for consistency.

---

## [1.2.0] — 2026-06-16

### Added

**1 new agent** (total: 25 → 26):
- `typescript-reviewer` — TypeScript / React / frontend review specialist. Covers TS strictness
  (`strict`, no `any`/`@ts-ignore`), React idioms (no state mutation, effect deps, focused
  components), design-state completeness (loading/empty/error/partial/uncertain/success/streaming),
  accessibility, PWA/service-worker correctness, and client-side security (XSS, token handling).
  Enforces the full TS gate (`tsc --noEmit && eslint . && vitest run`), never a subset. Tier 2.
  Fills a real gap: A Team shipped Go/Python/Rust/Kotlin/Swift/Flutter reviewers but no
  TypeScript/JS specialist — the most common web stack.

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
