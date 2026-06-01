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
    """Parse log events and return summary statistics.

    Returns dict with keys: sessions, dispatched, complete, failed,
    interventions, avg_time (str), success_rate (int 0-100).
    """
    if base_dir is None:
        base_dir = Path(__file__).parent
    events = read_events(days, base_dir=base_dir)

    sessions = 0
    dispatched = 0
    complete = 0
    failed = 0
    interventions = 0
    active_tasks: dict[str, str] = {}
    task_durations: list[float] = []

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
        cutoff_ts = datetime.combine(cutoff, datetime.min.time()).timestamp()
        for stale_file in stale_dir.glob("*.json"):
            try:
                if stale_file.stat().st_mtime < cutoff_ts:
                    stale_file.unlink()
            except OSError:
                pass


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass  # Python < 3.7 or stdout not reconfigurable (e.g. redirected)

    parser = argparse.ArgumentParser(description="A Team metrics report")
    parser.add_argument("--days", type=int, default=7, help="Number of days to report")
    args = parser.parse_args()

    rotate_logs()
    stats = parse_events(args.days)

    sep = "━" * 35
    rate = f" ({stats['success_rate']}%)" if stats["dispatched"] else ""

    print(f"\nA Team — últimos {args.days} dias")
    print(sep)
    print(f"Sessões:              {stats['sessions']}")
    print(
        f"Tarefas:              {stats['dispatched']} despachadas · "
        f"{stats['complete']} concluídas · {stats['failed']} falhadas{rate}"
    )
    print(f"Intervenções humanas: {stats['interventions']}")
    if stats["avg_time"]:
        print(f"Tempo médio por tarefa: {stats['avg_time']}")
    print()


if __name__ == "__main__":
    main()
