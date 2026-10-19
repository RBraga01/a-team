# Host validation — 2026-10-19

Machine: Windows 11 Home 10.0.26200. CLI tests used isolated homes and a disposable project. No paid Claude, Copilot, Codex, Cursor or OpenCode model transcript was run.

## GitHub Copilot CLI 1.0.98 (#33)

- `copilot plugin install RBraga01/a-team:.copilot-plugin` failed: `skills path escapes plugin directory: ../skills/`. The old published command was invalid.
- `copilot plugin install RBraga01/a-team` succeeded in a disposable `COPILOT_HOME`. The published root package initially listed two skill parsing errors (`brainstorming`, `incident-response`), caused by unquoted colons in YAML descriptions. Both descriptions are fixed.
- Installing the corrected local root package reports `Installed 20 skills`; `copilot skill list --json` lists 20 plugin skills with no parse failures.
- The installed package contains 26 `com.github.copilot/agents/*.agent.md` files and `com.github.copilot/hooks/hooks.json` with four events. `scripts/sync_plugin_agents.py --check` prevents drift from the canonical profiles.
- Native agent invocation and hook execution still require an authenticated session. Packaging and skill discovery are proven; runtime enforcement is not.

## Claude Code 2.1.303 (#34)

- `claude plugin validate .claude --strict --json` passed after adding command frontmatter. `claude plugin validate .claude-plugin/marketplace.json --json` passed after changing remote builder pack sources to GitHub source objects.
- A clean install with `CLAUDE_CONFIG_DIR` and `claude plugin install a-team@rbraga01` succeeded. `claude plugin details a-team` reports 20 workflow skills, 10 commands, 26 agents and a SessionStart hook.
- `install.ps1` into a project containing custom `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` preserved their contents and installed 26 project agent files. Existing settings require a deliberate merge for A Team project hooks.
- Interactive startup reached Claude Code's login-method screen. It could not test `/orchestrate init`, `/orchestrate morning`, `SessionStart` or `PostToolUse` without authentication and a model session.

## Codex CLI 0.162.0-alpha.17.2 (#35)

- In a disposable `CODEX_HOME`, `codex plugin marketplace add <repo>` registered `a-team-local`; `codex plugin add a-team@a-team-local` installed and enabled version 1.4.1.
- Installed package contains 20 skill directories and `hooks/hooks.json`. The plugin manifest does not register the 26 specialists as native Codex agents; project `AGENTS.md` remains the instruction source.
- SessionStart execution and hook trust need a real interactive session; file presence and enabled status do not prove the hook fired.

## Cursor 3.19.7 (#36)

- Installed the official `Anysphere.Cursor` Windows package with winget, copied the committed root package to `~/.cursor/plugins/local/a-team`, then started Cursor on the disposable project.
- Cursor's `Cursor Plugins` log records `loadUserLocalPlugin a-team loaded` and `loadAllPlugins ... failures=0`. The copied package contains 26 source agents, 20 skills, rules and `sessionStart` hook declarations.
- The IDE Customize view, component counts inside the IDE, hook trace, path expansion and collision behavior remain unverified. Local plugin discovery alone does not prove those behaviors.

## OpenCode 2.0.30 (#37)

- Started `opencode mini --standalone` in the A Team checkout with no configured integrations. The interactive slash menu displayed all ten project commands, including `/orchestrate`, `/plan`, `/quality-gate` and `/security-review`.
- The menu proves project command discovery where the earlier `/api/command` probe did not. The Markdown definitions and `$ARGUMENTS` are covered by static tests.
- Prompt execution, skill discovery and `/orchestrate init`/`morning` behavior were not validated. A Team provides no OpenCode-native agents or hooks.

## GitHub listing and Pages (#32)

- GitHub About was updated to 26 agents and 20 workflow skills. Exactly 20 topics remain; `ai`, `llm` and `open-source` were replaced with `tdd`, `codex-cli` and `multi-agent-systems` after checking topic usage.
- Original 1280×640 social preview is saved at `assets/social-preview-1280x640.png`. The browser integration was unavailable, so GitHub Settings upload and generated link preview remain pending.
- A Team Pages and all four builder pack Pages returned HTTP 200. Each live builder pack's A Team card says 20 workflow skills. The live A Team page contains Mac/Linux and Windows installation commands and `copyCode` button handlers. A rendered click test was unavailable.
- The illustrative README terminal block still needs a genuine authenticated `/orchestrate init` and `/orchestrate morning` recording before replacement.
