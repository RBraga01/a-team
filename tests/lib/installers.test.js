import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const expectedPaths = [
  'plugin.json',
  'hooks/hooks.json',
  'AGENTS.md',
  'CLAUDE.md',
  '.claude',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  '.copilot-plugin/plugin.json',
  'com.github.copilot/agents/orchestrator.agent.md',
  'com.github.copilot/hooks/hooks.json',
  '.opencode/commands/orchestrate.md',
  'assets/ATeam_full.png',
  'skills',
  'hooks',
  'templates',
  'scripts',
  'scripts/pre_tool_use.py',
  'scripts/session_start.py',
  'scripts/process_utils.py',
  'scripts/watcher.py',
  'INIT.md',
]

function commandExists(command, args = ['--version']) {
  return spawnSync(command, args, { stdio: 'ignore' }).status === 0
}

function assertInstallation(result, destination) {
  assert.equal(
    result.status,
    0,
    `installer failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  )

  for (const path of expectedPaths) {
    assert.ok(existsSync(join(destination, path)), `${path} was not installed`)
  }
}

const bash = commandExists('bash')
  ? 'bash'
  : process.platform === 'win32' && existsSync('C:\\Program Files\\Git\\bin\\bash.exe')
    ? 'C:\\Program Files\\Git\\bin\\bash.exe'
    : null

test('Bash installer installs the complete distribution', { skip: !bash }, () => {
  const destination = mkdtempSync(join(tmpdir(), 'a-team-bash-install-'))
  try {
    const result = spawnSync(bash, [join(repoRoot, 'install.sh'), destination], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        A_TEAM_REPO_URL: pathToFileURL(repoRoot).href,
      },
    })
    assertInstallation(result, destination)
  } finally {
    rmSync(destination, { recursive: true, force: true })
  }
})

const powershell = commandExists('pwsh')
  ? 'pwsh'
  : commandExists('powershell', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion'])
    ? 'powershell'
    : null

test('PowerShell installer installs the complete distribution', { skip: !powershell }, () => {
  const destination = mkdtempSync(join(tmpdir(), 'a-team-powershell-install-'))
  try {
    const result = spawnSync(
      powershell,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(repoRoot, 'install.ps1'), '-Destination', destination],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          A_TEAM_REPO_URL: pathToFileURL(repoRoot).href,
        },
      },
    )
    assertInstallation(result, destination)
  } finally {
    rmSync(destination, { recursive: true, force: true })
  }
})

test('Bash installer preserves existing AGENTS.md and CLAUDE.md', { skip: !bash }, () => {
  const destination = mkdtempSync(join(tmpdir(), 'a-team-bash-guard-'))
  try {
    writeFileSync(join(destination, 'AGENTS.md'), 'CUSTOM AGENT POLICY\n')
    writeFileSync(join(destination, 'CLAUDE.md'), 'CUSTOM CLAUDE POLICY\n')
    const result = spawnSync(bash, [join(repoRoot, 'install.sh'), destination], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, A_TEAM_REPO_URL: pathToFileURL(repoRoot).href },
    })
    assertInstallation(result, destination)
    assert.equal(readFileSync(join(destination, 'AGENTS.md'), 'utf8'), 'CUSTOM AGENT POLICY\n')
    assert.equal(readFileSync(join(destination, 'CLAUDE.md'), 'utf8'), 'CUSTOM CLAUDE POLICY\n')
  } finally {
    rmSync(destination, { recursive: true, force: true })
  }
})

test('PowerShell installer preserves existing project instructions', { skip: !powershell }, () => {
  const destination = mkdtempSync(join(tmpdir(), 'a-team-pwsh-guard-'))
  try {
    writeFileSync(join(destination, 'AGENTS.md'), 'CUSTOM AGENT POLICY\n')
    writeFileSync(join(destination, 'CLAUDE.md'), 'CUSTOM CLAUDE POLICY\n')
    const result = spawnSync(
      powershell,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(repoRoot, 'install.ps1'), '-Destination', destination],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, A_TEAM_REPO_URL: pathToFileURL(repoRoot).href },
      },
    )
    assertInstallation(result, destination)
    assert.equal(readFileSync(join(destination, 'AGENTS.md'), 'utf8'), 'CUSTOM AGENT POLICY\n')
    assert.equal(readFileSync(join(destination, 'CLAUDE.md'), 'utf8'), 'CUSTOM CLAUDE POLICY\n')
  } finally {
    rmSync(destination, { recursive: true, force: true })
  }
})

test('Bash installer merges missing files in an existing .claude/ directory', { skip: !bash }, () => {
  const destination = mkdtempSync(join(tmpdir(), 'a-team-bash-merge-'))
  try {
    mkdirSync(join(destination, '.claude'))
    mkdirSync(join(destination, 'scripts'))
    writeFileSync(join(destination, '.claude', 'settings.json'), 'CUSTOM SETTINGS\n')
    writeFileSync(join(destination, 'scripts', 'custom_local.py'), 'KEEP ME\n')
    const result = spawnSync(bash, [join(repoRoot, 'install.sh'), destination], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, A_TEAM_REPO_URL: pathToFileURL(repoRoot).href },
    })
    assertInstallation(result, destination)
    assert.equal(readFileSync(join(destination, '.claude', 'settings.json'), 'utf8'), 'CUSTOM SETTINGS\n')
    assert.equal(readFileSync(join(destination, 'scripts', 'custom_local.py'), 'utf8'), 'KEEP ME\n')
    assert.ok(existsSync(join(destination, '.claude', 'agents', 'orchestrator.md')), 'agent profiles should be merged')
    assert.ok(existsSync(join(destination, 'scripts', 'pre_tool_use.py')), 'new scripts should be merged')
  } finally {
    rmSync(destination, { recursive: true, force: true })
  }
})

test('PowerShell installer merges missing files in an existing .claude/ directory', { skip: !powershell }, () => {
  const destination = mkdtempSync(join(tmpdir(), 'a-team-pwsh-merge-'))
  try {
    mkdirSync(join(destination, '.claude'))
    mkdirSync(join(destination, 'scripts'))
    writeFileSync(join(destination, '.claude', 'settings.json'), 'CUSTOM SETTINGS\n')
    writeFileSync(join(destination, 'scripts', 'custom_local.py'), 'KEEP ME\n')
    const result = spawnSync(
      powershell,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(repoRoot, 'install.ps1'), '-Destination', destination],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, A_TEAM_REPO_URL: pathToFileURL(repoRoot).href },
      },
    )
    assertInstallation(result, destination)
    assert.equal(readFileSync(join(destination, '.claude', 'settings.json'), 'utf8'), 'CUSTOM SETTINGS\n')
    assert.equal(readFileSync(join(destination, 'scripts', 'custom_local.py'), 'utf8'), 'KEEP ME\n')
    assert.ok(existsSync(join(destination, '.claude', 'agents', 'orchestrator.md')), 'agent profiles should be merged')
    assert.ok(existsSync(join(destination, 'scripts', 'pre_tool_use.py')), 'new scripts should be merged')
  } finally {
    rmSync(destination, { recursive: true, force: true })
  }
})
