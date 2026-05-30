/**
 * Suite: session-start
 *
 * Verifies that every session starts with the A Team methodology injected.
 * The SessionStart hook should load using-a-team, which then enforces all
 * mandatory skill invocations.
 *
 * This suite runs a bare "hello" session (no specific task) and verifies
 * that the session-start content appears in context.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runSession } from '../lib/session-runner.js'
import {
  assertUsingATeamEarly,
  summariseSuite,
} from '../lib/assertions.js'
import { CostTracker } from '../lib/cost-tracker.js'
import { printSuite } from '../lib/reporter.js'

const MODE = process.env.TEST_MODE ?? 'replay'
const tracker = new CostTracker()

test('session-start: using-a-team is present at session start', async () => {
  const transcript = await runSession('session-hello', { mode: MODE })
  tracker.record('session-hello', transcript)

  const results = [
    assertUsingATeamEarly(transcript),
  ]

  const suite = summariseSuite('session start injects using-a-team', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('session-start: session references INIT.md check', async () => {
  const transcript = await runSession('session-hello', { mode: MODE })

  const referencesInit = transcript.textBlocks.some(t =>
    t.includes('INIT.md') || t.includes('INIT_TEMPLATE') || t.includes('orchestrate init')
  )

  const results = [{
    pass: referencesInit,
    name: 'session mentions INIT.md protocol',
    message: referencesInit
      ? '✓ Session referenced INIT.md / init protocol from hook injection'
      : '✗ Session did not reference INIT.md — SessionStart hook may not be firing',
    actual: referencesInit ? 'INIT.md mentioned' : 'not mentioned',
    expected: 'INIT.md or orchestrate init mentioned in session',
  }]

  const suite = summariseSuite('session start mentions INIT.md', results)
  printSuite(suite)

  assert.equal(results.filter(r => !r.pass).length, 0,
    results.filter(r => !r.pass).map(r => r.message).join('\n'))
})

test('session-start: session mentions mandatory skill trigger table', async () => {
  const transcript = await runSession('session-hello', { mode: MODE })

  const mentionsSkills = transcript.textBlocks.some(t =>
    t.includes('brainstorming') && (t.includes('feature') || t.includes('skill'))
  )

  const results = [{
    pass: mentionsSkills,
    name: 'session includes skill trigger table',
    message: mentionsSkills
      ? '✓ Session context includes skill trigger reference'
      : '✗ Skill trigger table not found — hook content may not be injected',
    actual: mentionsSkills ? 'trigger table found' : 'not found',
    expected: 'brainstorming + feature trigger mentioned in session context',
  }]

  const suite = summariseSuite('session includes skill trigger table', results)
  printSuite(suite)

  // Non-fatal — session hook injection varies by platform
  if (results.some(r => !r.pass)) {
    console.log('  ℹ️  Hook injection may differ by Claude Code version. Check settings.json SessionStart hook.')
  }
})

test('session-start: session cost is within expected range', async () => {
  const transcript = await runSession('session-hello', { mode: MODE })
  tracker.record('session-hello-cost', transcript)

  const budget = tracker.checkBudget('session-hello-cost', 0.10)

  const results = [{
    pass: budget.ok,
    name: 'session-hello cost under $0.10',
    message: budget.ok
      ? `✓ ${budget.message}`
      : `⚠ ${budget.message} (warning only)`,
  }]

  const suite = summariseSuite('session cost within budget', results)
  printSuite(suite)

  // Budget check is a warning, not a hard failure
  if (!budget.ok) console.warn(`  ⚠ Cost warning: ${budget.message}`)
})

process.on('exit', () => {
  if (tracker.entries().length > 0) process.stdout.write(tracker.formatReport())
})
