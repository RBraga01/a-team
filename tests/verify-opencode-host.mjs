import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const path = process.argv[2]
assert.ok(path, 'Pass output of GET /api/command from a running OpenCode v2 server')
const raw = readFileSync(path, 'utf8').trim()
let payload
try { payload = JSON.parse(raw) } catch {
  console.error('OpenCode API returned invalid JSON:', raw.slice(0, 700))
  process.exit(1)
}
const list = Array.isArray(payload) ? payload : payload.data
assert.ok(Array.isArray(list), 'Expected OpenCode command.list API response with a data array')
const commands = Object.fromEntries(list.filter(x => x && x.name).map(x => [x.name, x]))
const expected = ['build-fix', 'code-review', 'debug', 'e2e', 'feature', 'orchestrate', 'plan', 'quality-gate', 'refactor', 'security-review']
console.log('OpenCode API discovered commands:', Object.keys(commands).sort())
for (const name of expected) {
  assert.ok(commands[name], `OpenCode did not discover /${name}`)
  assert.ok(typeof commands[name].template === 'string', `/${name}: template missing`)
  assert.ok(commands[name].template.includes('$ARGUMENTS'), `/${name}: arguments not forwarded`)
}
console.log('PASS: OpenCode v2 discovered all 10 A Team native command definitions')
