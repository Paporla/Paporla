-- ============================================================================
-- PAPORLA — 0012_permissions.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Exact table/function privileges. RLS remains a second independent gate.
-- ============================================================================

BEGIN;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Remove broad/default client privileges before adding the allowlist.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

-- RLS admin policies use one no-argument helper that can reveal only whether the
-- current caller is an admin. No arbitrary user-id role lookup is granted.
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_current_admin() TO authenticated;

-- Public catalogue/onboarding reads. RLS filters rows and lifecycle states.
GRANT SELECT ON TABLE
  public.markets,
  public.regions,
  public.localities
TO anon;

-- Authenticated users receive the public catalogue plus their private RLS rows.
GRANT SELECT ON TABLE
  public.markets,
  public.regions,
  public.localities,
  public.user_profiles,
  public.favorites,
  public.notifications,
  public.notification_preferences,
  public.legal_acceptances,
  public.user_penalties,
  public.activity_logs,
  public.scheduled_job_runs
TO authenticated;

-- No client INSERT/UPDATE/DELETE is granted on business tables. Exact RPCs own
-- all mutations and validate actor, resource, state and idempotency.
GRANT EXECUTE ON FUNCTION public.set_favorite(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_reservation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_pickup(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_own_shop(uuid, uuid, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_own_shop(uuid, uuid, text, text, text, text, text, text, text, text, text, double precision, double precision, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_own_shop_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_shop(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pack_draft(uuid, text, text, text, text[], text, text, bigint, bigint, integer, timestamptz, timestamptz, timestamptz, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pack_content(uuid, text, text, text, text[], text, text, bigint, bigint, timestamptz, timestamptz, timestamptz, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_pack(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pack_paused(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_pack_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_pack(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_legal_document(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_preference(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_device(text, text, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_device(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_shop_hour(uuid, smallint, smallint, time, time, boolean) TO authenticated;

-- Server-side code can perform DML but still uses the canonical RPCs for business
-- transitions. TRUNCATE/TRIGGER/REFERENCES are intentionally not granted.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA app_private TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Secure future defaults for this migration owner.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;
