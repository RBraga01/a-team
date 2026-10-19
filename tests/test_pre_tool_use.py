import json

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
