/**
 * Unit tests for transcript-parser.js
 *
 * These tests run entirely offline using hardcoded JSONL strings.
 * They verify the parser correctly extracts skill calls, agent calls,
 * text blocks, completion claims, and cost data from raw session output.
 *
 * Run: node --test lib/transcript-parser.test.js
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseTranscriptString,
  getSkillCalls,
  getAgentCalls,
  getBashCalls,
  skillWasInvoked,
  agentWasDispatched,
  findCompletionClaim,
  skillInvocationIndex,
  toolCallSequence,
  completionClaimToolCallIndex,
} from './transcript-parser.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INIT_EVENT = JSON.stringify({
  type: 'system', subtype: 'init',
  session_id: 'test-session-001',
  model: 'claude-sonnet-4-6',
  tools: [],
})

const userEvent = (text) => JSON.stringify({
  type: 'user',
  message: { role: 'user', content: [{ type: 'text', text }] },
})

const assistantEvent = (blocks) => JSON.stringify({
  type: 'assistant',
  message: { role: 'assistant', content: blocks },
})

const textBlock = (text) => ({ type: 'text', text })
const skillUse = (skill, id = 'cu_001') => ({ type: 'tool_use', id, name: 'Skill', input: { skill } })
const agentUse = (subagent_type, id = 'cu_002') => ({ type: 'tool_use', id, name: 'Agent', input: { subagent_type, description: 'test', prompt: 'do the thing' } })
const bashUse = (command, id = 'cu_003') => ({ type: 'tool_use', id, name: 'Bash', input: { command } })

const resultEvent = (cost_usd = 0.05, input_tokens = 1000, output_tokens = 200) =>
  JSON.stringify({ type: 'result', subtype: 'success', cost_usd, input_tokens, output_tokens })

const buildJSONL = (...lines) => lines.join('\n')

// ─── Parser: basics ───────────────────────────────────────────────────────────

describe('parseTranscriptString: basic parsing', () => {
  test('parses session id and model from init event', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      userEvent('hello'),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    assert.equal(t.sessionId, 'test-session-001')
    assert.equal(t.model, 'claude-sonnet-4-6')
  })

  test('extracts user prompt lines', () => {
    const raw = buildJSONL(INIT_EVENT, userEvent('please build a feature'), resultEvent())
    const t = parseTranscriptString(raw)
    assert.deepEqual(t.promptLines, ['please build a feature'])
  })

  test('extracts cost from result event', () => {
    const raw = buildJSONL(INIT_EVENT, resultEvent(0.12, 3000, 600))
    const t = parseTranscriptString(raw)
    assert.equal(t.cost.usd, 0.12)
    assert.equal(t.cost.inputTokens, 3000)
    assert.equal(t.cost.outputTokens, 600)
    assert.equal(t.cost.totalTokens, 3600)
  })

  test('handles empty JSONL gracefully', () => {
    const t = parseTranscriptString('')
    assert.deepEqual(t.toolCalls, [])
    assert.deepEqual(t.textBlocks, [])
  })

  test('throws on malformed JSON line', () => {
    assert.throws(
      () => parseTranscriptString('{"type":"system"}\nnot-json\n'),
      /Invalid JSON on line 2/
    )
  })
})

// ─── Tool call extraction ─────────────────────────────────────────────────────

describe('getSkillCalls / getAgentCalls / getBashCalls', () => {
  test('extracts skill calls from assistant turns', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      userEvent('build a feature'),
      assistantEvent([skillUse('brainstorming'), skillUse('writing-plans')]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    const skills = getSkillCalls(t)
    assert.equal(skills.length, 2)
    assert.equal(skills[0].input.skill, 'brainstorming')
    assert.equal(skills[1].input.skill, 'writing-plans')
  })

  test('extracts agent calls', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      userEvent('review my code'),
      assistantEvent([agentUse('code-reviewer'), agentUse('security-reviewer')]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    const agents = getAgentCalls(t)
    assert.equal(agents.length, 2)
    assert.equal(agents[0].input.subagent_type, 'code-reviewer')
  })

  test('extracts bash calls', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      userEvent('run tests'),
      assistantEvent([bashUse('npm test'), bashUse('npm run build')]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    assert.equal(getBashCalls(t).length, 2)
    assert.equal(getBashCalls(t)[0].input.command, 'npm test')
  })

  test('returns empty arrays when no tool calls exist', () => {
    const raw = buildJSONL(INIT_EVENT, assistantEvent([textBlock('hello')]), resultEvent())
    const t = parseTranscriptString(raw)
    assert.deepEqual(getSkillCalls(t), [])
    assert.deepEqual(getAgentCalls(t), [])
    assert.deepEqual(getBashCalls(t), [])
  })
})

// ─── skillWasInvoked ──────────────────────────────────────────────────────────

describe('skillWasInvoked', () => {
  test('returns true when exact skill name matches', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      assistantEvent([skillUse('brainstorming')]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    assert.equal(skillWasInvoked(t, 'brainstorming'), true)
  })

  test('returns true when skill name is a prefix match (e.g. namespaced)', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      assistantEvent([skillUse('systematic-debugging:root-cause')]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    assert.equal(skillWasInvoked(t, 'systematic-debugging'), true)
  })

  test('returns false when skill not present', () => {
    const raw = buildJSONL(INIT_EVENT, assistantEvent([skillUse('brainstorming')]), resultEvent())
    const t = parseTranscriptString(raw)
    assert.equal(skillWasInvoked(t, 'writing-plans'), false)
  })
})

// ─── agentWasDispatched ───────────────────────────────────────────────────────

describe('agentWasDispatched', () => {
  test('returns true when agent was dispatched', () => {
    const raw = buildJSONL(INIT_EVENT, assistantEvent([agentUse('code-reviewer')]), resultEvent())
    const t = parseTranscriptString(raw)
    assert.equal(agentWasDispatched(t, 'code-reviewer'), true)
  })

  test('returns false when agent was not dispatched', () => {
    const raw = buildJSONL(INIT_EVENT, assistantEvent([agentUse('code-reviewer')]), resultEvent())
    const t = parseTranscriptString(raw)
    assert.equal(agentWasDispatched(t, 'security-reviewer'), false)
  })
})

// ─── findCompletionClaim ──────────────────────────────────────────────────────

describe('findCompletionClaim', () => {
  const completionPhrases = [
    'The task is done.',
    'Implementation is complete.',
    'All tests are passing.',
    'The bug has been fixed. Finished.',
    'Task complete — merged to main.',
  ]

  for (const phrase of completionPhrases) {
    test(`detects completion claim: "${phrase.slice(0, 40)}"`, () => {
      const raw = buildJSONL(INIT_EVENT, assistantEvent([textBlock(phrase)]), resultEvent())
      const t = parseTranscriptString(raw)
      const { claimed } = findCompletionClaim(t)
      assert.equal(claimed, true, `Expected "${phrase}" to match completion claim pattern`)
    })
  }

  test('returns false when no completion claim exists', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      assistantEvent([textBlock('I am working on step 2 of the implementation.')]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    const { claimed } = findCompletionClaim(t)
    assert.equal(claimed, false)
  })

  test('includes matched text in result', () => {
    const raw = buildJSONL(INIT_EVENT, assistantEvent([textBlock('All done! Task complete.')]), resultEvent())
    const t = parseTranscriptString(raw)
    const { claimed, matchedText } = findCompletionClaim(t)
    assert.equal(claimed, true)
    assert.ok(matchedText?.includes('done') || matchedText?.includes('complete'))
  })
})

// ─── skillInvocationIndex ─────────────────────────────────────────────────────

describe('skillInvocationIndex', () => {
  test('returns correct index for skill in tool call array', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      assistantEvent([
        bashUse('git status', 'b1'),
        skillUse('brainstorming', 's1'),
        skillUse('writing-plans', 's2'),
      ]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    // toolCalls: [bash, brainstorming, writing-plans]
    assert.equal(skillInvocationIndex(t, 'brainstorming'), 1)
    assert.equal(skillInvocationIndex(t, 'writing-plans'), 2)
  })

  test('returns -1 when skill not present', () => {
    const raw = buildJSONL(INIT_EVENT, assistantEvent([skillUse('brainstorming')]), resultEvent())
    const t = parseTranscriptString(raw)
    assert.equal(skillInvocationIndex(t, 'writing-plans'), -1)
  })
})

// ─── toolCallSequence ─────────────────────────────────────────────────────────

describe('toolCallSequence', () => {
  test('produces readable sequence of tool call names', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      assistantEvent([
        bashUse('npm test', 'b1'),
        skillUse('brainstorming', 's1'),
        agentUse('code-reviewer', 'a1'),
      ]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    const seq = toolCallSequence(t)
    assert.ok(seq[0].startsWith('Bash('), `Expected Bash first, got: ${seq[0]}`)
    assert.equal(seq[1], 'Skill(brainstorming)')
    assert.equal(seq[2], 'Agent(code-reviewer)')
  })
})

// ─── Multi-turn transcripts ───────────────────────────────────────────────────

describe('multi-turn transcript parsing', () => {
  test('collects tool calls across multiple assistant turns', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      userEvent('build a feature'),
      assistantEvent([skillUse('brainstorming', 's1')]),
      JSON.stringify({ type: 'tool_result', tool_use_id: 's1', content: [{ type: 'text', text: 'spec done' }] }),
      assistantEvent([skillUse('writing-plans', 's2')]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    assert.equal(getSkillCalls(t).length, 2)
    assert.equal(t.turns.length, 2)
  })

  test('collects text blocks across multiple turns', () => {
    const raw = buildJSONL(
      INIT_EVENT,
      assistantEvent([textBlock('Step 1 done.')]),
      assistantEvent([textBlock('Step 2 done.'), textBlock('All tasks complete.')]),
      resultEvent()
    )
    const t = parseTranscriptString(raw)
    assert.equal(t.textBlocks.length, 3)
  })
})
