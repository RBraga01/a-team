/**
 * Suite: tdd-enforcement
 *
 * Verifies that the TDD discipline is applied correctly:
 * - test-driven-development skill is invoked before implementation
 * - RED phase (failing test) appears before GREEN phase (passing test)
 * - Tests are written before code (not after)
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runSession } from '../lib/session-runner.js'
import {
  assertTddSkillUsed,
  assertRedBeforeGreen,
  assertSkillOrder,
  assertVerificationCommandRun,
  summariseSuite,
} from '../lib/assertions.js'
import { CostTracker } from '../lib/cost-tracker.js'
import { printSuite } from '../lib/reporter.js'

const MODE = process.env.TEST_MODE ?? 'replay'
const tracker = new CostTracker()

test('tdd-enforcement: implementation uses test-driven-development skill', async () => {
  const transcript = await runSession('implement-task', { mode: MODE })
  tracker.record('implement-task-tdd', transcript)

  const results = [
    assertTddSkillUsed(transcript),
  ]

  const suite = summariseSuite('implementation → TDD skill invoked', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('tdd-enforcement: RED phase before GREEN phase', async () => {
  const transcript = await runSession('implement-task', { mode: MODE })

  const results = [
    assertRedBeforeGreen(transcript),
  ]

  const suite = summariseSuite('RED (fail) before GREEN (pass)', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('tdd-enforcement: test-driven-development before executing-plans', async () => {
  const transcript = await runSession('plan-execution', { mode: MODE })
  tracker.record('plan-execution-tdd', transcript)

  const results = [
    assertSkillOrder(transcript, 'test-driven-development', 'verification-before-completion'),
  ]

  const suite = summariseSuite('TDD before completion claim', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('tdd-enforcement: bug fix uses TDD (failing test first)', async () => {
  const transcript = await runSession('bug-fix', { mode: MODE })
  tracker.record('bug-fix-tdd', transcript)

  const results = [
    assertTddSkillUsed(transcript),
    assertRedBeforeGreen(transcript),
  ]

  const suite = summariseSuite('bug fix → TDD with RED first', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('tdd-enforcement: coverage check run before completion', async () => {
  const transcript = await runSession('implement-task', { mode: MODE })

  const results = [
    assertVerificationCommandRun(transcript),
  ]

  const suite = summariseSuite('coverage/test command run before done', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

process.on('exit', () => {
  if (tracker.entries().length > 0) process.stdout.write(tracker.formatReport())
})
