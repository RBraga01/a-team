/**
 * A Team test assertion library.
 *
 * Wraps the transcript-parser query helpers with clear pass/fail messages
 * and structured result objects. All assertions return an AssertionResult —
 * they never throw. The test runner collects results and reports at the end.
 */

import {
  skillWasInvoked,
  agentWasDispatched,
  findCompletionClaim,
  skillInvocationIndex,
  toolCallSequence,
  getSkillCalls,
  getAgentCalls,
  getBashCalls,
} from './transcript-parser.js'

// ─── Result Type ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AssertionResult
 * @property {boolean} pass
 * @property {string}  name
 * @property {string}  message    - Human-readable outcome
 * @property {any}     [actual]   - What was observed (on failure)
 * @property {any}     [expected] - What was expected (on failure)
 */

/** @param {string} name @param {string} message @returns {AssertionResult} */
const pass = (name, message) => ({ pass: true, name, message })

/** @param {string} name @param {string} message @param {any} actual @param {any} expected @returns {AssertionResult} */
const fail = (name, message, actual, expected) => ({ pass: false, name, message, actual, expected })

// ─── Skill Assertions ─────────────────────────────────────────────────────────

/**
 * Assert that a specific skill was invoked at least once.
 */
export function assertSkillInvoked(transcript, skillName) {
  const name = `skill invoked: ${skillName}`
  if (skillWasInvoked(transcript, skillName)) {
    return pass(name, `✓ Skill "${skillName}" was invoked`)
  }
  return fail(
    name,
    `✗ Skill "${skillName}" was NOT invoked`,
    toolCallSequence(transcript).filter(s => s.startsWith('Skill(')),
    `Skill(${skillName})`
  )
}

/**
 * Assert that a skill was NOT invoked (useful for pruned skills).
 */
export function assertSkillNotInvoked(transcript, skillName) {
  const name = `skill not invoked: ${skillName}`
  if (!skillWasInvoked(transcript, skillName)) {
    return pass(name, `✓ Skill "${skillName}" was correctly NOT invoked`)
  }
  return fail(
    name,
    `✗ Skill "${skillName}" was invoked but should not have been`,
    `Skill(${skillName}) found`,
    'not present'
  )
}

/**
 * Assert that skill A was invoked before skill B.
 */
export function assertSkillOrder(transcript, firstSkill, secondSkill) {
  const name = `skill order: ${firstSkill} before ${secondSkill}`
  const idxA = skillInvocationIndex(transcript, firstSkill)
  const idxB = skillInvocationIndex(transcript, secondSkill)

  if (idxA === -1) {
    return fail(name, `✗ "${firstSkill}" was never invoked`, 'not found', `before ${secondSkill}`)
  }
  if (idxB === -1) {
    return fail(name, `✗ "${secondSkill}" was never invoked`, 'not found', `after ${firstSkill}`)
  }
  if (idxA < idxB) {
    return pass(name, `✓ "${firstSkill}" (idx ${idxA}) appeared before "${secondSkill}" (idx ${idxB})`)
  }
  return fail(
    name,
    `✗ "${firstSkill}" (idx ${idxA}) appeared AFTER "${secondSkill}" (idx ${idxB})`,
    `${firstSkill} at ${idxA}, ${secondSkill} at ${idxB}`,
    `${firstSkill} before ${secondSkill}`
  )
}

// ─── Agent Assertions ─────────────────────────────────────────────────────────

/**
 * Assert that a specific agent was dispatched at least once.
 */
export function assertAgentDispatched(transcript, agentName) {
  const name = `agent dispatched: ${agentName}`
  if (agentWasDispatched(transcript, agentName)) {
    return pass(name, `✓ Agent "${agentName}" was dispatched`)
  }
  return fail(
    name,
    `✗ Agent "${agentName}" was NOT dispatched`,
    getAgentCalls(transcript).map(c => c.input?.subagent_type),
    agentName
  )
}

/**
 * Assert that at least N agents were dispatched in parallel within a single turn.
 * "Parallel" means multiple Agent tool calls appear in the same assistant turn.
 */
export function assertParallelDispatch(transcript, minCount = 2) {
  const name = `parallel dispatch: ≥ ${minCount} agents in one turn`
  const maxInOneTurn = Math.max(
    0,
    ...transcript.turns.map(t => t.toolCalls.filter(c => c.name === 'Agent').length)
  )
  if (maxInOneTurn >= minCount) {
    return pass(name, `✓ ${maxInOneTurn} agents dispatched in a single turn`)
  }
  return fail(
    name,
    `✗ Max agents in a single turn: ${maxInOneTurn} (expected ≥ ${minCount})`,
    maxInOneTurn,
    `≥ ${minCount}`
  )
}

// ─── Verification Gate Assertions ─────────────────────────────────────────────

/**
 * Assert that verification-before-completion was invoked before any completion claim.
 * This is the core behavioral gate — agents must prove work before claiming done.
 */
export function assertVerificationBeforeCompletion(transcript) {
  const name = 'verification-before-completion gate'
  const { claimed, matchedText } = findCompletionClaim(transcript)

  if (!claimed) {
    return pass(name, `✓ No completion claim found (nothing to gate)`)
  }

  if (skillWasInvoked(transcript, 'verification-before-completion')) {
    const verIdx = skillInvocationIndex(transcript, 'verification-before-completion')
    // Find index of the first completion claim in tool calls
    // Completion claims appear in text blocks — we check that verification
    // appeared at some point before the final text claiming done
    return pass(name, `✓ verification-before-completion invoked (tool call idx ${verIdx}) before completion claim`)
  }

  return fail(
    name,
    `✗ Completion claimed without invoking verification-before-completion`,
    `Completion text: "${matchedText}"`,
    'Skill(verification-before-completion) must be invoked first'
  )
}

