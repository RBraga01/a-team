import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const inputPath = process.argv[2]
assert.ok(inputPath, 'Pass the path to output of: opencode debug config')
const raw = readFileSync(inputPath, 'utf8').trim()
let config
try {
  config = JSON.parse(raw)
} catch {
  console.error('OpenCode debug config did not produce parseable JSON:', raw.slice(0, 1000))
  process.exit(1)
}
const commands = config.commands ?? config.command ?? {}
const expected = ['build-fix', 'code-review', 'debug', 'e2e', 'feature', 'orchestrate', 'plan', 'quality-gate', 'refactor', 'security-review']
console.log('OpenCode config command keys:', Object.keys(commands).sort())
for (const name of expected) {
  assert.ok(commands[name], `OpenCode did not discover /${name}`)
  const template = commands[name].template ?? ''
  assert.ok(template.includes('A Team') || template.includes('request:') || template.includes('scope:') || template.includes('Failure to investigate'),
    `/${name}: unexpected prompt template`)
}
console.log('PASS: OpenCode discovered all 10 A Team command templates')
