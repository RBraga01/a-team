# /e2e

Run, generate, or maintain end-to-end tests for critical user flows.

**Invokes:** `e2e-runner` agent

**Usage:**
```
/e2e                         Run all E2E tests
/e2e --generate "auth flow"  Generate new E2E tests for a user journey
/e2e --fix-flaky             Identify and quarantine flaky tests
/e2e --report                Show latest test report
```

**Priority by risk:**
- HIGH: Authentication, payments, data mutations
- MEDIUM: Search, navigation, form submissions
- LOW: UI polish, cosmetic interactions

**Flaky test protocol:**
Run locally 3-5 times. If flaky → quarantine with `test.fixme()` and file issue.

**Success metrics:**
- Critical journeys: 100% pass rate
- Overall: > 95% pass rate
- Flaky rate: < 5%
- Duration: < 10 minutes
