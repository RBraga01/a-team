import json
import subprocess
import sys
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "session_start.py"


def test_session_start_emits_both_context_fields(tmp_path):
    skill = tmp_path / "skills" / "using-a-team" / "SKILL.md"
    skill.parent.mkdir(parents=True)
    skill.write_text("A Team session instructions → ready", encoding="utf-8")

    result = subprocess.run(
        [sys.executable, str(SCRIPT)],
        cwd=tmp_path,
        input='{"hook_event_name":"SessionStart"}',
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=True,
    )
    output = json.loads(result.stdout)
    assert output["additionalContext"].startswith("A Team session instructions → ready")
    assert output["hookSpecificOutput"] == {
        "hookEventName": "SessionStart",
        "additionalContext": output["additionalContext"],
    }
    assert "pre_tool_use.py not found" in output["additionalContext"]
