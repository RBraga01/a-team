# Credits & Integrations

A Team integrates with several AI coding assistants and was built by adapting patterns from a number of open-source projects. This page documents both.

---

## Integrated platforms (the "apps" A Team plugs into)

A Team is model-agnostic infrastructure. It doesn't replace your assistant — it configures one. It supports running on a single CLI or several at once, all sharing the same agent definitions and `.agent-sync/` state directory.

| Platform           | Role                                                            | Plugin / config            |
| ------------------ | -------------------------------------------------------------- | -------------------------- |
| **Claude Code**    | Primary / reference platform — full hooks, sub-agent dispatch, all slash commands | `.claude/` (+ `settings.json`) |
| **Codex CLI**      | Loads agents, skills, and rules; session-start hook only        | `.codex-plugin/`           |
| **Cursor**         | Loads agents, skills, and rules; session-start hook only        | `.cursor-plugin/`          |
| **OpenCode**       | Skills + command aliases                                         | `.opencode/`               |
| **GitHub Copilot** | Agents + skills via plugin manifest; full hook set (session-start, pre/post-tool-use, session-end) | `.copilot-plugin/`         |

See [Installation → Platform support](./installation.md#platform-support) for the capability differences that matter in practice.

---

## Upstream projects

Per the project's own acknowledgments, A Team was built by studying the architecture and workflow patterns of the projects below. The maintainer notes that no code or prompt text was copied verbatim — only concepts, patterns, and structural ideas were adapted and re-implemented.

| Project | What it informed |
| ------- | ---------------- |
| [Superpowers](https://github.com/obra/superpowers) | Skill-based methodology, TDD enforcement, subagent-driven development, and Git worktree isolation patterns |
| [tick-md](https://github.com/Purple-Horizons/tick-md) | Task-state management using Markdown files and atomic Git commits as the state machine |
| [Switchman](https://github.com/switchman-dev/switchman) | Concurrent agent coordination and file-level conflict detection across parallel workspaces |
| [Armory](https://github.com/Mathews-Tom/armory) | Headless automated test suite for validating the semantic effectiveness of rules and prompts |
| [BMad Cursor Master Workflow Agent and Rules](https://github.com/BuildSomethingAI/cursor-custom-agents-rules-generator) | Short, density-focused rule files with mandatory `[VALID]`/`[INVALID]` code examples |
| [claude-skills](https://github.com/alirezarezvani/claude-skills) | Modular skill-library architecture with native tool integrations |
| [Pi-DCP](https://github.com/PSU3D0/pi-dcp) | Token optimization via hooks that prune redundant command history and debug logs from context |
| [GitAgent (Open GAP)](https://github.com/open-gitagent/opengap) | Agent identity standardization through structured files and framework-agnostic state contracts |

---

## License

A Team is released under the **MIT License** — free to use, modify, and distribute in any project, commercial or otherwise, as long as the copyright notice is retained. See [`LICENSE`](../LICENSE).
