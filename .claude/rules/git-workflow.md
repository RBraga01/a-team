# Git Workflow

## Commit Message Format

```
<type>: <description>

<optional body explaining why>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Examples:
```
feat: add Stripe subscription billing with three tiers
fix: resolve N+1 query in user posts endpoint
refactor: extract auth middleware into focused module
test: add integration tests for checkout webhook handler
```

## Pull Request Workflow

1. Run `git diff [base-branch]...HEAD` to see all changes
2. Analyze full commit history (not just latest commit)
3. Draft PR title (< 70 characters) and comprehensive body
4. Include test plan with verification TODOs
5. Push with `-u` flag for new branches

## PR Body Format

```markdown
## Summary
- What changed and why

## Test plan
- [ ] Verify happy path works
- [ ] Verify error handling works
- [ ] Run E2E tests on staging
```

## Branch Naming

- Features: `feat/<description>`
- Bug fixes: `fix/<description>`
- Veto-isolated decisions: `isolate/dec-NNN`

## Pre-Merge Requirements

- [ ] All CI checks passing
- [ ] Quality gate passed (`/quality-gate`)
- [ ] Branch up to date with base
- [ ] Merge conflicts resolved
- [ ] No CRITICAL or HIGH review findings

## Hard Rules

- Never force-push to main/master
- Never use `--no-verify` unless explicitly approved
- Never commit secrets (use `git secret` or `git-crypt` for sensitive files)
- Resolve conflicts rather than discarding changes
