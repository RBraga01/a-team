#!/usr/bin/env python3
"""SessionStart hook shared by Claude Code and Copilot on Windows and Unix."""

import subprocess
import sys
from pathlib import Path


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    root = Path.cwd()
    for relative in ("skills/using-a-team/SKILL.md", "hooks/session-start.md"):
        path = root / relative
        if path.is_file():
            print(path.read_text(encoding="utf-8"))
            break
    else:
        print("[A Team] Session started. Run /orchestrate init if INIT.md and .agent-sync/TEAM.md are missing.")

    required = (
        "scripts/pre_tool_use.py",
        "scripts/watcher.py",
        "scripts/status.py",
        "scripts/metrics.py",
        "scripts/session_export.py",
    )
    for relative in required:
        if not (root / relative).is_file():
            print(f"[A Team] WARNING: {relative} not found — enforcement inactive. Re-run the installer.")

    watcher = root / "scripts/watcher.py"
    if watcher.is_file():
        subprocess.Popen(
            [sys.executable, str(watcher)],
            cwd=root,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


if __name__ == "__main__":
    main()
