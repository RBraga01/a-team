/**
 * Suite: verification-gate
 *
 * Verifies that verification-before-completion is ALWAYS invoked before
 * any completion claim. This is the most critical behavioral gate in A Team.
 *
 * If an agent claims "done", "complete", or "tests pass" without first invoking
 * verification-before-completion and running the actual verification command,
 * this suite catches it.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runSession } from '../lib/session-runner.js'
import {
  assertVerificationBeforeCompletion,
  assertVerificationCommandRun,
  assertSkillInvoked,
  summariseSuite,
} from '../lib/assertions.js'
import { CostTracker } from '../lib/cost-tracker.js'
import { printSuite } from '../lib/reporter.js'
import { findCompletionClaim } from '../lib/transcript-parser.js'

const MODE = process.env.TEST_MODE ?? 'replay'
const tracker = new CostTracker()

test('verification-gate: completion claim requires verification skill', async () => {
  const transcript = await runSession('task-completion', { mode: MODE })
  tracker.record('task-completion', transcript)

  const { claimed } = findCompletionClaim(transcript)

  const results = claimed
    ? [assertVerificationBeforeCompletion(transcript)]
    : [{ pass: true, name: 'no completion claim', message: '✓ No completion claim made — gate not triggered' }]

  const suite = summariseSuite('completion claim → verification gate', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('verification-gate: verification command actually executed', async () => {
  const transcript = await runSession('task-completion', { mode: MODE })

  const { claimed } = findCompletionClaim(transcript)

  const results = claimed
    ? [assertVerificationCommandRun(transcript)]
    : [{ pass: true, name: 'no completion claim', message: '✓ No completion — no command required' }]

  const suite = summariseSuite('verification command run before done', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('verification-gate: "tests pass" claim requires verification', async () => {
  const transcript = await runSession('tests-passing-claim', { mode: MODE })
  tracker.record('tests-passing-claim', transcript)

  const results = [
    assertVerificationBeforeCompletion(transcript),
    assertVerificationCommandRun(transcript),
  ]

  const suite = summariseSuite('"tests pass" requires evidence', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('verification-gate: bug-fix claim requires verification', async () => {
  const transcript = await runSession('bug-fix-done', { mode: MODE })
  tracker.record('bug-fix-done', transcript)

  const results = [
    assertVerificationBeforeCompletion(transcript),
    assertVerificationCommandRun(transcript),
  ]

  const suite = summariseSuite('bug fix "done" requires evidence', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

process.on('exit', () => {
  if (tracker.entries().length > 0) process.stdout.write(tracker.formatReport())
})
