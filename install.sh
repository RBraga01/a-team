#!/usr/bin/env bash
# A Team installer — copies shared infrastructure and all platform integration directories.
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/RBraga01/a-team/main/install.sh)
#   bash <(curl -fsSL https://raw.githubusercontent.com/RBraga01/a-team/main/install.sh) /path/to/project

set -euo pipefail

REPO_URL="${A_TEAM_REPO_URL:-https://github.com/RBraga01/a-team.git}"
DEST="${1:-$PWD}"
DIRS=(".claude" ".claude-plugin" ".codex-plugin" ".cursor-plugin" ".copilot-plugin" "com.github.copilot" ".opencode" "skills" "hooks" "templates" "scripts" "assets")

RESET="\033[0m"; BOLD="\033[1m"; GREEN="\033[32m"; BLUE="\033[34m"; RED="\033[31m"; DIM="\033[2m"

echo ""
echo -e "${BOLD}A Team${RESET} — Universal Multi-Agent Infrastructure"
echo -e "${DIM}Installing into: $DEST${RESET}"
echo ""

# -- Preflight checks --
command -v git >/dev/null 2>&1 || { echo -e "${RED}Error: git is required but not installed.${RESET}"; exit 1; }
command -v python3 >/dev/null 2>&1 && python3 -c 'import sys; sys.exit(sys.version_info < (3, 9))' >/dev/null 2>&1 || { echo -e "${RED}Error: Python 3.9+ must be available as python3 for hooks.${RESET}"; exit 1; }
[ -d "$DEST" ]              || { echo -e "${RED}Error: destination '$DEST' does not exist.${RESET}"; exit 1; }

# -- Sparse clone into temp dir --
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo -e "  ${DIM}Fetching required files (sparse checkout)...${RESET}"
git clone \
  --filter=blob:none \
  --sparse \
  --depth 1 \
  --quiet \
  "$REPO_URL" "$TMP/a-team"

cd "$TMP/a-team"
git sparse-checkout set "${DIRS[@]}"

# -- Copy into destination --
echo ""
COPIED=0; SKIPPED=0
for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    if cp -rn "$dir" "$DEST/" 2>/dev/null; then
      echo -e "  ${GREEN}✓${RESET} $dir/"
      COPIED=$((COPIED + 1))
    else
      echo -e "  ${DIM}↩ $dir/ already exists — skipped (use --force to overwrite)${RESET}"
      SKIPPED=$((SKIPPED + 1))
    fi
  fi
done

# -- Install project instruction files without replacing existing policies --
for file in AGENTS.md CLAUDE.md plugin.json; do
  if [ ! -e "$DEST/$file" ]; then
    cp "$file" "$DEST/$file"
    echo -e "  ${GREEN}✓${RESET} $file (project instructions)"
    COPIED=$((COPIED + 1))
  else
    echo -e "  ${DIM}↩ $file already exists — skipped; merge A Team instructions manually if needed${RESET}"
    SKIPPED=$((SKIPPED + 1))
  fi
done

# -- Copy INIT_TEMPLATE as INIT.md if not already present --
if [ ! -f "$DEST/INIT.md" ]; then
  cp INIT_TEMPLATE.md "$DEST/INIT.md"
  echo -e "  ${GREEN}✓${RESET} INIT.md (from template)"
  COPIED=$((COPIED + 1))
else
  echo -e "  ${DIM}↩ INIT.md already exists — skipped${RESET}"
  SKIPPED=$((SKIPPED + 1))
fi

# -- Smoke check: verify hook scripts are present --
echo ""
HOOK_SCRIPTS=("scripts/pre_tool_use.py" "scripts/session_start.py" "scripts/watcher.py" "scripts/status.py" "scripts/metrics.py" "scripts/session_export.py" ".claude-plugin/plugin.json" ".codex-plugin/plugin.json" ".cursor-plugin/plugin.json" ".copilot-plugin/plugin.json" "com.github.copilot/hooks/hooks.json" "com.github.copilot/agents/orchestrator.agent.md" ".opencode/commands/orchestrate.md" "assets/ATeam_full.png" "AGENTS.md" "CLAUDE.md" "plugin.json" "hooks/hooks.json")
MISSING_COUNT=0
for script in "${HOOK_SCRIPTS[@]}"; do
  if [ ! -f "$DEST/$script" ]; then
    echo -e "  ${RED}✗ $script — not found${RESET}"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done
if [ $MISSING_COUNT -gt 0 ]; then
  echo ""
  echo -e "  ${RED}${BOLD}Error:${RESET} $MISSING_COUNT enforcement script(s) missing."
  echo -e "  Security gate, watcher, metrics, and status line will be ${RED}inactive${RESET}."
  echo -e "  This is a bug — please report at github.com/RBraga01/a-team/issues"
  exit 1
else
  echo -e "  ${GREEN}✓${RESET} All enforcement scripts present"
fi

# -- Done --
echo ""
echo -e "${GREEN}${BOLD}Done.${RESET} $COPIED item(s) installed, $SKIPPED skipped."
echo ""
echo -e "${BOLD}Next steps:${RESET}"
echo -e "  1. Edit ${BLUE}INIT.md${RESET} — declare your languages, stack, and compliance scope"
echo -e "  2. Configure Claude Code, Codex, Cursor, OpenCode, or GitHub Copilot CLI"
echo -e "  3. Run ${BLUE}/orchestrate init${RESET}"
echo ""
