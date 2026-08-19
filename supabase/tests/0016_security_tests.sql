-- ============================================================================
-- PAPORLA — 0016_security_tests.sql (pgTAP)
-- Run only against Supabase local/staging after all migrations.
-- Never include this file in production migrations.
-- ============================================================================

BEGIN;
-- Supabase remote tests use cli_login_postgres with INHERIT FALSE.
SET LOCAL ROLE postgres;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT set_config(
  'search_path',
  COALESCE((
    SELECT quote_ident(n.nspname)
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgtap'
  ), 'extensions') || ',public,pg_catalog',
  true
);
SELECT plan(27);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis'),
  'postgis is installed'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'),
  'pg_trgm is installed'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'markets','regions','localities','user_profiles','shops','shop_stats','shop_hours',
      'packs','reservations','payments','payment_events','payment_refunds','favorites',
      'notifications','user_devices','notification_preferences','legal_documents',
      'legal_acceptances','user_penalties','reviews','activity_logs','outbox_events',
      'scheduled_job_runs','rate_limits'
    ]) AS expected(name)
    WHERE to_regclass('public.' || expected.name) IS NULL
  ),
  'all canonical business tables exist'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY(ARRAY[
        'markets','regions','localities','user_profiles','shops','shop_stats','shop_hours',
        'packs','reservations','payments','payment_events','payment_refunds','favorites',
        'notifications','user_devices','notification_preferences','legal_documents',
        'legal_acceptances','user_penalties','reviews','activity_logs','outbox_events',
        'scheduled_job_runs','rate_limits'
      ])
      AND c.relrowsecurity = false
  ),
  'RLS is enabled on every business table'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE grantee = 'anon'
      AND table_schema = 'public'
      AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES')
  ),
  'anon has no write/DDL-like privileges on public business tables'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES')
  ),
  'authenticated has no direct business-table mutations'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
    WHERE n.nspname IN ('public','app_private')
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ),
  'no Paporla public/app_private function is executable by PUBLIC'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.service_expire_payment_holds(integer)',
    'EXECUTE'
  ),
  'authenticated cannot execute service-only cron functions'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.create_payment_reservation(uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated can execute the canonical reservation RPC'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.service_expire_payment_holds(integer)',
    'EXECUTE'
  ),
  'service_role can execute service cron functions'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.shops'::regclass
      AND conname = 'shops_owner_key'
      AND contype = 'u'
  ),
  'one shop per owner is enforced for MVP'
);

SELECT ok(
  to_regclass('public.reservations_user_idempotency_key') IS NOT NULL,
  'reservation idempotency unique index exists'
);

SELECT ok(
  to_regclass('public.reservations_one_active_user_pack_key') IS NOT NULL,
  'one active reservation per user/pack index exists'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.conrelid IN ('public.shops'::regclass, 'public.packs'::regclass, 'public.reservations'::regclass)
      AND pg_get_constraintdef(c.oid) ILIKE '%ON DELETE CASCADE%'
  ),
  'shops/packs/reservations do not cascade-delete business history'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reservations'::regclass
      AND conname = 'reservations_status_check'
      AND pg_get_constraintdef(oid) LIKE '%payment_pending%'
      AND pg_get_constraintdef(oid) LIKE '%completed%'
  ),
  'canonical reservation states are constrained'
);

SELECT ok(
  (SELECT count(*) = 3 FROM storage.buckets
   WHERE id IN ('avatars','shop-images','pack-images')),
  'three canonical image buckets exist'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'INSERT'
      AND policyname = 'storage_auth_insert'
  ),
  'old unrestricted storage insert policy does not exist'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'on_auth_user_created'
      AND tgenabled <> 'D'
  ),
  'Auth profile creation trigger is installed and enabled'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.user_profiles'::regclass
      AND tgname = 'user_profiles_guard_privileged_fields'
      AND tgenabled <> 'D'
  ),
  'profile privileged-field guard trigger is enabled'
);

SELECT ok(
  (SELECT count(*) = 3 FROM public.markets WHERE country_code IN ('CL','AR','CO')),
  'Chile, Argentina and Colombia market seeds exist'
);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.markets WHERE country_code = 'ES'),
  'Spain is not seeded as an operating market'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.packs', 'SELECT'),
  'anon cannot query packs table columns directly'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'public.search_available_packs(uuid,uuid,double precision,double precision,integer,text,timestamptz,uuid,integer)',
    'EXECUTE'
  ),
  'anon can execute safe public pack search'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'search_available_packs'
      AND p.prosecdef = true
      AND array_to_string(p.proconfig, ',') LIKE '%search_path=%'
  ),
  'public search is SECURITY DEFINER with fixed search_path'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public','app_private')
      AND p.prosecdef = true
      AND COALESCE(array_to_string(p.proconfig, ','), '') NOT LIKE '%search_path=%'
  ),
  'all Paporla SECURITY DEFINER functions have fixed search_path'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reservations'
      AND policyname = 'reservations_user_read'
  ),
  'reservation owner RLS policy exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reservations'
      AND policyname = 'reservations_shop_owner_read'
  ),
  'merchant reservation RLS policy exists'
);

SELECT * FROM finish();
ROLLBACK;
