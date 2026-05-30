# /quality-gate

Full pre-merge quality check. Runs code-reviewer and security-reviewer in parallel.

Gate criteria:
- PASS: No CRITICAL or HIGH issues
- WARN: HIGH only — merge with documented issue
- BLOCK: Any CRITICAL — must fix before merge

Also verifies: tests passing, build succeeds, no debug statements, no hardcoded secrets.
