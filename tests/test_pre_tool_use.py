import json
import subprocess
import sys
from pathlib import Path

from scripts.pre_tool_use import _is_env_access, _log


def test_env_guard_accepts_claude_and_copilot_path_fields():
    for key in ("file_path", "path", "filePath"):
        assert _is_env_access("Read", {key: ".env"})
        assert _is_env_access("Write", {key: "config/.env.local"})
        assert not _is_env_access("Read", {key: ".env.example"})


def test_guard_log_does_not_retain_tool_arguments(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _log({"tool_name": "Bash", "tool_input": {"command": "echo secret-value"}})
    log = (tmp_path / ".agent-sync" / "logs" / "pre_tool_use.json").read_text()
    assert "secret-value" not in log
    assert json.loads(log) == [{"tool_name": "Bash"}]


def test_rejected_command_never_appears_in_stderr_or_log(tmp_path):
    secret = "secret-value-should-not-be-logged"
    command = f"rm -rf /tmp/example --token={secret}"
    script = Path(__file__).resolve().parents[1] / "scripts" / "pre_tool_use.py"
    result = subprocess.run(
        [sys.executable, str(script)],
        input=json.dumps({"tool_name": "Bash", "tool_input": {"command": command}}),
        text=True,
        capture_output=True,
        cwd=tmp_path,
        check=False,
    )
    assert result.returncode == 2
    assert "BLOQUEADO" in result.stderr
    assert secret not in result.stderr
    assert command not in result.stderr
    log_path = tmp_path / ".agent-sync" / "logs" / "pre_tool_use.json"
    if log_path.exists():
        assert secret not in log_path.read_text(encoding="utf-8")
