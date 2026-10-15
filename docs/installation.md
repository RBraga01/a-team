# Installation

Everything you need before, during, and after installing A Team. For a faster narrative walkthrough, see [Getting Started](./getting-started.md).

---

## Pre-install preparation

A Team is configuration, not a running service, so the requirements are light. Confirm the following before you install.

### Required

- **A supported AI coding assistant.** At least one of: Claude Code (primary, full feature set), Codex CLI, Cursor, OpenCode, or GitHub Copilot. See [Platform support](#platform-support) for what each one can do.
- **A target project directory.** A Team installs into a project, not globally. Decide whether you're starting greenfield or adding to an existing repo (see [Adding to an existing project](#adding-to-an-existing-project)).

### Depends on your install method

- **Option A (one-liner):** `git` and `curl` (Mac/Linux/WSL); `git` and PowerShell (Windows).
- **Option B:** the [GitHub CLI](https://cli.github.com/) (`gh`).
- **Option C:** `git` (version recent enough to support `--filter` and `--sparse`, i.e. Git 2.27+).
- **Option D:** nothing — just a browser and an unzip tool.

### Only if you intend to run the test suite

- **Node.js and npm.** The harness in `tests/` is run with `npm install` && `npm test`.

### Decide before you install

- **Are you on a fresh project or an existing one?** On an existing project you must avoid clobbering files you already have — see below.
- **Do you already have a `.claude/settings.json`?** If so, do **not** let the install overwrite it; you'll merge permissions manually after installing.

---

## Install methods

All methods copy the same distribution: `.claude/`, `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.copilot-plugin/`, `.opencode/`, `skills/`, `hooks/`, `templates/`, `scripts/` and `assets/`. **File presence is not plugin activation.** Follow [platform activation](#platform-plugin-activation) for non-native integrations.

### Option A — One-liner (recommended)

```bash
# Mac / Linux / WSL
bash <(curl -fsSL https://raw.githubusercontent.com/RBraga01/a-team/main/install.sh)
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/RBraga01/a-team/main/install.ps1 | iex
```

Install into a specific directory by passing the path:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/RBraga01/a-team/main/install.sh) /path/to/project
```

### Option B — GitHub CLI

```bash
gh repo clone RBraga01/a-team -- --depth 1
cp -r a-team/.claude a-team/.claude-plugin a-team/.codex-plugin a-team/.cursor-plugin a-team/.copilot-plugin a-team/.opencode a-team/skills a-team/hooks a-team/templates a-team/scripts a-team/assets your-project/
cp a-team/INIT_TEMPLATE.md your-project/INIT.md
rm -rf a-team
```

### Option C — Git, no GitHub CLI (sparse clone)

```bash
git clone --filter=blob:none --sparse --depth 1 \
  https://github.com/RBraga01/a-team.git
cd a-team
git sparse-checkout set .claude .claude-plugin .codex-plugin .cursor-plugin .copilot-plugin .opencode skills hooks templates scripts assets
cp -r .claude .claude-plugin .codex-plugin .cursor-plugin .copilot-plugin .opencode skills hooks templates scripts assets ../your-project/
cp INIT_TEMPLATE.md ../your-project/INIT.md
cd .. && rm -rf a-team
```

**Windows (PowerShell equivalent):**

```powershell
git clone --filter=blob:none --sparse --depth 1 `
  https://github.com/RBraga01/a-team.git
cd a-team
git sparse-checkout set .claude .claude-plugin .codex-plugin .cursor-plugin .copilot-plugin .opencode skills hooks templates scripts assets
Copy-Item -Recurse .claude,.claude-plugin,.codex-plugin,.cursor-plugin,.copilot-plugin,.opencode,skills,hooks,templates,scripts,assets ..\your-project\
Copy-Item INIT_TEMPLATE.md ..\your-project\INIT.md
cd .. ; Remove-Item a-team -Recurse -Force
```

### Option D — Download ZIP (no git)

1. Go to the [repository](https://github.com/RBraga01/a-team).
2. **Code → Download ZIP**.
3. Extract and copy all eleven directories named under [Install methods](#install-methods) into your project root.
4. Copy `INIT_TEMPLATE.md` as `INIT.md`.

### Platform plugin activation

The installers include all integration manifests and OpenCode commands. **A copied manifest is not proof that its host CLI registered or loaded the plugin.**

- **Claude Code:** the project `.claude/` settings, hooks and commands are available after trusting the workspace.
- **OpenCode:** `.opencode/commands/` is the project-level custom-command directory.
- **GitHub Copilot CLI:** separately run `copilot plugin install RBraga01/a-team:.copilot-plugin`; inspect `copilot plugin list`. End-to-end loading of referenced components still needs a real Copilot CLI test.
- **Cursor:** install via **Customize → Plugins** or test through Cursor's local plugin directory; copying `.cursor-plugin/` into a project alone does not register a plugin.
- **Codex:** the `.codex-plugin/` manifest is bundled, but copying it alone is not a verified Codex plugin installation. Check registration and component loading on the targeted Codex build.

Hook/agent/command parity across platforms must be validated separately. See [Platform support](#platform-support).

---

## Adding to an existing project

If the project is already in progress, copy with `cp -rn` (no-clobber) so your existing files survive:

```bash
cp -rn a-team/.claude a-team/.claude-plugin a-team/.codex-plugin a-team/.cursor-plugin a-team/.copilot-plugin a-team/.opencode a-team/skills a-team/hooks a-team/templates a-team/scripts a-team/assets ./
cp -n a-team/INIT_TEMPLATE.md ./INIT.md
```

> **Protect your settings.** If you already have `.claude/settings.json`, the install must not overwrite it. Merge the A Team permissions and hooks into your existing file by hand so your current configuration is preserved.

When filling out `INIT.md` for an existing project, describe **what already exists** — languages, frameworks, current test coverage, known technical debt. The orchestrator uses this to prune irrelevant agents, and accuracy matters more here than on a greenfield project.

---

## Post-install preparation

Installing only places the files. These steps make the team operational.

### 1. Fill out `INIT.md`

Tick the boxes for:

- Primary languages (Go, Python, Kotlin, Swift, etc.) — controls which language reviewers survive pruning
- Tech stack (database, infra, CI/CD) — controls reviewers like the database and infra agents
- Compliance scope (GDPR, PCI-DSS, etc.) — configures the compliance reviewer
- Which AI platforms are active

### 2. Initialize the team

```text
/orchestrate init
```

The orchestrator reads `INIT.md`, prunes agents and skills outside your declared scope, and generates:

- `.agent-sync/TEAM.md` — the permanent record of the active roster (and why each agent was kept)
- `.agent-sync/ROUTING.md` — the task routing table plus an empty file-claims table

### 3. Review the pruned roster

Open `.agent-sync/TEAM.md` and confirm nothing you need was removed. **Restore any agent that was incorrectly pruned** before doing real work — this is the single most common post-install gap.

### 4. Start the first session

```text
/orchestrate morning
```

Running `morning` first lets the orchestrator read repo state before anything is touched. From then on, the session-start hook injects the rules automatically every session — no per-session setup.

---

## Platform support

A Team can run on one CLI or several at once. All platforms share the same agent definitions and the `.agent-sync/` state directory, but their enforcement capabilities differ.

| Platform        | Agents | Skills | Rules | Hooks                 | Slash commands |
| --------------- | ------ | ------ | ----- | --------------------- | -------------- |
| **Claude Code** | ✅     | ✅     | ✅    | full (SessionStart + PostToolUse) | ✅ |
| **Codex CLI**   | ✅     | ✅     | ✅    | session-start only    | —              |
| **Cursor**      | ✅     | ✅     | ✅    | session-start only    | —              |
| **OpenCode**    | —      | ✅     | —     | —                     | command aliases |
| **GitHub Copilot** | via plugin | ✅ | — | full (SessionStart + PreToolUse + PostToolUse + SessionEnd) | — |

Key consequences:

- **Claude Code is the reference platform.** It has the full hook system, native sub-agent dispatch, and all slash commands.
- **Hooks do not propagate across platforms.** Each plugin manifest configures its own hooks independently: `.codex-plugin/` and `.cursor-plugin/` wire up a session-start hook only, while `.copilot-plugin/` configures the full set (SessionStart, PreToolUse, PostToolUse, SessionEnd). On Codex and Cursor, mid-session enforcement therefore relies on the agents' own rules rather than hooks.
- **File presence is not plugin activation** — follow [platform plugin activation](#platform-plugin-activation), and test command discovery, hooks, and agent loading in each CLI.
- **On Cursor and OpenCode, slash commands aren't available** — invoke the corresponding skill directly instead.

> The exact agent and skill counts and the full platform matrix evolve between releases. Treat [`AGENTS.md`](../AGENTS.md), [`skills/`](../skills/), and the plugin manifests as the source of truth; this table is a guide to the *shape* of each platform's support.
