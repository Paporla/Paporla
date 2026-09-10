-- ============================================================================
-- 0044 · Favoritos RPC-only: revocar los permisos que sobraban.
--
-- HISTORIA: el primer CI tras 0043 falló dos tests pgTAP, y ambos tenían
-- razón (los ensayos contra la base real hicieron exactamente su trabajo):
--
--   · Test 7 — list_my_favorites nació ejecutable por PUBLIC: 0043 hizo el
--     GRANT a authenticated pero omitió el REVOKE FROM PUBLIC explícito que
--     la convención de 0041 exige a TODA función nueva (el ACL por defecto
--     de Postgres incluye EXECUTE para PUBLIC; solo un REVOKE explícito lo
--     materializa fuera).
--
--   · Test 31 — 0012 concedió SELECT directo sobre favorites a authenticated
--     (diseño antiguo: "lectura de tabla con RLS filtrando filas"). La
--     práctica canónica desde el incidente L-06 es una sola puerta:
--     list_my_favorites. Producción ya denegaba ese SELECT (Sentry 42501 el
--     2026-09-09); esta migración alinea el diseño con la realidad y cierra
--     el camino doble para siempre.
--
-- Idempotente: REVOKE sobre permisos inexistentes es un no-op seguro.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.list_my_favorites() FROM PUBLIC;

REVOKE SELECT ON TABLE public.favorites FROM authenticated;
REVOKE ALL ON TABLE public.favorites FROM anon;
REVOKE ALL ON TABLE public.favorites FROM PUBLIC;