---
render_with_liquid: false
---

# A Team Evolution v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add metrics collection, conversational Smart Init, and a cross-platform status line to A Team without breaking any existing project.

**Architecture:** Three independent deliveries on branch `feat/evolution-v2`. Delivery 1 (metrics) must be merged before Delivery 2 (Smart Init) adds events. Delivery 3 (status) is fully independent but shares `current-task.json` with the orchestrator. All Python scripts accept a `base_dir` parameter for testability — no `Path(__file__).parent` magic in tested code paths.

**Tech Stack:** Python 3.8+ standard library only (no new dependencies). pytest for tests. Markdown for skill/agent files.

---

## File Map

### Created
```
.agent-sync/metrics.py              ← shared module: append_metric(), read_events()
.agent-sync/metrics-report.py       ← CLI: parse events, print report, rotate logs
.agent-sync/status.py               ← reads TEAM.md + current-task.json + watcher.pid
skills/smart-init/SKILL.md          ← interview script + INIT.md generation template
tests/test_metrics.py
tests/test_status.py
```

### Modified
```
.claude/agents/orchestrator.md      ← add ROADMAP detection + Smart Init trigger
.claude/settings.json               ← add statusLine.command + Stop hook
.codex-plugin/hooks/hooks.json      ← add status.py to SessionStart
.cursor-plugin/hooks/hooks-cursor.json ← add status.py to sessionStart
.opencode/commands/orchestrate.md   ← prepend status output
hooks/session-start.md              ← append_metric("session_start") call
.gitignore                          ← add runtime files
```

---

## Task 0: Branch Setup

**Files:** none

- [ ] **Step 1: Create and push branch**

```bash
cd "e:/Projectos/A Team"
git checkout -b feat/evolution-v2
git push -u origin feat/evolution-v2
```

Expected: `Branch 'feat/evolution-v2' set up to track remote branch`

- [ ] **Step 2: Verify clean state**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

---

## Task 1: metrics.py — Core Module

**Files:**
- Create: `.agent-sync/metrics.py`
- Create: `tests/test_metrics.py`

### Why `base_dir` parameter

All functions accept an optional `base_dir: Path = None`. When `None`, defaults to `Path(__file__).parent`. Tests pass `tmp_path` directly — no import patching needed.

- [ ] **Step 1: Create the test file**

```python
# tests/test_metrics.py
import os
import sys
from datetime import date, timedelta
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / ".agent-sync"))
import metrics as m


def test_append_creates_log_file(tmp_path):
    m.append_metric("session_start", base_dir=tmp_path)
    log = tmp_path / "metrics" / f"{date.today()}.log"
    assert log.exists()


def test_append_writes_event_text(tmp_path):
    m.append_metric("task_dispatch TASK-001 code-reviewer main", base_dir=tmp_path)
    log = tmp_path / "metrics" / f"{date.today()}.log"
    assert "task_dispatch TASK-001 code-reviewer main" in log.read_text()


def test_append_includes_iso_timestamp(tmp_path):
    m.append_metric("session_start", base_dir=tmp_path)
    log = tmp_path / "metrics" / f"{date.today()}.log"
    first_line = log.read_text().splitlines()[0]
    assert "T" in first_line  # ISO datetime contains T separator
    assert str(date.today()) in first_line


def test_append_multiple_events_are_separate_lines(tmp_path):
    m.append_metric("session_start", base_dir=tmp_path)
    m.append_metric("task_dispatch TASK-001 agent branch", base_dir=tmp_path)
    m.append_metric("task_complete TASK-001 agent", base_dir=tmp_path)
    log = tmp_path / "metrics" / f"{date.today()}.log"
    lines = [l for l in log.read_text().splitlines() if l.strip()]
    assert len(lines) == 3


def test_read_events_empty_when_no_logs(tmp_path):
    assert m.read_events(7, base_dir=tmp_path) == []


def test_read_events_returns_todays_events(tmp_path):
    m.append_metric("session_start", base_dir=tmp_path)
    m.append_metric("task_complete TASK-001 agent", base_dir=tmp_path)
    events = m.read_events(1, base_dir=tmp_path)
    assert len(events) == 2
    assert any("session_start" in e for e in events)
    assert any("task_complete" in e for e in events)


def test_read_events_ignores_future_days(tmp_path):
    m.append_metric("session_start", base_dir=tmp_path)
    events = m.read_events(0, base_dir=tmp_path)  # 0 days = nothing
    assert events == []


def test_append_creates_metrics_dir_if_missing(tmp_path):
    assert not (tmp_path / "metrics").exists()
    m.append_metric("session_start", base_dir=tmp_path)
    assert (tmp_path / "metrics").exists()
```

- [ ] **Step 2: Run tests — verify they all FAIL**

```bash
cd "e:/Projectos/A Team"
python -m pytest tests/test_metrics.py -v 2>&1 | head -30
```

Expected: `ModuleNotFoundError: No module named 'metrics'` or similar import error

- [ ] **Step 3: Create `.agent-sync/metrics.py`**

