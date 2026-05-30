# Common Patterns

## Repository Pattern

Encapsulate data access behind a consistent interface:
- Define standard operations: `findAll`, `findById`, `create`, `update`, `delete`
- Concrete implementations handle storage details (database, API, file, etc.)
- Business logic depends on the abstract interface, not the storage mechanism
- Enables easy swapping of data sources and simplifies testing with mocks

## API Response Envelope

Use a consistent envelope for all API responses:
```typescript
{
  success: boolean
  data: T | null
  error: string | null
  meta?: { total: number; page: number; limit: number }
}
```

## Skeleton Projects

When implementing new functionality:
1. Search for battle-tested skeleton projects first
2. Evaluate options on: security, extensibility, relevance, maintenance activity
3. Clone best match as foundation
4. Iterate within proven structure rather than greenfield

## Error Handling Pattern

```typescript
// Wrap external operations in Result types
type Result<T> = { ok: true; data: T } | { ok: false; error: string }

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await db.users.findById(id)
    return { ok: true, data: user }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
```

## Development Workflow (Research → Plan → TDD → Review → Commit)

0. **Research** — check GitHub, docs, registries before writing anything new
1. **Plan** — use `planner` agent before coding
2. **TDD** — write tests first with `tdd-guide` agent
3. **Code Review** — use `code-reviewer` immediately after writing code
4. **Commit** — conventional commit format, detailed body
