# /debug

Systematic root-cause debugging. Enforces the Iron Law — no fixes without investigation first.

**Invokes:** `debugger` agent

**Usage:**
```
/debug                       Debug current failing tests or reported bug
/debug "TypeError: cannot read property of undefined in UserService:42"
```

**The Four Phases (must complete in order):**
1. Root Cause Investigation — read errors, reproduce, check changes, gather evidence
2. Pattern Analysis — find working examples, compare differences
3. Hypothesis & Testing — one hypothesis, smallest change, verify before continuing
4. Implementation — create failing test, fix root cause, verify

**The Iron Law: No fixes without root cause investigation first.**

If 3+ fix attempts have failed: STOP — the issue is architectural, not surface-level.