```python
# .agent-sync/metrics.py
"""
Shared metrics module for A Team.
Append-only log: .agent-sync/metrics/YYYY-MM-DD.log
One event per line: ISO-timestamp EVENT_TYPE [args...]
"""
import sys
from datetime import date, datetime, timedelta
from pathlib import Path


def _metrics_dir(base_dir: Path) -> Path:
    return base_dir / "metrics"


def append_metric(event: str, base_dir: Path = None) -> None:
    """Append a metric event to today's log file."""
    if base_dir is None:
        base_dir = Path(__file__).parent
    metrics_dir = _metrics_dir(base_dir)
    metrics_dir.mkdir(parents=True, exist_ok=True)
    log_file = metrics_dir / f"{date.today()}.log"
    line = f"{datetime.now().isoformat(timespec='seconds')} {event}\n"
    with open(log_file, "a", encoding="utf-8") as f:
        if sys.platform != "win32":
            import fcntl
            fcntl.flock(f, fcntl.LOCK_EX)
            f.write(line)
            fcntl.flock(f, fcntl.LOCK_UN)
        else:
            # NTFS atomic append is safe for writes < 4KB (our lines are <200 bytes)
            f.write(line)


def read_events(days: int, base_dir: Path = None) -> list:
    """Read all events from the last N days. Returns list of raw log lines."""
    if base_dir is None:
        base_dir = Path(__file__).parent
    metrics_dir = _metrics_dir(base_dir)
    events = []
    for i in range(days):
        d = date.today() - timedelta(days=i)
        log_file = metrics_dir / f"{d}.log"
        if log_file.exists():
            with open(log_file, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        events.append(line)
    return events


if __name__ == "__main__":
    # Called directly from hooks: python metrics.py session_start
    if len(sys.argv) > 1:
        append_metric(" ".join(sys.argv[1:]))
```

- [ ] **Step 4: Run tests — verify they all PASS**

```bash
python -m pytest tests/test_metrics.py -v
```

Expected:
```
tests/test_metrics.py::test_append_creates_log_file PASSED
tests/test_metrics.py::test_append_writes_event_text PASSED
tests/test_metrics.py::test_append_includes_iso_timestamp PASSED
tests/test_metrics.py::test_append_multiple_events_are_separate_lines PASSED
tests/test_metrics.py::test_read_events_empty_when_no_logs PASSED
tests/test_metrics.py::test_read_events_returns_todays_events PASSED
tests/test_metrics.py::test_read_events_ignores_future_days PASSED
tests/test_metrics.py::test_append_creates_metrics_dir_if_missing PASSED
8 passed
```

- [ ] **Step 5: Commit**

```bash
git add .agent-sync/metrics.py tests/test_metrics.py
git commit -m "feat: add metrics.py shared module with append_metric and read_events"
```

---

## Task 2: metrics-report.py — CLI Report Tool

**Files:**
- Create: `.agent-sync/metrics-report.py`
- Modify: `tests/test_metrics.py` (append report tests)

- [ ] **Step 1: Append report tests to `tests/test_metrics.py`**

```python
# Append to bottom of tests/test_metrics.py

sys.path.insert(0, str(Path(__file__).parent.parent / ".agent-sync"))
import metrics_report as mr


def test_parse_events_counts_sessions(tmp_path):
    m.append_metric("session_start", base_dir=tmp_path)
    m.append_metric("session_start", base_dir=tmp_path)
    stats = mr.parse_events(days=1, base_dir=tmp_path)
    assert stats["sessions"] == 2


def test_parse_events_counts_tasks(tmp_path):
    m.append_metric("task_dispatch TASK-001 code-reviewer main", base_dir=tmp_path)
    m.append_metric("task_dispatch TASK-002 debugger main", base_dir=tmp_path)
    m.append_metric("task_complete TASK-001 code-reviewer", base_dir=tmp_path)
    m.append_metric("task_failed TASK-002 debugger", base_dir=tmp_path)
    stats = mr.parse_events(days=1, base_dir=tmp_path)
    assert stats["dispatched"] == 2
    assert stats["complete"] == 1
    assert stats["failed"] == 1


def test_parse_events_counts_interventions(tmp_path):
    m.append_metric("human_intervention TASK-003 unblocked_manually", base_dir=tmp_path)
    stats = mr.parse_events(days=1, base_dir=tmp_path)
    assert stats["interventions"] == 1


def test_parse_events_calculates_success_rate(tmp_path):
    m.append_metric("task_dispatch TASK-001 agent main", base_dir=tmp_path)
    m.append_metric("task_dispatch TASK-002 agent main", base_dir=tmp_path)
    m.append_metric("task_dispatch TASK-003 agent main", base_dir=tmp_path)
    m.append_metric("task_complete TASK-001 agent", base_dir=tmp_path)
    m.append_metric("task_complete TASK-002 agent", base_dir=tmp_path)
    m.append_metric("task_failed TASK-003 agent", base_dir=tmp_path)
    stats = mr.parse_events(days=1, base_dir=tmp_path)
    assert stats["success_rate"] == 66


def test_parse_events_empty_logs(tmp_path):
    stats = mr.parse_events(days=7, base_dir=tmp_path)
    assert stats["sessions"] == 0
    assert stats["dispatched"] == 0
    assert stats["success_rate"] == 0


def test_rotate_logs_compresses_old_files(tmp_path):
    from datetime import date, timedelta
    old_date = date.today() - timedelta(days=31)
    old_log = tmp_path / "metrics" / f"{old_date}.log"
    old_log.parent.mkdir(parents=True, exist_ok=True)
    old_log.write_text("2026-01-01T09:00:00 session_start\n")
    mr.rotate_logs(base_dir=tmp_path)
    assert not old_log.exists()
    assert (tmp_path / "metrics" / f"{old_date}.log.gz").exists()


def test_rotate_logs_keeps_recent_files(tmp_path):
    from datetime import date
    today_log = tmp_path / "metrics" / f"{date.today()}.log"
    today_log.parent.mkdir(parents=True, exist_ok=True)
    today_log.write_text("2026-06-01T09:00:00 session_start\n")
    mr.rotate_logs(base_dir=tmp_path)
    assert today_log.exists()
```

