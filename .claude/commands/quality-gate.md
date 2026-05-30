# /quality-gate

Full pre-merge quality check. Runs multiple agents in parallel to validate readiness.

**Step 1 — Pipeline Audit (sequential, before reviews):**
- `harness-optimizer` — reads bash history and task results to verify agents ran required checks.
- If `.agent-sync/AUDIT.md` contains `BLOCK MERGE` → **stop here**. Do not proceed to reviews. Route failed tasks back for re-execution.

**Step 2 — Reviews (parallel, only if audit passes):**
- `code-reviewer` — code quality, surgical changes, security
- `security-reviewer` — OWASP Top 10 and secrets
- Language reviewer (`go-reviewer` / `python-reviewer` / `rust-reviewer`) based on files changed

**Usage:**
```
/quality-gate                Full check (audit + all reviews)
/quality-gate --skip-audit   Reviews only (use when re-running after a known-clean audit)
```

**Gate Criteria:**
- PASS: Audit clean + no CRITICAL or HIGH issues across all review agents
- WARN: Audit clean + HIGH issues only — merge with caution and track in issue
- BLOCK: Audit flagged evasion OR any CRITICAL review finding — must fix before merge

**Also verifies:**
- [ ] Tests passing (80%+ coverage)
- [ ] Build succeeds
- [ ] No console.log or debug statements
- [ ] No hardcoded secrets
- [ ] Branch is up to date with base
- [ ] File Claims in ROUTING.md all released (no `in-progress` rows for completed tasks)

Run before every PR merge.
