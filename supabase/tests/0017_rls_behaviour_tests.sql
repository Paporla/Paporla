-- ============================================================================
-- PAPORLA — 0017_rls_behaviour_tests.sql (pgTAP)
-- A-13: los candados se prueban CERRANDO, no mirando si existen.
--
-- El fichero 0016 comprueba que RLS esta habilitada y que existen dos
-- politicas concretas. Pero nunca ejecuta una consulta COMO OTRO USUARIO.
-- Una politica mal escrita con USING (true) dejaria verlo todo y los 38
-- tests del 0016 seguirian en verde.
--
-- Aqui se crean dos usuarios de verdad, datos de cada uno, y se consulta
-- poniendose en la piel de uno: lo que NO debe ver, no debe verse.
--
-- Todo ocurre dentro del BEGIN/ROLLBACK del final: no deja rastro.
-- Ejecutar solo contra local/staging despues de todas las migraciones.
-- Nunca incluir este fichero en las migraciones de produccion.
-- ============================================================================

BEGIN;
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

SELECT plan(13);

-- ============================================================================
-- Datos de prueba. Dos usuarios, dos comercios, dos packs, dos reservas.
-- ============================================================================

-- Los usuarios de prueba. El trigger on_auth_user_created (0010) crea su
-- perfil activo en public.user_profiles, que es lo que exige
-- require_active_caller() para no morir en ACCOUNT_NOT_ACTIVE.
DELETE FROM auth.users WHERE id IN
  ('00000000-0000-0000-0000-00000000a0a1'::uuid,
   '00000000-0000-0000-0000-00000000b0b2'::uuid);

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000a0a1'::uuid, 'pgtap-a13-usuario-a@example.test'),
  ('00000000-0000-0000-0000-00000000b0b2'::uuid, 'pgtap-a13-usuario-b@example.test');

-- Comercio de A y comercio de B (market y locality vienen del seed).
DELETE FROM public.shops WHERE id IN
  ('00000000-0000-0000-0000-00000000c0a1'::uuid,
   '00000000-0000-0000-0000-00000000c0b2'::uuid);

-- OJO: 'active' NO es un estado de comercio. Los validos son draft,
-- pending_review, verified, rejected, suspended y closed (0003). Y los tres
-- "revisados" (verified, rejected, suspended) exigen reviewed_at no nulo
-- (shops_review_metadata_check). Se usa verified porque es justo el estado que
-- el catalogo publico exige para mostrar un pack (s.status = 'verified').
INSERT INTO public.shops (id, owner_id, market_id, locality_id, name, timezone, status, reviewed_at)
VALUES
  ('00000000-0000-0000-0000-00000000c0a1'::uuid,
   '00000000-0000-0000-0000-00000000a0a1'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid,
   '30000000-0000-4000-8000-000000000101'::uuid,
   'Comercio de A (A-13)', 'America/Santiago', 'verified', now()),
  ('00000000-0000-0000-0000-00000000c0b2'::uuid,
   '00000000-0000-0000-0000-00000000b0b2'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid,
   '30000000-0000-4000-8000-000000000101'::uuid,
   'Comercio de B (A-13)', 'America/Santiago', 'verified', now());

-- Un pack en cada comercio.
DELETE FROM public.packs WHERE id IN
  ('00000000-0000-0000-0000-00000000d0a1'::uuid,
   '00000000-0000-0000-0000-00000000d0b2'::uuid);

-- Un pack publicado no admite cualquier cosa (0004): ademas de titulo y
-- categoria, allergen_notice e image_path son OBLIGATORIOS salvo en borrador
-- (packs_publish_requirements_check). Y image_path no puede ser una URL
-- (packs_image_path_check), va como ruta de storage.
INSERT INTO public.packs (
  id, shop_id, market_id, title, category, price_minor, original_price_minor,
  currency_code, total_stock, remaining_stock, pickup_start_at, pickup_end_at,
  timezone_snapshot, status, published_at, allergen_notice, image_path
) VALUES
  ('00000000-0000-0000-0000-00000000d0a1'::uuid,
   '00000000-0000-0000-0000-00000000c0a1'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid,
   'Pack de A (A-13)', 'otros', 1000, 3000, 'CLP', 10, 10,
   now() + interval '2 hours', now() + interval '6 hours',
   'America/Santiago', 'active', now(),
   'Contenido sorpresa; alergenos variables.',
   'packs/a13-pack-de-a.jpg'),
  ('00000000-0000-0000-0000-00000000d0b2'::uuid,
   '00000000-0000-0000-0000-00000000c0b2'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid,
   'Pack de B (A-13)', 'otros', 1000, 3000, 'CLP', 10, 10,
   now() + interval '2 hours', now() + interval '6 hours',
   'America/Santiago', 'active', now(),
   'Contenido sorpresa; alergenos variables.',
   'packs/a13-pack-de-b.jpg');

