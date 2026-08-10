---
name: paporla-security
description: Use when touching auth, API routes, CSP, env vars, secrets, or any security-sensitive code in Paporla. Provides security red lines, CSRF rules, and verification checks. Triggered by auth, security, middleware, or environment variable changes.
---

# Paporla Security

Security red lines. Break these and the deployment is blocked.

## 🔴 BLOCKING VIOLATIONS

### S-01: Never use SERVICE_ROLE_KEY in public-facing code

- **Banned in**: `layout.tsx`, `sitemap.ts`, `robots.ts`, client components, public pages
- **Allowed only in**: `src/app/api/cron/**`, `src/lib/notifications/`, `src/lib/services/` (server-side only)
- **For metadata reads** (generateMetadata, sitemap): use `createClient()` from `@/lib/supabase/server`
- **Check**: `grep -r "SERVICE_ROLE_KEY" src/ --include="*.ts" --include="*.tsx" | grep -v admin.ts | grep -v test`

### S-02: CSP must NOT contain 'unsafe-inline'

- The Content-Security-Policy in `next.config.js` must not have `'unsafe-inline'` in `script-src`
- For inline scripts (JSON-LD, Google Analytics), use **nonces** or move to external files
- Every new inline `<script>` must be reviewed

### S-03: CSRF protection on all API mutations

- All `POST`, `PUT`, `PATCH`, `DELETE` API routes must verify a CSRF token or use SameSite cookie validation
- The implementation lives in `src/lib/middleware/csrf.ts`
- Add `X-CSRF-Token` header check to mutation endpoints

## 🟠 MANDATORY CHECKS (every PR)

1. **No secrets in client code**: `NEXT_PUBLIC_*` prefix only for harmless config (URL, anon key, site URL, GA ID, Sentry DSN)
2. **Input validation**: Every API route must validate input — use Zod schemas from `@/lib/utils/validations.ts`
3. **RLS verified**: New tables must have RLS policies. Check `sql/00_master_schema.sql` sections 13.x for patterns
4. **CSP compatible**: New external domains (scripts, images, fonts, connect-src) must be added to `next.config.js` CSP
5. **No raw user input in HTML**: Always escape; React handles this by default — don't use `dangerouslySetInnerHTML` without sanitization

## Environment Variables — Visibility Rules

| Variable                        | Public?  | Notes                              |
| ------------------------------- | -------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅ Yes   | Anon key is designed to be public  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes   |                                    |
| `NEXT_PUBLIC_SITE_URL`          | ✅ Yes   |                                    |
| `NEXT_PUBLIC_GA_ID`             | ✅ Yes   |                                    |
| `NEXT_PUBLIC_SENTRY_DSN`        | ✅ Yes   | Configure CORS in Sentry dashboard |
| `NEXT_PUBLIC_MAINTENANCE_MODE`  | ✅ Yes   |                                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | ❌ NEVER | Server only — bypasses all RLS     |
| `RESEND_API_KEY`                | ❌ NEVER | Server only                        |
| `CRON_SECRET`                   | ❌ NEVER | Server only                        |
| `SENTRY_ORG`                    | ❌ NEVER | Build-time only                    |
| `SENTRY_PROJECT`                | ❌ NEVER | Build-time only                    |

## Cookie Security (middleware.ts)

- Ensure `Secure: true` in production
- Set `SameSite: Lax` as minimum
- Session cookies should have `HttpOnly: true`

## Rate Limiting

- API routes are rate-limited via `src/lib/middleware/rateLimit.ts`
- Limits per route configured in `routeLimits` object
- Two-layer: in-memory Map (fast) + Supabase table (persistent)
- Set `X-RateLimit-*` response headers on limited routes
