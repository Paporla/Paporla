-- ============================================================================
-- PAPORLA — seed.sql
-- Seed canonico: se aplica despues de las migraciones en cada
-- `supabase db reset` (local y en cualquier reconstruccion).
--
-- Contiene el catalogo geografico minimo con el que el mercado Chile puede
-- operar: Region Metropolitana y comuna de Santiago. Sin estos dos registros
-- no se puede elegir ciudad en la app y por tanto no se puede publicar ni
-- reservar: son datos de produccion, no de prueba.
--
-- Antes de abrir al publico, confrontar con los catalogos oficiales
-- (INE / SUBDERE) y completar las comunas que falten.
--
-- Idempotente: ON CONFLICT ... DO UPDATE.
-- ============================================================================

BEGIN;

INSERT INTO public.regions (
  id, market_id, code, slug, name, sort_order, is_active
)
VALUES (
  '20000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  'CL-RM',
  'region-metropolitana-de-santiago',
  'Región Metropolitana de Santiago',
  1,
  true
)
ON CONFLICT (market_id, code) DO UPDATE
SET name = EXCLUDED.name, slug = EXCLUDED.slug, is_active = true, updated_at = now();

INSERT INTO public.localities (
  id, market_id, region_id, code, slug, name,
  timezone, center_geog, sort_order, is_active
)
VALUES (
  '30000000-0000-4000-8000-000000000101'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  '20000000-0000-4000-8000-000000000001'::uuid,
  '13101',
  'santiago',
  'Santiago',
  'America/Santiago',
  extensions.ST_SetSRID(
    extensions.ST_MakePoint(-70.6693, -33.4489),
    4326
  )::extensions.geography,
  1,
  true
)
ON CONFLICT (market_id, region_id, code) WHERE code IS NOT NULL DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    timezone = EXCLUDED.timezone,
    center_geog = EXCLUDED.center_geog,
    is_active = true,
    updated_at = now();

COMMIT;