---
name: paporla-supabase
description: Use when working with Supabase in Paporla — database queries, RPC functions, RLS policies, client types, and migration rules. Triggered by Supabase references, database changes, SQL, or RLS.
---

# Paporla Supabase

Supabase conventions and patterns for this project.

Everything below was verified against a local database built from scratch with
all 41 migrations on 2026-09-02. If a name here does not exist in
`supabase/migrations/`, this file is wrong — trust the migrations.

## The one rule that caused a real incident

**Every migration that creates a function MUST revoke `EXECUTE` from `PUBLIC`
before granting it to anyone.**

PostgreSQL grants `EXECUTE` to `PUBLIC` on every new function by default, and
`ALTER DEFAULT PRIVILEGES` does **not** prevent it: the default is materialised
into the function's ACL at the moment you run the `GRANT`. Verified
experimentally on 2026-09-02 — a fresh function created after the hardening in
`0017` and `0041` still ended up with `=X/postgres` (that leading empty grantee
is `PUBLIC`) in its ACL.

Migrations 0027, 0028, 0032, 0033, 0034, 0038 and 0039 forgot that line and
left eight functions world-executable, including the whole admin panel. No data
leaked, because every one of them re-checks the caller internally
(`app_private.require_active_caller()` + `app_private.is_admin()`, or shop
ownership). Fixed in `0041`. The internal checks are the real defence; the
grants are the second layer, and both must agree.

