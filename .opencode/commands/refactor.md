# /refactor

Dead code cleanup and consolidation. Invokes the `refactor-cleaner` agent.

Runs detection tools (knip, depcheck, ts-prune), categorizes findings by risk, and removes safely with tests passing after each batch.

**Usage:**
```
/refactor
```

Never run during active feature development or before production deploys.
