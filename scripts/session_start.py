#!/usr/bin/env python3
"""SessionStart hook shared by Claude Code and Copilot on Windows and Unix."""

import json
import subprocess
import sys
from pathlib import Path


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    root = Path.cwd()
    context = []
    for relative in ("skills/using-a-team/SKILL.md", "hooks/session-start.md"):
        path = root / relative
        if path.is_file():
            context.append(path.read_text(encoding="utf-8"))
            break
    else:
        context.append("[A Team] Session started. Run /orchestrate init if INIT.md and .agent-sync/TEAM.md are missing.")

    required = (
        "scripts/pre_tool_use.py",
        "scripts/watcher.py",
        "scripts/status.py",
        "scripts/metrics.py",
        "scripts/session_export.py",
    )
    for relative in required:
        if not (root / relative).is_file():
            context.append(f"[A Team] WARNING: {relative} not found — enforcement inactive. Re-run the installer.")

    message = "\n\n".join(context)
    print(json.dumps({
        "additionalContext": message,
        "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": message},
    }, ensure_ascii=False))

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
