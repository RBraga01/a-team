#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Consistency checker for A Team.

Truth sources:
  Skill count  - number of SKILL.md files in skills/*/
  Agent count  - number of .md files in .claude/agents/
  Version      - latest ## [x.y.z] entry in CHANGELOG.md
  Pack roster  - packs.json (names, repos, versions, skill/agent counts)

Run: python scripts/check_consistency.py
Exit 0 = all checks passed. Exit 1 = at least one mismatch.

Cross-repo drift (packs.json vs the live builder-* GitHub repos) is
checked separately by scripts/check_packs_remote.py in the packs-sync
workflow — this script stays offline.
"""

import io
import json
import re
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).parent.parent

NUMBER_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
}


def count_skills() -> int:
    return len(list(REPO_ROOT.glob("skills/*/SKILL.md")))


def count_agents() -> int:
    return len(list(REPO_ROOT.glob(".claude/agents/*.md")))


def changelog_version() -> str:
    text = (REPO_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    m = re.search(r"^## \[(\d+\.\d+\.\d+)\]", text, re.MULTILINE)
    if not m:
        raise SystemExit("ERROR: no version found in CHANGELOG.md")
    return m.group(1)


def load_packs() -> list[dict]:
    return json.loads((REPO_ROOT / "packs.json").read_text(encoding="utf-8"))["packs"]


# (relative_path, regex_with_one_capture_group, human_label)
SKILL_COUNT_CHECKS = [
    ("README.md", r"\*\*(\d+) workflow skills\*\* that gate", "README bullet list"),
    ("README.md", r"← (\d+) workflow skill modules", "README directory tree"),
    ("README.md", r"## Skill Library \((\d+)\)", "README section heading"),
    ("CLAUDE.md", r"← (\d+) workflow skill modules", "CLAUDE.md directory tree"),
    ("CLAUDE.md", r"## Skill Library \((\d+)\)", "CLAUDE.md section heading"),
    ("docs/index.html", r"(\d+) enforced workflows", "index.html hero paragraph"),
    ("docs/index.html", r'hero-stat-n n-purple">(\d+)<', "index.html hero stat skill count"),
    ("docs/index.html", r"(\d+) enforced workflow skills", "index.html FAQ answer"),
    ("docs/index.html", r"· (\d+) skills ·", "index.html footer"),
    (".claude-plugin/plugin.json", r"(\d+) enforced workflow skills", "claude plugin.json description"),
    (".claude-plugin/marketplace.json", r"(\d+) enforced workflow skills", "marketplace.json a-team description"),
    (".codex-plugin/plugin.json", r"(\d+) enforced workflow skills", "codex plugin.json description"),
    (".cursor-plugin/plugin.json", r"(\d+) enforced workflow skills", "cursor plugin.json description"),
    (".copilot-plugin/plugin.json", r"(\d+) enforced workflow skills", "copilot plugin.json description"),
    ("CITATION.cff", r"(\d+) enforced workflow skills", "CITATION.cff summary"),
    ("docs/overview.md", r"SKILL LAYER — (\d+) skills", "overview.md diagram label"),
]

AGENT_COUNT_CHECKS = [
    ("README.md", r"team of (\d+) specialists", "README intro paragraph"),
    ("README.md", r"\*\*(\d+) specialist agents\*\*", "README bullet list"),
    ("README.md", r"← (\d+) agent profiles", "README directory tree"),
    ("README.md", r"## Agent Roster \((\d+)\)", "README section heading"),
    ("CLAUDE.md", r"team of (\d+) specialists", "CLAUDE.md intro paragraph"),
    ("CLAUDE.md", r"← (\d+) agent profiles", "CLAUDE.md directory tree"),
    ("CLAUDE.md", r"## Agent Roster \((\d+)\)", "CLAUDE.md section heading"),
    ("docs/index.html", r"(\d+) specialists, a lead orchestrator", "index.html hero paragraph"),
    ("docs/index.html", r'hero-stat-n n-blue">(\d+)<', "index.html hero stat agent count"),
    ("docs/index.html", r"(\d+) specialists — each with one clear", "index.html comparison row"),
    ("docs/index.html", r"(\d+) specialists\. One team\.", "index.html agents heading"),
    ("docs/index.html", r"installs (\d+) specialist AI agents", "index.html FAQ answer"),
    ("docs/index.html", r"all (\d+) agents\?", "index.html FAQ summary"),
    ("docs/index.html", r"· (\d+) agents ·", "index.html footer"),
    ("docs/overview.md", r"(\d+) specialist agents", "overview.md comparison label"),
    ("docs/overview.md", r"SPECIALIST AGENTS — (\d+) total", "overview.md diagram label"),
    ("docs/overview.md", r"## The (\d+) Agents at a Glance", "overview.md section heading"),
    (".claude-plugin/plugin.json", r"(\d+) specialist agents", "claude plugin.json description"),
    (".claude-plugin/marketplace.json", r"(\d+) specialist agents", "marketplace.json a-team description"),
    (".codex-plugin/plugin.json", r"(\d+) pre-configured specialists", "codex plugin.json description"),
    (".cursor-plugin/plugin.json", r"(\d+) pre-configured specialists", "cursor plugin.json description"),
    (".copilot-plugin/plugin.json", r"(\d+) pre-configured specialists", "copilot plugin.json description"),
    ("CITATION.cff", r"provides (\d+) specialist agents", "CITATION.cff summary"),
]

VERSION_CHECKS = [
    ("README.md", r"# A Team[^\n]*v(\d+\.\d+\.\d+)", "README title heading"),
    ("AGENTS.md", r"# A Team[^\n]*v(\d+\.\d+\.\d+)", "AGENTS.md title heading"),
    ("CLAUDE.md", r"# A Team[^\n]*v(\d+\.\d+\.\d+)", "CLAUDE.md title heading"),
    ("docs/index.html", r'nav-logo-badge">v(\d+\.\d+\.\d+)<', "index.html nav badge"),
    ("docs/index.html", r"A Team v(\d+\.\d+\.\d+) —", "index.html footer span"),
    ("docs/index.html", r"MIT License · v(\d+\.\d+\.\d+) ·", "index.html footer MIT line"),
    (".codex-plugin/plugin.json", r'"version":\s*"(\d+\.\d+\.\d+)"', "codex plugin.json version field"),
    (".cursor-plugin/plugin.json", r'"version":\s*"(\d+\.\d+\.\d+)"', "cursor plugin.json version field"),
    (".copilot-plugin/plugin.json", r'"version":\s*"(\d+\.\d+\.\d+)"', "copilot plugin.json version field"),
    ("CITATION.cff", r'^version:\s*"(\d+\.\d+\.\d+)"', "CITATION.cff version field"),
]

PLATFORM_COUNT_CHECKS = [
    ("docs/index.html", r'hero-stat-n n-cyan">(\d+)<', "index.html hero platform count"),
    ("docs/index.html", r"· (\d+) platforms", "index.html footer platform count"),
]


def run_checks(checks: list, expected: str) -> list[str]:
    errors = []
    for filepath, pattern, desc in checks:
        path = REPO_ROOT / filepath
        if not path.exists():
            errors.append(f"MISSING  {filepath} ({desc}): file not found")
            continue
        text = path.read_text(encoding="utf-8")
        matches = list(re.finditer(pattern, text, re.MULTILINE))
        if not matches:
            errors.append(f"MISSING  {filepath} ({desc}): pattern not found in file")
            continue
        for m in matches:
            found = m.group(1)
            if found != str(expected):
                errors.append(
                    f"MISMATCH {filepath} ({desc}): found {found!r}, expected {str(expected)!r}"
                )
    return errors


def check_packs() -> tuple[list[str], int]:
    """Enforce packs.json against README.md, docs/index.html, and marketplace.json.

    Returns (errors, number_of_checks_performed).
    """
    errors = []
    checks = 0
    packs = load_packs()
    names = {p["name"] for p in packs}

    readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
    index = (REPO_ROOT / "docs/index.html").read_text(encoding="utf-8")
    market = json.loads(
        (REPO_ROOT / ".claude-plugin/marketplace.json").read_text(encoding="utf-8")
    )

    # ── marketplace.json: exact roster, version, and counts per pack ──
    entries = {p["name"]: p for p in market["plugins"] if p["name"] != "a-team"}
    checks += 1
    if set(entries) != names:
        errors.append(
            f"ROSTER   marketplace.json: packs {sorted(set(entries))} != packs.json {sorted(names)}"
        )
    for p in packs:
        e = entries.get(p["name"])
        if e is None:
            continue
        counts = f'{p["skills"]} skills and {p["agents"]} agents'
        checks += 3
        if e.get("version") != p["version"]:
            errors.append(
                f"MISMATCH marketplace.json ({p['name']} version): "
                f"found {e.get('version')!r}, expected {p['version']!r}"
            )
        if e.get("repository") != p["repo"]:
            errors.append(
                f"MISMATCH marketplace.json ({p['name']} repository): "
                f"found {e.get('repository')!r}, expected {p['repo']!r}"
            )
        if counts not in e.get("description", ""):
            errors.append(
                f"MISMATCH marketplace.json ({p['name']} description): "
                f"expected it to contain {counts!r}"
            )

    # ── marketplace registry description: pack count as a word ──
    word = NUMBER_WORDS.get(len(packs))
    checks += 1
    if word and f"{word} domain builder packs" not in market.get("description", ""):
        errors.append(
            f"MISMATCH marketplace.json (registry description): "
            f"expected {word!r} domain builder packs for {len(packs)} packs"
        )

    # ── README: one linked bullet per pack, no stale packs ──
    readme_names = set(
        re.findall(r"\*\*\[(builder-[a-z-]+)\]\(https://github\.com/RBraga01/", readme)
    )
    checks += 1
    if readme_names != names:
        errors.append(
            f"ROSTER   README.md domain packs: {sorted(readme_names)} != packs.json {sorted(names)}"
        )

    # ── index.html: one ecosystem card per pack with pages link and counts ──
    card_names = set(re.findall(r'class="ack-name">(builder-[a-z-]+)<', index))
    checks += 1
    if card_names != names:
        errors.append(
            f"ROSTER   docs/index.html ecosystem cards: {sorted(card_names)} != packs.json {sorted(names)}"
        )
    for p in packs:
        counts = f'{p["skills"]} skills and {p["agents"]} agents'
        checks += 2
        if p["pages"] not in index:
            errors.append(
                f"MISSING  docs/index.html ({p['name']} card): pages link {p['pages']} not found"
            )
        if counts not in index:
            errors.append(
                f"MISMATCH docs/index.html ({p['name']} card): expected {counts!r} somewhere on the page"
            )

    return errors, checks


def main() -> int:
    actual_skills = count_skills()
    actual_agents = count_agents()
    actual_version = changelog_version()
    packs = load_packs()

    print(
        f"Truth: {actual_agents} agents  |  {actual_skills} skills  |  "
        f"v{actual_version}  |  {len(packs)} packs"
    )
    print()

    skill_errors = run_checks(SKILL_COUNT_CHECKS, str(actual_skills))
    agent_errors = run_checks(AGENT_COUNT_CHECKS, str(actual_agents))
    version_errors = run_checks(VERSION_CHECKS, actual_version)
    platform_errors = run_checks(PLATFORM_COUNT_CHECKS, "5")
    pack_errors, pack_checks = check_packs()

    all_errors = skill_errors + agent_errors + version_errors + platform_errors + pack_errors

    if all_errors:
        print(f"Found {len(all_errors)} consistency error(s):\n")
        for e in all_errors:
            print(f"  {e}")
        print()
        print("Fix the mismatches above and re-run.")
        return 1

    total = (
        len(SKILL_COUNT_CHECKS)
        + len(AGENT_COUNT_CHECKS)
        + len(VERSION_CHECKS)
        + len(PLATFORM_COUNT_CHECKS)
        + pack_checks
    )
    print(f"All {total} checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
