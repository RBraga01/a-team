#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cross-repo pack drift checker for A Team.

Compares packs.json (the local truth for the builder-* domain packs)
against the LIVE state of the builder-* repositories on GitHub:

  1. Roster    - the set of public, non-archived builder-* repos must
                 equal the packs listed in packs.json
  2. Counts    - skills (skills/*/SKILL.md) and agents (.claude/agents/*.md)
                 counted from each repo's file tree must match packs.json
  3. Version   - each repo's .claude-plugin/plugin.json version must
                 match packs.json
  4. Description - if a repo's GitHub description advertises counts
                 ("N skills and M agents"), they must match packs.json

Run: python scripts/check_packs_remote.py
Uses GITHUB_TOKEN from the environment when available (recommended in CI;
unauthenticated calls work but are rate-limited).

Exit 0 = no drift. Exit 1 = drift detected (report on stdout).
"""

import base64
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).parent.parent
API = "https://api.github.com"

SKILL_PATH_RE = re.compile(r"^skills/[^/]+/SKILL\.md$")
AGENT_PATH_RE = re.compile(r"^\.claude/agents/[^/]+\.md$")
COUNTS_RE = re.compile(r"(\d+) skills and (\d+) agents")


def gh_api(path: str) -> dict | list:
    req = urllib.request.Request(f"{API}{path}")
    req.add_header("Accept", "application/vnd.github+json")
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_packs() -> tuple[str, list[dict]]:
    data = json.loads((REPO_ROOT / "packs.json").read_text(encoding="utf-8"))
    return data["owner"], data["packs"]


def main() -> int:
    owner, packs = load_packs()
    expected = {p["name"]: p for p in packs}

    try:
        repos = gh_api(f"/users/{owner}/repos?per_page=100")
    except urllib.error.URLError as e:
        print(f"ERROR: could not reach GitHub API: {e}")
        return 1

    live = {
        r["name"]: r
        for r in repos
        if r["name"].startswith("builder-") and not r["archived"] and not r["private"]
    }

    errors = []

    # ── 1. Roster ──
    if set(live) != set(expected):
        missing = sorted(set(expected) - set(live))
        unknown = sorted(set(live) - set(expected))
        if missing:
            errors.append(f"ROSTER   packs listed in packs.json but not live on GitHub: {missing}")
        if unknown:
            errors.append(f"ROSTER   live builder-* repos missing from packs.json: {unknown}")

    for name in sorted(set(live) & set(expected)):
        p = expected[name]
        repo = live[name]
        branch = repo["default_branch"]

        # ── 2. Counts from the real file tree ──
        try:
            tree = gh_api(f"/repos/{owner}/{name}/git/trees/{branch}?recursive=1")
            paths = [t["path"] for t in tree.get("tree", [])]
        except urllib.error.URLError as e:
            errors.append(f"ERROR    {name}: could not read file tree: {e}")
            continue

        skills = sum(1 for x in paths if SKILL_PATH_RE.match(x))
        agents = sum(1 for x in paths if AGENT_PATH_RE.match(x))
        if skills != p["skills"]:
            errors.append(
                f"DRIFT    {name}: repo has {skills} skills, packs.json says {p['skills']}"
            )
        if agents != p["agents"]:
            errors.append(
                f"DRIFT    {name}: repo has {agents} agents, packs.json says {p['agents']}"
            )

        # ── 3. Manifest version ──
        try:
            blob = gh_api(f"/repos/{owner}/{name}/contents/.claude-plugin/plugin.json?ref={branch}")
            manifest = json.loads(base64.b64decode(blob["content"]).decode("utf-8"))
            if manifest.get("version") != p["version"]:
                errors.append(
                    f"DRIFT    {name}: manifest version {manifest.get('version')!r}, "
                    f"packs.json says {p['version']!r}"
                )
        except (urllib.error.URLError, KeyError, ValueError) as e:
            errors.append(f"ERROR    {name}: could not read .claude-plugin/plugin.json: {e}")

        # ── 4. GitHub description counts (only when it advertises counts) ──
        desc = repo.get("description") or ""
        m = COUNTS_RE.search(desc)
        if m and (int(m.group(1)) != p["skills"] or int(m.group(2)) != p["agents"]):
            errors.append(
                f"DRIFT    {name}: GitHub description says '{m.group(0)}', "
                f"repo truth is {p['skills']} skills and {p['agents']} agents"
            )

    if errors:
        print(f"Found {len(errors)} pack drift issue(s):\n")
        for e in errors:
            print(f"  {e}")
        print()
        print("Update packs.json (and the surfaces check_consistency.py enforces),")
        print("or fix the builder-* repo, so both sides agree.")
        return 1

    print(f"All {len(expected)} packs in sync with live GitHub state")
    return 0


if __name__ == "__main__":
    sys.exit(main())
