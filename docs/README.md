# A Team Documentation

Centralized documentation for **A Team** — universal multi-agent infrastructure for AI coding assistants.

This folder is the single entry point for using A Team. The root [`README.md`](../README.md) is the project overview and pitch; everything operational lives here.

## Start here

| If you want to…                                   | Read                                          |
| ------------------------------------------------- | --------------------------------------------- |
| Understand what A Team is and get running fast     | [Getting Started](./getting-started.md)       |
| Install it (prerequisites → install → first run)   | [Installation](./installation.md)             |
| Know what every command does                       | [Command Reference](./commands.md)            |
| Browse all agents and skills                         | [Catalog](./catalog.md)                       |
| Understand routing, state and gates                  | [How A Team Works](./how-it-works.md)         |
| Fix something that isn't working                   | [Troubleshooting](./troubleshooting.md)       |
| See what platforms and projects this builds on     | [Credits & Integrations](./credits.md)        |

## Visual references

Diagram-led companions to the prose above (also published as the [live site](https://rbraga01.github.io/a-team/)):

- **[Overview](./overview.md)** — the 5-layer architecture, daily cycle, and agent map as diagrams
- **[Decision tree](./decision-tree.md)** — "what am I about to do?" → which gate fires first

## Canonical references (single source of truth)

To avoid the same fact being written in several places and drifting out of sync, these lists are **not** duplicated in the docs. They live in exactly one place each:

- **Agent identities** — the files in [`.claude/agents/`](../.claude/agents/), audited against [catalog](./catalog.md), [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md)
- **Skill identities** — the files in [`skills/`](../skills/), audited against the [catalog](./catalog.md), with triggers in [`skills/using-a-team/SKILL.md`](../skills/using-a-team/SKILL.md)
- **Coding standards** — [`.claude/rules/`](../.claude/rules/)
- **Changelog** — [`CHANGELOG.md`](../CHANGELOG.md)
- **Contributing** — [`CONTRIBUTING.md`](../CONTRIBUTING.md)

When you add an agent or skill, update its canonical location and the trigger map — not the docs in this folder.

## Documentation map

```
docs/
├── README.md            ← you are here (hub + index)
├── getting-started.md   ← zero to first task
├── installation.md      ← prerequisites, install methods, post-install
├── catalog.md           ← complete audited agent and skill inventory
├── how-it-works.md      ← orchestration, audits, coding standards
├── commands.md          ← every slash command, what it does
├── troubleshooting.md   ← common problems and fixes
├── credits.md           ← integrated platforms + upstream projects
├── overview.md          ← visual architecture & daily cycle (diagrams)
└── decision-tree.md     ← visual gate-routing decision tree
```
