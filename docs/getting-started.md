# Getting Started

This guide takes you from nothing to a running, self-enforcing agent team in about ten minutes. For the full list of install methods and prerequisites, see [Installation](./installation.md).

## What A Team is

A Team is a drop-in folder of configuration that turns a single AI coding assistant into a structured engineering team. Instead of one general-purpose model doing everything, you get specialist agents (each with a defined scope, model tier, and tool set), a lead **orchestrator** that plans and dispatches work, a library of workflow **skills** that gate what can happen and when, and **enforcement hooks** plus a **pipeline auditor** that verify required checks actually ran rather than trusting an agent's word for it.

The infrastructure is **stateless by design**: every agent derives its context from files, not memory, so a session can be interrupted and resumed without drift.

It runs on Claude Code (the primary platform), and also Codex CLI, Cursor, OpenCode, and GitHub Copilot. Capabilities differ per platform — see the platform notes in [Installation](./installation.md#platform-support).

## The mental model

```
INIT.md            you declare your stack and scope (once)
   │
   ▼
/orchestrate init  orchestrator prunes irrelevant agents, writes the active roster
   │
   ▼
/orchestrate morning   plans up to 3 tasks, waits for your approval, then dispatches
   │
   ▼
work happens       agents run skills; hooks + auditor enforce the rules
```

Three files hold the state the orchestrator reads back each session:

- `INIT.md` — your project's scope declaration (you fill this out)
- `.agent-sync/TEAM.md` — the active agent roster after pruning
- `.agent-sync/ROUTING.md` — task→agent routing table and the file-claims lock table

## Three steps to running

### 1. Install

Use the one-liner from the project root (full options in [Installation](./installation.md)):

```bash
# Mac / Linux / WSL
bash <(curl -fsSL https://raw.githubusercontent.com/RBraga01/a-team/main/install.sh)
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/RBraga01/a-team/main/install.ps1 | iex
```

### 2. Declare your project

Open `INIT.md` and tick the boxes for your primary languages, tech stack, compliance scope, and which AI platforms you'll use. This takes about five minutes and controls which agents survive pruning. On an existing codebase, describe what already exists — languages, frameworks, current test coverage, known tech debt — because accuracy here drives the pruning decisions.

### 3. Initialize and start

```text
/orchestrate init
```

This reads `INIT.md`, removes agents and skills that don't apply, and generates `TEAM.md` and `ROUTING.md`. **Review `.agent-sync/TEAM.md` before doing any work** and restore anything that was pruned by mistake.

Then either start working directly — the session-start hook injects the rules automatically — or kick off the managed daily cycle:

```text
/orchestrate morning
```

## What happens automatically each session

- The **SessionStart hook** injects the mandatory trigger map (`skills/using-a-team/SKILL.md`) into context before any work begins.
- On Claude Code and GitHub Copilot CLI, a **PostToolUse hook** fires after every file write or edit, reminding the agent to run a code review before committing and to verify before claiming a task is done.

You don't re-run setup per session — the state files and hooks carry it.

## Where to go next

- Full prerequisites and every install method → [Installation](./installation.md)
- What each command does → [Command Reference](./commands.md)
- Something not working → [Troubleshooting](./troubleshooting.md)
