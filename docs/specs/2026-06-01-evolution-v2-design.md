# A Team Evolution v2 — Design Spec

**Date:** 2026-06-01
**Branch:** `feat/evolution-v2`
**Status:** Awaiting implementation approval
**Test bed:** KidOs (primary), Cody + TIO (secondary, after KidOs validates)

---

## Problem Statement

The A Team has solid quality infrastructure but three real gaps:

1. **Onboarding barrier** — INIT_TEMPLATE.md requires technical knowledge. Non-technical users abandon it or fill it incorrectly, producing a misconfigured team.
2. **No measurement** — no way to know if a change improves or degrades efficiency. Every improvement is currently based on intuition.
3. **No visual confirmation** — users working in IDEs have no persistent signal that the A Team is active and healthy.

---

## Scope

Three deliveries in one branch, in this order:

| # | Delivery | Why this order |
|---|----------|---------------|
| 1 | Metrics layer | Establishes baseline before anything changes |
| 2 | Smart Init | Removes the onboarding barrier |
| 3 | Status line | Visual confirmation across all platforms |

**Out of scope for this branch:**
- VS Code extension (separate project, separate branch)
- New agents or language packs (next iteration)
- Token consumption tracking (revisit after baseline data exists)

**Merge gate:** tested on KidOs in real conditions before merging to `main`.

---

## Compatibility Contract

| Project type | Guarantee |
|-------------|-----------|
| No A Team installed | All hooks fail silently with `|| true`. Zero errors. Zero impact. |
| New project | Smart Init activates on first `/orchestrate init`. Clean experience. |
| Existing A Team (current version) | INIT.md respected. No overwrites. All changes additive. |
| Existing A Team (older version) | README documents the exact entries to merge into settings.json. No migration scripts. |

**Golden rule:** if any new file or script does not exist, every reference fails silently.

---

## Delivery 1 — Metrics Layer

### Shared module: `metrics.py`

A single module imported by `watcher.py`, `metrics-report.py`, and any future consumer. No logic duplication.

```
.agent-sync/
  metrics.py          ← shared module (append_metric, read_events)
  metrics-report.py   ← CLI report tool (imports metrics.py)
  metrics/
    YYYY-MM-DD.log    ← runtime, not committed
```

### Storage format

`.agent-sync/metrics/YYYY-MM-DD.log` — append-only, one event per line:

```
2026-06-01T09:14:22 session_start
2026-06-01T09:14:25 watcher_start
2026-06-01T09:15:01 task_dispatch TASK-008 code-reviewer feat/persona-blink
2026-06-01T09:28:44 task_complete TASK-008 code-reviewer
2026-06-01T09:29:10 human_intervention TASK-010 unblocked_manually
2026-06-01T11:03:45 session_end
```

`metrics-report.py` aggregates lines at report time. No JSON, no corruption risk.

### File locking — cross-platform

`fcntl.flock` on POSIX. On Windows, small appends to a file are atomic at the OS level for writes under ~4KB (NTFS guarantee). For our single-line events this is sufficient — no locking library needed on Windows. If a line is ever lost under concurrent write, it is a missing data point, not corruption.

```python
import fcntl, sys

def append_metric(event: str):
    path = BASE / "metrics" / f"{date.today()}.log"
    path.parent.mkdir(parents=True, exist_ok=True)
    line = f"{datetime.now().isoformat(timespec='seconds')} {event}\n"
    with open(path, 'a', encoding='utf-8') as f:
        if sys.platform != 'win32':
            fcntl.flock(f, fcntl.LOCK_EX)
        f.write(line)
        if sys.platform != 'win32':
            fcntl.flock(f, fcntl.LOCK_UN)
```

### Events tracked

| Event | Triggered by | Notes |
|-------|-------------|-------|
| `session_start` | SessionStart hook | |
| `session_end` | Stop hook | Added to settings.json in this branch |
| `watcher_start` | watcher.py on startup | |
| `task_dispatch TASK-ID agent branch` | Orchestrator on task creation | |
| `task_complete TASK-ID agent` | Watcher after CLI returns exit 0 | |
| `task_failed TASK-ID agent` | Watcher on non-zero exit | |
| `human_intervention TASK-ID reason` | Orchestrator when user manually unblocks | Orchestrator writes this line explicitly |