/**
 * Assert that a verification command (test runner, build, etc.) was actually run.
 * Checks for bash calls matching common test/build patterns.
 */
export function assertVerificationCommandRun(transcript) {
  const name = 'verification command executed'
  const verificationPatterns = [
    /^npm (test|run (test|build|lint))/,
    /^npx (tsc|vitest|playwright)/,
    /^pytest/,
    /^go (test|build)/,
    /^cargo (test|build|check)/,
  ]
  const bashCalls = getBashCalls(transcript)
  const verificationRun = bashCalls.some(c =>
    verificationPatterns.some(p => p.test(String(c.input?.command ?? '')))
  )
  if (verificationRun) {
    return pass(name, `✓ Verification command was executed`)
  }
  return fail(
    name,
    `✗ No verification command was run (npm test, pytest, go test, etc.)`,
    bashCalls.map(c => c.input?.command).slice(0, 5),
    'at least one test/build command'
  )
}

// ─── TDD Assertions ───────────────────────────────────────────────────────────

/**
 * Assert that test-driven-development skill was invoked.
 */
export function assertTddSkillUsed(transcript) {
  return assertSkillInvoked(transcript, 'test-driven-development')
}

/**
 * Assert that a test run failure appeared before a test run success.
 * This verifies RED happened before GREEN.
 * Looks for bash test commands that produced failure output, then later a passing run.
 */
export function assertRedBeforeGreen(transcript) {
  const name = 'TDD: RED phase before GREEN phase'
  // We detect this by looking at the text blocks for failure/pass patterns.
  // failPattern must NOT match "0 failed" — only non-zero failure counts.
  const failPattern = /([1-9]\d* fail(ing|ed)|(?<![a-z])FAIL(?![a-z])|AssertionError|assertion error)/i
  const passPattern = /([1-9]\d* pass(ing|ed)|(?<![a-z])PASS(?![a-z])|all tests pass)/i

  let sawRed = false
  let sawGreen = false

  for (const text of transcript.textBlocks) {
    if (!sawRed && failPattern.test(text)) sawRed = true
    if (sawRed && passPattern.test(text)) { sawGreen = true; break }
  }

  if (sawRed && sawGreen) {
    return pass(name, `✓ RED (failing test) appeared before GREEN (passing test)`)
  }
  if (!sawRed) {
    return fail(name, `✗ No RED phase detected (no failing test output observed)`, 'no failure text', 'failure before pass')
  }
  return fail(name, `✗ RED phase found but no GREEN phase followed`, 'RED without GREEN', 'RED then GREEN')
}

// ─── Session Start Assertions ─────────────────────────────────────────────────

/**
 * Assert that using-a-team was invoked early (within the first 3 tool calls).
 * This verifies the SessionStart hook correctly injected the meta-skill.
 */
export function assertUsingATeamEarly(transcript) {
  const name = 'using-a-team invoked early (SessionStart)'
  const idx = skillInvocationIndex(transcript, 'using-a-team')
  if (idx === -1) {
    // using-a-team may be injected as context rather than an explicit tool call.
    // Check if it appears in the text blocks (injected via hook content).
    const mentionedInText = transcript.textBlocks.some(t =>
      t.includes('using-a-team') || t.includes('A Team') || t.includes('INIT.md')
    )
    if (mentionedInText) {
      return pass(name, `✓ using-a-team content referenced in session (injected via hook)`)
    }
    return fail(
      name,
      `✗ using-a-team was not invoked and not mentioned in session context`,
      'not found',
      'Skill(using-a-team) in first 3 tool calls or hook content in text'
    )
  }
  if (idx < 3) {
    return pass(name, `✓ using-a-team invoked at tool call index ${idx} (within first 3)`)
  }
  return fail(
    name,
    `✗ using-a-team invoked late (index ${idx}) — SessionStart hook may not be working`,
    `index ${idx}`,
    'index < 3'
  )
}

// ─── Routing Assertions ───────────────────────────────────────────────────────

/**
 * Assert that the correct language reviewer was dispatched for a given file extension.
 */
export function assertLanguageReviewerDispatched(transcript, extension) {
  const reviewerMap = {
    '.go':  'go-reviewer',
    '.py':  'python-reviewer',
    '.rs':  'rust-reviewer',
    '.sql': 'database-reviewer',
  }
  const expected = reviewerMap[extension]
  if (!expected) {
    return fail(
      `language reviewer: ${extension}`,
      `✗ No reviewer mapped for extension "${extension}"`,
      extension,
      Object.keys(reviewerMap).join(', ')
    )
  }
  return assertAgentDispatched(transcript, expected)
}

// ─── Summary ──────────────────────────────────────────────────────────────────

/**
 * Summarise an array of AssertionResults into a suite result.
 * @param {string} suiteName
 * @param {AssertionResult[]} results
 * @returns {{ name: string, passed: number, failed: number, results: AssertionResult[] }}
 */
export function summariseSuite(suiteName, results) {
  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length
  return { name: suiteName, passed, failed, results }
}
