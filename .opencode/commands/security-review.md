# /security-review

Security audit. Invokes the `security-reviewer` agent.

Checks OWASP Top 10, secrets, injection, authentication, and dependency vulnerabilities.

**Usage:**
```
/security-review
```

If a CRITICAL vulnerability is found: stop all other work, fix it first, rotate any exposed secrets.
