# /e2e

End-to-end test suite. Invokes the `e2e-runner` agent.

Prefers Agent Browser for semantic selectors. Falls back to Playwright. Tests critical user journeys: auth, core features, payments, CRUD flows.

**Usage:**
```
/e2e
```

Success criteria: all critical journeys passing (100%), overall pass rate > 95%, flaky rate < 5%.