- [ ] **Step 2: Run new tests — verify they FAIL**

```bash
python -m pytest tests/test_metrics.py -v -k "parse or rotate" 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'metrics_report'`

- [ ] **Step 3: Create `.agent-sync/metrics-report.py`**

```python
# .agent-sync/metrics-report.py
"""
A Team metrics report CLI.
Usage: python metrics-report.py [--days 7]
"""
import argparse
import gzip
import shutil
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from metrics import read_events


def parse_events(days: int, base_dir: Path = None) -> dict:
    """Parse log events and return summary statistics."""
    if base_dir is None:
        base_dir = Path(__file__).parent
    events = read_events(days, base_dir=base_dir)

    sessions = 0
    dispatched = 0
    complete = 0
    failed = 0
    interventions = 0
    active_tasks: dict = {}
    task_durations: list = []

    for line in events:
        parts = line.split(" ", 2)
        if len(parts) < 2:
            continue
        ts, event_type = parts[0], parts[1]
        rest = parts[2] if len(parts) > 2 else ""

        if event_type == "session_start":
            sessions += 1
        elif event_type == "task_dispatch":
            dispatched += 1
            task_id = rest.split()[0] if rest else ""
            if task_id:
                active_tasks[task_id] = ts
        elif event_type == "task_complete":
            complete += 1
            task_id = rest.split()[0] if rest else ""
            if task_id and task_id in active_tasks:
                try:
                    start = datetime.fromisoformat(active_tasks.pop(task_id))
                    end = datetime.fromisoformat(ts)
                    task_durations.append((end - start).total_seconds())
                except ValueError:
                    pass
        elif event_type == "task_failed":
            failed += 1
        elif event_type == "human_intervention":
            interventions += 1

    avg_time = ""
    if task_durations:
        avg_sec = sum(task_durations) / len(task_durations)
        mins, secs = divmod(int(avg_sec), 60)
        avg_time = f"{mins}m {secs:02d}s"

    success_rate = int(complete / dispatched * 100) if dispatched else 0

    return {
        "sessions": sessions,
        "dispatched": dispatched,
        "complete": complete,
        "failed": failed,
        "interventions": interventions,
        "avg_time": avg_time,
        "success_rate": success_rate,
    }


def rotate_logs(base_dir: Path = None) -> None:
    """Compress logs older than 30 days. Clean stale queue files older than 30 days."""
    if base_dir is None:
        base_dir = Path(__file__).parent
    metrics_dir = base_dir / "metrics"
    stale_dir = base_dir / "queue" / "stale"
    cutoff = date.today() - timedelta(days=30)

    if metrics_dir.exists():
        for log_file in metrics_dir.glob("*.log"):
            try:
                file_date = date.fromisoformat(log_file.stem)
                if file_date < cutoff:
                    gz_path = log_file.with_suffix(".log.gz")
                    with open(log_file, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
                        shutil.copyfileobj(f_in, f_out)
                    log_file.unlink()
            except (ValueError, OSError):
                pass

    if stale_dir.exists():
        for stale_file in stale_dir.glob("*.json"):
            try:
                if stale_file.stat().st_mtime < (
                    datetime.combine(cutoff, datetime.min.time()).timestamp()
                ):
                    stale_file.unlink()
            except OSError:
                pass


def main() -> None:
    parser = argparse.ArgumentParser(description="A Team metrics report")
    parser.add_argument("--days", type=int, default=7, help="Number of days to report")
    args = parser.parse_args()

    rotate_logs()
    stats = parse_events(args.days)

    sep = "━" * 35
    rate = f" ({stats['success_rate']}%)" if stats["dispatched"] else ""
    avg = f"\nTempo médio por tarefa: {stats['avg_time']}" if stats["avg_time"] else ""

    print(f"\nA Team — últimos {args.days} dias")
    print(sep)
    print(f"Sessões:              {stats['sessions']}")
    print(
        f"Tarefas:              {stats['dispatched']} despachadas · "
        f"{stats['complete']} concluídas · {stats['failed']} falhadas{rate}"
    )
    print(f"Intervenções humanas: {stats['interventions']}{avg}\n")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run all metrics tests — verify they all PASS**

```bash
python -m pytest tests/test_metrics.py -v
```

Expected: all tests PASS (including the 7 from Task 1 + 7 new ones = 15 total)

- [ ] **Step 5: Verify CLI output manually**

```bash
python .agent-sync/metrics.py session_start
python .agent-sync/metrics.py "task_dispatch TASK-001 code-reviewer main"
python .agent-sync/metrics.py "task_complete TASK-001 code-reviewer"
python .agent-sync/metrics.py "human_intervention TASK-001 unblocked_manually"
python .agent-sync/metrics-report.py --days 1
```

Expected output:
```
A Team — últimos 1 dias
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sessões:              1
Tarefas:              1 despachadas · 1 concluídas · 0 falhadas (100%)
Intervenções humanas: 1
```

- [ ] **Step 6: Commit**

```bash
git add .agent-sync/metrics-report.py tests/test_metrics.py
git commit -m "feat: add metrics-report.py CLI with parse, report, and log rotation"
```

---

## Task 3: Wire Metrics into Hooks

**Files:**
- Modify: `hooks/session-start.md`
- Modify: `.claude/settings.json`

- [ ] **Step 1: Add `session_start` metric to `hooks/session-start.md`**

Open `hooks/session-start.md`. Find the end of the file and append:

```markdown

---

