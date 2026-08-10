---
name: paporla-supabase
description: Use when working with Supabase in Paporla — database queries, RPC functions, RLS policies, client types, and migration rules. Triggered by Supabase references, database changes, SQL, or RLS.
---

# Paporla Supabase

Supabase conventions and patterns for this project.

## Client Types — Choose the Right One

| Client         | Import                                        | When to use                                                                               | Auth level                |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------- |
| Server client  | `@/lib/supabase/server` → `createClient()`    | Server Components, API routes, RSC                                                        | User's session (anon key) |
| Browser client | `@/lib/supabase/client` → `supabaseBrowser()` | Client Components (hooks)                                                                 | User's session (anon key) |
| Admin client   | `@/lib/supabase/admin` → `getSupabaseAdmin()` | Background jobs, cron, notifications (notifications_insert_own RLS blocks regular client) | Service role (bypass RLS) |

## 🔴 CRITICAL: Admin Client Rules

**NEVER use `getSupabaseAdmin()` or `SUPABASE_SERVICE_ROLE_KEY` in:**

- Layout files (`layout.tsx`) that could be public
- `sitemap.ts` or `robots.ts`
- Client components
- Any code path that reads public data without needing RLS bypass

**ONLY use admin client in:**

- CRON endpoints (`src/app/api/cron/**`)
- Notification sending (RLS blocks `INSERT` on notifications for non-owners)
- Approved server-side operations where user auth was already validated

**For public metadata reads in layouts**, use the server client (`@/lib/supabase/server`):

```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
// This uses anon key — safe for public metadata
```

## RPC Functions (Database)

All critical mutations go through RPC functions with `SECURITY DEFINER`:

| RPC                                                            | Purpose                                                          | Auth check                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| `create_reservation_atomic(pack_id, quantity, payment_method)` | Create reservation with stock decrement (uses `FOR UPDATE` lock) | `auth.uid()`                     |
| `cancel_reservation(reservation_id, reason)`                   | Cancel + reintegrate stock + update stats                        | `auth.uid()`                     |
| `validate_pickup(pickup_code)`                                 | Validate pickup code (shop owner or admin only)                  | Shop owner + role check          |
| `expire_reservations()`                                        | Mark overdue reservations as no_show                             | Service role                     |
| `cleanup_pending_reservations(minutes_ago)`                    | Clean stale pending reservations                                 | Service role                     |
| `update_shop_rating(shop_id, rating)`                          | Update shop rating atomically                                    | Authenticated                    |
| `admin_delete_user(user_id)`                                   | Delete user and all their data                                   | Admin only (checked in function) |
| `admin_delete_shop(shop_id)`                                   | Delete shop and all related data                                 | Admin only                       |

**Always use RPC for mutations that touch multiple tables or need atomicity.** Never do multi-step updates from the app layer that should be atomic.

## RLS Policies

All tables have Row-Level Security enabled. Key policies:

- **user_profiles**: Users read/write own; admins all
- **shops**: Public read; owner manages own; admins all
- **packs**: Public read active packs; owner manages own; admins all
- **reservations**: Users CRUD own; admins all; no direct UPDATE (go through RPC)
- **favorites**: Users manage own
- **notifications**: Users CRUD own; shop owners can see reservations for their shops; admins all
- **activity_logs**: Users insert own; admins read all

## Migration Rules

The schema is in `sql/00_master_schema.sql` (1290 lines). It is designed to be **idempotent** — safe to run multiple times.

When changing the schema:

1. Add changes at the END of the file (new sections)
2. Use `IF NOT EXISTS` / `IF EXISTS` / `DO $$ BEGIN ... EXCEPTION ... END; $$` patterns
3. Never delete existing sections — only add
4. Test by running in Supabase SQL Editor
5. Update TypeScript types in `src/types/database.ts` to match

## Query Patterns

**Server-side (RSC / API routes):**

```typescript
const supabase = await createClient() // from @/lib/supabase/server
const { data, error } = await supabase.from('packs').select('*, shop:shops(*)').eq('is_active', true)
```

**Client-side (hooks):**

```typescript
const supabase = supabaseBrowser() // from @/lib/supabase/client
```

Prefetch via React Query; avoid direct Supabase calls in components.

**Admin operations:**

```typescript
const supabase = getSupabaseAdmin() // from @/lib/supabase/admin
```

Use sparingly — only when RLS prevents the operation.
