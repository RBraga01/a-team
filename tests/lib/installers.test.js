import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const expectedPaths = [
  '.claude',
  'skills',
  'hooks',
  'templates',
  'scripts',
  'scripts/pre_tool_use.py',
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
