#!/usr/bin/env python3
"""
A Team session export — Stop hook.
Converts the session transcript (.jsonl) to a readable JSON array in
.agent-sync/logs/chat-YYYY-MM-DD-{session_id[:8]}.json for post-session debugging.
Always exits 0 — never blocks the Stop hook.
"""
import json
import sys
from datetime import date
from pathlib import Path


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    transcript_path = data.get("transcript_path", "")
    session_id = data.get("session_id", "unknown")

    if not transcript_path:
        sys.exit(0)

    src = Path(transcript_path)
    if not src.exists():
        sys.exit(0)

    try:
        entries = []
        for line in src.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

        log_dir = Path.cwd() / ".agent-sync" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        slug = session_id[:8] if session_id != "unknown" else "unknown"
        out = log_dir / f"chat-{date.today()}-{slug}.json"
        out.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass

    sys.exit(0)


if __name__ == "__main__":
    main()
