---
name: paporla-deploy
description: Use before deploying Paporla to production or when asked to verify deployment readiness. Runs through a pre-deploy checklist covering security, build, tests, env vars, and monitoring.
---

# Paporla Deploy

Pre-deployment verification workflow.

## Pre-Deploy Checklist

Run these before every production deployment:

### 1. Security Gates (BLOCKING)

```bash
# Check for SERVICE_ROLE_KEY leaks outside allowed files
grep -r "SERVICE_ROLE_KEY" src/ --include="*.ts" --include="*.tsx" | grep -v "admin.ts" | grep -v "__tests__"

# Check CSP for unsafe-inline
grep "unsafe-inline" next.config.js

# Verify CSRF middleware is active
grep -r "csrf" src/lib/middleware/ --include="*.ts"

# Check for hardcoded secrets
grep -r "sk-\|api_key\|secret\|token" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v ".env"
```

### 2. Build & Tests

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:run
npm run build
```

### 3. Environment Verification

```bash
# Required vars in production
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
echo $RESEND_API_KEY
echo $CRON_SECRET
echo $NEXT_PUBLIC_SITE_URL
echo $NEXT_PUBLIC_SENTRY_DSN
echo $SENTRY_ORG
echo $SENTRY_PROJECT
```

### 4. Database

- [ ] `sql/00_master_schema.sql` executed on production Supabase
- [ ] RLS enabled on all tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] All RPC functions deployed
- [ ] Rate limits table created (`rate_limits`)
- [ ] Test `create_reservation_atomic` RPC works

### 5. DNS & Email

- [ ] SPF record: `v=spf1 include:spf.resend.com ~all`
- [ ] DKIM records configured (2 records from Resend)
- [ ] DMARC record: `v=DMARC1; p=quarantine; ...`
- [ ] Domain verified in Resend dashboard
- [ ] Test email delivered (not spam): send to mail-tester.com

### 6. Post-Deploy Verification

```bash
# Health check
curl https://paporla.com/api/health

# Auth flow
curl -I https://paporla.com/login

# Public pages
curl -I https://paporla.com/
curl -I https://paporla.com/packs
curl -I https://paporla.com/about

# Check security headers
curl -I https://paporla.com | grep -i "x-frame\|x-content\|csp\|hsts\|referrer"
```

### 7. Monitoring

- [ ] Sentry receiving errors (check dashboard)
- [ ] Google Analytics tracking (check real-time)
- [ ] Vercel deployment healthy
- [ ] Supabase dashboard shows active connections
- [ ] Cron jobs configured (cron-job.org or similar):
  - `GET /api/cron/expire-reservations` — every 30 min
  - `GET /api/cron/cleanup-pending` — every 5 min
  - `GET /api/cron/cleanup-rate-limits` — every 15 min
  - `GET /api/cron/pickup-reminders` — every hour

## Rollback Plan

If deployment fails:

1. **Vercel**: One-click rollback to previous deployment
2. **Database**: Schema changes are additive — no rollback needed
3. **RPC functions**: Can be re-deployed via SQL Editor
4. **Alert**: Notify team via Sentry + Slack/email

## Soft Launch Checklist (first users)

- [ ] Limit to invited users (use feature flag or allowlist)
- [ ] Monitor error rate < 0.5%
- [ ] Monitor P95 API latency < 500ms
- [ ] Monitor reservation creation success rate > 99%
- [ ] Monitor email delivery > 95%
- [ ] User feedback channel active (email/chat)
- [ ] Database backup configured (Supabase auto-backup)
