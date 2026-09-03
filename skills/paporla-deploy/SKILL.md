---
name: paporla-deploy
description: Use before deploying Paporla to production or when asked to verify deployment readiness. Runs through a pre-deploy checklist covering security, build, tests, env vars, and monitoring.
---

# Paporla Deploy

Pre-deployment verification workflow.
Actualizado 2026-09-03: la fuente de verdad del esquema es `supabase/migrations/`
(42 migraciones, 0001–0042). No existe `sql/00_master_schema.sql`.

## Pre-Deploy Checklist

Run these before every production deployment:

### 1. Security Gates (BLOCKING)

```bash
# Check for SERVICE_ROLE_KEY leaks outside allowed files
grep -r "SERVICE_ROLE_KEY" src/ --include="*.ts" --include="*.tsx" | grep -v "admin.ts" | grep -v "__tests__"

# CSP sin unsafe-inline: la politica vive en el middleware (no en next.config.js)
grep -r "unsafe-inline" src/lib/middleware/csp.ts

# Verify CSRF middleware is active
grep -r "csrf" src/lib/middleware/ --include="*.ts"

# Check for hardcoded secrets
grep -r "sk-\|api_key\|secret\|token" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v ".env"
```
