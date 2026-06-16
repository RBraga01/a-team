## Summary

<!-- What does this PR add, fix, or change? 2-3 sentences. -->

## Type of change

- [ ] New agent
- [ ] New skill
- [ ] Bug fix in existing agent/skill/rule
- [ ] Documentation improvement
- [ ] Configuration / infrastructure fix

## Why it belongs in a universal baseline

<!-- A Team is a universal baseline — every addition must be useful in at least 50% of projects.
     Explain why this change meets that bar. -->

## Platforms tested

- [ ] Claude Code
- [ ] Codex CLI
- [ ] Cursor
- [ ] OpenCode
- [ ] GitHub Copilot CLI

## Checklist

- [ ] Agent has correct `allowedTools`, `model` (tier), and `description` in frontmatter
- [ ] Trigger registered in `skills/using-a-team/SKILL.md`
- [ ] Added to `AGENTS.md`, `README.md` agent tables
- [ ] Pruning rule added to `orchestrator.md` init table (if new agent)
- [ ] New skill added to plugin manifests and `settings.json` permissions
- [ ] Tests pass: `cd tests && npm test`
- [ ] No hardcoded secrets or personal data
