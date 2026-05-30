# /build-fix

Diagnose and fix build errors or TypeScript type errors with minimal code changes.

**Invokes:** `build-error-resolver` agent

**Usage:**
```
/build-fix                   Fix all build errors
/build-fix --ts-only         TypeScript errors only
/build-fix --lint-only       ESLint errors only
```

**Scope:** Fix errors with smallest possible diffs. No refactoring. No architectural changes.

**Prioritization:**
1. Build-blocking errors first
2. Type errors second
3. Lint warnings third

**When NOT to use:**
- Code needs refactoring → `/refactor`
- Architecture changes needed → `/plan`
- Tests failing → `tdd-guide` agent
