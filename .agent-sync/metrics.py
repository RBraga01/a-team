# .agent-sync/metrics.py
"""
Shared metrics module for A Team.
Append-only log: .agent-sync/metrics/YYYY-MM-DD.log
One event per line: ISO-timestamp EVENT_TYPE [args...]
"""
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import threading as _threading

try:
    import fcntl as _fcntl
    _HAS_FCNTL = True
except ImportError:
    _HAS_FCNTL = False

# Per-process in-process lock: prevents data loss when multiple threads call
# append_metric() concurrently in the same process (the common case on Windows
# where fcntl is unavailable).
_write_lock = _threading.Lock()


def append_metric(event: str, base_dir: Path = None) -> None:
    """Append a metric event to today's log file."""
    if base_dir is None:
        base_dir = Path(__file__).parent
    metrics_dir = base_dir / "metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    log_file = metrics_dir / f"{date.today()}.log"
    line = f"{datetime.now().isoformat(timespec='seconds')} {event}\n"
    with _write_lock:
        with open(log_file, "a", encoding="utf-8") as f:
            if _HAS_FCNTL:
                _fcntl.flock(f, _fcntl.LOCK_EX)
                f.write(line)
                _fcntl.flock(f, _fcntl.LOCK_UN)
            else:
                f.write(line)


def read_events(days: int, base_dir: Path = None) -> list[str]:
    """Read events from today and the N-1 days before it.

    ``days=1`` returns today only; ``days=7`` returns today plus the 6 prior
    days.  Events are returned in reverse-chronological order (most recent day
    first).

    Returns list of raw log lines.
    """
    if base_dir is None:
        base_dir = Path(__file__).parent
    metrics_dir = base_dir / "metrics"
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