-- Una reserva de A (en el comercio de A) y otra de B (en el de B).
DELETE FROM public.reservations WHERE id IN
  ('00000000-0000-0000-0000-00000000e0a1'::uuid,
   '00000000-0000-0000-0000-00000000e0b2'::uuid);

-- pack_title_snapshot y shop_name_snapshot son NOT NULL (0005): la reserva
-- guarda una copia del titulo y del comercio para que el historico no cambie
-- aunque luego el comercio se renombre o el pack se borre. Hay que informarlos.
INSERT INTO public.reservations (
  id, idempotency_key, user_id, shop_id, pack_id, market_id, quantity,
  unit_price_minor, total_amount_minor, currency_code, status, payment_status,
  checkout_hold_expires_at, pickup_start_at, pickup_end_at, timezone_snapshot,
  pack_title_snapshot, shop_name_snapshot, confirmed_at
) VALUES
  ('00000000-0000-0000-0000-00000000e0a1'::uuid, gen_random_uuid(),
   '00000000-0000-0000-0000-00000000a0a1'::uuid,
   '00000000-0000-0000-0000-00000000c0a1'::uuid,
   '00000000-0000-0000-0000-00000000d0a1'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid, 1, 1000, 1000, 'CLP',
   'confirmed', 'authorized', now() + interval '10 minutes',
   now() + interval '2 hours', now() + interval '6 hours', 'America/Santiago',
   'Pack de A (A-13)', 'Comercio de A (A-13)', now()),
  ('00000000-0000-0000-0000-00000000e0b2'::uuid, gen_random_uuid(),
   '00000000-0000-0000-0000-00000000b0b2'::uuid,
   '00000000-0000-0000-0000-00000000c0b2'::uuid,
   '00000000-0000-0000-0000-00000000d0b2'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid, 1, 1000, 1000, 'CLP',
   'confirmed', 'authorized', now() + interval '10 minutes',
   now() + interval '2 hours', now() + interval '6 hours', 'America/Santiago',
   'Pack de B (A-13)', 'Comercio de B (A-13)', now());

-- Una notificacion para cada uno.
DELETE FROM public.notifications WHERE user_id IN
  ('00000000-0000-0000-0000-00000000a0a1'::uuid,
   '00000000-0000-0000-0000-00000000b0b2'::uuid);

-- category es NOT NULL (0006) y solo admite nueve valores: account_security,
-- reservation, pickup, payment, shop_operations, nearby_packs, favorites,
-- marketing, system. Es la pestana donde cae el aviso en el panel, asi que no
-- vale cualquier texto.
INSERT INTO public.notifications (user_id, category, type, title, body)
VALUES
  ('00000000-0000-0000-0000-00000000a0a1'::uuid, 'reservation',
   'reservation_confirmed', 'Aviso de A', 'Solo la debe ver A'),
  ('00000000-0000-0000-0000-00000000b0b2'::uuid, 'reservation',
   'reservation_confirmed', 'Aviso de B', 'Solo la debe ver B');

