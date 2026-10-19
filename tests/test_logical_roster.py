"""Offline contract checks: non-destructive A Team initialization and dispatch."""

from pathlib import Path

import pytest

from scripts.roster import RosterError, create, load, may_dispatch


@pytest.fixture
def project(tmp_path: Path) -> Path:
    for name in ("orchestrator", "planner", "go-reviewer", "security-reviewer"):
        path = tmp_path / ".claude/agents" / f"{name}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"# {name}\n", encoding="utf-8")
    for name in ("using-a-team", "verification-before-completion", "writing-plans", "data-migration", "smart-init"):
        path = tmp_path / "skills" / name / "SKILL.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"# {name}\n", encoding="utf-8")
    return tmp_path


def initialize(project):
    return create(project, {"orchestrator", "planner"},
                  {"using-a-team", "verification-before-completion", "writing-plans"})


def test_keeps_all_installed_profiles_and_skills(project):
    originals = {p.relative_to(project) for p in project.rglob("*.md")}
    state = initialize(project)
    assert originals <= {p.relative_to(project) for p in project.rglob("*.md")}
    assert state.inactive_agents == {"go-reviewer", "security-reviewer"}
    assert state.inactive_skills == {"data-migration", "smart-init"}
    assert "## Inactive Agents" in (project / ".agent-sync/TEAM.md").read_text()
    assert "| `planner` | active |" in (project / ".agent-sync/ROUTING.md").read_text()


def test_direct_agent_and_skill_dispatch_allowed_only_if_active(project):
    initialize(project)
    assert may_dispatch(project, "Agent", "planner")[0]
    assert may_dispatch(project, "Agent", "a-team:planner")[0]
    assert not may_dispatch(project, "Agent", "a-team:go-reviewer")[0]
    assert not may_dispatch(project, "Agent", "security-reviewer")[0]
    assert may_dispatch(project, "Skill", "writing-plans")[0]
    assert not may_dispatch(project, "Skill", "data-migration")[0]
    assert may_dispatch(project, "Agent", "general-purpose")[0]


def test_bootstrap_requires_core_orchestrator_and_skills(project):
    assert may_dispatch(project, "Agent", "orchestrator")[0]
    assert not may_dispatch(project, "Agent", "go-reviewer")[0]
    assert may_dispatch(project, "Skill", "using-a-team")[0]
    assert may_dispatch(project, "Skill", "smart-init")[0]
    assert not may_dispatch(project, "Skill", "data-migration")[0]


def test_missing_team_file_fails_closed(project):
    initialize(project)
    (project / ".agent-sync/TEAM.md").unlink()
    assert not may_dispatch(project, "Agent", "planner")[0]
    assert not may_dispatch(project, "Skill", "writing-plans")[0]
    assert may_dispatch(project, "Agent", "orchestrator")[0]


def test_inactive_agent_in_routing_fails_closed(project):
    initialize(project)
    routing = project / ".agent-sync/ROUTING.md"
    routing.write_text(routing.read_text().replace("| `planner` | active |", "| `go-reviewer` | active |"))
    with pytest.raises(RosterError, match="ROUTING.md"):
        load(project)
    assert not may_dispatch(project, "Agent", "planner")[0]


def test_inconsistent_inventory_or_fingerprint_fails_closed(project):
    initialize(project)
    (project / ".claude/agents/another-agent.md").write_text("# new\n")
    assert not may_dispatch(project, "Agent", "planner")[0]
    (project / ".claude/agents/another-agent.md").unlink()
    state = project / ".agent-sync/TEAM.md"
    state.write_text(state.read_text().replace("Roster-ID: ", "Roster-ID: changed-", 1))
    assert not may_dispatch(project, "Agent", "planner")[0]


def test_duplicate_or_unknown_entries_rejected(project):
    initialize(project)
    state = project / ".agent-sync/TEAM.md"
    state.write_text(state.read_text().replace("- `planner`: Selected", "- `planner`: Selected\n- `planner`: Selected", 1))
    with pytest.raises(RosterError, match="Duplicate"):
        load(project)


def test_required_core_cannot_be_inactive(project):
    with pytest.raises(RosterError, match="Core"):
        create(project, {"planner"}, {"using-a-team", "verification-before-completion"})
    with pytest.raises(RosterError, match="Core"):
        create(project, {"orchestrator"}, {"using-a-team"})


def test_reinitialization_requires_explicit_replace_and_no_claims(project):
    initialize(project)
    with pytest.raises(RosterError, match="--replace"):
        create(project, {"orchestrator", "planner", "go-reviewer"},
               {"using-a-team", "verification-before-completion"})
    route = project / ".agent-sync/ROUTING.md"
    route.write_text(route.read_text().replace(
        "| (empty — populated at dispatch time) | | | |",
        "| src/foo.py | planner | TASK-1 | in-progress |",
    ))
    with pytest.raises(RosterError, match="In-progress"):
        create(project, {"orchestrator", "planner", "go-reviewer"},
               {"using-a-team", "verification-before-completion"}, replace=True)
    route.write_text(route.read_text().replace("in-progress", "done"))
    updated = create(project, {"orchestrator", "planner", "go-reviewer"},
                     {"using-a-team", "verification-before-completion"}, replace=True)
    assert "go-reviewer" in updated.agents
    assert may_dispatch(project, "Agent", "go-reviewer")[0]


def test_legacy_physical_pruning_state_not_trusted(project):
    initialize(project)
    p = project / ".agent-sync/TEAM.md"
    p.write_text(p.read_text().replace("logical-v1", "physical-pruning"))
    assert not may_dispatch(project, "Agent", "planner")[0]
