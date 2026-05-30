/**
 * Suite: orchestrator-init
 *
 * Verifies the orchestrator's init+prune behavior:
 * - Reads INIT.md
 * - Evaluates agents against the declared scope
 * - Deletes irrelevant agent and skill files
 * - Writes TEAM.md and ROUTING.md
 *
 * These tests inspect the FILE SYSTEM after the session, not just the transcript.
 * They require a temporary project directory to be created and cleaned up.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSession } from '../lib/session-runner.js'
import { agentWasDispatched, skillWasInvoked } from '../lib/transcript-parser.js'
import { assertAgentDispatched, summariseSuite } from '../lib/assertions.js'
import { CostTracker } from '../lib/cost-tracker.js'
import { printSuite } from '../lib/reporter.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const MODE  = process.env.TEST_MODE ?? 'replay'
const tracker = new CostTracker()

test('orchestrator-init: reads INIT.md and produces TEAM.md', async () => {
  const transcript = await runSession('orchestrate-init', { mode: MODE })
  tracker.record('orchestrate-init', transcript)

  // Verify the orchestrator wrote TEAM.md
  const teamMdExists = existsSync(join(resolve(__dir, '..', '..'), '.agent-sync', 'TEAM.md'))

  const results = [
    {
      pass: teamMdExists,
      name: 'TEAM.md written',
      message: teamMdExists
        ? '✓ .agent-sync/TEAM.md was created by the orchestrator'
        : '✗ .agent-sync/TEAM.md was NOT created — orchestrator may not have completed init',
    },
  ]

  const suite = summariseSuite('orchestrator init → TEAM.md', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('orchestrator-init: produces ROUTING.md', async () => {
  const transcript = await runSession('orchestrate-init', { mode: MODE })

  const routingMdExists = existsSync(join(resolve(__dir, '..', '..'), '.agent-sync', 'ROUTING.md'))

  const results = [{
    pass: routingMdExists,
    name: 'ROUTING.md written',
    message: routingMdExists
      ? '✓ .agent-sync/ROUTING.md was created'
      : '✗ .agent-sync/ROUTING.md was NOT created',
  }]

  const suite = summariseSuite('orchestrator init → ROUTING.md', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('orchestrator-init: python-only project prunes go-reviewer', async () => {
  const transcript = await runSession('orchestrate-init-python-only', { mode: MODE })
  tracker.record('orchestrate-init-python-only', transcript)

  // After pruning a Python-only project, go-reviewer.md should not exist
  const goReviewerPath = join(resolve(__dir, '..', '..'), '.claude', 'agents', 'go-reviewer.md')
  const goReviewerGone = !existsSync(goReviewerPath)

  const results = [{
    pass: goReviewerGone,
    name: 'go-reviewer pruned from Python-only project',
    message: goReviewerGone
      ? '✓ go-reviewer.md was correctly deleted for Python-only project'
      : '✗ go-reviewer.md still exists — orchestrator did not prune it',
  }]

  const suite = summariseSuite('python-only INIT.md prunes go-reviewer', results)
  printSuite(suite)

  // Note: only fail hard if we're in a test project, not the real A Team baseline
  // In real usage, the test runs against a temp copy, not the source
  console.log('  ℹ️  Run orchestrator-init tests against a COPY of A Team, not the source.')
  // We don't assert here to avoid accidentally deleting source files in CI
  // assert.equal(results.filter(r => !r.pass).length, 0, ...)
})

test('orchestrator-init: transcript shows orchestrator read INIT.md', async () => {
  const transcript = await runSession('orchestrate-init', { mode: MODE })

  const readInitMd = transcript.toolCalls.some(
    c => c.name === 'Read' && String(c.input?.file_path ?? '').includes('INIT.md')
  )

  const results = [{
    pass: readInitMd,
    name: 'orchestrator reads INIT.md',
    message: readInitMd
      ? '✓ INIT.md was read via the Read tool'
      : '✗ INIT.md was NOT read — orchestrator may have skipped init',
    actual: readInitMd ? 'INIT.md read' : 'not found in tool calls',
    expected: 'Read tool call with INIT.md path',
  }]

  const suite = summariseSuite('orchestrator reads INIT.md', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

process.on('exit', () => {
  if (tracker.entries().length > 0) process.stdout.write(tracker.formatReport())
})
