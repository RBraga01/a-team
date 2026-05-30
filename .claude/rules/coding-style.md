# Coding Style

## Immutability (CRITICAL)

NEVER mutate. ALWAYS return a new copy.

```js
// [INVALID]
user.verified = true
results.push(item)

// [VALID]
return { ...user, verified: true }
return [...results, item]
```

## Early Returns over Nesting (max 4 levels)

```js
// [INVALID]
function process(user) {
  if (user) {
    if (user.active) {
      if (user.role === 'admin') {
        doWork()
      }
    }
  }
}

// [VALID]
function process(user) {
  if (!user) return
  if (!user.active) return
  if (user.role !== 'admin') return
  doWork()
}
```

## Function Size (max 50 lines)

```python
# [INVALID]
def handle_order(order):
    # 80 lines doing validation, DB write, email, logging all in one function

# [VALID]
def handle_order(order):
    validated = validate_order(order)
    saved = save_order(validated)
    notify_user(saved)
    log_order(saved)
```

## Error Handling — Never Silent

```ts
// [INVALID]
try {
  await sendEmail(user)
} catch (_) {}

// [VALID]
try {
  await sendEmail(user)
} catch (err) {
  logger.error('email failed', { userId: user.id, err })
  throw new EmailError('Failed to notify user', { cause: err })
}
```

## Input Validation at Boundaries

```ts
// [INVALID]
app.post('/order', (req, res) => {
  createOrder(req.body.amount, req.body.userId)
})

// [VALID]
app.post('/order', (req, res) => {
  const { amount, userId } = OrderSchema.parse(req.body)
  createOrder(amount, userId)
})
```

## No Magic Numbers

```ts
// [INVALID]
if (retries > 3) throw new Error('too many retries')
await sleep(5000)

// [VALID]
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000
if (retries > MAX_RETRIES) throw new Error('too many retries')
await sleep(RETRY_DELAY_MS)
```

## Naming Conventions

| Kind | Convention | Example |
|------|-----------|---------|
| Variables, functions | camelCase | `getUserById`, `isActive` |
| Booleans | is/has/should/can prefix | `isLoading`, `hasPermission` |
| Types, interfaces, components | PascalCase | `UserProfile`, `OrderItem` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `BASE_URL` |
| Custom hooks | use prefix | `useAuth`, `useDebounce` |

## File Organization

- 200–400 lines typical, **800 max**
- Organize by feature/domain, not by type
- Many small files > few large files

## Surgical Changes

Touch only what the task requires. Every line in the diff must trace directly to the request.

### Don't rewrite what wasn't broken

```ts
// Task: "fix the null check on userId"

// [INVALID] — fixes the bug AND reformats, adds types, renames
function getOrder(userId) {                    // renamed below
function getOrder(userId: string | null) {     // type added — not asked
  if (!userId) throw new Error('missing')      // this is the fix
  const result = db.query(userId)              // style unchanged below
  const result = await db.query(userId)        // await added — not asked
  return result
  return result ?? null                        // changed — not asked
}

// [VALID] — only the null check changed
function getOrder(userId) {
  if (!userId) throw new Error('missing id')   // ← the actual fix
  const result = db.query(userId)
  return result
}
```

### Match the style you found — don't normalize it

```python
# Task: "add logging to the payment processor"
# Existing code uses single quotes and snake_case — keep it that way

# [INVALID] — adds logging AND reformats to your preferences
def process_payment(order_id: str, amount: float) -> dict:  # type hints added
    """Process a payment."""                                 # docstring added
    logger.info(f"Processing payment for order {order_id}") # double quotes
    response = gateway.charge(order_id, amount)
    return {"status": response.status}                      # double quotes

# [VALID] — adds only the logging, preserves existing style
def process_payment(order_id, amount):
    logger.info('Processing payment for order %s', order_id) # single quotes
    response = gateway.charge(order_id, amount)
    return {'status': response.status}                       # single quotes
```

### Clean up only what you created

```ts
// Task: "replace manual fetch with the httpClient utility"

// [INVALID] — removes all unused imports in the file
- import { fetch } from 'node-fetch'     // your change made this unused ✓ remove
- import { formatDate } from './utils'   // pre-existing dead code ✗ leave it
- import { logger } from './logger'      // pre-existing dead code ✗ leave it
+ import { httpClient } from './http'

// [VALID] — removes only the import YOUR change made unused
- import { fetch } from 'node-fetch'     // ← your change made this unused
+ import { httpClient } from './http'
  import { formatDate } from './utils'   // ← leave — not your responsibility
  import { logger } from './logger'      // ← leave — not your responsibility
```

**Self-check before committing:** "Is every changed line a direct consequence of the task I was given? If not — undo the extra changes."

## Pre-Completion Checklist

- [ ] No mutation — spread/map/filter only
- [ ] No deep nesting (>4 levels)
- [ ] Functions < 50 lines, files < 800 lines
- [ ] Every error handled and logged
- [ ] No hardcoded values — use named constants
- [ ] Input validated at all system boundaries
- [ ] Every diff line traces to the task — no drive-by changes