-- ============================================================================
-- Utilidad: ponerse en la piel de un usuario y fijar su claim.
-- Se fijan las dos variantes del claim porque auth.uid() puede leer una u otra.
-- ============================================================================
CREATE FUNCTION _a13_ver_como(p_sub uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', p_sub::text, false);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_sub::text)::text, false);
END $$;

-- ============================================================================
-- QUE SE PRUEBA AQUI, Y POR QUE ASI
-- ============================================================================
-- La idea de A-13 es comprobar que los candados CIERRAN, no que existen.
--
-- Al hacerlo aparecio algo que obliga a replantear el test: en este proyecto
-- el cliente autenticado NO tiene concedido SELECT sobre reservations, packs,
-- shops ni payments. La 0012 solo lo concede sobre 11 tablas (perfiles,
-- favoritos, notificaciones, catalogo geografico...) y la 0023 lo deja escrito
-- al descartar el hint de PostgREST: "en este proyecto el cliente no lee
-- tablas, lee funciones SECURITY DEFINER".
--
-- Consecuencia: consultar esas tablas como el usuario no devuelve 0 filas,
-- da "permission denied". Un test que lo intentase fallaria por permisos y
-- no por la regla de aislamiento. Asi que se prueban las DOS lineas de
-- defensa, cada una como corresponde:
--
--   1. No hay acceso directo a las tablas (primera linea). Se comprueba con
--      has_table_privilege, que consulta el catalogo.
--   2. La lectura pasa por RPCs, y esos RPCs SI filtran por propietario
--      (segunda linea). Se comprueba llamandolos de verdad como el usuario.
--   3. Donde SI hay concesion (notificaciones), el RLS actua de verdad y se
--      puede contar filas sin problemas.
-- ============================================================================

-- ============================================================================
-- 1. El cliente no lee las tablas de negocio. Ni las toca.
-- ============================================================================
SELECT is(
  has_table_privilege('authenticated', 'public.reservations', 'SELECT'),
  false,
  'authenticated no tiene SELECT sobre reservations: el aislamiento no depende solo del RLS'
);

SELECT is(
  has_table_privilege('authenticated', 'public.payments', 'SELECT'),
  false,
  'authenticated no tiene SELECT sobre payments'
);

SELECT is(
  has_table_privilege('authenticated', 'public.packs', 'SELECT'),
  false,
  'authenticated no tiene SELECT sobre packs (se lee por RPC, decision de la 0023)'
);

SELECT is(
  has_table_privilege('authenticated', 'public.shops', 'SELECT'),
  false,
  'authenticated no tiene SELECT sobre shops (se lee por RPC, decision de la 0023)'
);

-- ============================================================================
-- 2. El RPC de reservas aísla de verdad: se llama COMO el usuario.
--    list_my_reservations() filtra internamente por r.user_id = v_user_id,
--    asi que es el mecanismo real que usa la app.
-- ============================================================================
SELECT _a13_ver_como('00000000-0000-0000-0000-00000000a0a1'::uuid);

SELECT is(
  (SELECT count(*) FROM public.list_my_reservations()
    WHERE reservation_id = '00000000-0000-0000-0000-00000000e0a1'::uuid),
  1::bigint,
  'A ve SU reserva a traves de list_my_reservations()'
);

SELECT is(
  (SELECT count(*) FROM public.list_my_reservations()
    WHERE reservation_id = '00000000-0000-0000-0000-00000000e0b2'::uuid),
  0::bigint,
  'A NO ve la reserva de B: el RPC filtra por propietario, no devuelve todo'
);

SELECT _a13_ver_como('00000000-0000-0000-0000-00000000b0b2'::uuid);

SELECT is(
  (SELECT count(*) FROM public.list_my_reservations()),
  1::bigint,
  'B ve exactamente 1 reserva (la suya): el RPC esta abierto lo justo, no de mas'
);

-- ============================================================================
-- 3. Donde SI hay concesion, el RLS tiene que cerrar de verdad.
--    notifications esta concedida a authenticated, asi que aqui contar filas
--    si es valido: si la politica estuviese mal escrita con USING (true),
--    se verian las del otro.
-- ============================================================================
SELECT _a13_ver_como('00000000-0000-0000-0000-00000000a0a1'::uuid);

SELECT is(
  (SELECT count(*) FROM public.notifications
    WHERE user_id = '00000000-0000-0000-0000-00000000b0b2'::uuid),
  0::bigint,
  'A NO ve las notificaciones de B (notifications_user_read cierra de verdad)'
);

SELECT is(
  (SELECT count(*) FROM public.notifications
    WHERE user_id = '00000000-0000-0000-0000-00000000a0a1'::uuid),
  1::bigint,
  'A SI ve sus propias notificaciones (la politica no esta demas cerrada)'
);

-- ============================================================================
-- 4. Sin sesion (anon): lo privado cerrado, lo publico abierto.
--
--    Ojo con contar filas como anon: la 0012 arranca con
--        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon,
--                                                    authenticated;
--    y solo le concede SELECT sobre markets, regions y localities. O sea que
--    anon no puede ni ejecutar la consulta: daria "permission denied" y se
--    llevaria el script por delante. Se comprueba el permiso en si.
--
--    has_table_privilege consulta el catalogo, asi que da igual el rol actual.
-- ============================================================================
SELECT is(
  has_table_privilege('anon', 'public.user_profiles', 'SELECT'),
  false,
  'anon no tiene SELECT sobre user_profiles (ni llega al RLS)'
);

SELECT is(
  has_table_privilege('anon', 'public.payments', 'SELECT'),
  false,
  'anon no tiene SELECT sobre payments'
);

SELECT is(
  has_table_privilege('anon', 'public.reservations', 'SELECT'),
  false,
  'anon no tiene SELECT sobre reservations'
);

-- Y la comprobacion contraria, que tambien importa: un test que solo mira que
-- todo esta cerrado se queda corto. Sin markets no habria ni pagina de inicio.
SELECT is(
  has_table_privilege('anon', 'public.markets', 'SELECT'),
  true,
  'anon SI tiene SELECT sobre markets (lo publico sigue abierto)'
);

SELECT * FROM finish();
ROLLBACK;