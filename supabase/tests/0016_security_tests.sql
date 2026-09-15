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
SELECT plan(38);

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

-- Favoritos (Lote F1, 0043): la lectura oficial es list_my_favorites y la
-- tabla sigue siendo RPC-only — el bug L-06 fue precisamente hablar directo.
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'list_my_favorites'
      AND p.prosecdef = true
      AND p.provolatile = 's'
  ),
  'list_my_favorites exists as SECURITY DEFINER STABLE'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.list_my_favorites()',
    'EXECUTE'
  ),
  'authenticated can execute list_my_favorites'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.set_favorite(uuid, boolean)',
    'EXECUTE'
  ),
  'authenticated can execute set_favorite'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'favorites'
      AND grantee IN ('anon', 'authenticated')
  ),
  'favorites table stays RPC-only: no direct grants to anon/authenticated'
);

-- ---------------------------------------------------------------------------
-- L-64 Camino 1 (0048): shop_mark_picked_up, la entrega sin credencial.
-- Convención 0041: SECURITY DEFINER con search_path fijo, REVOKE FROM PUBLIC y
-- sin acceso para anon. El test global de más arriba ya vigila que ninguna
-- función de public/app_private sea ejecutable por PUBLIC; aquí se fija además
-- la firma concreta, para que un cambio de search_path o de volatilidad no
-- pase desapercibido.
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'shop_mark_picked_up'
      AND p.prosecdef = true
      AND p.provolatile = 'v'
  ),
  'shop_mark_picked_up exists as SECURITY DEFINER VOLATILE'
);

SELECT ok(
  (SELECT p.proconfig[1] LIKE 'search_path=%'
     AND p.proconfig[1] LIKE '%pg_catalog%'
     AND p.proconfig[1] LIKE '%app_private%'
     AND p.proconfig[1] LIKE '%public%'
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'shop_mark_picked_up'
  ),
  'shop_mark_picked_up pins its search_path (convention 0041)'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.shop_mark_picked_up(uuid)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.shop_mark_picked_up(uuid)',
    'EXECUTE'
  ),
  'shop_mark_picked_up is callable by authenticated but not by anon'
);

-- ---------------------------------------------------------------------------
-- L-48 / A-04 (0049): update_own_shop y las coordenadas.
--
-- Regresion confirmada por dos auditorias independientes: la 0021 anadio
-- COALESCE para que un NULL significara "no toques la ubicacion" y la 0022
-- anadio la validacion de pareja y de rangos; la 0024 y la 0038 reescribieron
-- la funcion entera y se llevaron las dos cosas por delante. Mientras el bug
-- estuvo vivo, guardar el perfil sin reenviar coordenadas borraba la ubicacion
-- del comercio devolviendo success=true, y el comercio desaparecia del catalogo.
--
-- Las tres guardas viven ANTES de la busqueda del comercio, asi que se pueden
-- probar con identificadores de comercio inventados y sin datos de seed: si
-- alguien vuelve a reescribir la funcion y las pierde, estos tests pasan de
-- devolver el error de validacion a devolver SHOP_NOT_OWNED_OR_INACTIVE.
-- Verificado por mutacion: con la 0038 reinstalada fallan exactamente 3 de 4.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _t0049 (caso text PRIMARY KEY, msg text) ON COMMIT DROP;

CREATE FUNCTION _captura_0049(p_caso text, p_lat double precision, p_lng double precision)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- require_active_caller (0009) no se conforma con que haya un identificador de
  -- sesion: comprueba que el usuario exista en public.user_profiles con
  -- account_status = 'active'. Con un uuid inventado la funcion moria en
  -- ACCOUNT_NOT_ACTIVE antes de llegar a las guardas de coordenadas, y el test
  -- no media lo que decia medir. Asi que se crea un usuario de verdad. El
  -- trigger on_auth_user_created (0010) crea su perfil activo. Todo dentro del
  -- BEGIN/ROLLBACK del fichero, o sea que no deja rastro.
  DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-0000000000ff';
  INSERT INTO auth.users (id, email)
  VALUES ('00000000-0000-0000-0000-0000000000ff', 'pgtap-0049@example.test');

  -- Se fijan las dos variantes del claim por si auth.uid() lee una u otra.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ff', false);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ff"}', false);

  BEGIN
    PERFORM public.update_own_shop(
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
      'x', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      p_lat, p_lng, NULL, NULL, NULL, NULL, NULL
    );
    INSERT INTO _t0049 VALUES (p_caso, 'SIN ERROR');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _t0049 VALUES (p_caso, SQLERRM);
  END;
END $$;

SELECT _captura_0049('par', -33.4::double precision, NULL::double precision);
SELECT _captura_0049('lat', 95::double precision, -70.6::double precision);
SELECT _captura_0049('lng', -33.4::double precision, -200::double precision);
SELECT _captura_0049('busqueda', NULL::double precision, NULL::double precision);

SELECT is(
  (SELECT msg FROM _t0049 WHERE caso = 'par'),
  'COORDINATES_MUST_COME_IN_PAIR',
  'update_own_shop rejects a lone coordinate before touching the table (lost in 0024/0038, restored in 0049)'
);
SELECT is(
  (SELECT msg FROM _t0049 WHERE caso = 'lat'),
  'LATITUDE_OUT_OF_RANGE',
  'update_own_shop validates the latitude range'
);
SELECT is(
  (SELECT msg FROM _t0049 WHERE caso = 'lng'),
  'LONGITUDE_OUT_OF_RANGE',
  'update_own_shop validates the longitude range'
);
SELECT is(
  (SELECT msg FROM _t0049 WHERE caso = 'busqueda'),
  'SHOP_NOT_OWNED_OR_INACTIVE',
  'coordinate guards run before the shop lookup, so they are testable without seed data'
);
SELECT * FROM finish();
ROLLBACK;