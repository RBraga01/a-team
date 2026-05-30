/**
 * Cost tracker — aggregates token usage and USD cost across test runs.
 *
 * Each ParsedTranscript carries a cost summary. This module collects those
 * summaries, computes totals, and formats reports.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CostEntry
 * @property {string} fixtureName
 * @property {number} usd
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {number} totalTokens
 */

// ─── Tracker ──────────────────────────────────────────────────────────────────

export class CostTracker {
  /** @type {CostEntry[]} */
  #entries = []

  /**
   * Record the cost of a session.
   * @param {string} fixtureName
   * @param {import('./transcript-parser.js').ParsedTranscript} transcript
   */
  record(fixtureName, transcript) {
    this.#entries.push({
      fixtureName,
      usd:          transcript.cost.usd,
      inputTokens:  transcript.cost.inputTokens,
      outputTokens: transcript.cost.outputTokens,
      totalTokens:  transcript.cost.totalTokens,
    })
  }

  /** @returns {CostEntry[]} */
  entries() { return [...this.#entries] }

  totals() {
    return this.#entries.reduce(
      (acc, e) => ({
        usd:          acc.usd + e.usd,
        inputTokens:  acc.inputTokens + e.inputTokens,
        outputTokens: acc.outputTokens + e.outputTokens,
        totalTokens:  acc.totalTokens + e.totalTokens,
      }),
      { usd: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    )
  }

  formatReport() {
    const lines = ['', '── Token & Cost Report ──────────────────────────']
    for (const e of this.#entries) {
      lines.push(
        `  ${e.fixtureName.padEnd(40)} ` +
        `$${e.usd.toFixed(4)}  ` +
        `in:${e.inputTokens.toLocaleString()}  ` +
        `out:${e.outputTokens.toLocaleString()}`
      )
    }
    const t = this.totals()
    lines.push('─'.repeat(50))
    lines.push(
      `  ${'TOTAL'.padEnd(40)} ` +
      `$${t.usd.toFixed(4)}  ` +
      `in:${t.inputTokens.toLocaleString()}  ` +
      `out:${t.outputTokens.toLocaleString()}`
    )
    lines.push('')
    return lines.join('\n')
  }

  /**
   * Warn if a single session cost more than the budget threshold.
   * @param {string} fixtureName
   * @param {number} [maxUsd=0.30]
   * @returns {{ ok: boolean, message: string }}
   */
  checkBudget(fixtureName, maxUsd = 0.30) {
    const entry = this.#entries.find(e => e.fixtureName === fixtureName)
    if (!entry) return { ok: true, message: `No cost data for "${fixtureName}"` }
    if (entry.usd <= maxUsd) {
      return { ok: true, message: `$${entry.usd.toFixed(4)} ≤ budget $${maxUsd.toFixed(2)}` }
    }
    return {
      ok: false,
      message: `$${entry.usd.toFixed(4)} EXCEEDS budget $${maxUsd.toFixed(2)} for "${fixtureName}"`,
    }
  }
}
