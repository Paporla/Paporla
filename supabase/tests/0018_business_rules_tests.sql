-- ============================================================================
-- PAPORLA — 0018_business_rules_tests.sql (pgTAP)
-- A-14: las reglas del negocio se prueban EJECUTANDOLAS.
--
-- Hoy no hay ni un solo test que ejecute una regla de negocio en la base:
-- el 0016 solo comprueba que los CHECK y los indices EXISTEN. Un error de
-- escritura en una RPC se desplegaria en silencio y podria vender stock
-- agotado durante dias.
--
-- Los invariantes que importan son dos:
--   "no vender lo que no hay"  y  "no cobrar dos veces".
-- Aqui se intentan romper los dos, y se espera que la base diga que no.
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

SELECT plan(8);

-- ============================================================================
-- Datos de prueba: dos usuarios activos y cuatro packs, uno por cada caso.
-- ============================================================================
DELETE FROM auth.users WHERE id IN
  ('00000000-0000-0000-0000-00000000a141'::uuid,
   '00000000-0000-0000-0000-00000000b142'::uuid);

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000a141'::uuid, 'pgtap-a14-a@example.test'),
  ('00000000-0000-0000-0000-00000000b142'::uuid, 'pgtap-a14-b@example.test');

-- El trigger de alta (0010) crea el perfil SIN market_id, asi que queda en
-- NULL. Y create_payment_reservation compara el mercado del usuario con el del
-- pack: NULL frente a un mercado real da MARKET_MISMATCH, que taparia justo el
-- error que queremos provocar. Se fija en los dos perfiles el mercado del seed,
-- el mismo que llevan el comercio y los packs.
UPDATE public.user_profiles
SET market_id = '10000000-0000-4000-8000-000000000001'::uuid
WHERE id IN
  ('00000000-0000-0000-0000-00000000a141'::uuid,
   '00000000-0000-0000-0000-00000000b142'::uuid);

DELETE FROM public.shops WHERE id = '00000000-0000-0000-0000-00000000c141'::uuid;
-- OJO: 'active' NO es un estado de comercio (vale para PACKS, no para
-- comercios). Los de comercio son draft, pending_review, verified, rejected,
-- suspended y closed (0003), y verified exige reviewed_at no nulo
-- (shops_review_metadata_check). Se usa verified porque es el que el catalogo
-- publico exige para poder reservar.
INSERT INTO public.shops (id, owner_id, market_id, locality_id, name, timezone, status, reviewed_at)
VALUES (
  '00000000-0000-0000-0000-00000000c141'::uuid,
  '00000000-0000-0000-0000-00000000a141'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  '30000000-0000-4000-8000-000000000101'::uuid,
  'Comercio A-14', 'America/Santiago', 'verified', now());

-- 1) agotado  2) borrador  3) disponible  4) ventana de recogida ya pasada
DELETE FROM public.packs WHERE id IN (
  '00000000-0000-0000-0000-00000000d141'::uuid,
  '00000000-0000-0000-0000-00000000d142'::uuid,
  '00000000-0000-0000-0000-00000000d143'::uuid,
  '00000000-0000-0000-0000-00000000d144'::uuid);

