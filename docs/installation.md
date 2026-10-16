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

All methods copy the same directory distribution and, if missing, add the root `AGENTS.md`, `CLAUDE.md`, `plugin.json`, and `INIT.md`. Existing project instructions are not overwritten.  `.claude/`, `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.copilot-plugin/`, `.opencode/`, `skills/`, `hooks/`, `templates/`, `scripts/` and `assets/`. **File presence is not plugin activation.** Follow [platform activation](#platform-plugin-activation) for non-native integrations.

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
cp -n a-team/AGENTS.md a-team/CLAUDE.md a-team/plugin.json your-project/
cp -n a-team/INIT_TEMPLATE.md your-project/INIT.md
rm -rf a-team
```

### Option C — Git, no GitHub CLI (sparse clone)

```bash
git clone --filter=blob:none --sparse --depth 1 \
  https://github.com/RBraga01/a-team.git
cd a-team
git sparse-checkout set .claude .claude-plugin .codex-plugin .cursor-plugin .copilot-plugin .opencode skills hooks templates scripts assets
cp -r .claude .claude-plugin .codex-plugin .cursor-plugin .copilot-plugin .opencode skills hooks templates scripts assets ../your-project/
cp -n AGENTS.md CLAUDE.md plugin.json ../your-project/
cp -n INIT_TEMPLATE.md ../your-project/INIT.md
cd .. && rm -rf a-team
```

**Windows (PowerShell equivalent):**

```powershell
git clone --filter=blob:none --sparse --depth 1 `
  https://github.com/RBraga01/a-team.git
cd a-team
git sparse-checkout set .claude .claude-plugin .codex-plugin .cursor-plugin .copilot-plugin .opencode skills hooks templates scripts assets
Copy-Item -Recurse .claude,.claude-plugin,.codex-plugin,.cursor-plugin,.copilot-plugin,.opencode,skills,hooks,templates,scripts,assets ..\your-project\
foreach ($f in 'AGENTS.md','CLAUDE.md','plugin.json','INIT_TEMPLATE.md') {
  $target = if ($f -eq 'INIT_TEMPLATE.md') { 'INIT.md' } else { $f }
  if (-not (Test-Path "..\\your-project\\$target")) { Copy-Item $f "..\\your-project\\$target" }
}
cd .. ; Remove-Item a-team -Recurse -Force
```

### Option D — Download ZIP (no git)

1. Go to the [repository](https://github.com/RBraga01/a-team).
2. **Code → Download ZIP**.
3. Extract and copy all eleven directories named under [Install methods](#install-methods) into your project root.
4. Copy root `AGENTS.md`, `CLAUDE.md` and `plugin.json` if absent, otherwise merge your existing instructions manually. Copy `INIT_TEMPLATE.md` as `INIT.md` if absent.

### Platform plugin activation

The installers include all integration manifests and OpenCode commands. **A copied manifest is not proof that its host CLI registered or loaded the plugin.**

- **Claude Code:** the project `.claude/` settings, hooks and commands are available after trusting the workspace.
- **OpenCode:** `.opencode/commands/` is the project-level custom-command directory.
- **GitHub Copilot CLI:** separately run `copilot plugin install RBraga01/a-team:.copilot-plugin`; inspect `copilot plugin list`. End-to-end loading of referenced components still needs a real Copilot CLI test.
- **Cursor:** install via **Customize → Plugins** or test through Cursor's local plugin directory; copying `.cursor-plugin/` into a project alone does not register a plugin.
- **Codex:** portable `plugin.json` at the package root is the primary identity, with `.codex-plugin/plugin.json` as a compatibility overlay. Skills load from `skills/`; hooks use `hooks/hooks.json` but must be trusted in Codex. Codex plugin installation and real hook execution still need host verification.

Hook/agent/command parity across platforms must be validated separately. See [Platform support](#platform-support).

---

## Adding to an existing project

If the project is already in progress, copy with `cp -rn` (no-clobber) so your existing files survive:

```bash
cp -rn a-team/.claude a-team/.claude-plugin a-team/.codex-plugin a-team/.cursor-plugin a-team/.copilot-plugin a-team/.opencode a-team/skills a-team/hooks a-team/templates a-team/scripts a-team/assets ./
cp -n a-team/AGENTS.md a-team/CLAUDE.md a-team/plugin.json ./
cp -n a-team/INIT_TEMPLATE.md ./INIT.md
```

> **Protect your settings.** Both script installers merge missing files into existing folders without replacing existing files. If you already have `AGENTS.md`, `CLAUDE.md`, or `.claude/settings.json`, they are kept intact; merge relevant A Team instructions, permissions and hooks manually. Merge the A Team permissions and hooks into your existing file by hand so your current configuration is preserved.

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

The table describes **what A Team currently declares or distributes**, not what has been proven in a real session. Automatic activation and enforcement can differ considerably by host.

| Platform | Specialist agents | Skills | Rules | Hook configuration | Commands |
|---|---|---|---|---|---|
| Claude Code | Project `.claude/agents/` | `skills/` | `.claude/rules/` | Project `settings.json` | Project slash commands |
| Codex CLI | No native agent profiles declared | root `skills/` (portable manifest) | Project `AGENTS.md` | `hooks/hooks.json` declared; user trust needed | Not packaged |
| Cursor | `.claude/agents/` declared | `skills/` declared | `.claude/rules/` declared | `sessionStart` declared | Not packaged |
| OpenCode | No A Team-native agent files | Host-discovered/manual | Not declared | Not declared | `.opencode/commands/` |
| GitHub Copilot CLI | Sibling directory path* | Sibling directory path* | Not declared | Four events declared* | Not packaged |

*GitHub Copilot CLI's legacy manifest lives inside `.copilot-plugin/`. Its `../` paths to sibling directories may not survive installation of that subdirectory as an isolated plugin; **real end-to-end validation is outstanding**.*

Claude Code remains the reference platform. The current Codex and Cursor manifests have structurally valid package-root paths; they still require actual CLI registration. OpenCode supplies project command aliases rather than A Team-native agent/hook definitions. A copied file is not equivalent to an activated plugin. For details see [Platform plugin activation](#platform-plugin-activation).
