# Security Guidelines

## Mandatory Pre-Commit Checks

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated at system boundaries
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML output)
- [ ] CSRF protection on state-changing endpoints
- [ ] Authentication/authorization verified on every protected route
- [ ] Rate limiting on all public endpoints
- [ ] Error messages do not leak sensitive data

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables or a secret manager
- Validate that required secrets are present at startup
- Rotate any secrets that may have been exposed

## Security Response Protocol

If any security issue is found:
1. STOP immediately — do not continue with unrelated work
2. Use `security-reviewer` agent for full assessment
3. Fix CRITICAL issues before any other merge
4. Rotate any exposed secrets
5. Review the full codebase for similar patterns

## OWASP Top 10 — Quick Reference

| Risk | Prevention |
|------|-----------|
| Injection | Parameterized queries, input sanitization |
| Broken Auth | bcrypt/argon2, JWT validation, session security |
| Sensitive Data | HTTPS, env vars, PII encryption, sanitized logs |
| Broken Access Control | Auth check on every route, CORS configured |
| Security Misconfiguration | Debug off in prod, security headers set |
| XSS | Output escaping, CSP, DOMPurify |
| Known Vulnerabilities | npm audit, govulncheck, cargo audit |
| Insufficient Logging | Security events logged, alerts configured |

## Defense in Depth

Apply multiple layers of security — never rely on a single control:
1. Input validation at the boundary
2. Parameterized queries in data access
3. Output encoding in the view
4. Authorization checks in business logic
5. Audit logging for sensitive operations