<!-- A Team metrics: fires on every session start -->
Run silently: `python .agent-sync/metrics.py session_start 2>/dev/null || python3 .agent-sync/metrics.py session_start 2>/dev/null || true`
```

- [ ] **Step 2: Add Stop hook for `session_end` to `.claude/settings.json`**

In `.claude/settings.json`, inside the `"hooks"` object, add a `"Stop"` entry after `"PostToolUse"`:

```json
"Stop": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "python .agent-sync/metrics.py session_end 2>/dev/null || python3 .agent-sync/metrics.py session_end 2>/dev/null || true"
      }
    ]
  }
]
```

- [ ] **Step 3: Verify settings.json is valid JSON**

```bash
python -c "import json; json.load(open('.claude/settings.json')); print('valid')"
```

Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add hooks/session-start.md .claude/settings.json
git commit -m "feat: wire session_start and session_end metric events into hooks"
```

**Delivery 1 complete.** The metrics layer is live. Run a session in KidOs, then `python .agent-sync/metrics-report.py --days 1` to confirm events are recorded.

---

## Task 4: skills/smart-init/SKILL.md — Interview Script

**Files:**
- Create: `skills/smart-init/SKILL.md`

This file is the reference the orchestrator reads during Smart Init. It contains the full interview script, ROADMAP extraction rules, and the INIT.md template.

- [ ] **Step 1: Create `skills/smart-init/SKILL.md`**

```markdown
---
name: smart-init
description: Conversational onboarding for A Team. Detects ROADMAP.md, extracts context, generates INIT.md without requiring technical knowledge. Invoked automatically by the orchestrator when INIT.md is missing.
---

# Smart Init — Conversational Onboarding

## Trigger

This skill is invoked by the orchestrator when `/orchestrate init` is called and no `INIT.md` exists.

## Detection Sequence

Check in this order:

1. `INIT.md` exists → stop, use current init flow unchanged
2. `ROADMAP.md` exists → Path A (extract from ROADMAP)
3. `ROADMAP_*.md` exists (e.g. `ROADMAP_icd10.md`) → Path A (extract from that file)
4. Neither exists → Path B (full 5-question interview)

---

## Path A — ROADMAP Exists

Read the ROADMAP file and extract:

| Look for in ROADMAP | Maps to INIT.md field |
|--------------------|-----------------------|
| Project name in H1 or title | Project name |
| Description paragraph | Project overview |
| Stack table or technology mentions | Languages & stack |
| "Princípios não-negociáveis" or "Non-negotiable" section | Immutable rules |
| "Próximo" / "Next" / "Roadmap" items | Active work context |
| Compliance mentions (GDPR, local-first, privacy, HIPAA) | Compliance scope |
| "Feito" / "Done" section | Existing coverage |

After extraction, ask **only one question** (the only thing a ROADMAP cannot tell you):

> "Que ferramentas de IA estás a usar para escrever código neste projecto?"
> → A) Claude Code
> → B) Codex CLI
> → C) Cursor
> → D) OpenCode
> → E) Várias — escolho mais do que uma

Then generate INIT.md (see Template section below) and show the review gate.

---

## Path B — No ROADMAP (Full Interview)

Ask these 5 questions, one at a time. Use plain language — assume the user is non-technical.

**Q1 (free text):**
> "O que queres construir? Descreve com as tuas palavras."

**Q2 (multiple choice):**
> "Já existe código ou começas do zero?"
> → A) Começo do zero
> → B) Já existe código
> → C) Não tenho a certeza

*If answer is B: run stack inference silently (see Stack Inference section).*

**Q3 (multiple choice):**
> "Que tipo de projecto é?"
> → A) App web (abre no browser)
> → B) App móvel (iPhone ou Android)
> → C) API ou serviço de backend
> → D) Análise de dados ou automação
> → E) Outro

**Q4 (multiple choice):**
> "Em que dispositivo ou plataforma deve correr?"
> → A) Browser (qualquer dispositivo)
> → B) iPhone / iPad
> → C) Android
> → D) Desktop (Windows / Mac / Linux)
> → E) Servidor / cloud

**Q5 (multiple choice):**
> "Que ferramentas de IA estás a usar para escrever código?"
> → A) Claude Code
> → B) Codex CLI
> → C) Cursor
> → D) OpenCode
> → E) Várias — escolho mais do que uma

After Q5: generate INIT.md, show review gate, then **offer to create ROADMAP.md**:
> "Queres que eu crie um ROADMAP.md para este projecto com base no que descreveste? É útil para futuras sessões."

---

## Stack Inference (Path B, answer B to Q2 only)

Run silently. Do NOT run this for new projects (answer A or C to Q2).

```bash
git ls-files | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10
```

Extension → stack mapping:
- `.kt` → Kotlin / Android (agents: kotlin-reviewer, compose-ui)
- `.swift` → Swift / iOS (agents: swift-reviewer)
- `.py` → Python (agents: python-reviewer)
- `.ts` or `.tsx` → TypeScript / React (agents: code-reviewer)
- `.go` → Go (agents: go-reviewer)
- `.rs` → Rust (agents: rust-reviewer)
- `.dart` → Flutter (agents: flutter-reviewer)
- `.java` → Java / Android (agents: kotlin-reviewer as fallback)

Confidence threshold: if one extension accounts for >40% of tracked files, pre-fill Q3/Q4 and confirm with user. If ambiguous, ask normally.

---

## Review Gate

After generating INIT.md, display ONLY the `## O que entendi` section and ask:

> "Está correcto? Falta alguma coisa?"

