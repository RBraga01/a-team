# Contributing to A Team

Thanks for your interest in improving A Team. This document explains how to contribute.

## What makes a good contribution

A Team is a **universal baseline** — every addition must be genuinely useful across a wide range of projects, not just a specific tech stack or workflow. Before contributing, ask: *would this agent or skill be valuable in at least 50% of software projects?*

Good contributions:
- New specialist agents for languages or domains not yet covered
- Improvements to existing hard gate skills that reduce false negatives
- Bug fixes in agent logic or routing rules
- Documentation clarifications

Not a good fit:
- Project-specific agents (e.g., a Stripe-only billing reviewer)
- Workflow opinions that contradict the established patterns
- Model-specific optimisations that break other platforms

## How to contribute

### 1. Fork and branch

```bash
git clone https://github.com/YOUR-USERNAME/a-team
git checkout -b feat/your-agent-name
# or
git checkout -b fix/brief-description
```

### 2. Follow the conventions

**New agent:**
- Create `.claude/agents/<name>.md` with standard frontmatter (`name`, `description`, `allowedTools`, `model`)
- Add to `.agent-sync/TEAM.md` if it's a universal agent
- Register the trigger in `skills/using-a-team/SKILL.md`
- Add to `AGENTS.md` and `README.md` agent tables
- Add pruning rule to `orchestrator.md` init table

**New skill:**
- Use `/writing-skills` meta-skill to walk through spec, TDD, and validation
- Create `skills/<name>/SKILL.md`
- Register trigger in `skills/using-a-team/SKILL.md`
- Add to plugin manifests (`.codex-plugin/`, `.cursor-plugin/`)
- Add `Skill(<name>)` and `Skill(<name>:*)` to `settings.json`

**Rules changes:**
- Include a concrete `[VALID]`/`[INVALID]` example for any new coding standard
- Keep rules short and dense — LLMs replicate patterns, not paragraphs

### 3. Run the test suite

```bash
cd tests
npm install
npm test
```

All existing tests must pass. Add tests for new behaviour in `tests/suites/`.

### 4. Open a pull request

Use the PR template. Include:
- What the agent or skill does and why it belongs in a universal baseline
- Which platforms were tested (Claude Code, Codex, Cursor, OpenCode)
- Any model tier changes and the reasoning

## Reporting issues

Open a GitHub Issue with:
- Which agent or skill is affected
- What you expected vs. what happened
- Which AI platform you're using
- Relevant session transcript excerpt if possible

For security vulnerabilities, use GitHub's private vulnerability reporting — do not open a public issue.

## Code of conduct

Be direct, constructive, and blameless. Critique ideas, not people.
