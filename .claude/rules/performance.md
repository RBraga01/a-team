# Performance Optimization

## Model Tier Strategy

A Team uses three capability tiers. The `model:` field in each agent's frontmatter is the **Claude Code default** — other platforms (Codex, Cursor, OpenCode) use their own model selection mechanisms and may ignore or override this field.

### Tier 1 — Complex Reasoning
Used by: **orchestrator**, **architect**

| Platform | Recommended model |
|----------|------------------|
| Claude Code | `claude-opus-4-8` |
| Codex CLI / ChatGPT | `o3` / `gpt-5.5` |
| Cursor | Claude Opus or equivalent reasoning model |
| OpenCode | Configure via `~/.config/opencode/config.json` |
| Google / Gemini | `gemini-2.5-pro` |

Use for: architectural decisions, orchestration, multi-step planning, complex reasoning chains.

### Tier 2 — Balanced
Used by: most specialist agents (code-reviewer, debugger, planner, language reviewers, …)

| Platform | Recommended model |
|----------|------------------|
| Claude Code | `claude-sonnet-4-6` |
| Codex CLI / ChatGPT | `gpt-4.1` |
| Cursor | Claude Sonnet or GPT-4.1 |
| Google / Gemini | `gemini-2.5-flash` |

Use for: code review, debugging, implementation, security review, most daily work.

### Tier 3 — Lightweight
Used by: **doc-updater**, **harness-optimizer**, **performance-profiler**

| Platform | Recommended model |
|----------|------------------|
| Claude Code | `claude-haiku-4-5` |
| Codex CLI / ChatGPT | `gpt-4.1-mini` |
| Cursor | GPT-4.1-mini or Claude Haiku |
| Google / Gemini | `gemini-2.0-flash-lite` |

Use for: documentation, pipeline auditing, lightweight analysis, high-frequency ops.

## Cost Rules

- Use the lowest tier that can handle the task
- Tier 1 for orchestration and architecture only — not for routine code tasks
- Flag workflows that escalate to Tier 1 without a clear reasoning requirement
- On Claude Code: defaults in agent frontmatter are already calibrated per tier

## Context Window Management

Avoid the last 20% of context window for:
- Large-scale refactoring spanning many files
- Feature implementation touching multiple subsystems
- Complex debugging sessions

Lower context sensitivity (safe to run anywhere):
- Single-file edits, documentation updates, simple bug fixes

## Parallel Agent Efficiency

Always dispatch independent agents in parallel.
A task with 3 independent subtasks should complete 3x faster with parallel dispatch.

## Build Troubleshooting

If build fails:
1. Use `build-error-resolver` agent — minimal diffs only
2. Analyze all errors before fixing any
3. Fix incrementally, one error at a time
4. Verify after each fix
