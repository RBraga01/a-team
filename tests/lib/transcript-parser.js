/**
 * Claude Code session transcript parser.
 *
 * Claude Code emits newline-delimited JSON (JSONL) when run with
 * --output-format stream-json. Each line is one event. This module
 * parses that format into a structured representation that test suites
 * can assert against.
 *
 * Supported event types:
 *   system   - session init metadata (model, tools, session_id)
 *   user     - the prompt sent to the session
 *   assistant - model turns (text blocks + tool_use blocks)
 *   tool_result - result of a tool call
 *   result   - final summary (cost_usd, input_tokens, output_tokens)
 */

import { readFileSync } from 'node:fs'

// ─── Types (JSDoc) ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ToolUseEvent
 * @property {string} name         - Tool name e.g. "Skill", "Agent", "Bash"
 * @property {string} id           - Tool call ID
 * @property {Record<string,any>} input - Tool input params
 */

/**
 * @typedef {Object} ParsedTranscript
 * @property {string}        sessionId
 * @property {string}        model
 * @property {string[]}      promptLines     - Raw text of the user prompt
 * @property {ToolUseEvent[]} toolCalls      - All tool calls in order
 * @property {string[]}      textBlocks      - All assistant text blocks in order
 * @property {CostSummary}   cost
 * @property {EventGroup[]}  turns           - Full structured turns
 */

/**
 * @typedef {Object} CostSummary
 * @property {number} usd
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {number} totalTokens
 */

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a JSONL transcript file into a structured representation.
 * @param {string} filePath - Absolute or relative path to the .jsonl file
 * @returns {ParsedTranscript}
 */
export function parseTranscript(filePath) {
  const lines = readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(l => l.trim().length > 0)

  const events = lines.map((line, i) => {
    try {
      return JSON.parse(line)
    } catch {
      throw new Error(`Invalid JSON on line ${i + 1} of ${filePath}: ${line.slice(0, 80)}`)
    }
  })

  return buildTranscript(events)
}

/**
 * Parse JSONL transcript content from a string (useful for testing the parser).
 * @param {string} content
 * @returns {ParsedTranscript}
 */
export function parseTranscriptString(content) {
  const lines = content.split('\n').filter(l => l.trim().length > 0)
  const events = lines.map((line, i) => {
    try { return JSON.parse(line) }
    catch { throw new Error(`Invalid JSON on line ${i + 1}: ${line.slice(0, 80)}`) }
  })
  return buildTranscript(events)
}

