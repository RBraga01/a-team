# Testing Requirements

## Minimum Test Coverage: 80%

All three test types are required:
1. **Unit Tests** — Individual functions, utilities, components in isolation
2. **Integration Tests** — API endpoints, database operations, service interactions
3. **E2E Tests** — Critical user flows (auth, payments, core CRUD)

## Test-Driven Development (MANDATORY)

1. Write test first (RED) — test must fail
2. Run test — verify it FAILS
3. Write minimal implementation (GREEN)
4. Run test — verify it PASSES
5. Refactor (IMPROVE) — tests stay green
6. Verify coverage ≥ 80%

## Test Structure (AAA Pattern)

```typescript
test('description of expected behavior', () => {
  // Arrange — set up test data and state
  const input = createTestInput()

  // Act — call the function being tested
  const result = functionUnderTest(input)

  // Assert — verify the expected outcome
  expect(result).toEqual(expectedOutput)
})
```

## Edge Cases to Always Test

1. Null/Undefined input
2. Empty arrays/strings
3. Invalid types
4. Boundary values (min/max)
5. Error paths (network failures, DB errors)
6. Concurrent operations

## Test Anti-Patterns

- Testing implementation details instead of behavior
- Tests that depend on each other (shared state)
- Asserting too little (tests that always pass)
- Not mocking external dependencies

## Quality Checklist

- [ ] All public functions have unit tests
- [ ] All API endpoints have integration tests
- [ ] Critical flows have E2E tests
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] External dependencies mocked
- [ ] Tests are independent
- [ ] Coverage ≥ 80%

## Framework Commands

```bash
# JavaScript/TypeScript
npm run test:coverage
npx vitest run --coverage

# Python
pytest --cov=app --cov-report=term-missing

# Go
go test -cover ./...

# Rust
cargo test
```