> **Removed from earlier draft:** `agent_invoked` via PostToolUse — the hook fires on tool calls but does not expose agent identity. This event cannot be reliably implemented without changes to Claude Code internals. Removed to avoid false data.

### `metrics-report.py`

```
python .agent-sync/metrics-report.py [--days 7]
```

Output:
```
A Team — últimos 7 dias
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sessões:              12
Tarefas:              34 despachadas · 31 concluídas · 3 falhadas (91%)
Intervenções humanas: 6
Tempo médio por tarefa: 4m 12s
```

### Log rotation

Files older than 30 days are compressed to `.log.gz` when `metrics-report.py` runs. `queue/stale/` files older than 30 days are also deleted at that point. No background process.

---

## Delivery 2 — Smart Init

### Context: the natural workflow

The user's workflow before A Team is: **Idea → LLM conversation → ROADMAP.md → coding begins**. The ROADMAP contains what the A Team most needs — project identity, real users, non-negotiable constraints, current state, pending decisions. The old INIT_TEMPLATE.md ignored this and asked technical questions that duplicated what already existed.

Smart Init reads the ROADMAP first. Questions are only asked for what is missing.

### Where the logic lives

Smart Init is implemented as a modification to the **orchestrator agent** (`agents/orchestrator.md`), not a new skill. The orchestrator already owns the init flow. Users still run `/orchestrate init`.

A new file `skills/smart-init/SKILL.md` contains the ROADMAP extraction rules, interview script, and INIT.md generation template.

### Trigger and detection sequence

`/orchestrate init` checks in this order:

```
1. INIT.md exists?          → current flow unchanged (existing users unaffected)
2. ROADMAP.md exists?       → extract context, ask only what's missing (≤2 questions)
3. ROADMAP_*.md exists?     → same as above (e.g. ROADMAP_icd10.md)
4. None of the above?       → full 5-question interview
```

### Path A — ROADMAP exists (most common for the user's projects)

The orchestrator reads the ROADMAP and extracts:

| Extracted from ROADMAP | Maps to INIT.md field |
|------------------------|----------------------|
| Project name / description | Project overview |
| Stack table or mentioned technologies | Languages & stack |
| Non-negotiable principles | Immutable rules section |
| "Próximo" / next items | Active work context |
| Compliance mentions (GDPR, local-first, etc.) | Compliance scope |
| Current state (Feito / Done) | Existing coverage baseline |

After extraction, the orchestrator asks **only**:
1. "Que ferramentas de IA estás a usar?" (cannot be inferred from ROADMAP)

Then generates INIT.md and shows the review summary.

### Path B — No ROADMAP, project has existing code

Stack inference runs silently (`git ls-files`), then 5-question interview. After approval, the orchestrator **also offers** to create a ROADMAP.md template pre-filled from the interview answers — so the user has one for future sessions.

### Path C — No ROADMAP, new project (nothing exists)

Full 5-question interview. Same ROADMAP offer at the end.

### Interview flow (Paths B and C)

Five questions, one at a time. Non-technical language throughout.

```
Orchestrator: "O que queres construir? Descreve com as tuas palavras."
User: [free text]

Orchestrator: "Já existe código ou começas do zero?"
→ A) Começo do zero
→ B) Já existe código
→ C) Não tenho a certeza

[If B: run stack inference silently before next question]

Orchestrator: "Que tipo de projecto é?"
→ A) App web (abre no browser)
→ B) App móvel (iPhone ou Android)
→ C) API ou serviço de backend
→ D) Análise de dados ou automação
→ E) Outro

Orchestrator: "Em que dispositivo ou plataforma deve correr?"
→ A) Browser (qualquer dispositivo)
→ B) iPhone / iPad
→ C) Android
→ D) Desktop (Windows / Mac / Linux)
→ E) Servidor / cloud

Orchestrator: "Que ferramentas de IA estás a usar para escrever código?"
→ A) Claude Code
→ B) Codex CLI
→ C) Cursor
→ D) OpenCode
→ E) Várias — escolho mais do que uma
```

