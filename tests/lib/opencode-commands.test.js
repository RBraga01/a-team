import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DIR = join(ROOT, '.opencode', 'commands')
const expected = ['build-fix', 'code-review', 'debug', 'e2e', 'feature', 'orchestrate', 'plan', 'quality-gate', 'refactor', 'security-review']

test('OpenCode project slash-command roster is complete', () => {
  const names = readdirSync(DIR).filter(x => x.endsWith('.md')).map(x => x.slice(0,-3)).sort()
  assert.deepEqual(names, [...expected].sort())
})

for (const name of expected) {
  test(`OpenCode /${name} has native command metadata and forwards user arguments`, () => {
    const source = readFileSync(join(DIR, name + '.md'), 'utf8')
    assert.match(source, /^---\n(description: [^\n]+)\n---\n/)
    assert.ok(source.includes('$ARGUMENTS'), 'CLI arguments must not be lost')
    assert.doesNotMatch(source, /\binvokes?\b[^\n]*native agent/i)
  })
}

test('OpenCode /orchestrate names all operations and enforces human approval', () => {
  const src = readFileSync(join(DIR, 'orchestrate.md'), 'utf8')
  for (const verb of ['init','morning','tick','report']) assert.match(src, new RegExp('\\b'+verb+'\\b'))
  assert.match(src, /human approval/i)
})