- User says "ok" / "sim" / "yes" → run `/orchestrate init` automatically
- User describes a correction → update the relevant INIT.md section, show `## O que entendi` again
- After 3 correction rounds without approval → ask user to edit INIT.md manually: "Não consegui perceber a correcção. Por favor edita o INIT.md directamente e diz 'ok' quando estiver pronto."

---

## Codex Warning

Show this **before** the final approval:

> "Última coisa: o Codex vai pedir para aprovares um script de segurança na próxima sessão. Clica em 'Trust' para continuar — é o script de estado da A Team."

---

## INIT.md Template

Generate this file at the project root. Fill each field from the interview answers or ROADMAP extraction.

```markdown
## O que entendi
[Plain language summary: what the project is, inferred stack, active AI platforms, agent count after init]

Se algo estiver errado, edita este ficheiro antes de continuar.

---

# INIT.md — [Project Name]

> Run `/orchestrate init` after reviewing this file.

## Project Overview

**Name:** [from Q1 or ROADMAP H1]
**Type:** [from Q3: web app / mobile app / API / data / other]
**Status:** [New project / Active development]
**Description:** [from Q1 free text or ROADMAP description]

## Languages & Stack

[Check all that apply — inferred from ROADMAP or stack scan]
- [ ] Kotlin
- [ ] Swift
- [ ] Python
- [ ] TypeScript / JavaScript
- [ ] Go
- [ ] Rust
- [ ] Flutter / Dart
- [ ] Other: ___

**Framework / UI:** [inferred or left blank]
**Database:** [inferred or left blank]
**Build system:** [inferred or left blank]

## Compliance Scope

[Extracted from ROADMAP "non-negotiable" / compliance mentions, or left unchecked]
- [ ] GDPR
- [ ] Child privacy / COPPA
- [ ] Local-first / no external data
- [ ] HIPAA
- [ ] PCI-DSS

## Active AI Platforms

[From Q5]
- [ ] Claude Code
- [ ] Codex CLI
- [ ] Cursor
- [ ] OpenCode

## Non-Negotiable Rules

[Extracted from ROADMAP "princípios não-negociáveis" section, or left blank]

## Active Work / Next Steps

[Extracted from ROADMAP "Próximo" / "Next" section, or left blank]

## Agents to Prune

[Inferred from stack — list agents irrelevant to this project's languages/domain]
```
```

- [ ] **Step 2: Verify the file was created**

```bash
cat "skills/smart-init/SKILL.md" | head -5
```

Expected: `---` (YAML frontmatter)

- [ ] **Step 3: Commit**

```bash
git add skills/smart-init/SKILL.md
git commit -m "feat: add smart-init skill with ROADMAP detection and interview script"
```

---

## Task 5: orchestrator.md — Smart Init Integration

**Files:**
- Modify: `.claude/agents/orchestrator.md`

- [ ] **Step 1: Read the current orchestrator.md**

```bash
head -80 .claude/agents/orchestrator.md
```

Note the current init instructions. You will add the Smart Init block immediately before the existing init logic (the section that reads INIT.md and prunes agents).

- [ ] **Step 2: Add Smart Init detection block**

Find the section in `orchestrator.md` that handles `/orchestrate init`. Add this block **before** the existing "read INIT.md" logic:

```markdown
## Smart Init — Automatic Onboarding

When `/orchestrate init` is invoked, check in this order before doing anything else:

### Step 1: Check for existing INIT.md
If `INIT.md` exists at the project root → proceed with the standard init flow below. Do NOT run the interview.

### Step 2: Check for ROADMAP
If `INIT.md` does not exist:
- Look for `ROADMAP.md` at the project root
- Look for any `ROADMAP_*.md` file at the project root (e.g. `ROADMAP_icd10.md`)

If a ROADMAP file is found → read `skills/smart-init/SKILL.md` and follow **Path A** (ROADMAP extraction).
If no ROADMAP file is found → read `skills/smart-init/SKILL.md` and follow **Path B** (full interview).

### Step 3: Generate and review
Generate `INIT.md` from the extracted context or interview answers.
Show only the `## O que entendi` section to the user.
Wait for approval before proceeding.
Show the Codex trust prompt warning before final approval.

### Step 4: Run standard init
Only after the user approves the generated INIT.md → proceed with standard init flow (read INIT.md, prune agents, generate TEAM.md and ROUTING.md).

### Record the metric
After successful init, call:
`python .agent-sync/metrics.py "task_complete INIT orchestrator smart-init" 2>/dev/null || true`
```

- [ ] **Step 3: Verify the file is not corrupted**

```bash
head -10 .claude/agents/orchestrator.md
```

Expected: valid markdown starting with YAML frontmatter `---`

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/orchestrator.md
git commit -m "feat: add Smart Init ROADMAP detection to orchestrator init flow"
```

**Delivery 2 complete.** Test by opening a project without INIT.md and running `/orchestrate init`.

---

## Task 6: status.py — Status Script

**Files:**
- Create: `.agent-sync/status.py`
- Create: `tests/test_status.py`

- [ ] **Step 1: Create `tests/test_status.py`**