### Stack inference (existing projects only)

Runs silently after the user answers B to question 2:

```bash
git ls-files | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10
```

Extension-to-stack map:
- `.kt` → Kotlin / Android
- `.swift` → Swift / iOS
- `.py` → Python
- `.ts` / `.tsx` → TypeScript / React
- `.go` → Go
- `.rs` → Rust
- `.dart` → Flutter
- `.java` → Java / Android

**Confidence threshold:** if one extension accounts for >40% of tracked files (lowered from 50% to handle mixed projects), pre-fill the answer and confirm. If ambiguous, ask normally. The review gate below catches any inference errors.

### Generated INIT.md

The orchestrator generates a complete INIT.md. The summary section at the top is in plain language:

```markdown
## O que entendi
Estás a construir uma app Android para crianças.
Stack inferida: Kotlin · Jetpack Compose.
Plataformas AI activas: Claude Code + Codex CLI.
Agentes activos após init: 11 de 25.

Se algo estiver errado, edita este ficheiro antes de continuar.

---

## Project Overview
**Name:** [from question 1 free text]
**Type:** Android mobile application
**Status:** Active development
...
[standard INIT.md fields pre-filled from interview answers]
```

The full INIT.md body follows the same structure as `INIT_TEMPLATE.md` so that existing tooling (pruning, routing) works without modification.

### Review gate

After generating INIT.md, the orchestrator displays the summary section and asks:
> "Está correcto? Falta alguma coisa?"

User says "ok" → `/orchestrate init` runs automatically.
User describes a correction → orchestrator updates INIT.md and shows the summary again.
Maximum 3 correction rounds before asking the user to edit the file manually.

### Codex trust prompt warning

Before closing the interview:
> "Última coisa: o Codex vai pedir para aprovares um script de segurança na próxima sessão. Clica em 'Trust' para continuar — é o script de estado da A Team."

---

## Delivery 3 — Status Line

### `current-task.json`

The orchestrator writes this file on every tick. Small, always current:

```json
{
  "task": "TASK-008",
  "agent": "code-reviewer",
  "started_at": "2026-06-01T09:14:22",
  "stale_after_minutes": 120
}
```

`stale_after_minutes` defaults to 120 but can be set per-task by the orchestrator for known long-running tasks (e.g., E2E suites). `status.py` reads this value instead of a hardcoded constant.

### `status.py`

Reads three files only. Always exits 0. Never blocks the session.

| File read | Purpose |
|-----------|---------|
| `.agent-sync/TEAM.md` | Count `^|` lines = active agents |
| `.agent-sync/current-task.json` | Current task + staleness check |
| `.agent-sync/watcher.pid` | Watcher alive check |

Output states:

| State | Display |
|-------|---------|
| Active, initialized | `⚡ A Team · 14 agentes` |
| Task running | `⚡ A Team · TASK-008 a correr` |
| Watcher active | `⚡ A Team · 14 agentes · ⟳` |
| Not initialized | `⚡ A Team · não iniciado — corre /orchestrate init` |
| No project configured | `⚡ A Team · sem projecto configurado` |
| Task stale | `⚡ A Team · tarefa pendente — verifica DAILY.md` |
| Python not found | `⚡ A Team · instala Python para ver o estado` |

### Platform integration

All platforms use the same invocation. Active by default via SessionStart hooks:

```bash
python .agent-sync/status.py 2>/dev/null || \
python3 .agent-sync/status.py 2>/dev/null || \
py .agent-sync/status.py 2>/dev/null || \
echo "⚡ A Team · instala Python para ver o estado"
```

| Platform | Mechanism | Config location |
|----------|-----------|----------------|
| Claude Code | `statusLine` in settings.json | `.claude/settings.json` |
| Codex CLI | SessionStart hook | `.codex-plugin/hooks/hooks.json` |
| Cursor | sessionStart hook | `.cursor-plugin/hooks/hooks-cursor.json` |
| OpenCode | session start command | `.opencode/commands/orchestrate.md` |

