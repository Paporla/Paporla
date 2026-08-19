-- ============================================================================
-- PAPORLA — 0015_seed_markets.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Seeds only planned markets; regions/localities use reviewed per-country files.
-- ============================================================================

BEGIN;

INSERT INTO public.markets (
  id, country_code, slug, name, status,
  default_locale, currency_code, currency_minor_units,
  default_timezone, region_label, locality_label,
  support_email, reservation_hold_minutes,
  cancellation_cutoff_minutes, no_show_policy
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001'::uuid,
    'CL', 'cl', 'Chile', 'pilot',
    'es-CL', 'CLP', 0,
    'America/Santiago', 'Región', 'Comuna',
    NULL, 10, 120, 'track_only'
  ),
  (
    '10000000-0000-4000-8000-000000000002'::uuid,
    'AR', 'ar', 'Argentina', 'waitlist',
    'es-AR', 'ARS', 2,
    'America/Argentina/Buenos_Aires', 'Provincia', 'Localidad',
    NULL, 10, 120, 'track_only'
  ),
  (
    '10000000-0000-4000-8000-000000000003'::uuid,
    'CO', 'co', 'Colombia', 'waitlist',
    'es-CO', 'COP', 2,
    'America/Bogota', 'Departamento', 'Municipio',
    NULL, 10, 120, 'track_only'
  )
ON CONFLICT (country_code) DO UPDATE
SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  default_locale = EXCLUDED.default_locale,
  currency_code = EXCLUDED.currency_code,
  currency_minor_units = EXCLUDED.currency_minor_units,
  default_timezone = EXCLUDED.default_timezone,
  region_label = EXCLUDED.region_label,
  locality_label = EXCLUDED.locality_label,
  reservation_hold_minutes = EXCLUDED.reservation_hold_minutes,
  cancellation_cutoff_minutes = EXCLUDED.cancellation_cutoff_minutes,
  no_show_policy = EXCLUDED.no_show_policy,
  updated_at = now();

-- Spain is intentionally not seeded: development from Spain selects Chile
-- manually and uses browser/simulator location overrides for Santiago.
-- Brazil, Mexico, Venezuela and other markets are added later through reviewed
-- market/location seeds, legal configuration and feature flags—not schema copies.

COMMIT;
