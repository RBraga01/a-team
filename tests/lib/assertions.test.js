/**
 * Unit tests for assertions.js
 *
 * Verifies each assertion function produces the correct pass/fail result
 * using mock transcripts — no API calls required.
 *
 * Run: node --test lib/assertions.test.js
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { parseTranscriptString } from './transcript-parser.js'
import {
  assertSkillInvoked,
  assertSkillNotInvoked,
  assertSkillOrder,
  assertAgentDispatched,
  assertParallelDispatch,
  assertVerificationBeforeCompletion,
  assertVerificationCommandRun,
  assertTddSkillUsed,
  assertRedBeforeGreen,
  assertUsingATeamEarly,
  assertLanguageReviewerDispatched,
} from './assertions.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const init = JSON.stringify({ type: 'system', subtype: 'init', session_id: 'x', model: 'm' })
const result = JSON.stringify({ type: 'result', subtype: 'success', cost_usd: 0.01, input_tokens: 100, output_tokens: 50 })

const turn = (blocks) => JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: blocks } })
const text = (t) => ({ type: 'text', text: t })
const skill = (s, id = 'si') => ({ type: 'tool_use', id, name: 'Skill', input: { skill: s } })
const agent = (a, id = 'ai') => ({ type: 'tool_use', id, name: 'Agent', input: { subagent_type: a } })
const bash  = (cmd, id = 'bi') => ({ type: 'tool_use', id, name: 'Bash', input: { command: cmd } })

const t = (...lines) => parseTranscriptString([init, ...lines, result].join('\n'))

// ─── assertSkillInvoked ───────────────────────────────────────────────────────

describe('assertSkillInvoked', () => {
  test('passes when skill was invoked', () => {
    const transcript = t(turn([skill('brainstorming')]))
    const r = assertSkillInvoked(transcript, 'brainstorming')
    assert.equal(r.pass, true)
  })

  test('fails when skill was not invoked', () => {
    const transcript = t(turn([skill('writing-plans')]))
    const r = assertSkillInvoked(transcript, 'brainstorming')
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('NOT invoked'))
  })
})

// ─── assertSkillNotInvoked ────────────────────────────────────────────────────

describe('assertSkillNotInvoked', () => {
  test('passes when skill is absent', () => {
    const transcript = t(turn([skill('brainstorming')]))
    const r = assertSkillNotInvoked(transcript, 'writing-plans')
    assert.equal(r.pass, true)
  })

  test('fails when skill is present', () => {
    const transcript = t(turn([skill('brainstorming')]))
    const r = assertSkillNotInvoked(transcript, 'brainstorming')
    assert.equal(r.pass, false)
  })
})

// ─── assertSkillOrder ─────────────────────────────────────────────────────────

describe('assertSkillOrder', () => {
  test('passes when first skill appears before second', () => {
    const transcript = t(turn([skill('brainstorming', 's1'), skill('writing-plans', 's2')]))
    const r = assertSkillOrder(transcript, 'brainstorming', 'writing-plans')
    assert.equal(r.pass, true)
  })

  test('fails when order is reversed', () => {
    const transcript = t(turn([skill('writing-plans', 's1'), skill('brainstorming', 's2')]))
    const r = assertSkillOrder(transcript, 'brainstorming', 'writing-plans')
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('AFTER'))
  })

  test('fails when first skill is missing', () => {
    const transcript = t(turn([skill('writing-plans', 's1')]))
    const r = assertSkillOrder(transcript, 'brainstorming', 'writing-plans')
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('never invoked'))
  })

  test('fails when second skill is missing', () => {
    const transcript = t(turn([skill('brainstorming', 's1')]))
    const r = assertSkillOrder(transcript, 'brainstorming', 'writing-plans')
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('never invoked'))
  })
})

// ─── assertAgentDispatched ────────────────────────────────────────────────────

describe('assertAgentDispatched', () => {
  test('passes when agent was dispatched', () => {
    const transcript = t(turn([agent('code-reviewer')]))
    const r = assertAgentDispatched(transcript, 'code-reviewer')
    assert.equal(r.pass, true)
  })

  test('fails when agent was not dispatched', () => {
    const transcript = t(turn([agent('code-reviewer')]))
    const r = assertAgentDispatched(transcript, 'security-reviewer')
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('NOT dispatched'))
    assert.deepEqual(r.actual, ['code-reviewer'])
  })
})

// ─── assertParallelDispatch ───────────────────────────────────────────────────

describe('assertParallelDispatch', () => {
  test('passes when 2 agents dispatched in same turn', () => {
    const transcript = t(turn([agent('code-reviewer', 'a1'), agent('security-reviewer', 'a2')]))
    const r = assertParallelDispatch(transcript, 2)
    assert.equal(r.pass, true)
  })

  test('fails when agents dispatched in separate turns', () => {
    const transcript = t(
      turn([agent('code-reviewer', 'a1')]),
      turn([agent('security-reviewer', 'a2')])
    )
    const r = assertParallelDispatch(transcript, 2)
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('Max agents'))
  })

  test('passes with higher count requirement when met', () => {
    const transcript = t(turn([agent('a1', 'x1'), agent('a2', 'x2'), agent('a3', 'x3')]))
    assert.equal(assertParallelDispatch(transcript, 3).pass, true)
    assert.equal(assertParallelDispatch(transcript, 4).pass, false)
  })
})

// ─── assertVerificationBeforeCompletion ──────────────────────────────────────

describe('assertVerificationBeforeCompletion', () => {
  test('passes when verification skill present and completion claimed', () => {
    const transcript = t(
      turn([skill('verification-before-completion', 's1')]),
      turn([text('Task complete. Done!')])
    )
    const r = assertVerificationBeforeCompletion(transcript)
    assert.equal(r.pass, true)
  })

  test('fails when completion claimed without verification skill', () => {
    const transcript = t(turn([text('The implementation is done and complete!')]))
    const r = assertVerificationBeforeCompletion(transcript)
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('without invoking verification'))
  })

  test('passes trivially when no completion claim is made', () => {
    const transcript = t(turn([text('I am working on step 1.')]))
    const r = assertVerificationBeforeCompletion(transcript)
    assert.equal(r.pass, true)
    assert.ok(r.message.includes('No completion claim'))
  })
})

// ─── assertVerificationCommandRun ────────────────────────────────────────────

describe('assertVerificationCommandRun', () => {
  const verificationCommands = [
    'npm test',
    'npm run test',
    'npx vitest run',
    'npx tsc --noEmit',
    'pytest',
    'go test ./...',
    'cargo test',
  ]

  for (const cmd of verificationCommands) {
    test(`passes for verification command: "${cmd}"`, () => {
      const transcript = t(turn([bash(cmd)]))
      const r = assertVerificationCommandRun(transcript)
      assert.equal(r.pass, true, `Expected "${cmd}" to be recognised as a verification command`)
    })
  }

  test('fails when only non-verification bash commands run', () => {
    const transcript = t(turn([bash('git status'), bash('ls -la')]))
    const r = assertVerificationCommandRun(transcript)
    assert.equal(r.pass, false)
  })

  test('fails when no bash commands run at all', () => {
    const transcript = t(turn([text('Here is the implementation...')]))
    const r = assertVerificationCommandRun(transcript)
    assert.equal(r.pass, false)
  })
})

// ─── assertTddSkillUsed ───────────────────────────────────────────────────────

describe('assertTddSkillUsed', () => {
  test('passes when test-driven-development skill invoked', () => {
    const transcript = t(turn([skill('test-driven-development')]))
    assert.equal(assertTddSkillUsed(transcript).pass, true)
  })

  test('fails when skill missing', () => {
    const transcript = t(turn([text('Writing the code now...')]))
    assert.equal(assertTddSkillUsed(transcript).pass, false)
  })
})

// ─── assertRedBeforeGreen ─────────────────────────────────────────────────────

describe('assertRedBeforeGreen', () => {
  test('passes when failure text appears before pass text', () => {
    const transcript = t(
      turn([text('Running tests: 1 failing, 0 passing')]),
      turn([text('After fix: 1 passing, 0 failing ✓')])
    )
    const r = assertRedBeforeGreen(transcript)
    assert.equal(r.pass, true)
  })

  test('fails when only green phase observed', () => {
    const transcript = t(turn([text('All tests passing: 5 passed, 0 failed ✓')]))
    const r = assertRedBeforeGreen(transcript)
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('No RED phase'))
  })

  test('fails when red but no green follows', () => {
    const transcript = t(turn([text('Tests failing: assertion error in line 42')]))
    const r = assertRedBeforeGreen(transcript)
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('no GREEN'))
  })
})

// ─── assertUsingATeamEarly ────────────────────────────────────────────────────

describe('assertUsingATeamEarly', () => {
  test('passes when using-a-team skill in first 3 tool calls', () => {
    const transcript = t(turn([
      bash('git status', 'b1'),
      skill('using-a-team', 's1'),
    ]))
    const r = assertUsingATeamEarly(transcript)
    assert.equal(r.pass, true)
  })

  test('passes when A Team mentioned in text (hook injection)', () => {
    const transcript = t(turn([text('A Team is active. INIT.md check: file exists.')]))
    const r = assertUsingATeamEarly(transcript)
    assert.equal(r.pass, true)
  })

  test('fails when using-a-team is absent and not mentioned', () => {
    const transcript = t(turn([text('Hello, how can I help you today?')]))
    const r = assertUsingATeamEarly(transcript)
    assert.equal(r.pass, false)
  })
})

// ─── assertLanguageReviewerDispatched ─────────────────────────────────────────

describe('assertLanguageReviewerDispatched', () => {
  const cases = [
    ['.go',  'go-reviewer'],
    ['.py',  'python-reviewer'],
    ['.rs',  'rust-reviewer'],
    ['.sql', 'database-reviewer'],
  ]

  for (const [ext, reviewer] of cases) {
    test(`${ext} change → ${reviewer}`, () => {
      const transcript = t(turn([agent(reviewer)]))
      const r = assertLanguageReviewerDispatched(transcript, ext)
      assert.equal(r.pass, true)
    })

    test(`${ext} change fails without ${reviewer}`, () => {
      const transcript = t(turn([agent('code-reviewer')]))
      const r = assertLanguageReviewerDispatched(transcript, ext)
      assert.equal(r.pass, false)
    })
  }

  test('fails gracefully for unknown extension', () => {
    const transcript = t(turn([agent('code-reviewer')]))
    const r = assertLanguageReviewerDispatched(transcript, '.java')
    assert.equal(r.pass, false)
    assert.ok(r.message.includes('No reviewer mapped'))
  })
})