**Claude Code `statusLine` format:**
```json
"statusLine": {
  "command": "python .agent-sync/status.py 2>/dev/null || python3 .agent-sync/status.py 2>/dev/null || py .agent-sync/status.py 2>/dev/null || echo '⚡ A Team'"
}
```

---

## Failure Modes and Mitigations

| # | Failure | Mitigation |
|---|---------|-----------|
| 1 | PID reused by another process | Check process name via psutil; fallback to `os.kill(pid, 0)` if psutil absent |
| 2 | Smart Init infers wrong stack | 40% threshold + mandatory review gate; max 3 correction rounds |
| 3 | Stale tasks in queue on watcher restart | Move all `queue/*.json` to `queue/stale/` on startup; log count; delete files >30 days via metrics-report.py |
| 4 | Concurrent metrics writes | POSIX: fcntl.flock. Windows: rely on NTFS atomic append for small writes (<4KB) |
| 5 | `current-task.json` stale after crash | `stale_after_minutes` field; configurable per-task by orchestrator |
| 6 | Python not in PATH | Chain: python → python3 → py → echo fallback |
| 7 | Codex trust prompt blocks non-technical users | Warning shown at end of Smart Init interview |
| 8 | `git ls-files` returns nothing on new project | Stack inference only runs for answer B ("already exists"); skipped for new projects |

---

## Files Created / Modified

### New files
```
.agent-sync/metrics.py              ← shared metrics module
.agent-sync/metrics-report.py       ← CLI report tool
.agent-sync/status.py               ← status line script
.agent-sync/current-task.json       ← runtime, not committed
.agent-sync/metrics/                ← runtime, not committed
.agent-sync/queue/stale/            ← runtime, not committed
skills/smart-init/SKILL.md          ← interview script + INIT.md template
```

### Modified files
```
.claude/agents/orchestrator.md      ← add Smart Init interview logic
.claude/settings.json               ← add statusLine + Stop hook for session_end
.codex-plugin/hooks/hooks.json      ← add status.py to SessionStart
.cursor-plugin/hooks/hooks-cursor.json ← add status.py to sessionStart
.opencode/commands/orchestrate.md   ← add status output
hooks/session-start.md              ← add session_start metric event
```

### `.gitignore` additions
```
.agent-sync/metrics/
.agent-sync/current-task.json
.agent-sync/queue/stale/
.agent-sync/watcher.pid
.agent-sync/watcher.log
```

> **Note:** if `watcher.log` was previously committed, run `git rm --cached .agent-sync/watcher.log` before committing the `.gitignore` change.

### settings.json entries for existing users

Users on the current A Team version add these three entries manually:

```json
"statusLine": {
  "command": "python .agent-sync/status.py 2>/dev/null || python3 .agent-sync/status.py 2>/dev/null || py .agent-sync/status.py 2>/dev/null || echo '⚡ A Team'"
},
```

```json
{ "type": "command", "command": "python .agent-sync/watcher.py &" }
```
(add to the existing `SessionStart` hooks array)

```json
"Stop": [{ "hooks": [{ "type": "command", "command": "python .agent-sync/metrics.py session_end 2>/dev/null || true" }] }]
```
(new top-level entry in `hooks`)

---

## Success Criteria

Ready to merge when, tested on KidOs:

- [ ] Non-developer runs `/orchestrate init` and gets correct INIT.md without reading documentation
- [ ] `metrics-report.py --days 7` produces a valid report after one week of use
- [ ] Status line shows correct state in Claude Code, Codex CLI, and Cursor
- [ ] Existing KidOs session unaffected after installing new files
- [ ] All 8 failure modes tested explicitly
- [ ] `backup kidos` used to restore if anything breaks during testing
- [ ] `git rm --cached` applied to any previously-committed runtime files

---

## What This Does Not Change

- Agent roster and skills — unchanged
- Orchestrator daily cycle — unchanged
- DAILY.md format — unchanged
- File Lock Protocol — unchanged
- Any existing INIT.md — respected, never overwritten
- `orchestration.md` rule "If INIT.md does not exist: instruct user to fill INIT_TEMPLATE.md" — updated to reflect Smart Init replaces this instruction
