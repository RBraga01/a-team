# Host validation — 2026-10-19

Machine: Windows 11 Home 10.0.26200. Installation tests used isolated homes and disposable projects. After user approval, Claude Code model sessions ran in `E:\Projectos\worktrees\a-team-live-validation`; no other host model session was run.

## GitHub Copilot CLI 1.0.98 (#33)

- `copilot plugin install RBraga01/a-team:.copilot-plugin` failed: `skills path escapes plugin directory: ../skills/`. The old published command was invalid.
- `copilot plugin install RBraga01/a-team` succeeded in a disposable `COPILOT_HOME`. The published root package initially listed two skill parsing errors (`brainstorming`, `incident-response`), caused by unquoted colons in YAML descriptions. Both descriptions are fixed.
- Installing the corrected local root package reports `Installed 20 skills`; `copilot skill list --json` lists 20 plugin skills with no parse failures.
- The installed package contains 26 `com.github.copilot/agents/*.agent.md` files and `com.github.copilot/hooks/hooks.json` with four events. `scripts/sync_plugin_agents.py --check` prevents drift from the canonical profiles.
- Authenticated Copilot CLI sessions with the local plugin returned `READY`. The first run rejected the shared Claude `PreToolUse` hook because the matcher was empty. Changing it to `*` removed that warning, but revealed that Copilot executes shared hook commands through PowerShell on Windows. Replaced the Bash-specific hook commands with Python 3 entry points, checked as an installer prerequisite. In a disposable project, Copilot then read ordinary files and its repository `preToolUse` hook blocked a real Read of a test-only `.env` file with the guard's expected message. The shared `SessionStart` entry point now emits both hosts' supported JSON context fields; a later authenticated Copilot prompt completed with no hook error in its log. Native agent invocation remains unverified.

## Claude Code 2.1.303 (#34)

- `claude plugin validate .claude --strict --json` passed after adding command frontmatter. `claude plugin validate .claude-plugin/marketplace.json --json` passed after changing remote builder pack sources to GitHub source objects.
- A clean install with `CLAUDE_CONFIG_DIR` and `claude plugin install a-team@rbraga01` succeeded. `claude plugin details a-team` reports 20 workflow skills, 10 commands, 26 agents and a SessionStart hook.
- `install.ps1` into a project containing custom `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` preserved their contents and installed 26 project agent files. Existing settings require a deliberate merge for A Team project hooks.
- With the user's approval, authenticated Claude Code Pro sessions ran against a disposable Python CLI project. `/orchestrate init` generated `.agent-sync/TEAM.md` and `ROUTING.md` and invoked the `orchestrator` subagent. Pruning was decided but denied in non-interactive mode without a permission prompt, so the listed agent and skill files remain. This is a partial init, not a successful prune.
- The first debug trace found that Claude rejected `.claude/settings.json` because `statusLine.type` was missing and warned that all 26 agents used the unsupported `allowedTools` frontmatter key. Both are corrected: `statusLine.type` is `command`; agent `tools` values now use Claude's actual tool names. The allowlists include `Skill`, `Edit` where writing was already allowed, and `Agent` for the orchestrator. A fresh trace had no invalid-setting or unknown-frontmatter warnings; agent dispatch under the new allowlist still needs a separately approved morning plan. After making shared hook commands portable, a Claude Read of a test-only `.env` was blocked with guard exit 2. A subsequent `--init-only` trace confirmed `SessionStart` with the dual JSON output succeeded and provided `additionalContext`.
- After trusting only this disposable project with its blanket `permissions.allow` list removed, `/orchestrate morning` wrote `.agent-sync/DAILY.md` with one proposed task, marked `PENDING HUMAN APPROVAL`, and dispatched no agent. Its debug trace shows A Team `SessionStart`, `PreToolUse` and `PostToolUse:Write` hooks executing successfully. The PreToolUse shell command was also changed to preserve a blocking exit code and show its error; a `.env` read payload exits 2.
- Approval of the plan and full prune were deliberately not simulated. The existing-project settings merge remains a manual step.
- The init instructions no longer suggest `rm -rf` for skill pruning, since the project's own PreToolUse guard blocks recursive force removal. The authenticated retry held the prune because the disposable agent files had uncommitted edits and the Veto Buffer decision required human approval.

Reproduction: install this branch into a new test project, fill `INIT.md` and `TASKS.md`, and run `claude -p '/orchestrate init' --permission-mode acceptEdits --permission-prompts none`, then `claude -p '/orchestrate morning'` with the same permission flags. In the trusted-project morning run, the result said `Do you approve this plan?`, `DAILY.md` contained `PENDING HUMAN APPROVAL`, and the debug log recorded `Hooks: SessionStart:startup`, `Hooks: PreToolUse:Write` and `Hooks: PostToolUse:Write ... finished with status 0`. No task was dispatched.

## Codex CLI 0.162.0-alpha.17.2 (#35)

- In a disposable `CODEX_HOME`, `codex plugin marketplace add <repo>` registered `a-team-local`; `codex plugin add a-team@a-team-local` installed and enabled version 1.4.1.
- Installed package contains 20 skill directories and `hooks/hooks.json`. The plugin manifest does not register the 26 specialists as native Codex agents; project `AGENTS.md` remains the instruction source.
- SessionStart execution and hook trust need a real interactive session; file presence and enabled status do not prove the hook fired.
- With the user's approval, `a-team@a-team-local` was also installed and enabled in the authenticated Codex profile. A stale `a-team@rbraga01-a-team` v1.3.0 installation caused a missing-description skill error and its marketplace snapshot was absent; the old plugin and marketplace were removed with Codex CLI after saving a local config backup. A subsequent authenticated `codex exec` completed without that error.
- The interactive `codex --no-daemon` opened this disposable project and showed the hook trust screen. It listed three active `SessionStart` hooks and two unrelated plugin hooks requiring review; the latter were left untrusted. The TUI did not identify which active `SessionStart` hook belonged to A Team, so execution of A Team's hook remains unproven. No `--dangerously-bypass-hook-trust` flag was used.

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
