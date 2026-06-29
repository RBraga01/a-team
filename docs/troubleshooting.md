# Troubleshooting

Common problems and how to resolve them. Each entry below is derived from A Team's documented behavior; the symptoms map to specific mechanisms in the system.

<!-- Maintainer note: this page is a starting set based on how the system is documented to work.
     Fold in issues reported by real users over time so it becomes the first place people look. -->

---

## Installation

### The one-liner fails (curl/PowerShell error or permission denied)

The install script may be blocked by your shell, a proxy, or execution policy.

- Re-run from the project directory you actually want to install into.
- If it still fails, fall back to a method that doesn't pipe a remote script: use the **GitHub CLI**, **sparse git clone**, or **ZIP download** in [Installation](./installation.md#install-methods).

### Installing overwrote my `.claude/settings.json`

A Team ships its own `settings.json` with permissions and hooks. On a project that already had one, an overwriting copy replaces your configuration.

- Restore your file from version control (`git checkout .claude/settings.json`).
- Re-apply A Team's permissions and hooks by **merging** them into your existing file by hand rather than copying over it.
- To avoid this on existing projects, install with `cp -rn` (no-clobber) as shown in [Adding to an existing project](./installation.md#adding-to-an-existing-project).

---

## Initialization

### An agent I need was removed

Pruning during `/orchestrate init` deletes agents and skills outside the scope declared in `INIT.md`. If your `INIT.md` understated your stack, useful agents get pruned.

- Open `.agent-sync/TEAM.md` to see what was kept and why.
- Restore the missing agent (re-add its `.claude/agents/<name>.md`, then add it back to `TEAM.md` and `ROUTING.md`).
- Correct the relevant section of `INIT.md` so a future re-init keeps it.

### `/orchestrate` says it can't find state

The orchestrator is stateless and reads everything from files. If `TEAM.md` or `ROUTING.md` is missing, init hasn't run (or didn't complete).

- Confirm `INIT.md` exists and is filled out.
- Run `/orchestrate init` and check that `.agent-sync/TEAM.md` and `.agent-sync/ROUTING.md` are generated.

---

## Sessions and enforcement

### The session-start rules aren't being injected

The SessionStart hook is what loads the mandatory trigger map at the beginning of a session. If it isn't firing:

- Confirm the hook is present in `.claude/settings.json` (Claude Code) or in the relevant plugin manifest for your platform.
- Remember that **hooks do not propagate across platforms** — each of `.codex-plugin/`, `.cursor-plugin/`, and `.copilot-plugin/` configures its own session-start hook independently.

### No post-edit reminders after writing files

The PostToolUse reminder (review before commit, verify before "done") fires on **Claude Code** and **GitHub Copilot CLI** — both manifests configure a `PostToolUse` (Write|Edit) hook.

- On **Codex CLI, Cursor, or OpenCode** this mid-session hook isn't configured; enforcement there relies on the agents' own rules. Lean on `/code-review` and `/quality-gate` explicitly instead.

### Slash commands don't work on my platform

Slash commands are native to Claude Code and exist as aliases on OpenCode.

- On **Cursor** and **Codex CLI**, invoke the corresponding **skill** directly rather than a slash command. See the platform notes in [Command Reference](./commands.md).

---

## Merges and the pipeline auditor

### A branch won't finish — `BLOCK MERGE` in `AUDIT.md`

The `harness-optimizer` auditor blocks a merge when it can't verify that required checks actually ran. It writes its verdict to `.agent-sync/AUDIT.md`. Common causes:

- **verification evasion** — no real test or build command (`npm test`, `pytest`, `go test ./...`, etc.) appears in history after the last code change for a task.
- **missing code review** — a task modified source files but has no `code-reviewer` result in `.agent-sync/results/`.

**Fix:** re-run the actual verification and review for the failing tasks, then re-run the quality gate. The auditor checks history, so genuinely running the checks (not just asserting them) is what clears the block.

### A file shows as locked but nothing is running ("stale claim")

The file-claims table in `ROUTING.md` tracks which agent is editing which source file. A row left `in-progress` for a task already marked done is a stale claim and will block other agents.

- Release the stale rows for the completed task in `ROUTING.md`.

### Two parallel agents collided on the same file anyway

The lock relies on paths being normalized to the **git repository root**. Each parallel agent runs in its own worktree, so the same file has a different absolute path in each. If a path was written worktree-local or absolute, the lock is invisible to other agents.

- Ensure file-claim paths are stored relative to the repo root. The documented normalization is:

  ```bash
  REPO_ROOT=$(git worktree list --porcelain | awk 'NR==1 {print $2}')
  RELATIVE=$(realpath --relative-to="$REPO_ROOT" "$ABSOLUTE_PATH")
  ```

---

## Multi-CLI setups

### State looks inconsistent across CLIs

All CLIs share `.agent-sync/` (`DAILY.md`, `ROUTING.md`, `TEAM.md`, `results/`), so orchestrator state and file claims are visible regardless of which CLI triggered them. What is **not** shared is hooks.

- If enforcement behaves differently on one CLI, check that its plugin manifest configures `onSessionStart` — hooks are per-platform, not global.

---

## Still stuck?

- Re-read the relevant section of [Installation](./installation.md) or [Command Reference](./commands.md).
- Open a GitHub Issue with: which agent or skill is affected, what you expected vs. what happened, which AI platform you're on, and a session transcript excerpt if you can share one (per [`CONTRIBUTING.md`](../CONTRIBUTING.md)).
- For security vulnerabilities, use GitHub's private vulnerability reporting rather than a public issue.
