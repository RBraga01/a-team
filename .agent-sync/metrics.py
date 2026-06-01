# .agent-sync/metrics.py
"""
Shared metrics module for A Team.
Append-only log: .agent-sync/metrics/YYYY-MM-DD.log
One event per line: ISO-timestamp EVENT_TYPE [args...]
"""
import sys
from datetime import date, datetime, timedelta
from pathlib import Path


def append_metric(event: str, base_dir: Path = None) -> None:
    """Append a metric event to today's log file."""
    if base_dir is None:
        base_dir = Path(__file__).parent
    metrics_dir = base_dir / "metrics"
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
