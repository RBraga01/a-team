/**
 * Suite: skill-triggering
 *
 * Verifies that the correct skills are invoked when specific situations arise.
 * These are the most important tests — they confirm A Team's Hard Gates work.
 *
 * Each test loads a fixture that describes a scenario, runs (or replays) the
 * session, and asserts that the mandatory skill was consulted.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runSession } from '../lib/session-runner.js'
import {
  assertSkillInvoked,
  assertSkillNotInvoked,
  assertSkillOrder,
  summariseSuite,
} from '../lib/assertions.js'
import { CostTracker } from '../lib/cost-tracker.js'
import { printSuite } from '../lib/reporter.js'

const MODE = process.env.TEST_MODE ?? 'replay'
const tracker = new CostTracker()

test('skill-triggering: new feature request triggers brainstorming', async () => {
  const transcript = await runSession('new-feature', { mode: MODE })
  tracker.record('new-feature', transcript)

  const results = [
    assertSkillInvoked(transcript, 'brainstorming'),
  ]

  const suite = summariseSuite('new feature → brainstorming', results)
  printSuite(suite)

  // The assertion that feeds into node:test's pass/fail
  const failed = results.filter(r => !r.pass)
  assert.equal(failed.length, 0, failed.map(r => r.message).join('\n'))
})

test('skill-triggering: brainstorming invoked before writing-plans', async () => {
  const transcript = await runSession('new-feature', { mode: MODE })

  const results = [
    assertSkillOrder(transcript, 'brainstorming', 'writing-plans'),
  ]

  const suite = summariseSuite('brainstorming before writing-plans', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('skill-triggering: bug report triggers debugger agent', async () => {
  const transcript = await runSession('bug-report', { mode: MODE })
  tracker.record('bug-report', transcript)

  const results = [
    assertSkillInvoked(transcript, 'systematic-debugging'),
  ]

  const suite = summariseSuite('bug report → systematic-debugging skill', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('skill-triggering: any code implementation triggers test-driven-development', async () => {
  const transcript = await runSession('implement-task', { mode: MODE })
  tracker.record('implement-task', transcript)

  const results = [
    assertSkillInvoked(transcript, 'test-driven-development'),
  ]

  const suite = summariseSuite('implementation → test-driven-development', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('skill-triggering: development start triggers using-git-worktrees', async () => {
  const transcript = await runSession('start-feature-dev', { mode: MODE })
  tracker.record('start-feature-dev', transcript)

  const results = [
    assertSkillInvoked(transcript, 'using-git-worktrees'),
  ]

  const suite = summariseSuite('dev start → using-git-worktrees', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('skill-triggering: writing-plans invoked after spec approval', async () => {
  const transcript = await runSession('spec-approved', { mode: MODE })
  tracker.record('spec-approved', transcript)

  const results = [
    assertSkillInvoked(transcript, 'writing-plans'),
  ]

  const suite = summariseSuite('spec approved → writing-plans', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

// Print cost summary when all tests in this suite complete
process.on('exit', () => {
  if (tracker.entries().length > 0) {
    process.stdout.write(tracker.formatReport())
  }
})
