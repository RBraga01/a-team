# .agent-sync/status.py
"""
A Team status line script.
Reads: .agent-sync/TEAM.md, current-task.json, watcher.pid
Output: single line of text. Always exits 0.

Usage: python status.py
Called from: Claude Code statusLine.command, platform SessionStart hooks.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def count_agents(base_dir: Path) -> int | None:
    """Count active agents from TEAM.md. Returns None if file missing or empty."""
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


def get_current_task(base_dir: Path) -> tuple[str | None, bool]:
    """Returns (task_id, is_stale). Returns (None, False) if no task or on error."""
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
            if start.tzinfo is not None:
                now = datetime.now(timezone.utc)
            elapsed_minutes = (now - start).total_seconds() / 60
            if elapsed_minutes > stale_minutes:
                return task_id, True
        return task_id or None, False
    except Exception:
        return None, False


def is_watcher_running(base_dir: Path) -> bool:
    """Check if watcher process is alive via PID file. Cleans up stale PID file."""
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
    """Print a single status line. Always exits 0."""
    if base_dir is None:
        base_dir = Path(__file__).parent
        # Ensure UTF-8 output on Windows terminals
        if hasattr(sys.stdout, "reconfigure"):
            try:
                sys.stdout.reconfigure(encoding="utf-8")
            except Exception:
                pass

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
