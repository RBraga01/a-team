# scripts/watcher.py
#
# Generic A Team watcher — coordinates Claude Code ↔ secondary CLI (Codex, OpenCode, etc.)
#
# HOW IT WORKS:
#   1. Claude Code orchestrator writes task JSON files to .agent-sync/queue/
#   2. This watcher picks them up, invokes the secondary CLI, writes results to .agent-sync/results/
#   3. Notifies the Claude Code orchestrator via `claude -c /orchestrate tick`
#
# SETUP:
#   1. Copy this file to scripts/watcher.py in your project
#   2. Set SECONDARY_CLI and MODEL below to match your setup
#   3. The SessionStart hook in .claude/settings.json auto-starts this watcher
#
# TASK JSON FORMAT (placed in .agent-sync/queue/):
#   {
#     "id": "TASK-001",
#     "agent": "code-reviewer",
#     "description": "Review the auth module changes",
#     "context_files": ["src/auth/login.ts"],
#     "branch": "feat/auth"
#   }
#
# ARCHITECTURE NOTE — Sequential Processing is Intentional:
#   invoke_cli() uses subprocess.run() (blocking). This ensures the watcher
#   processes exactly one task at a time and fires exactly one /orchestrate tick
#   at a time — preventing concurrent writes to DAILY.md.

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime

from process_utils import pid_is_running

# ── CONFIGURE THESE FOR YOUR PROJECT ──────────────────────────────────────────

# Command to invoke your secondary CLI (e.g. "codex", "opencode", "aider")
SECONDARY_CLI = "codex"

# Extra flags passed before the prompt (e.g. "--approval-mode auto-edit")
CLI_FLAGS = ["--approval-mode", "auto-edit"]

# How often to poll the queue folder (seconds)
POLL_INTERVAL = 5

# ──────────────────────────────────────────────────────────────────────────────

BASE     = Path(__file__).parent.parent / ".agent-sync"
QUEUE    = BASE / "queue"
PROC     = BASE / "processing"
RESULTS  = BASE / "results"
LOG      = BASE / "watcher.log"
PID_FILE = BASE / "watcher.pid"


def log(msg):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}\n"
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line)
    print(line, end="")


def is_already_running():
    if not PID_FILE.exists():
        return False
    try:
        pid = int(PID_FILE.read_text().strip())
        if pid == os.getpid():
            return False
        if pid_is_running(pid):
            return True
        PID_FILE.unlink(missing_ok=True)
        return False
    except (ValueError, OSError):
        PID_FILE.unlink(missing_ok=True)
        return False


def write_pid():
    PID_FILE.write_text(str(os.getpid()))


def cleanup(signum=None, frame=None):
    PID_FILE.unlink(missing_ok=True)
    log("=== Watcher stopped ===")
    sys.exit(0)


def build_prompt(task):
    agent       = task.get("agent", "assistant")
    description = task.get("description", "")
    context     = " ".join(f"@{f}" for f in task.get("context_files", []))
    return (
        f"You are the {agent} agent. "
        f"Task: {description}. "
        f"{'Context: ' + context + '.' if context else ''} "
        f"REQUIRED: end your response with a ```json block containing exactly: "
        f"commit (string|null), files_changed (list), "
        f"tests ({{passed:N, failed:N}}), decisions_made (list), blockers (list)."
    )


def invoke_cli(task):
    cmd = [SECONDARY_CLI] + CLI_FLAGS + [build_prompt(task)]
    return subprocess.run(cmd, capture_output=True, text=True)


def extract_structured(stdout):
    if "```json" not in stdout:
        return None
    try:
        raw = stdout.split("```json")[1].split("```")[0].strip()
        return json.loads(raw)
    except Exception:
        return None


def notify_orchestrator(task_id):
    subprocess.Popen(
        ["claude", "-c", "/orchestrate tick"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    log(f"NOTIFY  orchestrator tick → {task_id}")


def run_task(task_file):
    proc_file = PROC / task_file.name
    task_file.rename(proc_file)
    task = json.loads(proc_file.read_text())
    log(f"START   {task['id']} → {task.get('agent', '?')} (branch: {task.get('branch', 'main')})")

    result  = invoke_cli(task)
    success = result.returncode == 0
    parsed  = extract_structured(result.stdout) if success else None

    receipt = {
        "id":             task["id"],
        "status":         "complete" if success else "failed",
        "branch":         task.get("branch", "main"),
        "commit":         None,
        "files_changed":  [],
        "tests":          {"passed": 0, "failed": 0},
        "decisions_made": [],
        "blockers":       [],
        "completed_at":   datetime.now().isoformat(),
    }

    if parsed:
        receipt.update(parsed)
    elif success:
        receipt["decisions_made"] = ["Could not parse structured output from CLI"]
        receipt["raw_output"]     = result.stdout[-2000:]
    else:
        receipt["blockers"] = [result.stderr[-2000:]]

    (RESULTS / f"{task['id']}-result.json").write_text(json.dumps(receipt, indent=2))
    proc_file.unlink()
    log(f"DONE    {task['id']} — {receipt['status']}")
    notify_orchestrator(task["id"])


def recover_stale_queue_files():
    """On restart, move any stale tasks stuck in processing/ back to queue/.

    If the watcher crashed mid-task the file was already renamed to PROC/.
    Moving it back to QUEUE/ ensures it is retried on the next poll cycle.
    """
    for stale in sorted(PROC.glob("*.json")):
        dest = QUEUE / stale.name
        try:
            stale.rename(dest)
            log(f"RECOVER stale queue file: {stale.name} → queue/")
        except Exception as e:
            log(f"WARN    could not recover stale queue file {stale.name}: {e}")


def watch():
    for d in [QUEUE, PROC, RESULTS]:
        d.mkdir(parents=True, exist_ok=True)

    if is_already_running():
        print(f"[Watcher] Already running (PID {PID_FILE.read_text().strip()}). Exiting.")
        sys.exit(0)

    write_pid()
    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    # Move any stale queue files left in processing/ from a previous crashed run
    recover_stale_queue_files()

    log(f"=== A Team Watcher started (CLI: {SECONDARY_CLI}) ===")
    try:
        while True:
            for f in sorted(QUEUE.glob("*.json")):
                try:
                    run_task(f)
                except Exception as e:
                    log(f"ERROR   {f.name}: {e}")
            time.sleep(POLL_INTERVAL)
    finally:
        cleanup()


if __name__ == "__main__":
    watch()
