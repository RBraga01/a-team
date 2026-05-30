# /security-review

Run a focused security audit on current code changes.

**Invokes:** `security-reviewer` agent

**Always run after:** New API endpoints, auth code, user input handling, DB queries,
file uploads, payment code, external API integrations, dependency updates.

**OWASP Top 10 coverage:**
Injection, Broken Auth, Sensitive Data, Broken Access Control, XSS,
Insecure Deserialization, Known Vulnerabilities, Insufficient Logging.

**If CRITICAL found:**
1. STOP all other work
2. Document full report
3. Alert project owner
4. Rotate exposed secrets
5. Fix before merging anything else