function buildTranscript(events) {
  const transcript = {
    sessionId: '',
    model: '',
    promptLines: [],
    toolCalls: [],
    textBlocks: [],
    cost: { usd: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    turns: [],
  }

  for (const event of events) {
    switch (event.type) {
      case 'system':
        if (event.subtype === 'init') {
          transcript.sessionId = event.session_id ?? ''
          transcript.model = event.model ?? ''
        }
        break

      case 'user': {
        const content = event.message?.content ?? []
        for (const block of content) {
          if (block.type === 'text') transcript.promptLines.push(block.text)
        }
        break
      }

      case 'assistant': {
        const turn = { role: 'assistant', toolCalls: [], textBlocks: [] }
        const content = event.message?.content ?? []
        for (const block of content) {
          if (block.type === 'text' && block.text?.trim()) {
            transcript.textBlocks.push(block.text)
            turn.textBlocks.push(block.text)
          }
          if (block.type === 'tool_use') {
            const call = { name: block.name, id: block.id, input: block.input ?? {} }
            transcript.toolCalls.push(call)
            turn.toolCalls.push(call)
          }
        }
        transcript.turns.push(turn)
        break
      }

      case 'result':
        transcript.cost.usd = event.cost_usd ?? 0
        transcript.cost.inputTokens = event.input_tokens ?? 0
        transcript.cost.outputTokens = event.output_tokens ?? 0
        transcript.cost.totalTokens =
          (event.input_tokens ?? 0) + (event.output_tokens ?? 0)
        break
    }
  }

  return transcript
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Return all Skill tool calls.
 * @param {ParsedTranscript} t
 * @returns {ToolUseEvent[]}
 */
export function getSkillCalls(t) {
  return t.toolCalls.filter(c => c.name === 'Skill')
}

/**
 * Return all Agent tool calls.
 * @param {ParsedTranscript} t
 * @returns {ToolUseEvent[]}
 */
export function getAgentCalls(t) {
  return t.toolCalls.filter(c => c.name === 'Agent')
}

/**
 * Return all Bash tool calls.
 * @param {ParsedTranscript} t
 * @returns {ToolUseEvent[]}
 */
export function getBashCalls(t) {
  return t.toolCalls.filter(c => c.name === 'Bash')
}

/**
 * Check whether a specific skill was invoked (by name or prefix).
 * @param {ParsedTranscript} t
 * @param {string} skillName  - e.g. "brainstorming" or "systematic-debugging"
 * @returns {boolean}
 */
export function skillWasInvoked(t, skillName) {
  return getSkillCalls(t).some(
    c => c.input?.skill === skillName || String(c.input?.skill).startsWith(skillName + ':')
  )
}

/**
 * Check whether a specific agent was dispatched (by subagent_type).
 * @param {ParsedTranscript} t
 * @param {string} agentName
 * @returns {boolean}
 */
export function agentWasDispatched(t, agentName) {
  return getAgentCalls(t).some(c => c.input?.subagent_type === agentName)
}

/**
 * Check whether the assistant claimed completion in any text block.
 * Matches: done, complete, finished, task complete, implementation complete, etc.
 * @param {ParsedTranscript} t
 * @returns {{ claimed: boolean, matchedText: string | null }}
 */
export function findCompletionClaim(t) {
  const pattern = /\b(done|complete[d]?|finished|task complete|implementation complete|all (tests? )?(are )?pass(ing|ed))\b/i
  for (const text of t.textBlocks) {
    if (pattern.test(text)) return { claimed: true, matchedText: text.slice(0, 200) }
  }
  return { claimed: false, matchedText: null }
}

/**
 * Find the index (in toolCalls array) of the first completion claim in text blocks.
 * Returns -1 if no completion claim found.
 * @param {ParsedTranscript} t
 * @returns {number}
 */
export function completionClaimToolCallIndex(t) {
  const pattern = /\b(done|complete[d]?|finished|task complete|all (tests? )?(are )?pass(ing|ed))\b/i
  let textIndex = 0
  for (let i = 0; i < t.turns.length; i++) {
    const turn = t.turns[i]
    for (const text of turn.textBlocks) {
      if (pattern.test(text)) {
        // Return the cumulative tool call count up to this turn
        return t.toolCalls.indexOf(turn.toolCalls[0] ?? null)
      }
    }
    textIndex += turn.textBlocks.length
  }
  return -1
}

/**
 * Get the index of the first invocation of a skill in toolCalls.
 * @param {ParsedTranscript} t
 * @param {string} skillName
 * @returns {number} -1 if not found
 */
export function skillInvocationIndex(t, skillName) {
  return t.toolCalls.findIndex(
    c => c.name === 'Skill' && (
      c.input?.skill === skillName ||
      String(c.input?.skill).startsWith(skillName + ':')
    )
  )
}

/**
 * Return all tool call names in order (useful for ordering assertions).
 * @param {ParsedTranscript} t
 * @returns {string[]}
 */
export function toolCallSequence(t) {
  return t.toolCalls.map(c => {
    if (c.name === 'Skill') return `Skill(${c.input?.skill ?? '?'})`
    if (c.name === 'Agent') return `Agent(${c.input?.subagent_type ?? '?'})`
    if (c.name === 'Bash') return `Bash(${String(c.input?.command ?? '').slice(0, 40)})`
    return c.name
  })
}
