/**
 * Session runner — launches a real Claude Code session with a test prompt
 * and captures the JSONL transcript.
 *
 * RECORD mode:  runs `claude` CLI, saves transcript to tests/transcripts/
 * REPLAY mode:  returns the saved transcript without launching a new session
 *
 * Usage:
 *   const transcript = await runSession('new-feature', { mode: 'record' })
 *   const transcript = await runSession('new-feature', { mode: 'replay' })
 *
 * CLI command used:
 *   claude --print --output-format stream-json --permission-mode bypassPermissions \
 *          --add-dir . < fixtures/<name>.txt > transcripts/<name>-<ts>.jsonl
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseTranscript } from './transcript-parser.js'

const execFileAsync = promisify(execFile)

const __dir = dirname(fileURLToPath(import.meta.url))
const TESTS_DIR    = resolve(__dir, '..')
const FIXTURES_DIR = join(TESTS_DIR, 'fixtures')
const TRANSCRIPT_DIR = join(TESTS_DIR, 'transcripts')
const PROJECT_ROOT = resolve(TESTS_DIR, '..')

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run a named test session or load its saved transcript.
 *
 * @param {string} fixtureName    - Name of the fixture file (without .txt)
 * @param {Object} [opts]
 * @param {'record'|'replay'|'auto'} [opts.mode='auto']
 *   - record: always run a new session and save
 *   - replay: always load the latest saved transcript (fail if none)
 *   - auto:   replay if a saved transcript exists, record otherwise
 * @param {number} [opts.timeoutMs=120000]
 * @returns {Promise<import('./transcript-parser.js').ParsedTranscript>}
 */
export async function runSession(fixtureName, opts = {}) {
  const { mode = 'auto', timeoutMs = 120_000 } = opts

  const fixturePath = join(FIXTURES_DIR, `${fixtureName}.txt`)
  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`)
  }

  if (mode === 'replay' || (mode === 'auto' && hasSavedTranscript(fixtureName))) {
    return loadLatestTranscript(fixtureName)
  }

  return recordSession(fixtureName, fixturePath, timeoutMs)
}

/**
 * Load the most recent saved transcript for a fixture without running a session.
 * @param {string} fixtureName
 * @returns {import('./transcript-parser.js').ParsedTranscript}
 */
export function loadLatestTranscript(fixtureName) {
  const transcriptPath = findLatestTranscript(fixtureName)
  if (!transcriptPath) {
    throw new Error(
      `No saved transcript for "${fixtureName}". Run with mode:'record' first.\n` +
      `  npm run record -- --fixture ${fixtureName}`
    )
  }
  return parseTranscript(transcriptPath)
}

/**
 * List all saved transcripts grouped by fixture name.
 * @returns {Record<string, string[]>}  { fixtureName: [path, ...] }
 */
export function listTranscripts() {
  if (!existsSync(TRANSCRIPT_DIR)) return {}
  const files = readdirSync(TRANSCRIPT_DIR).filter(f => f.endsWith('.jsonl'))
  const grouped = {}
  for (const f of files) {
    const name = f.replace(/-\d+\.jsonl$/, '')
    grouped[name] = grouped[name] ?? []
    grouped[name].push(join(TRANSCRIPT_DIR, f))
  }
  return grouped
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function recordSession(fixtureName, fixturePath, timeoutMs) {
  const timestamp = Date.now()
  const outPath = join(TRANSCRIPT_DIR, `${fixtureName}-${timestamp}.jsonl`)
  const prompt = readFileSync(fixturePath, 'utf8')

  console.log(`  [record] Running session for fixture "${fixtureName}"...`)
  console.log(`  [record] Output: ${outPath}`)

  let stdout = ''
  let stderr = ''

  try {
    // Build args for the claude CLI
    // --print          non-interactive, exit after response
    // --output-format stream-json  emit JSONL events
    // --permission-mode bypassPermissions  skip permission prompts in tests
    // --add-dir .      allow access to project files
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--permission-mode', 'bypassPermissions',
      '--add-dir', PROJECT_ROOT,
      '--max-turns', '20',
      prompt,
    ]

    const result = await execFileAsync('claude', args, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,  // 50 MB
      cwd: PROJECT_ROOT,
    })
    stdout = result.stdout
    stderr = result.stderr
  } catch (err) {
    // claude may exit with non-zero for various reasons but still produce output
    stdout = err.stdout ?? ''
    stderr = err.stderr ?? ''
    if (!stdout.trim()) {
      throw new Error(
        `Session failed with no output.\nstderr: ${stderr.slice(0, 500)}\n` +
        `Make sure 'claude' CLI is installed and ANTHROPIC_API_KEY is set.`
      )
    }
  }

  writeFileSync(outPath, stdout, 'utf8')
  console.log(`  [record] Transcript saved (${stdout.length} bytes)`)

  if (stderr.trim()) {
    console.warn(`  [record] stderr: ${stderr.slice(0, 200)}`)
  }

  return parseTranscript(outPath)
}

function hasSavedTranscript(fixtureName) {
  return findLatestTranscript(fixtureName) !== null
}

function findLatestTranscript(fixtureName) {
  if (!existsSync(TRANSCRIPT_DIR)) return null
  const files = readdirSync(TRANSCRIPT_DIR)
    .filter(f => f.startsWith(`${fixtureName}-`) && f.endsWith('.jsonl'))
    .sort()
    .reverse()
  return files.length > 0 ? join(TRANSCRIPT_DIR, files[0]) : null
}
