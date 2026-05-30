# /refactor

Find and safely remove dead code, unused dependencies, and duplicates.

**Invokes:** `refactor-cleaner` agent

**Usage:**
```
/refactor                    Full analysis and cleanup
/refactor --deps-only        Unused npm/pip/cargo dependencies only
/refactor --exports-only     Unused TypeScript exports only
```

**Tools run:**
- `npx knip` — unused files, exports, dependencies
- `npx depcheck` — unused npm dependencies
- `npx ts-prune` — unused TypeScript exports

**Process:** Analyze → Verify each item → Remove SAFE items → Run tests → Commit per batch

**Never run:**
- During active feature development
- Right before production deployment
- Without test coverage
