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
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..', '..')

const PLATFORM_MANIFESTS = [
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  '.copilot-plugin/plugin.json',
]

const REQUIRED_FIELDS = ['name', 'description', 'version', 'author', 'license']

function readJson(absolutePath) {
  return JSON.parse(readFileSync(absolutePath, 'utf8'))
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

test('manifests that declare a hooks file: file exists and parses as JSON', () => {
  for (const manifestPath of PLATFORM_MANIFESTS) {
    const manifestAbsDir = dirname(join(ROOT, manifestPath))
    const json = readJson(join(ROOT, manifestPath))
    if (typeof json.hooks !== 'string') continue
    const hookAbsPath = json.hooks.startsWith('/')
      ? json.hooks
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
