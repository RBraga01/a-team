"""Generate Copilot-native agent files from the canonical Claude profiles.

Run ``python scripts/sync_copilot_agents.py`` after changing a source profile.
``--check`` verifies the committed copies without writing files.
"""

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".claude" / "agents"
TARGET = ROOT / "com.github.copilot" / "agents"


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
    return f"---\nname: {name}\ndescription: {json.dumps(description, ensure_ascii=False)}\n---\n{body}"


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
    actual = {path.name: path.read_text(encoding="utf-8") for path in TARGET.glob("*.agent.md")} if TARGET.exists() else {}
    if args.check:
        changed = [name for name, content in expected.items() if actual.get(name) != content]
        extra = set(actual) - set(expected)
        if changed or extra:
            print(f"Copilot agents out of sync: changed={changed}, extra={sorted(extra)}")
            return 1
    else:
        TARGET.mkdir(parents=True, exist_ok=True)
        for name, content in expected.items():
            (TARGET / name).write_text(content, encoding="utf-8", newline="\n")
        for name in set(actual) - set(expected):
            (TARGET / name).unlink()
    print(f"Copilot agents synced: {len(expected)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
