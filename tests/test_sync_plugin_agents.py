import json
import re

import pytest

from scripts.sync_plugin_agents import COPILOT_TOOL_ALIASES, SOURCE, TARGET, convert


def test_copilot_agents_have_explicit_scoped_tools():
    for source in SOURCE.glob("*.md"):
        generated = (TARGET / f"{source.stem}.agent.md").read_text(encoding="utf-8")
        frontmatter = generated.split("---\n", 2)[1]
        assert "tools:" in frontmatter, source.name
        source_header = source.read_text(encoding="utf-8").split("---\n", 2)[1]
        source_tools = re.findall(r"^  - (\w+)$", source_header, re.MULTILINE)
        expected = list(dict.fromkeys(COPILOT_TOOL_ALIASES[tool] for tool in source_tools))
        actual = json.loads(re.search(r"^tools: (.+)$", frontmatter, re.MULTILINE).group(1))
        assert actual == expected, source.name
        assert "*" not in actual, source.name
        assert "skill" in actual, source.name
        if source.stem == "code-reviewer":
            assert 'tools: ["read", "execute", "skill"]' in frontmatter
            assert '"edit"' not in frontmatter


def test_unknown_claude_tool_is_rejected_instead_of_opening_permissions(tmp_path):
    source = tmp_path / "test-agent.md"
    source.write_text(
        "---\nname: test-agent\ndescription: Test agent\ntools:\n  - UnknownTool\n---\nBody\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="unsupported tool"):
        convert(source)
