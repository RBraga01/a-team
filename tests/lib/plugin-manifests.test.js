/**
 * Suite: plugin-manifests
 *
 * Structural validation of every per-platform plugin manifest. Catches drift
 * that's easy to introduce when adding a new agent, skill, or platform:
 *  - manifest is parseable JSON
 *  - required fields present
 *  - plugin name is "a-team" everywhere
 *  - versions are in lockstep (a stale version means a platform falls behind)
 *  - referenced hooks files exist and are themselves valid JSON
 *
 * Pure file/JSON validation — no transcript replay, no API calls.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..', '..')

const PLATFORM_MANIFESTS = [
  'plugin.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  '.copilot-plugin/plugin.json',
]

const REQUIRED_FIELDS = ['name', 'description', 'version', 'author', 'license']

function readJson(absolutePath) {
  return JSON.parse(readFileSync(absolutePath, 'utf8'))
}

function asArray(value) {
  return Array.isArray(value) ? value : [value]
}

for (const manifestPath of PLATFORM_MANIFESTS) {
  test(`platform manifest is parseable JSON: ${manifestPath}`, () => {
    const full = join(ROOT, manifestPath)
    assert.ok(existsSync(full), `${manifestPath} not found`)
    assert.doesNotThrow(() => readJson(full), `${manifestPath} should be valid JSON`)
  })

  test(`platform manifest has required fields: ${manifestPath}`, () => {
    const json = readJson(join(ROOT, manifestPath))
    for (const field of REQUIRED_FIELDS) {
      assert.ok(json[field], `${manifestPath} missing required field: ${field}`)
    }
  })
}

test('all platform manifests share the plugin name "a-team"', () => {
  for (const manifestPath of PLATFORM_MANIFESTS) {
    const json = readJson(join(ROOT, manifestPath))
    assert.equal(json.name, 'a-team', `${manifestPath} name should be "a-team"`)
  }
})

test('all platform manifest versions are in lockstep', () => {
  const versions = PLATFORM_MANIFESTS.map((p) => readJson(join(ROOT, p)).version)
  const unique = new Set(versions)
  const detail = Object.fromEntries(PLATFORM_MANIFESTS.map((p, i) => [p, versions[i]]))
  assert.equal(
    unique.size,
    1,
    `Manifest versions diverged — bump them together: ${JSON.stringify(detail)}`,
  )
})

test('marketplace.json a-team entry matches .claude-plugin/plugin.json version', () => {
  const marketplace = readJson(join(ROOT, '.claude-plugin/marketplace.json'))
  const aTeam = marketplace.plugins.find((p) => p.name === 'a-team')
  assert.ok(aTeam, 'marketplace.json should list a "a-team" plugin entry')
  const pluginVersion = readJson(join(ROOT, '.claude-plugin/plugin.json')).version
  assert.equal(
    aTeam.version,
    pluginVersion,
    `marketplace.json a-team version (${aTeam.version}) drifted from .claude-plugin/plugin.json version (${pluginVersion})`,
  )
})

test('Claude marketplace external packs use GitHub source objects', () => {
  const market = readJson(join(ROOT, '.claude-plugin', 'marketplace.json'))
  for (const entry of market.plugins.filter((plugin) => plugin.name !== 'a-team')) {
    assert.deepEqual(entry.source, { source: 'github', repo: `RBraga01/${entry.name}` })
  }
})

test('Claude plugin registers all canonical agents and project commands', () => {
  const manifest = readJson(join(ROOT, '.claude-plugin', 'plugin.json'))
  const agentNames = readdirSync(join(ROOT, '.claude', 'agents')).filter((name) => name.endsWith('.md')).sort()
  assert.deepEqual(manifest.agents.slice().sort(), agentNames.map((name) => `./.claude/agents/${name}`))
  assert.equal(manifest.commands, './.claude/commands/')
})

test('manifests that declare a hooks file: file exists and parses as JSON', () => {
  for (const manifestPath of PLATFORM_MANIFESTS) {
    const manifestAbsDir = dirname(join(ROOT, manifestPath))
    const json = readJson(join(ROOT, manifestPath))
    if (typeof json.hooks !== 'string') continue
    const hookAbsPath = json.hooks.startsWith('/')
      ? json.hooks
      : manifestPath === '.cursor-plugin/plugin.json' || manifestPath === '.codex-plugin/plugin.json'
        ? join(ROOT, json.hooks)
        : join(manifestAbsDir, json.hooks)
    assert.ok(
      existsSync(hookAbsPath),
      `Hook file referenced by ${manifestPath} not found at ${json.hooks}`,
    )
    assert.doesNotThrow(
      () => readJson(hookAbsPath),
      `Hook file ${json.hooks} (referenced by ${manifestPath}) should be valid JSON`,
    )
  }
})

test('GitHub Copilot CLI install command uses the portable repository root', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
  const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8')
  assert.match(readme, /copilot plugin install RBraga01\/a-team(?:\s|`|$)/m)
  assert.match(changelog, /copilot plugin install RBraga01\/a-team(?:\s|`|$)/m)
  assert.doesNotMatch(readme, /copilot plugin install RBraga01\/a-team:\.copilot-plugin/)
})

test('Copilot portable package has synced native agents and hooks', () => {
  const source = join(ROOT, '.claude', 'agents')
  const output = join(ROOT, 'com.github.copilot', 'agents')
  const sourceNames = readdirSync(source).filter((name) => name.endsWith('.md')).sort()
  const outputNames = readdirSync(output).filter((name) => name.endsWith('.agent.md')).sort()
  assert.equal(sourceNames.length, 26)
  assert.deepEqual(outputNames, sourceNames.map((name) => name.replace(/\.md$/, '.agent.md')))
  for (const name of outputNames) {
    const content = readFileSync(join(output, name), 'utf8')
    assert.match(content, /^---\nname: [a-z0-9-]+\ndescription: ".+"\n---\n/s)
  }
  const hooks = readJson(join(ROOT, 'com.github.copilot', 'hooks', 'hooks.json'))
  assert.deepEqual(Object.keys(hooks.hooks).sort(), ['PostToolUse', 'PreToolUse', 'SessionEnd', 'SessionStart'].sort())
})

test('skill descriptions containing colon-space are valid YAML strings', () => {
  for (const name of ['brainstorming', 'incident-response']) {
    const content = readFileSync(join(ROOT, 'skills', name, 'SKILL.md'), 'utf8')
    assert.match(content, /^---\r?\nname: [^\r\n]+\r?\ndescription: "[^"\r\n]+"\r?\n---/)
  }
})

test('GitHub Copilot CLI manifest component paths resolve inside the repository', () => {
  const manifestPath = '.copilot-plugin/plugin.json'
  const manifestAbsPath = join(ROOT, manifestPath)
  const manifestAbsDir = dirname(manifestAbsPath)
  const json = readJson(manifestAbsPath)

  for (const field of ['agents', 'skills', 'hooks']) {
    assert.ok(json[field], `${manifestPath} should declare ${field}`)
    for (const relativePath of asArray(json[field])) {
      const resolved = normalize(join(manifestAbsDir, relativePath))
      assert.ok(
        existsSync(resolved),
        `${manifestPath} ${field} path should exist: ${relativePath}`,
      )
    }
  }
})

test('GitHub Copilot CLI hooks use the supported config-file shape', () => {
  const hooks = readJson(join(ROOT, '.copilot-plugin', 'hooks', 'hooks.json'))
  const expectedEvents = ['SessionStart', 'PreToolUse', 'PostToolUse', 'SessionEnd']

  assert.equal(hooks.version, 1, 'Copilot hooks config should declare version: 1')
  assert.deepEqual(Object.keys(hooks.hooks).sort(), expectedEvents.sort())

  for (const eventName of expectedEvents) {
    assert.ok(Array.isArray(hooks.hooks[eventName]), `${eventName} should be an array`)
    assert.ok(hooks.hooks[eventName].length > 0, `${eventName} should declare at least one hook`)

    for (const entry of hooks.hooks[eventName]) {
      assert.equal(entry.type, 'command', `${eventName} hooks should be command hooks`)
      assert.ok(
        entry.command || entry.bash || entry.powershell,
        `${eventName} hook should declare command, bash, or powershell`,
      )
      assert.equal(
        entry.hooks,
        undefined,
        `${eventName} should use direct Copilot hook entries, not nested Claude hooks`,
      )
    }
  }
})


test('Codex and Cursor component paths stay inside the distribution root', () => {
  const mapping = [
    ['.codex-plugin/plugin.json', ['skills', 'hooks']],
    ['.cursor-plugin/plugin.json', ['skills', 'agents', 'rules', 'hooks']],
  ]
  for (const [manifestPath, fields] of mapping) {
    const json = readJson(join(ROOT, manifestPath))
    for (const field of fields) {
      assert.ok(typeof json[field] === 'string', `${manifestPath}: missing ${field}`)
      assert.ok(json[field].startsWith('./'), `${manifestPath}: ${field} must start with ./`)
      assert.ok(!json[field].split('/').includes('..'), `${manifestPath}: ${field} must not escape plugin root`)
      assert.ok(existsSync(join(ROOT, json[field])), `${manifestPath}: ${field} target not found`)
    }
  }
  const portable = readJson(join(ROOT, 'plugin.json'))
  assert.equal(portable.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
  assert.equal(portable.name, 'a-team')
  const codex = readJson(join(ROOT, '.codex-plugin/plugin.json'))
  assert.equal(codex.interface.composerIcon, './assets/ATeam_full.png')
  assert.ok(existsSync(join(ROOT, codex.interface.composerIcon)))
})

test('portable manifest and Codex overlay use a single root hooks file', () => {
  const portable = readJson(join(ROOT, 'plugin.json'))
  const overlay = readJson(join(ROOT, '.codex-plugin', 'plugin.json'))
  assert.equal(portable.version, overlay.version)
  assert.equal(overlay.skills, './skills/')
  assert.equal(overlay.hooks, './hooks/hooks.json')
  assert.ok(existsSync(join(ROOT, 'hooks', 'hooks.json')))
  const hooks = readJson(join(ROOT, 'hooks', 'hooks.json'))
  assert.ok(Array.isArray(hooks.hooks.SessionStart))
  assert.match(JSON.stringify(hooks), /PLUGIN_ROOT/)
  assert.ok(!existsSync(join(ROOT, '.codex-plugin', 'hooks', 'hooks.json')),
    'old duplicate Codex hooks file should not be shipped')
})

test('Codex marketplace advertises the repository-root plugin', () => {
  const market = readJson(join(ROOT, '.agents', 'plugins', 'marketplace.json'))
  const plugin = market.plugins.find((entry) => entry.name === 'a-team')
  assert.ok(plugin)
  assert.equal(plugin.source.source, 'local')
  assert.equal(plugin.source.path, './')
  assert.equal(plugin.policy.installation, 'AVAILABLE')
})
