/**
 * Suite: agent-routing
 *
 * Verifies that the right specialist agents are dispatched based on the
 * type of task or file change. Language reviewers, security reviewer,
 * code reviewer, and parallel dispatch are all tested here.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runSession } from '../lib/session-runner.js'
import {
  assertAgentDispatched,
  assertLanguageReviewerDispatched,
  assertParallelDispatch,
  assertSkillInvoked,
  summariseSuite,
} from '../lib/assertions.js'
import { CostTracker } from '../lib/cost-tracker.js'
import { printSuite } from '../lib/reporter.js'

const MODE = process.env.TEST_MODE ?? 'replay'
const tracker = new CostTracker()

test('agent-routing: code change dispatches code-reviewer', async () => {
  const transcript = await runSession('code-written', { mode: MODE })
  tracker.record('code-written', transcript)

  const results = [
    assertAgentDispatched(transcript, 'code-reviewer'),
  ]

  const suite = summariseSuite('code change → code-reviewer', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('agent-routing: auth code change dispatches security-reviewer', async () => {
  const transcript = await runSession('auth-code-change', { mode: MODE })
  tracker.record('auth-code-change', transcript)

  const results = [
    assertAgentDispatched(transcript, 'security-reviewer'),
  ]

  const suite = summariseSuite('auth code → security-reviewer', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('agent-routing: .go file change dispatches go-reviewer', async () => {
  const transcript = await runSession('go-code-change', { mode: MODE })
  tracker.record('go-code-change', transcript)

  const results = [
    assertLanguageReviewerDispatched(transcript, '.go'),
  ]

  const suite = summariseSuite('Go change → go-reviewer', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('agent-routing: .py file change dispatches python-reviewer', async () => {
  const transcript = await runSession('python-code-change', { mode: MODE })
  tracker.record('python-code-change', transcript)

  const results = [
    assertLanguageReviewerDispatched(transcript, '.py'),
  ]

  const suite = summariseSuite('Python change → python-reviewer', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('agent-routing: .rs file change dispatches rust-reviewer', async () => {
  const transcript = await runSession('rust-code-change', { mode: MODE })
  tracker.record('rust-code-change', transcript)

  const results = [
    assertLanguageReviewerDispatched(transcript, '.rs'),
  ]

  const suite = summariseSuite('Rust change → rust-reviewer', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('agent-routing: SQL migration dispatches database-reviewer', async () => {
  const transcript = await runSession('sql-migration', { mode: MODE })
  tracker.record('sql-migration', transcript)

  const results = [
    assertLanguageReviewerDispatched(transcript, '.sql'),
  ]

  const suite = summariseSuite('SQL migration → database-reviewer', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('agent-routing: independent failures use parallel dispatch', async () => {
  const transcript = await runSession('multiple-independent-failures', { mode: MODE })
  tracker.record('multiple-independent-failures', transcript)

  const results = [
    assertSkillInvoked(transcript, 'dispatching-parallel-agents'),
    assertParallelDispatch(transcript, 2),
  ]

  const suite = summariseSuite('independent failures → parallel dispatch', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

process.on('exit', () => {
  if (tracker.entries().length > 0) process.stdout.write(tracker.formatReport())
})
