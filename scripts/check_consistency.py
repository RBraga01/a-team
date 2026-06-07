#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Consistency checker for A Team.

Truth sources:
  Skill count — number of SKILL.md files in skills/*/
  Version     — latest ## [x.y.z] entry in CHANGELOG.md

Run: python scripts/check_consistency.py
Exit 0 = all checks passed. Exit 1 = at least one mismatch.
"""

import io
import re
import sys
import json
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).parent.parent


def count_skills() -> int:
    return len(list(REPO_ROOT.glob("skills/*/SKILL.md")))


def changelog_version() -> str:
    text = (REPO_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    m = re.search(r"^## \[(\d+\.\d+\.\d+)\]", text, re.MULTILINE)
    if not m:
        raise SystemExit("ERROR: no version found in CHANGELOG.md")
    return m.group(1)


# (relative_path, regex_with_one_capture_group, human_label)
SKILL_COUNT_CHECKS = [
    ("README.md",                  r"\*\*(\d+) workflow skills\*\* that gate",   "README — bullet list"),
    ("README.md",                  r"← (\d+) workflow skill modules",             "README — directory tree"),
    ("README.md",                  r"## Skill Library \((\d+)\)",                 "README — section heading"),
    ("docs/index.html",            r"(\d+) enforced workflows",                   "index.html — hero paragraph"),
    ("docs/index.html",            r"(\d+) enforced workflow skills",             "index.html — FAQ answer"),
    ("docs/index.html",            r"· (\d+) skills ·",                          "index.html — footer"),
    (".codex-plugin/plugin.json",  r"(\d+) enforced workflow skills",             "codex plugin.json — description"),
    (".cursor-plugin/plugin.json", r"(\d+) enforced workflow skills",             "cursor plugin.json — description"),
    ("docs/overview.md",           r"SKILL LAYER — (\d+) skills",                "overview.md — diagram label"),
]

VERSION_CHECKS = [
    ("README.md",                  r"# A Team[^\n]*v(\d+\.\d+\.\d+)",            "README — title heading"),
    ("AGENTS.md",                  r"# A Team[^\n]*v(\d+\.\d+\.\d+)",            "AGENTS.md — title heading"),
    ("CLAUDE.md",                  r"# A Team[^\n]*v(\d+\.\d+\.\d+)",            "CLAUDE.md — title heading"),
    ("docs/index.html",            r'nav-logo-badge">v(\d+\.\d+\.\d+)<',         "index.html — nav badge"),
    ("docs/index.html",            r"A Team v(\d+\.\d+\.\d+) —",                 "index.html — footer span"),
    ("docs/index.html",            r"MIT License · v(\d+\.\d+\.\d+) ·",          "index.html — footer MIT line"),
    (".codex-plugin/plugin.json",  r'"version":\s*"(\d+\.\d+\.\d+)"',            "codex plugin.json — version field"),
    (".cursor-plugin/plugin.json", r'"version":\s*"(\d+\.\d+\.\d+)"',            "cursor plugin.json — version field"),
    ("CITATION.cff",               r'^version:\s*"(\d+\.\d+\.\d+)"',             "CITATION.cff — version field"),
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


def main() -> int:
    actual_skills = count_skills()
    actual_version = changelog_version()

    print(f"Truth: {actual_skills} skills  |  v{actual_version}")
    print()

    skill_errors = run_checks(SKILL_COUNT_CHECKS, str(actual_skills))
    version_errors = run_checks(VERSION_CHECKS, actual_version)

    all_errors = skill_errors + version_errors

    if all_errors:
        print(f"Found {len(all_errors)} consistency error(s):\n")
        for e in all_errors:
            print(f"  {e}")
        print()
        print("Fix the mismatches above and re-run.")
        return 1

    total = len(SKILL_COUNT_CHECKS) + len(VERSION_CHECKS)
    print(f"✓ All {total} checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
