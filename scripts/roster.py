#!/usr/bin/env python3
"""Non-destructive A Team roster compiler and direct-dispatch guard.

Agent/skill files stay installed. TEAM.md defines the active/inactive roster,
ROUTING.md lists eligible agents, and matching fingerprints reject stale state.
This does not replace each host's native plugin trust model.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

MODE = "logical-v1"
CORE_AGENTS = frozenset({"orchestrator"})
CORE_SKILLS = frozenset({"using-a-team", "verification-before-completion"})
PROFILE = re.compile(r"^[a-z][a-z0-9-]*$")
ROW = re.compile(r"^- `([a-z][a-z0-9-]*)`: (.+)$")
ROUTE = re.compile(r"^\| `([a-z][a-z0-9-]*)` \| active \|$")


class RosterError(ValueError):
    """Invalid, incomplete or inconsistent active-team contract."""


@dataclass(frozen=True)
class Roster:
    agents: frozenset[str]
    skills: frozenset[str]
    inactive_agents: frozenset[str]
    inactive_skills: frozenset[str]
    roster_id: str


def inventory(root: Path) -> tuple[set[str], set[str]]:
    agents = {p.stem for p in (root / ".claude/agents").glob("*.md")}
    skills = {p.parent.name for p in (root / "skills").glob("*/SKILL.md")}
    if not agents or not skills:
        raise RosterError("A Team agent/skill files are missing; run the installer before init")
    if not all(PROFILE.fullmatch(n) for n in agents | skills):
        raise RosterError("Discovered invalid agent or skill names")
    if not CORE_AGENTS <= agents or not CORE_SKILLS <= skills:
        raise RosterError("Core A Team agents/skills are missing")
    return agents, skills


def fingerprint(agents: set[str], skills: set[str], all_agents: set[str], all_skills: set[str]) -> str:
    data = "\n".join(
        f"{label}:{','.join(sorted(names))}"
        for label, names in (
            ("agents", agents), ("skills", skills),
            ("all-agents", all_agents), ("all-skills", all_skills),
        )
    )
    return hashlib.sha256(data.encode("utf-8")).hexdigest()[:16]


def _parse_entries(text: str, heading: str) -> set[str]:
    marker = f"## {heading}\n"
    if text.count(marker) != 1:
        raise RosterError(f"Expected one {heading} section")
    block = text.split(marker, 1)[1].split("\n## ", 1)[0]
    entries = []
    for line in block.splitlines():
        if not line.strip():
            continue
        match = ROW.fullmatch(line)
        if not match:
            raise RosterError(f"Malformed {heading} entry")
        entries.append(match.group(1))
    if len(entries) != len(set(entries)):
        raise RosterError(f"Duplicate {heading} entries")
    return set(entries)


def load(root: Path) -> Roster:
    """Parse and validate both documents against installed identities; fail closed."""
    team_path = root / ".agent-sync/TEAM.md"
    routing_path = root / ".agent-sync/ROUTING.md"
    if not team_path.is_file() or not routing_path.is_file():
        raise RosterError("Logical roster is not initialized; run /orchestrate init")
    team = team_path.read_text(encoding="utf-8")
    routes = routing_path.read_text(encoding="utf-8")
    if team.count(f"Roster-Mode: {MODE}") != 1 or routes.count(f"Roster-Mode: {MODE}") != 1:
        raise RosterError("Legacy or invalid roster mode; re-run /orchestrate init")
    if team.count("Roster-Status: ACTIVE") != 1 or routes.count("Roster-Status: ACTIVE") != 1:
        raise RosterError("Roster is not ACTIVE")
    all_agents, all_skills = inventory(root)
    agents = _parse_entries(team, "Active Agents")
    inactive_agents = _parse_entries(team, "Inactive Agents")
    skills = _parse_entries(team, "Active Skills")
    inactive_skills = _parse_entries(team, "Inactive Skills")
    if agents & inactive_agents or skills & inactive_skills:
        raise RosterError("A component is both active and inactive")
    if agents | inactive_agents != all_agents or skills | inactive_skills != all_skills:
        raise RosterError("Roster does not exactly match installed agent/skill inventory")
    if not CORE_AGENTS <= agents or not CORE_SKILLS <= skills:
        raise RosterError("Required orchestrator and hard-gate skills must remain active")
    expected = fingerprint(agents, skills, all_agents, all_skills)
    if team.count(f"Roster-ID: {expected}") != 1 or routes.count(f"Roster-ID: {expected}") != 1:
        raise RosterError("TEAM.md and ROUTING.md fingerprints do not match the selected roster")
    if routes.count("## Eligible Agents\n") != 1 or routes.count("## File Claims\n") != 1:
        raise RosterError("Routing contract sections are missing")
    block = routes.split("## Eligible Agents\n", 1)[1].split("\n## ", 1)[0]
    routed = [m.group(1) for line in block.splitlines() if (m := ROUTE.fullmatch(line))]
    agent_rows = [line for line in block.splitlines() if line.startswith("| `")]
    if len(routed) != len(agent_rows) or len(routed) != len(set(routed)) or set(routed) != agents:
        raise RosterError("ROUTING.md must list exactly the active agents")
    return Roster(frozenset(agents), frozenset(skills), frozenset(inactive_agents), frozenset(inactive_skills), expected)


def _names(raw: str) -> set[str]:
    names = set(filter(None, (part.strip() for part in raw.split(","))))
    if not names or not all(PROFILE.fullmatch(name) for name in names):
        raise RosterError("Provide a comma-separated list of valid component names")
    return names


def _has_in_progress_claims(routes: str) -> bool:
    if "## File Claims\n" not in routes:
        return False
    for line in routes.split("## File Claims\n", 1)[1].splitlines():
        cells = [x.strip() for x in line.strip().strip("|").split("|")]
        if len(cells) >= 4 and cells[3].lower().replace("_", "-") == "in-progress":
            return True
    return False


def create(root: Path, selected_agents: set[str], selected_skills: set[str], *, replace: bool = False) -> Roster:
    """Compile selection without deleting any agent or skill file."""
    all_agents, all_skills = inventory(root)
    if not CORE_AGENTS <= selected_agents or not CORE_SKILLS <= selected_skills:
        raise RosterError("Core orchestrator and verification skills cannot be inactive")
    if selected_agents - all_agents or selected_skills - all_skills:
        raise RosterError("Unknown selected component")
    state_dir = root / ".agent-sync"
    team_path, route_path = state_dir / "TEAM.md", state_dir / "ROUTING.md"
    if state_dir.is_symlink() or team_path.is_symlink() or route_path.is_symlink():
        raise RosterError("Refusing to write a roster through a symlink")
    if (team_path.exists() or route_path.exists()) and not replace:
        raise RosterError("Existing roster found; require explicit --replace for reinitialization")
    if route_path.is_file() and _has_in_progress_claims(route_path.read_text(encoding="utf-8")):
        raise RosterError("In-progress file claims prevent roster replacement")
    inactive_agents = all_agents - selected_agents
    inactive_skills = all_skills - selected_skills
    roster_id = fingerprint(selected_agents, selected_skills, all_agents, all_skills)
    header = f"Roster-Mode: {MODE}\nRoster-Status: ACTIVE\nRoster-ID: {roster_id}\n"

    def rows(names: set[str], reason: str) -> str:
        return "".join(f"- `{name}`: {reason}\n" for name in sorted(names))

    team = (
        "# Active Team (project scope)\n" + header
        + f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}\n\n"
        + "## Active Agents\n" + rows(selected_agents, "Selected from INIT.md") + "\n"
        + "## Inactive Agents\n" + rows(inactive_agents, "Out of project scope (files retained)") + "\n"
        + "## Active Skills\n" + rows(selected_skills, "Selected from INIT.md") + "\n"
        + "## Inactive Skills\n" + rows(inactive_skills, "Out of project scope (files retained)")
    )
    routing = (
        "# A Team project routing\n" + header + "\n"
        + "## Eligible Agents\n| Agent | Status |\n|---|---|\n"
        + "".join(f"| `{name}` | active |\n" for name in sorted(selected_agents))
        + "\n## File Claims\n| File | Agent | Task | Status |\n|---|---|---|---|\n"
        + "| (empty — populated at dispatch time) | | | |\n"
    )
    state_dir.mkdir(parents=True, exist_ok=True)
    team_path.write_text(team, encoding="utf-8")
    route_path.write_text(routing, encoding="utf-8")
    return load(root)


def canonical_name(identifier: str) -> str:
    return identifier.strip().rsplit(":", 1)[-1].strip()


def may_dispatch(root: Path, kind: str, identifier: str) -> tuple[bool, str]:
    """Return (allowed, reason) for a direct A Team Agent or Skill invocation."""
    name = canonical_name(identifier)
    if not PROFILE.fullmatch(name):
        return False, "Invalid A Team dispatch identity"
    agent_names = {p.stem for p in (root / ".claude/agents").glob("*.md")}
    skill_names = {p.parent.name for p in (root / "skills").glob("*/SKILL.md")}
    if kind == "Agent":
        if name not in agent_names and not identifier.startswith(("a-team:", "a-team@")):
            return True, "External agent; outside A Team project roster"
        if name == "orchestrator":
            return True, "Core orchestrator may initialize or repair the roster"
    elif kind == "Skill":
        if name not in skill_names and not identifier.startswith(("a-team:", "a-team@")):
            return True, "External skill; outside A Team project roster"
        if name == "using-a-team":
            return True, "Mandatory meta-skill permitted for roster repair"
        if name == "smart-init":
            try:
                selected = load(root)
            except (OSError, RosterError):
                return True, "Bootstrap meta-skill permitted for roster repair"
            return (name in selected.skills), (
                "Active bootstrap skill" if name in selected.skills else "Inactive in A Team roster"
            )
    else:
        return False, "Unsupported dispatch kind"
    try:
        roster = load(root)
    except (OSError, RosterError) as exc:
        return False, f"Roster unavailable or inconsistent: {exc}"
    allowed = name in (roster.agents if kind == "Agent" else roster.skills)
    return allowed, "Active in A Team roster" if allowed else "Inactive in A Team roster"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Installed project root")
    actions = parser.add_subparsers(dest="action", required=True)
    init = actions.add_parser("init", help="Compile roster without deleting profiles")
    init.add_argument("--agents", required=True, help="Comma-separated active agents")
    init.add_argument("--skills", required=True, help="Comma-separated active skills")
    init.add_argument("--replace", action="store_true", help="Explicit reinit; refuses outstanding claims")
    actions.add_parser("verify", help="Validate TEAM.md, ROUTING.md and installed inventory")
    check = actions.add_parser("check", help="Check eligibility for an A Team invocation")
    check.add_argument("kind", choices=["Agent", "Skill"])
    check.add_argument("name")
    args = parser.parse_args()
    try:
        if args.action == "init":
            state = create(args.root, _names(args.agents), _names(args.skills), replace=args.replace)
            print(f"Logical roster ACTIVE ({state.roster_id}): {len(state.agents)} agents, {len(state.skills)} skills")
        elif args.action == "verify":
            state = load(args.root)
            print(f"Validated logical roster {state.roster_id}: {len(state.agents)} agents, {len(state.skills)} skills")
        else:
            allowed, reason = may_dispatch(args.root, args.kind, args.name)
            print(reason, file=sys.stdout if allowed else sys.stderr)
            return 0 if allowed else 2
    except (OSError, RosterError) as exc:
        print(f"A Team roster error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