```python
# tests/test_status.py
import io
import json
import os
import sys
from contextlib import redirect_stdout
from datetime import datetime, timedelta
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / ".agent-sync"))


def run_status(tmp_path):
    """Import and run status.py with BASE pointing to tmp_path."""
    import importlib
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "status",
        Path(__file__).parent.parent / ".agent-sync" / "status.py"
    )
    mod = importlib.util.module_from_spec(spec)
    mod.BASE = tmp_path
    spec.loader.exec_module(mod)
    buf = io.StringIO()
    with redirect_stdout(buf):
        mod.main()
    return buf.getvalue().strip()


def make_team_md(tmp_path, agent_count=3):
    lines = ["| Agent | Role |", "|---|---|"]
    for i in range(agent_count):
        lines.append(f"| agent-{i} | Role {i} |")
    (tmp_path / "TEAM.md").write_text("\n".join(lines))


def test_no_team_no_init_shows_no_project(tmp_path):
    result = run_status(tmp_path)
    assert "sem projecto configurado" in result


def test_no_team_with_init_shows_not_initialized(tmp_path):
    (tmp_path / "INIT.md").write_text("# INIT")
    result = run_status(tmp_path)
    assert "não iniciado" in result


def test_active_team_shows_agent_count(tmp_path):
    make_team_md(tmp_path, agent_count=5)
    result = run_status(tmp_path)
    assert "5 agentes" in result


def test_running_task_shown_in_status(tmp_path):
    make_team_md(tmp_path, agent_count=3)
    task = {
        "task": "TASK-042",
        "agent": "code-reviewer",
        "started_at": datetime.now().isoformat(),
        "stale_after_minutes": 120
    }
    (tmp_path / "current-task.json").write_text(json.dumps(task))
    result = run_status(tmp_path)
    assert "TASK-042" in result
    assert "a correr" in result


def test_stale_task_shows_warning(tmp_path):
    make_team_md(tmp_path, agent_count=3)
    stale_start = (datetime.now() - timedelta(hours=3)).isoformat()
    task = {
        "task": "TASK-099",
        "agent": "debugger",
        "started_at": stale_start,
        "stale_after_minutes": 120
    }
    (tmp_path / "current-task.json").write_text(json.dumps(task))
    result = run_status(tmp_path)
    assert "tarefa pendente" in result
    assert "DAILY.md" in result


def test_custom_stale_threshold_respected(tmp_path):
    make_team_md(tmp_path, agent_count=2)
    # 30 minutes ago, threshold is 20 minutes — should be stale
    start = (datetime.now() - timedelta(minutes=30)).isoformat()
    task = {
        "task": "TASK-010",
        "agent": "tdd-guide",
        "started_at": start,
        "stale_after_minutes": 20
    }
    (tmp_path / "current-task.json").write_text(json.dumps(task))
    result = run_status(tmp_path)
    assert "tarefa pendente" in result


def test_watcher_running_shows_indicator(tmp_path):
    make_team_md(tmp_path, agent_count=4)
    (tmp_path / "watcher.pid").write_text(str(os.getpid()))
    result = run_status(tmp_path)
    assert "⟳" in result


def test_stale_pid_file_removed_and_no_indicator(tmp_path):
    make_team_md(tmp_path, agent_count=4)
    # PID 99999999 almost certainly does not exist
    (tmp_path / "watcher.pid").write_text("99999999")
    result = run_status(tmp_path)
    assert "⟳" not in result
    assert not (tmp_path / "watcher.pid").exists()


def test_always_exits_zero(tmp_path):
    """status.py must never raise — always produce output and exit 0."""
    # Corrupt current-task.json
    make_team_md(tmp_path, agent_count=2)
    (tmp_path / "current-task.json").write_text("not valid json {{{")
    result = run_status(tmp_path)
    assert result  # some output produced, no exception raised
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
python -m pytest tests/test_status.py -v 2>&1 | head -20
```

Expected: `FileNotFoundError` or `ModuleNotFoundError` for status.py

- [ ] **Step 3: Create `.agent-sync/status.py`**