-- Reglas de 0004 que hay que respetar al preparar los datos:
--   * packs_active_stock_check: un pack 'active' NO puede tener stock 0.
--     Es decir, la propia BD impide vender algo agotado. Por eso el pack
--     "agotado" va como 'sold_out', no como 'active' con 0 unidades.
--   * packs_sold_out_check: 'sold_out' exige remaining_stock = 0.
--   * packs_publication_check: activo/agotado/expirado/pausado exigen
--     published_at; borrador exige que sea NULL.
--   * packs_publish_requirements_check: salvo borrador, son obligatorios
--     allergen_notice e image_path, y la imagen no puede ser una URL.
-- El RPC rechaza tanto 'sold_out' como stock 0 con el mismo codigo
-- PACK_NOT_AVAILABLE, asi que el test sigue comprobando lo que debe.
INSERT INTO public.packs (
  id, shop_id, market_id, title, category, price_minor, original_price_minor,
  currency_code, total_stock, remaining_stock, pickup_start_at, pickup_end_at,
  timezone_snapshot, status, published_at, allergen_notice, image_path
) VALUES
  -- agotado: 'sold_out' con 0 unidades (un 'active' con 0 es imposible)
  ('00000000-0000-0000-0000-00000000d141'::uuid,
   '00000000-0000-0000-0000-00000000c141'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid,
   'Pack agotado (A-14)', 'otros', 1000, 3000, 'CLP', 5, 0,
   now() + interval '2 hours', now() + interval '6 hours',
   'America/Santiago', 'sold_out', now(),
   'Contenido sorpresa; alergenos variables.',
   'packs/a14-agotado.jpg'),
  -- borrador: nunca se debe poder reservar (exento de requisitos de publicacion)
  ('00000000-0000-0000-0000-00000000d142'::uuid,
   '00000000-0000-0000-0000-00000000c141'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid,
   'Pack borrador (A-14)', 'otros', 1000, 3000, 'CLP', 5, 5,
   now() + interval '2 hours', now() + interval '6 hours',
   'America/Santiago', 'draft', NULL, NULL, NULL),
  -- disponible
  ('00000000-0000-0000-0000-00000000d143'::uuid,
   '00000000-0000-0000-0000-00000000c141'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid,
   'Pack disponible (A-14)', 'otros', 1000, 3000, 'CLP', 5, 5,
   now() + interval '2 hours', now() + interval '6 hours',
   'America/Santiago', 'active', now(),
   'Contenido sorpresa; alergenos variables.',
   'packs/a14-disponible.jpg'),
  -- ventana de recogida ya cerrada: sigue 'active' a proposito, para que el
  -- rechazo lo provoque la ventana y no el estado (que es lo que se prueba)
  ('00000000-0000-0000-0000-00000000d144'::uuid,
   '00000000-0000-0000-0000-00000000c141'::uuid,
   '10000000-0000-4000-8000-000000000001'::uuid,
   'Pack vencido (A-14)', 'otros', 1000, 3000, 'CLP', 5, 5,
   now() - interval '6 hours', now() - interval '2 hours',
   'America/Santiago', 'active', now(),
   'Contenido sorpresa; alergenos variables.',
   'packs/a14-vencido.jpg');

-- ============================================================================
-- Utilidad: ejecutar una llamada y guardar el codigo de error que devuelve.
-- Si no da error, se guarda 'SIN ERROR' para que el test lo vea.
-- ============================================================================
CREATE TEMP TABLE _a14 (caso text PRIMARY KEY, msg text) ON COMMIT DROP;

-- La tabla temporal pertenece a postgres, pero en cuanto _a14_como hace
-- SET LOCAL ROLE authenticated TODO el resto del script pasa a correr como
-- authenticated, incluido este INSERT. Sin el permiso da:
--     permission denied for table _a14
-- Ojo con la solucion facil: si la funcion se declara SECURITY DEFINER, el
-- INSERT funcionaria, pero tambien el EXECUTE p_sql, y entonces la llamada
-- dejaria de ejecutarse COMO el usuario, que es justo lo que se prueba.
-- Se concede el permiso y la funcion sigue siendo SECURITY INVOKER.
GRANT INSERT, SELECT ON _a14 TO authenticated;

