/**
 * Test reporter — formats suite results for terminal output and JSON files.
 *
 * Supports two output modes:
 *   terminal  — coloured/plain text to stdout
 *   json      — structured results written to reports/
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir  = dirname(fileURLToPath(import.meta.url))
const REPORTS = join(__dir, '..', 'reports')

const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BOLD   = '\x1b[1m'
const RESET  = '\x1b[0m'
const PASS   = `${GREEN}✓${RESET}`
const FAIL   = `${RED}✗${RESET}`

// ─── Terminal Reporter ────────────────────────────────────────────────────────

/**
 * Print a single suite result to stdout.
 * @param {{ name: string, passed: number, failed: number, results: import('./assertions.js').AssertionResult[] }} suite
 */
export function printSuite(suite) {
  const status = suite.failed === 0
    ? `${GREEN}PASS${RESET}`
    : `${RED}FAIL${RESET}`

  console.log(`\n${BOLD}${suite.name}${RESET}  [${status}]  ${suite.passed} passed, ${suite.failed} failed`)

  for (const r of suite.results) {
    const icon = r.pass ? PASS : FAIL
    console.log(`  ${icon}  ${r.message}`)
    if (!r.pass) {
      console.log(`       ${YELLOW}actual:${RESET}   ${JSON.stringify(r.actual)}`)
      console.log(`       ${YELLOW}expected:${RESET} ${JSON.stringify(r.expected)}`)
    }
  }
}

/**
 * Print a final summary across all suites.
 * @param {Array} suites
 * @param {import('./cost-tracker.js').CostTracker} costTracker
 */
export function printSummary(suites, costTracker) {
  const totalPassed = suites.reduce((s, t) => s + t.passed, 0)
  const totalFailed = suites.reduce((s, t) => s + t.failed, 0)
  const overall = totalFailed === 0
    ? `${GREEN}${BOLD}ALL TESTS PASSED${RESET}`
    : `${RED}${BOLD}${totalFailed} TEST(S) FAILED${RESET}`

  console.log('\n' + '═'.repeat(55))
  console.log(`  ${overall}  —  ${totalPassed} passed, ${totalFailed} failed`)
  console.log('═'.repeat(55))
  console.log(costTracker.formatReport())
}

// ─── JSON Reporter ────────────────────────────────────────────────────────────

/**
 * Write full results to reports/<timestamp>-results.json.
 * @param {Array} suites
 * @param {import('./cost-tracker.js').CostTracker} costTracker
 * @returns {string} Path to the written file
 */
export function writeJsonReport(suites, costTracker) {
  mkdirSync(REPORTS, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = join(REPORTS, `${timestamp}-results.json`)

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPassed: suites.reduce((s, t) => s + t.passed, 0),
      totalFailed: suites.reduce((s, t) => s + t.failed, 0),
    },
    cost: costTracker.totals(),
    suites: suites.map(s => ({
      name: s.name,
      passed: s.passed,
      failed: s.failed,
      results: s.results.map(r => ({
        pass: r.pass,
        name: r.name,
        message: r.message,
        actual:   r.actual   ?? null,
        expected: r.expected ?? null,
      })),
    })),
  }

  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\n  Report written: ${outPath}`)
  return outPath
}