```python
# .agent-sync/status.py
"""
A Team status line script.
Reads: .agent-sync/TEAM.md, current-task.json, watcher.pid
Output: single line. Always exits 0.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def count_agents(base_dir: Path) -> int | None:
    team_file = base_dir / "TEAM.md"
    if not team_file.exists():
        return None
    count = 0
    with open(team_file, encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if (
                stripped.startswith("| ")
                and not stripped.startswith("| Agent")
                and not stripped.startswith("| ---")
                and "---" not in stripped
                and stripped != "|"
            ):
                count += 1
    return count if count > 0 else None


def get_current_task(base_dir: Path) -> tuple:
    """Returns (task_id, is_stale). Returns (None, False) if no task."""
    task_file = base_dir / "current-task.json"
    if not task_file.exists():
        return None, False
    try:
        with open(task_file, encoding="utf-8") as f:
            data = json.load(f)
        task_id = data.get("task", "")
        started_at = data.get("started_at", "")
        stale_minutes = data.get("stale_after_minutes", 120)
        if started_at and task_id:
            start = datetime.fromisoformat(started_at)
            now = datetime.now()
            # Handle both aware and naive datetimes
            if start.tzinfo is not None:
                now = datetime.now(timezone.utc)
            elapsed_minutes = (now - start).total_seconds() / 60
            if elapsed_minutes > stale_minutes:
                return task_id, True
        return task_id or None, False
    except Exception:
        return None, False


def is_watcher_running(base_dir: Path) -> bool:
    pid_file = base_dir / "watcher.pid"
    if not pid_file.exists():
        return False
    try:
        pid = int(pid_file.read_text().strip())
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError, OSError):
        pid_file.unlink(missing_ok=True)
        return False
    except ValueError:
        pid_file.unlink(missing_ok=True)
        return False


def main(base_dir: Path = None) -> None:
    if base_dir is None:
        base_dir = Path(__file__).parent

    team_file = base_dir / "TEAM.md"
    init_md = base_dir.parent / "INIT.md"

    if not team_file.exists():
        if not init_md.exists():
            print("⚡ A Team · sem projecto configurado")
        else:
            print("⚡ A Team · não iniciado — corre /orchestrate init")
        return

    task_id, stale = get_current_task(base_dir)

    if stale:
        print("⚡ A Team · tarefa pendente — verifica DAILY.md")
        return

    agents = count_agents(base_dir)
    watcher = is_watcher_running(base_dir)

    parts = ["⚡ A Team"]
    if agents:
        parts.append(f"· {agents} agentes")
    if task_id:
        parts.append(f"· {task_id} a correr")
    if watcher:
        parts.append("· ⟳")

    print(" ".join(parts))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests — verify they all PASS**

```bash
python -m pytest tests/test_status.py -v
```

Expected: all 9 tests PASS

- [ ] **Step 5: Manual smoke test**

```bash
python .agent-sync/status.py
```

Expected: `⚡ A Team · sem projecto configurado` (no TEAM.md exists in A Team repo root's .agent-sync)

- [ ] **Step 6: Commit**

```bash
git add .agent-sync/status.py tests/test_status.py
git commit -m "feat: add status.py cross-platform status line script with staleness detection"
```

---

## Task 7: Wire Status into All Platforms + .gitignore

**Files:**
- Modify: `.claude/settings.json`
- Modify: `.codex-plugin/hooks/hooks.json`
- Modify: `.cursor-plugin/hooks/hooks-cursor.json`
- Modify: `.opencode/commands/orchestrate.md`
- Modify: `.gitignore` (create if missing)

The status invocation is the same on all platforms:

```bash
python .agent-sync/status.py 2>/dev/null || python3 .agent-sync/status.py 2>/dev/null || py .agent-sync/status.py 2>/dev/null || echo "⚡ A Team · instala Python para ver o estado"
```

- [ ] **Step 1: Add `statusLine` to `.claude/settings.json`**

In `.claude/settings.json`, add at the top level (alongside `"model"`, `"permissions"`, etc.):

```json
"statusLine": {
  "command": "python .agent-sync/status.py 2>/dev/null || python3 .agent-sync/status.py 2>/dev/null || py .agent-sync/status.py 2>/dev/null || echo '⚡ A Team'"
}
```

Verify JSON is valid:
```bash
python -c "import json; json.load(open('.claude/settings.json')); print('valid')"
```

- [ ] **Step 2: Update `.codex-plugin/hooks/hooks.json`**

Add the status command as the **first** hook in the SessionStart array (before the existing session-start.md hook):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "python .agent-sync/status.py 2>/dev/null || python3 .agent-sync/status.py 2>/dev/null || py .agent-sync/status.py 2>/dev/null || echo '⚡ A Team · instala Python para ver o estado'",
            "async": false
          },
          {
            "type": "command",
            "command": "cat \"../hooks/session-start.md\" 2>/dev/null || cat \"../skills/using-a-team/SKILL.md\" 2>/dev/null || echo '[A Team] Session started. Run /orchestrate init if .agent-sync/TEAM.md is missing.'",
            "async": false
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Update `.cursor-plugin/hooks/hooks-cursor.json`**

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "python .agent-sync/status.py 2>/dev/null || python3 .agent-sync/status.py 2>/dev/null || py .agent-sync/status.py 2>/dev/null || echo '⚡ A Team · instala Python para ver o estado'"
      },
      {
        "command": "cat \"../hooks/session-start.md\" 2>/dev/null || cat \"../skills/using-a-team/SKILL.md\" 2>/dev/null || echo '[A Team] Session started. Run /orchestrate init if .agent-sync/TEAM.md is missing.'"
      }
    ]
  }
}
```

- [ ] **Step 4: Update `.opencode/commands/orchestrate.md`**

Open `.opencode/commands/orchestrate.md`. At the very top of the file body (after any frontmatter), prepend:

```markdown
<!-- Status line output on session start -->
Run: `python .agent-sync/status.py 2>/dev/null || python3 .agent-sync/status.py 2>/dev/null || py .agent-sync/status.py 2>/dev/null || echo '⚡ A Team · instala Python para ver o estado'`

---

```

- [ ] **Step 5: Update `.gitignore`**

