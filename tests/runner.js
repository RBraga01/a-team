#!/usr/bin/env node
/**
 * A Team test runner.
 *
 * Usage:
 *   node runner.js                     # replay mode (uses saved transcripts)
 *   node runner.js --record            # record new sessions from all fixtures
 *   node runner.js --record --fixture new-feature   # record one fixture
 *   node runner.js --suite skill-triggering          # run one suite only
 *   node runner.js --list-transcripts  # show saved transcripts
 *
 * Environment variables:
 *   TEST_MODE=record|replay|auto   (default: replay)
 *   ANTHROPIC_API_KEY              (required for record mode)
 */

import { parseArgs } from 'node:util'
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { listTranscripts } from './lib/session-runner.js'
import { CostTracker } from './lib/cost-tracker.js'
import { printSummary, writeJsonReport } from './lib/reporter.js'

const __dir = dirname(fileURLToPath(import.meta.url))

// ─── CLI Args ─────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    record:            { type: 'boolean', default: false },
    replay:            { type: 'boolean', default: false },
    suite:             { type: 'string'  },
    fixture:           { type: 'string'  },
    'list-transcripts':{ type: 'boolean', default: false },
    'write-report':    { type: 'boolean', default: true  },
    help:              { type: 'boolean', default: false },
  },
  allowPositionals: true,
})

if (args.help) {
  console.log(`
A Team Test Runner

Usage:
  node runner.js [options]

Options:
  --record             Record new sessions (requires ANTHROPIC_API_KEY)
  --replay             Use saved transcripts only (default)
  --suite <name>       Run only this suite (e.g. skill-triggering)
  --fixture <name>     Record only this fixture
  --list-transcripts   Show all saved transcripts and exit
  --write-report       Write JSON report to reports/ (default: true)
  --help               Show this message

Suites:
  skill-triggering     Hard gate skills invoked at the right times
  verification-gate    verification-before-completion always fires
  agent-routing        Right agents for right tasks / languages
  tdd-enforcement      RED before GREEN, TDD skill used
  orchestrator-init    Init+prune writes TEAM.md and ROUTING.md
  session-start        SessionStart hook injects using-a-team

Examples:
  node runner.js                                   # replay all suites
  node runner.js --record                          # record all fixtures
  node runner.js --record --fixture new-feature    # record one fixture
  node runner.js --suite skill-triggering          # run one suite
  node runner.js --list-transcripts                # inspect saved runs
`)
  process.exit(0)
}

if (args['list-transcripts']) {
  const transcripts = listTranscripts()
  if (Object.keys(transcripts).length === 0) {
    console.log('No saved transcripts. Run with --record first.')
  } else {
    console.log('\nSaved transcripts:')
    for (const [name, paths] of Object.entries(transcripts)) {
      console.log(`  ${name}  (${paths.length} run(s))`)
      for (const p of paths) console.log(`    ${p}`)
    }
  }
  process.exit(0)
}

// ─── Mode ─────────────────────────────────────────────────────────────────────

const mode = args.record ? 'record' : args.replay ? 'replay' : 'replay'
process.env.TEST_MODE = mode

// ─── Suite Discovery ──────────────────────────────────────────────────────────

const SUITES_DIR = join(__dir, 'suites')
const allSuites = readdirSync(SUITES_DIR)
  .filter(f => f.endsWith('.test.js'))
  .sort()

const suitesToRun = args.suite
  ? allSuites.filter(f => f.includes(args.suite))
  : allSuites

if (suitesToRun.length === 0) {
  console.error(`No suites found matching "${args.suite}"`)
  process.exit(1)
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(55)}`)
console.log(`  A Team Test Runner`)
console.log(`  Mode: ${mode}  |  Suites: ${suitesToRun.length}`)
console.log(`${'─'.repeat(55)}`)

if (mode === 'record' && !process.env.ANTHROPIC_API_KEY) {
  console.error('\n  ✗ ANTHROPIC_API_KEY is not set. Record mode requires API access.')
  process.exit(1)
}

// Run each suite via node --test (built-in test runner, Node 18+)
let exitCode = 0
for (const suite of suitesToRun) {
  const result = spawnSync(
    process.execPath,
    ['--test', join(SUITES_DIR, suite)],
    { stdio: 'inherit', env: { ...process.env, TEST_MODE: mode } }
  )
  if (result.status !== 0) exitCode = 1
}

process.exit(exitCode)
