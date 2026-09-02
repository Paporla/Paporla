-- ============================================================================
-- PAPORLA — 0041_revoke_public_execute_leftovers.sql
-- Bloque E (ensayo de cutover), hallazgo del test pgTAP 7 de
-- supabase/tests/0016_security_tests.sql: ocho funciones seguian siendo
-- ejecutables por el rol PUBLIC.
--
-- DIAGNOSTICO (verificado contra una base de datos local construida desde
-- cero con las 40 migraciones, el 2026-09-02):
--
--   * Siete funciones de `public` tenian una entrada "=X" en su ACL, es
--     decir, EXECUTE concedido a PUBLIC. Pertenecen a las migraciones que
--     NO incluyeron el `REVOKE EXECUTE ... FROM PUBLIC` individual que si
--     llevan 0029, 0030, 0031, 0035 y 0036:
--       0027 -> admin_counts
--       0028 -> list_my_reservations
--       0032 -> list_admin_packs, list_admin_reservations
--       0033 -> admin_dashboard_trend
--       0038 -> update_own_shop
--       0039 -> list_admin_shops
--
--   * `app_private.normalize_chile_rut` (0038) tenia proacl NULL. En
--     PostgreSQL un ACL nulo NO significa "sin permisos": significa "aplicar
--     el valor por defecto", y el valor por defecto de una funcion incluye
--     EXECUTE para PUBLIC. El REVOKE explicito materializa el ACL y cierra
--     ese camino.
--
-- IMPACTO REAL ANTES DE ESTA MIGRACION: ninguna fuga de datos. Las siete
-- funciones de `public` son SECURITY DEFINER y comprueban el llamante por
-- dentro (app_private.require_active_caller + is_admin, o propietario del
-- comercio en update_own_shop), de modo que un anonimo recibia un error
-- antes de leer una sola fila. `normalize_chile_rut` es un auxiliar puro que
-- no toca tablas y vive en un esquema cuyo USAGE ya esta revocado a anon y
-- authenticated desde 0001. Se corrige igualmente: el diseno del proyecto es
-- que la capa de permisos y la capa de logica no dependan la una de la otra,
-- y ocho excepciones silenciosas son exactamente lo que no se quiere tener
-- delante el dia del cutover.
--
-- EL `REVOKE ... ON ALL FUNCTIONS` DE 0017 NO BASTA: solo afecta a las
-- funciones que ya existian cuando se ejecuto. Cada funcion nueva necesita su
-- propio REVOKE, y esa es la convencion que deja documentada esta migracion.
--
-- Idempotente: REVOKE y GRANT son operaciones sobre el estado final, no
-- incrementales, y las firmas estan escritas literalmente.
--
-- Ejecutar en: proyecto STAGING (mqdauyvnrqnnzemdenfj) y en la base local.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. app_private.normalize_chile_rut(text) — auxiliar interno de validacion
--    de RUT chileno. Lo usan create_own_shop y update_own_shop, ambas
--    SECURITY DEFINER y propiedad de postgres, que conserva EXECUTE por ser
--    el dueno. No necesita ninguna concesion adicional.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION app_private.normalize_chile_rut(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.normalize_chile_rut(text) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Funciones del panel de administracion. Todas exigen is_admin() por
--    dentro; aqui solo se alinea la capa de permisos con esa intencion.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_counts() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_dashboard_trend() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_trend() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_admin_packs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_admin_packs(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_admin_reservations(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_admin_reservations(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_admin_shops(text, text, timestamptz, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_admin_shops(text, text, timestamptz, uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Funciones de usuario y de comercio. Filtran por el llamante
--    (require_active_caller y, en update_own_shop, propietario del comercio).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.list_my_reservations(timestamptz, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_reservations(timestamptz, uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_own_shop(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  double precision, double precision, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_shop(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  double precision, double precision, text, text, text, text, text
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Cierre del mecanismo: ninguna funcion futura creada por postgres en
--    estos dos esquemas debe heredar EXECUTE para PUBLIC. Se refuerza lo que
--    ya intento 0017, ahora con el barrido aplicado encima.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMENT ON FUNCTION app_private.normalize_chile_rut(text) IS
  'Auxiliar interno (0038): normaliza y valida un RUT chileno; devuelve NULL si el formato o el digito verificador no cuadran. Sin acceso a tablas. 0041 le quita el EXECUTE por defecto que PostgreSQL concede a PUBLIC.';

COMMIT;