"""Generate plugin agent files from the canonical Claude project profiles.

Run ``python scripts/sync_plugin_agents.py`` after changing a source profile.
``--check`` verifies the committed copies without writing files.
"""

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".claude" / "agents"
TARGET = ROOT / "com.github.copilot" / "agents"
CLAUDE_TARGET = ROOT / "agents"

# GitHub Copilot custom-agent aliases and CLI tool names.
COPILOT_TOOL_ALIASES = {
    "Read": "read",
    "Bash": "execute",
    "Write": "edit",
    "Edit": "edit",
    "MultiEdit": "edit",
    "Glob": "search",
    "Grep": "search",
    "Agent": "agent",
    "Skill": "skill",
}


def convert(path: Path) -> str:
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    parts = text.split("---\n", 2)
    if len(parts) != 3 or parts[0] != "":
        raise ValueError(f"{path}: missing YAML frontmatter")
    header, body = parts[1], parts[2]
    body = "\n".join(line.rstrip() for line in body.splitlines()) + "\n"
    lines = header.splitlines()
    name = next((line[6:].strip() for line in lines if line.startswith("name: ")), None)
    if name != path.stem:
        raise ValueError(f"{path}: name and filename differ")
    start = next((i for i, line in enumerate(lines) if line.startswith("description: ")), None)
    if start is None:
        raise ValueError(f"{path}: missing description")
    first = lines[start][13:].strip()
    continued = []
    for line in lines[start + 1 :]:
        if not line.startswith((" ", "\t")):
            break
        continued.append(line.strip())
    description = " ".join(([first] if first != "|" else []) + continued)
    if not description:
        raise ValueError(f"{path}: empty description")
    tools_start = next((i for i, line in enumerate(lines) if line == "tools:"), None)
    if tools_start is None:
        raise ValueError(f"{path}: missing tools list")
    source_tools = []
    for line in lines[tools_start + 1 :]:
        if not line.startswith((" ", "\t")):
            break
        if not line.startswith("  - "):
            raise ValueError(f"{path}: invalid tools list")
        source_tools.append(line[4:].strip())
    if not source_tools:
        raise ValueError(f"{path}: empty tools list")
    unknown = set(source_tools) - set(COPILOT_TOOL_ALIASES)
    if unknown:
        raise ValueError(f"{path}: unsupported tool(s): {', '.join(sorted(unknown))}")
    tools = list(dict.fromkeys(COPILOT_TOOL_ALIASES[tool] for tool in source_tools))
    return (
        f"---\nname: {name}\ndescription: {json.dumps(description, ensure_ascii=False)}\n"
        f"tools: {json.dumps(tools)}\n---\n{body}"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = {
        path.stem + ".agent.md": convert(path)
        for path in sorted(SOURCE.glob("*.md"))
    }
    if len(expected) != 26:
        raise ValueError(f"Expected 26 canonical agents, got {len(expected)}")
    claude_expected = {
        path.name: "\n".join(line.rstrip() for line in path.read_text(encoding="utf-8").splitlines()) + "\n"
        for path in sorted(SOURCE.glob("*.md"))
    }
    actual = {path.name: path.read_text(encoding="utf-8") for path in TARGET.glob("*.agent.md")} if TARGET.exists() else {}
    claude_actual = {path.name: path.read_text(encoding="utf-8") for path in CLAUDE_TARGET.glob("*.md")} if CLAUDE_TARGET.exists() else {}
    if args.check:
        changed = [name for name, content in expected.items() if actual.get(name) != content]
        extra = set(actual) - set(expected)
        claude_changed = [name for name, content in claude_expected.items() if claude_actual.get(name) != content]
        claude_extra = set(claude_actual) - set(claude_expected)
        if changed or extra or claude_changed or claude_extra:
            print(f"Plugin agents out of sync: copilot={changed}, claude={claude_changed}, extra={sorted(extra | claude_extra)}")
            return 1
    else:
        TARGET.mkdir(parents=True, exist_ok=True)
        CLAUDE_TARGET.mkdir(parents=True, exist_ok=True)
        for name, content in expected.items():
            (TARGET / name).write_text(content, encoding="utf-8", newline="\n")
        for name, content in claude_expected.items():
            (CLAUDE_TARGET / name).write_text(content, encoding="utf-8", newline="\n")
        for name in set(actual) - set(expected):
            (TARGET / name).unlink()
        for name in set(claude_actual) - set(claude_expected):
            (CLAUDE_TARGET / name).unlink()
    print(f"Plugin agents synced: {len(expected)} Copilot, {len(claude_expected)} Claude")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
