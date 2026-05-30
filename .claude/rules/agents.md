# Agent Orchestration Rules

## Immediate Agent Triggers (No User Prompt Needed)

| Situation | Agent |
|-----------|-------|
| Complex feature request | **planner** |
| Code just written/modified | **code-reviewer** |
| Bug reported or test failing | **debugger** |
| Build broken | **build-error-resolver** |
| Architectural decision needed | **architect** |
| Security-sensitive code | **security-reviewer** |
| New feature (full flow) | **brainstorming** → **planner** → **subagent-driven-development** |

## Parallel Execution (ALWAYS)

Use parallel dispatch for independent operations:

```
# CORRECT: Parallel
Launch in parallel:
1. security-reviewer on auth module
2. code-reviewer on cache system
3. go-reviewer on utilities

# WRONG: Sequential when unnecessary
First security, then code, then go-reviewer
```

## Model Tier Selection

A Team uses three tiers regardless of platform. The `model:` values in agent frontmatter are Claude Code defaults — on other platforms, select the equivalent tier in your platform's model settings.

| Tier | Capability | Claude Code | OpenAI / Codex | Google / Gemini | Use for |
|------|-----------|-------------|----------------|-----------------|---------|
| **Tier 1** | Complex reasoning | `claude-opus-4-8` | `o3` / `gpt-5.5` | `gemini-2.5-pro` | Orchestrator, Architect |
| **Tier 2** | Balanced | `claude-sonnet-4-6` | `gpt-4.1` | `gemini-2.5-flash` | Most agents — review, debug, implement |
| **Tier 3** | Lightweight | `claude-haiku-4-5` | `gpt-4.1-mini` | `gemini-2.0-flash-lite` | Docs, audit, profiling |

Use the lowest tier that can handle the task to control cost.

## Multi-Perspective Analysis

For complex decisions, use split role sub-agents in parallel:
- Factual reviewer
- Senior engineer perspective
- Security expert perspective
- Consistency reviewer

## Agent Scope Rules

- Agents must not exceed their stated tool permissions
- `build-error-resolver` makes minimal diffs only — no refactoring
- `debugger` must complete Phase 1 before proposing any fix
- `orchestrator` never writes product code
- `refactor-cleaner` never runs during active feature development

## Context Window Management

Avoid the last 20% of context window for:
- Large-scale refactoring
- Multi-file feature implementation
- Complex debugging sessions

Prefer fresh sub-agents for isolated tasks to preserve coordinator context.