### Canonical migration pattern

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.my_function(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE              -- or VOLATILE if it writes
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  -- authorisation lives HERE, not in the grants
  IF NOT app_private.is_admin(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  -- ...
END;
$$;

COMMENT ON FUNCTION public.my_function(uuid) IS 'What it does and who may call it.';

-- MANDATORY, in this order, immediately before the GRANT:
REVOKE EXECUTE ON FUNCTION public.my_function(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_function(uuid) TO authenticated;

COMMIT;
```

Notes:

- Write argument types literally (`uuid`, `timestamptz`, `integer`). Do not rely
  on name resolution.
- A function in `app_private` needs no `GRANT`: only `service_role` and the
  owner have `USAGE` on that schema (revoked in `0001`). It still needs the
  `REVOKE ... FROM PUBLIC`, because a NULL ACL means "apply the default", and
  the default includes `PUBLIC`.
- If the signature changes, `CREATE OR REPLACE` will fail. Use
  `DROP FUNCTION IF EXISTS ...` first, then recreate — and remember that the new
  function gets a fresh ACL, so the `REVOKE`/`GRANT` pair is mandatory again.
- Migrations are idempotent and are applied in order, `0001` to the latest.
  They are the only source of truth for the schema. There is no master schema
  file.

### How to verify before deploying any migration

```bash
npx supabase start                 # local stack, applies every migration
npx supabase migration up --local  # apply only the pending ones
npx supabase test db --local       # 27 pgTAP security assertions
```

`supabase test db --local` is what catches a forgotten `REVOKE`. Test 7 fails
with `no Paporla public/app_private function is executable by PUBLIC`. Never
relax that test; fix the migration.

Never run `supabase link`, `supabase db push`, `supabase db pull` or
`supabase db reset --linked` unless the current task explicitly says so. They
reach cloud projects. Everything above stays on `localhost`.

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

## RPC Functions

The client **never reads or writes tables directly**: migration `0012` runs
`REVOKE ALL ... FROM authenticated` on every table in `public`. Everything goes
through a `SECURITY DEFINER` function that authorises the caller internally.

### Callable by `authenticated` (42 functions)

| Group        | Functions                                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reservations | `create_payment_reservation`, `cancel_reservation`, `confirm_shop_reservation`, `validate_pickup`, `list_my_reservations`, `list_shop_reservations`                                |
| Packs        | `create_pack_draft`, `update_pack_content`, `publish_pack`, `set_pack_paused`, `adjust_pack_stock`, `archive_pack`, `get_my_pack`, `list_my_packs`                                 |
| Shops        | `create_own_shop`, `update_own_shop`, `submit_own_shop_for_review`, `get_my_shop`, `set_shop_hour`                                                                                 |
| Catalogue    | `search_available_packs`, `get_public_shop`, `get_pack_public`, `list_public_shops`, `list_public_packs`, `list_public_reviews`, `community_stats`                                 |
| Profile      | `update_own_profile`, `set_favorite`, `set_notification_preference`, `mark_notification_read`, `register_device`, `revoke_device`                                                  |
| Legal        | `accept_legal_document`, `list_current_legal_documents`                                                                                                                            |
| Admin        | `admin_counts`, `admin_dashboard_trend`, `list_admin_shops`, `list_admin_packs`, `list_admin_reservations`, `admin_review_shop`, `admin_set_user_role`, `admin_set_account_status` |

Callable by `anon` as well (public reads): `search_available_packs`,
`get_public_shop`, `get_pack_public`, `list_public_shops`, `list_public_packs`,
`list_public_reviews`, `community_stats`.

### Service role only (17 functions)

Called from cron endpoints and background jobs, never from the client:

`service_open_pickup_windows`, `service_mark_no_shows`,
`service_complete_picked_up_reservations`, `service_expire_packs`,
`service_expire_payment_holds`, `service_issue_pickup_credentials`,
`service_record_payment_authorized`, `service_record_payment_paid`,
`service_mark_authorized_payment_captured`, `service_mark_payment_voided`,
`service_begin_refund`, `service_mark_refund_completed`,
`service_mark_refund_failed`, `service_claim_outbox`, `service_finish_outbox`,
`service_check_rate_limit`, `service_cleanup_rate_limits`.

### Internal helpers (`app_private`)

`require_active_caller`, `user_role`, `is_admin`, `is_current_admin`,
`owns_shop`, `require_service_role`, `enqueue_event`, `set_updated_at`,
`handle_new_auth_user`, `sync_auth_user_profile`,
`guard_profile_privileged_fields`, `sync_shop_geog`, `ensure_shop_stats`,
`guard_reservation_immutable_fields`, `guard_payment_immutable_fields`,
`guard_append_only`, `audit_status_change`, `can_write_pack_image`,
`can_write_shop_image`, `normalize_chile_rut`.

**Always use an RPC for mutations that touch multiple tables or need
atomicity.** Never do multi-step updates from the app layer that should be
atomic.

## Tables and RLS

24 tables in `public`, all with Row-Level Security enabled, and **no views** —
public reads are functions too, so the client never sees a table.

`markets`, `regions`, `localities`, `user_profiles`, `shops`, `shop_stats`,
`shop_hours`, `packs`, `reservations`, `payments`, `payment_events`,
`payment_refunds`, `favorites`, `notifications`, `user_devices`,
`notification_preferences`, `legal_documents`, `legal_acceptances`,
`user_penalties`, `reviews`, `activity_logs`, `outbox_events`, `rate_limits`,
`scheduled_job_runs`.

Key policies:

- **user_profiles**: users read/write own; admins all
- **shops**: public read; owner manages own; admins all
- **packs**: public read of active packs; owner manages own; admins all
- **reservations**: users read own; no direct `UPDATE` (go through an RPC)
- **notifications**: users read own; shop owners see reservations for their shops
- **activity_logs**: append-only (guarded by trigger)

## Types

- `src/types/database.generated.ts` — generated, canonical. Regenerate after
  schema changes; do not edit by hand.
- `src/types/{pack,reservation,shop,user}.ts` — small hand-written domain types.
- There is no `src/types/database.ts`. If you find a reference to it, it is
  stale.

## Query Patterns

**Server-side (RSC / API routes):**

```typescript
const supabase = await createClient() // from @/lib/supabase/server
const { data, error } = await supabase.rpc('search_available_packs', { p_market_id: marketId })
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

## Correction log

This file previously documented `sql/00_master_schema.sql` as the schema source
(that file does not exist), listed RPC names that were never real
(`create_reservation_atomic`, `expire_reservations`,
`cleanup_pending_reservations`, `update_shop_rating`, `admin_delete_user`,
`admin_delete_shop`), pointed at the removed `src/types/database.ts`, and said
nothing about the `PUBLIC` execute default. All of it corrected on 2026-09-02
against the local database.