Add to `.gitignore` (create file if it doesn't exist):

```
# A Team runtime files — not committed
.agent-sync/metrics/
.agent-sync/current-task.json
.agent-sync/queue/stale/
.agent-sync/watcher.pid
.agent-sync/watcher.log
```

If `watcher.log` was previously committed, remove it from tracking:
```bash
git ls-files .agent-sync/watcher.log && git rm --cached .agent-sync/watcher.log || true
```

- [ ] **Step 6: Verify all JSON files are valid**

```bash
python -c "
import json, pathlib
for f in ['.claude/settings.json', '.codex-plugin/hooks/hooks.json', '.cursor-plugin/hooks/hooks-cursor.json']:
    try:
        json.load(open(f))
        print(f'OK: {f}')
    except Exception as e:
        print(f'FAIL: {f} — {e}')
"
```

Expected: `OK` for all three files

- [ ] **Step 7: Commit**

```bash
git add .claude/settings.json .codex-plugin/hooks/hooks.json \
        .cursor-plugin/hooks/hooks-cursor.json \
        .opencode/commands/orchestrate.md .gitignore
git commit -m "feat: wire status.py into Claude Code statusLine and all platform SessionStart hooks"
```

**Delivery 3 complete.**

---

## Task 8: Failure Mode Verification

Run these tests explicitly before merging to `main`. Use `backup kidos` to restore if anything breaks.

- [ ] **FM-1: Stale PID — psutil absent**

```bash
# Verify fallback works without psutil
python -c "
import sys
sys.modules['psutil'] = None  # block import
from pathlib import Path
import os
pid_file = Path('/tmp/test_watcher.pid')
pid_file.write_text(str(os.getpid()))
# should not crash, should return True (own PID is alive)
print('PID file test passed')
pid_file.unlink()
"
```

- [ ] **FM-2: Smart Init wrong stack — verify review gate fires**

In a test project, create a ROADMAP.md with ambiguous content (no clear stack mention). Run `/orchestrate init`. Verify the review gate appears and corrections work.

- [ ] **FM-3: Stale queue files — verify moved on watcher restart**

```bash
python -c "
from pathlib import Path
import json
# Create a fake stale task
queue = Path('e:/Projectos/KIDOS/.agent-sync/queue')
queue.mkdir(parents=True, exist_ok=True)
(queue / 'STALE-999.json').write_text(json.dumps({'id': 'STALE-999'}))
print('Stale file created — restart watcher and verify it moves to queue/stale/')
"
```

Restart `python .agent-sync/watcher.py`, then check:
```bash
ls "e:/Projectos/KIDOS/.agent-sync/queue/stale/"
```

Expected: `STALE-999.json` present in `stale/`

- [ ] **FM-4: Concurrent metrics write — verify no corruption**

```bash
python -c "
import threading, sys
from pathlib import Path
sys.path.insert(0, '.agent-sync')
from metrics import append_metric

base = Path('.agent-sync')
def write():
    for i in range(50):
        append_metric(f'task_dispatch TASK-{i:03d} agent main', base_dir=base)

threads = [threading.Thread(target=write) for _ in range(4)]
[t.start() for t in threads]
[t.join() for t in threads]

from datetime import date
log = base / 'metrics' / f'{date.today()}.log'
lines = [l for l in log.read_text().splitlines() if l.strip()]
print(f'Lines written: {len(lines)} (expected 200)')
corrupt = [l for l in lines if not l[0].isdigit()]
print(f'Corrupt lines: {len(corrupt)} (expected 0)')
"
```

Expected: 200 lines, 0 corrupt

- [ ] **FM-5: current-task.json stale detection**

```bash
python -c "
import json
from datetime import datetime, timedelta
from pathlib import Path

base = Path('.agent-sync')
stale_start = (datetime.now() - timedelta(hours=3)).isoformat()
task = {'task': 'TASK-FM5', 'agent': 'debugger', 'started_at': stale_start, 'stale_after_minutes': 120}
(base / 'current-task.json').write_text(json.dumps(task))
print('Stale task written — run: python .agent-sync/status.py')
"
```

```bash
python .agent-sync/status.py
```

Expected: `⚡ A Team · tarefa pendente — verifica DAILY.md`

- [ ] **FM-6: Python not in PATH — verify fallback**

```bash
# Test the fallback chain manually
python .agent-sync/status.py 2>/dev/null && echo "python: OK" || echo "python: failed"
python3 .agent-sync/status.py 2>/dev/null && echo "python3: OK" || echo "python3: failed"
```

At least one should output `OK`.

- [ ] **FM-7: Codex trust prompt — document in onboarding**

Verify that `skills/smart-init/SKILL.md` contains the Codex warning text:

```bash
grep -c "Trust" skills/smart-init/SKILL.md
```

Expected: `1` (or more)

- [ ] **FM-8: git ls-files empty on new project**

```bash
# In a fresh directory with no git history
mkdir /tmp/test_new_project && cd /tmp/test_new_project
git init
git ls-files | wc -l
```

Expected: `0` — confirming stack inference correctly skips this case for new projects (Path B, answer A to Q2).

- [ ] **Final check: run all tests**

```bash
cd "e:/Projectos/A Team"
python -m pytest tests/test_metrics.py tests/test_status.py -v
```

Expected: all tests PASS

- [ ] **Commit failure mode docs**

```bash
git add .
git commit -m "test: document and verify all 8 failure modes before merge"
```

---

## Merge Checklist

Only merge `feat/evolution-v2` → `main` when all of these are ✅:

- [ ] All pytest tests pass (`tests/test_metrics.py`, `tests/test_status.py`)
- [ ] `metrics-report.py --days 1` shows data after one KidOs session
- [ ] Status line visible in Claude Code status bar on KidOs
- [ ] Status line printed on session start in Codex CLI on KidOs
- [ ] `/orchestrate init` on a project with ROADMAP.md reads the file and generates INIT.md
- [ ] `/orchestrate init` on a project without ROADMAP.md runs the 5-question interview
- [ ] All 8 failure modes tested explicitly (Task 8)
- [ ] Remote-control works in KidOs after watcher hook fix (separate issue — hooks currently empty in KIDOS settings, restore after confirming which hook blocks)
- [ ] `backup kidos` used to restore if anything broke during testing

---

## Remote-Control Fix (Tracked Here, Not in This Branch)

During testing, it was discovered that the `python .agent-sync/watcher.py &` SessionStart hook blocks remote-control in Claude Code VS Code extension (60s timeout). The hooks are currently empty in KIDOS settings.json pending investigation. After merge, add the watcher back using a non-blocking launch:

```json
{
  "type": "command",
  "command": "start /b python .agent-sync/watcher.py >nul 2>&1 || python .agent-sync/watcher.py & 2>/dev/null || true"
}
```

The `start /b` (Windows) or `&` (POSIX) difference is the likely root cause. This should be tested on KidOs before re-enabling.
