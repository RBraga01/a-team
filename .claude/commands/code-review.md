# /code-review

Review staged and recent code changes for quality, security, and correctness.

**Invokes:** `code-reviewer` agent

**Usage:**
```
/code-review
/code-review --staged-only
/code-review --commit HEAD~3..HEAD
```

**What it checks:**
- CRITICAL: Hardcoded secrets, SQL injection, XSS, auth bypasses
- HIGH: Large functions, deep nesting, missing error handling, mutation patterns
- HIGH: React/Next.js: stale closures, missing deps, wrong keys
- HIGH: Backend: N+1 queries, unvalidated input, missing rate limiting
- MEDIUM: Performance, unnecessary re-renders, large bundles
- LOW: TODOs without tickets, poor naming, magic numbers

**Approval Criteria:**
- Approve: No CRITICAL or HIGH issues
- Warning: HIGH issues only (can merge with caution)
- Block: CRITICAL issues found

**Run after every code change before committing.**
