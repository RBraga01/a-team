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
    assert "T" in first_line
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
    events = m.read_events(0, base_dir=tmp_path)
    assert events == []


def test_append_creates_metrics_dir_if_missing(tmp_path):
    assert not (tmp_path / "metrics").exists()
    m.append_metric("session_start", base_dir=tmp_path)
    assert (tmp_path / "metrics").exists()


def test_read_events_spans_multiple_days(tmp_path):
    from datetime import date, timedelta
    # Write a log for yesterday manually
    yesterday = date.today() - timedelta(days=1)
    log_dir = tmp_path / "metrics"
    log_dir.mkdir(parents=True, exist_ok=True)
    (log_dir / f"{yesterday}.log").write_text(
        f"{yesterday}T10:00:00 session_start\n"
    )
    # Write today's event via append_metric
    m.append_metric("task_complete TASK-001 agent", base_dir=tmp_path)
    events = m.read_events(2, base_dir=tmp_path)
    assert len(events) == 2
    assert any("session_start" in e for e in events)
    assert any("task_complete" in e for e in events)


# --- metrics_report tests ---
# metrics-report.py has a hyphen so it cannot be imported with a plain import statement.
# Use importlib to load it by file path.
import importlib.util as _ilu

_mr_spec = _ilu.spec_from_file_location(
    "metrics_report",
    Path(__file__).parent.parent / ".agent-sync" / "metrics-report.py",
)
mr = _ilu.module_from_spec(_mr_spec)
_mr_spec.loader.exec_module(mr)


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
