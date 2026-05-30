# A Team — Test Suite

Verifies that A Team's behavioral gates actually work by running real Claude Code sessions and parsing the resulting JSONL transcripts.

## Architecture

```
tests/
├── lib/
│   ├── transcript-parser.js   Parse .jsonl session transcripts into structured data
│   ├── assertions.js          Skill/agent invocation assertions (return results, don't throw)
│   ├── session-runner.js      Launch claude CLI sessions or load saved transcripts
│   ├── cost-tracker.js        Aggregate token usage and USD cost across runs
│   └── reporter.js            Terminal output + JSON report files
├── suites/
│   ├── skill-triggering.test.js   Hard gates invoked at the right times
│   ├── verification-gate.test.js  verification-before-completion always fires
│   ├── agent-routing.test.js      Right agents for right tasks / languages
│   ├── tdd-enforcement.test.js    RED before GREEN, TDD skill used
│   ├── orchestrator-init.test.js  Init+prune writes TEAM.md and ROUTING.md
│   └── session-start.test.js      SessionStart hook injects using-a-team
├── fixtures/                  Test prompt files (one per scenario)
├── transcripts/               Saved session outputs (gitignored, created by --record)
└── reports/                   JSON result reports (gitignored)
```

## Requirements

- **Node.js 18+** (uses built-in `node:test` and `node:util` — zero npm dependencies)
- **Claude Code CLI** (`claude` in PATH) — required for `--record` mode only
- **`ANTHROPIC_API_KEY`** — required for `--record` mode only

## Running Tests

### Replay Mode (default — uses saved transcripts)

```bash
cd tests
node runner.js
```

Runs all 6 suites against previously recorded transcripts. Fast, offline, free.

### Record Mode (runs live sessions — costs money)

```bash
cd tests
export ANTHROPIC_API_KEY=sk-ant-...
node runner.js --record
```

Runs the `claude` CLI with each fixture prompt, captures the JSONL transcript, saves it to `transcripts/`, then runs assertions.

**Expected cost:** $0.05–$0.20 per fixture. Full suite: ~$1–$3.

### Run a Single Suite

```bash
node runner.js --suite skill-triggering
node runner.js --suite verification-gate
node runner.js --suite agent-routing
node runner.js --suite tdd-enforcement
node runner.js --suite orchestrator-init
node runner.js --suite session-start
```

### Record a Single Fixture

```bash
node runner.js --record --fixture new-feature
node runner.js --record --fixture bug-report
```

### Inspect Saved Transcripts

```bash
node runner.js --list-transcripts

# Parse a specific transcript
node -e "
  import('./lib/transcript-parser.js').then(m => {
    const t = m.parseTranscript('transcripts/new-feature-1234567890.jsonl')
    console.log('Skills:', m.getSkillCalls(t).map(c => c.input.skill))
    console.log('Agents:', m.getAgentCalls(t).map(c => c.input.subagent_type))
    console.log('Cost:', t.cost)
  })
"
```

## Test Modes

Tests operate in three modes controlled by `TEST_MODE` env var (or `--record` / `--replay` flags):

| Mode | Behaviour |
|------|-----------|
| `replay` | Load latest saved transcript (default). Fail if none exists. |
| `record` | Run live claude session, save transcript, assert. |
| `auto`   | Replay if transcript exists, otherwise record. |

## What Each Suite Validates

### `skill-triggering`
Confirms A Team's Hard Gates fire:
- New feature request → `brainstorming` skill invoked first
- `brainstorming` before `writing-plans`
- Bug report → `systematic-debugging` skill invoked
- Implementation task → `test-driven-development` skill invoked
- Dev start → `using-git-worktrees` skill invoked

### `verification-gate`
Confirms the "prove it before claiming done" gate:
- Any completion claim → `verification-before-completion` skill first
- A verification command (test/build) is actually run
- "Tests pass" claim requires running the test suite
- Bug fix "done" claim requires re-running the failing case

### `agent-routing`
Confirms the right specialists are called:
- Code change → `code-reviewer` dispatched
- Auth code → `security-reviewer` dispatched
- `.go` change → `go-reviewer` dispatched
- `.py` change → `python-reviewer` dispatched
- `.rs` change → `rust-reviewer` dispatched
- SQL migration → `database-reviewer` dispatched
- 3+ independent failures → parallel dispatch

### `tdd-enforcement`
Confirms RED before GREEN discipline:
- `test-driven-development` skill invoked for implementation
- Failing test output appears before passing test output
- TDD skill used for bug fixes too
- Coverage/test command run before completion

### `orchestrator-init`
Confirms init+prune behavior (filesystem assertions):
- `/orchestrate init` creates `.agent-sync/TEAM.md`
- `/orchestrate init` creates `.agent-sync/ROUTING.md`
- Python-only `INIT.md` causes `go-reviewer.md` to be deleted
- Orchestrator transcript shows `Read` tool call on `INIT.md`

### `session-start`
Confirms session hook injection:
- `using-a-team` content present early in session
- Session references `INIT.md` protocol
- Session mentions mandatory skill trigger table
- Session start cost is within $0.10 budget

## Adding a New Test

1. Add a fixture to `fixtures/<scenario-name>.txt`
2. Add a test in the appropriate suite file (or create a new suite)
3. Record the session: `node runner.js --record --fixture <scenario-name>`
4. Commit the transcript to `transcripts/` so CI can replay it

## Interpreting Results

```
skill-triggering: new feature request triggers brainstorming  [PASS]  1 passed, 0 failed
  ✓ Skill "brainstorming" was invoked

verification-gate: completion claim requires verification skill  [FAIL]  0 passed, 1 failed
  ✗ Completion claimed without invoking verification-before-completion
       actual:   "Completion text: \"Done! The feature is implemented.\""
       expected: "Skill(verification-before-completion) must be invoked first"
```

A FAIL means the behavioral gate is not working — the agent skipped a mandatory step.
Fix by strengthening the rule in the relevant skill file or the `using-a-team` meta-skill.