CREATE FUNCTION _a14_intenta(p_caso text, p_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    INSERT INTO _a14 VALUES (p_caso, 'SIN ERROR');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _a14 VALUES (p_caso, SQLERRM);
  END;
END $$;

-- Ponerse en la piel del usuario A.
CREATE FUNCTION _a14_como(p_sub uuid)
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
-- REGLA DE EJECUCION DE ESTE FICHERO (importante, no saltarsela)
-- ============================================================================
--   LLAMADAS ........... se hacen COMO el usuario autenticado: es lo que se
--                        prueba, que los candados le cierran la puerta a un
--                        cliente real, no a un superusuario.
--   COMPROBACIONES ..... se hacen como postgres.
--
-- Por que: la migracion 0012 no concede SELECT sobre packs, shops ni
-- reservations a authenticated. Y no es un olvido: la 0023 lo deja escrito
-- al rechazar el hint de PostgREST, "en este proyecto el cliente no lee
-- tablas, lee funciones SECURITY DEFINER". Si el test intentase comprobar el
-- resultado leyendo las tablas como el usuario, fallaria por permisos y no
-- por la regla de negocio, que es exactamente lo que hay que aislar.
-- ============================================================================

-- ============================================================================
-- "No vender lo que no hay"  y  "no cobrar dos veces"
-- ============================================================================
SELECT _a14_como('00000000-0000-0000-0000-00000000a141'::uuid);

SELECT _a14_intenta('agotado',
  $$SELECT public.create_payment_reservation(
      '00000000-0000-0000-0000-00000000d141'::uuid, gen_random_uuid())$$);

SELECT _a14_intenta('borrador',
  $$SELECT public.create_payment_reservation(
      '00000000-0000-0000-0000-00000000d142'::uuid, gen_random_uuid())$$);

SELECT _a14_intenta('vencido',
  $$SELECT public.create_payment_reservation(
      '00000000-0000-0000-0000-00000000d144'::uuid, gen_random_uuid())$$);

SELECT _a14_intenta('inexistente',
  $$SELECT public.create_payment_reservation(
      '00000000-0000-0000-0000-00000000dead'::uuid, gen_random_uuid())$$);

SELECT _a14_intenta('primera',
  $$SELECT public.create_payment_reservation(
      '00000000-0000-0000-0000-00000000d143'::uuid, gen_random_uuid())$$);

SELECT _a14_intenta('segunda',
  $$SELECT public.create_payment_reservation(
      '00000000-0000-0000-0000-00000000d143'::uuid, gen_random_uuid())$$);

-- ============================================================================
-- Vuelta a postgres para mirar el efecto real de las llamadas.
-- ============================================================================
SET LOCAL ROLE postgres;

SELECT is(
  (SELECT remaining_stock FROM public.packs
    WHERE id = '00000000-0000-0000-0000-00000000d143'::uuid),
  4,
  'reservar descuenta una unidad del stock disponible'
);

-- ============================================================================
-- Ultimo caso: cancelar fuera de plazo.
-- Se cierra la ventana moviendo el inicio de recogida al pasado.
-- ============================================================================
-- OJO: hay que mover las dos fechas a la vez. La 0005 tiene
--     reservations_capture_schedule_check:
--         capture_scheduled_at IS NULL OR capture_scheduled_at <= pickup_start_at
-- Si solo se atrasa pickup_start_at, el cargo programado queda POR DETRAS del
-- inicio de recogida y salta la restriccion. Se mueven las dos al mismo sitio,
-- asi se cumple capture_scheduled_at <= pickup_start_at por ser iguales.
UPDATE public.reservations
   SET pickup_start_at = now() - interval '10 minutes',
       capture_scheduled_at = now() - interval '10 minutes'
 WHERE pack_id = '00000000-0000-0000-0000-00000000d143'::uuid
   AND user_id = '00000000-0000-0000-0000-00000000a141'::uuid;

-- El id de la reserva se resuelve AQUI, como postgres, y viaja ya resuelto
-- dentro de la sentencia: el usuario no tiene permiso para leer su propia
-- reserva, asi que un SELECT de verdad dentro de la llamada reventaria.
CREATE TEMP TABLE _a14_sql (txt text) ON COMMIT DROP;
GRANT SELECT ON _a14_sql TO authenticated;

INSERT INTO _a14_sql
SELECT 'SELECT public.cancel_reservation('
       || quote_literal(r.id::text)
       || ', ' || quote_literal('motivo de prueba') || ')'
  FROM public.reservations r
 WHERE r.pack_id = '00000000-0000-0000-0000-00000000d143'::uuid
   AND r.user_id = '00000000-0000-0000-0000-00000000a141'::uuid
 LIMIT 1;

SELECT _a14_como('00000000-0000-0000-0000-00000000a141'::uuid);

SELECT _a14_intenta('fuera_de_plazo', (SELECT txt FROM _a14_sql));

-- ============================================================================
-- Resultados. Ya como postgres, que es quien puede leer la tabla temporal
-- sin depender de permisos concedidos a proposito.
-- ============================================================================
SET LOCAL ROLE postgres;

SELECT is(
  (SELECT msg FROM _a14 WHERE caso = 'agotado'),
  'PACK_NOT_AVAILABLE',
  'create_payment_reservation rechaza un pack agotado'
);

SELECT is(
  (SELECT msg FROM _a14 WHERE caso = 'borrador'),
  'PACK_NOT_AVAILABLE',
  'create_payment_reservation rechaza un pack en borrador (nunca reservable)'
);

SELECT is(
  (SELECT msg FROM _a14 WHERE caso = 'vencido'),
  'PACK_NOT_AVAILABLE',
  'create_payment_reservation rechaza un pack cuya ventana de recogida ya paso'
);

SELECT is(
  (SELECT msg FROM _a14 WHERE caso = 'inexistente'),
  'PACK_NOT_FOUND',
  'create_payment_reservation rechaza un pack que no existe'
);

SELECT is(
  (SELECT msg FROM _a14 WHERE caso = 'primera'),
  'SIN ERROR',
  'la primera reserva de un pack disponible se crea sin error'
);

SELECT isnt(
  (SELECT msg FROM _a14 WHERE caso = 'segunda'),
  'SIN ERROR',
  'la segunda reserva del MISMO pack por el MISMO usuario falla (no se cobra dos veces)'
);

SELECT is(
  (SELECT msg FROM _a14 WHERE caso = 'fuera_de_plazo'),
  'CANCELLATION_WINDOW_CLOSED',
  'cancel_reservation rechaza una cancelacion fuera del plazo del mercado'
);

SELECT * FROM finish();
ROLLBACK;