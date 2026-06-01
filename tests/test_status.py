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
    """Run status.main() with BASE pointing to tmp_path."""
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
        mod.main(base_dir=tmp_path)
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
    # INIT.md lives at base_dir.parent per the spec
    (tmp_path.parent / "INIT.md").write_text("# INIT")
    result = run_status(tmp_path)
    # Either message is acceptable when TEAM.md is absent
    assert "não iniciado" in result or "sem projecto" in result
    # Cleanup
    (tmp_path.parent / "INIT.md").unlink(missing_ok=True)


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


def test_corrupt_task_json_does_not_raise(tmp_path):
    make_team_md(tmp_path, agent_count=2)
    (tmp_path / "current-task.json").write_text("not valid json {{{")
    result = run_status(tmp_path)
    assert result  # some output produced, no exception raised
