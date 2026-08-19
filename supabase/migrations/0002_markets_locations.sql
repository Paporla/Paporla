-- ============================================================================
-- PAPORLA — 0002_markets_locations.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Creates the generic multi-market location model used across LATAM.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Markets / countries where Paporla can operate.
-- ---------------------------------------------------------------------------
CREATE TABLE public.markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  default_locale text NOT NULL,
  currency_code text NOT NULL,
  currency_minor_units smallint NOT NULL DEFAULT 2,
  default_timezone text NOT NULL,
  region_label text NOT NULL DEFAULT 'Región',
  locality_label text NOT NULL DEFAULT 'Localidad',
  support_email text,
  reservation_hold_minutes smallint NOT NULL DEFAULT 10,
  cancellation_cutoff_minutes smallint NOT NULL DEFAULT 120,
  no_show_policy text NOT NULL DEFAULT 'track_only',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT markets_country_code_key UNIQUE (country_code),
  CONSTRAINT markets_slug_key UNIQUE (slug),
  CONSTRAINT markets_id_currency_key UNIQUE (id, currency_code),
  CONSTRAINT markets_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT markets_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT markets_name_not_blank CHECK (length(btrim(name)) BETWEEN 2 AND 100),
  CONSTRAINT markets_status_check CHECK (
    status IN ('draft', 'waitlist', 'pilot', 'active', 'paused')
  ),
  CONSTRAINT markets_locale_format CHECK (
    default_locale ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$'
  ),
  CONSTRAINT markets_currency_code_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT markets_currency_minor_units_check CHECK (currency_minor_units BETWEEN 0 AND 3),
  CONSTRAINT markets_timezone_not_blank CHECK (length(btrim(default_timezone)) > 0),
  CONSTRAINT markets_region_label_not_blank CHECK (length(btrim(region_label)) > 0),
  CONSTRAINT markets_locality_label_not_blank CHECK (length(btrim(locality_label)) > 0),
  CONSTRAINT markets_support_email_basic_check CHECK (
    support_email IS NULL OR position('@' IN support_email) > 1
  ),
  CONSTRAINT markets_hold_minutes_check CHECK (reservation_hold_minutes BETWEEN 5 AND 30),
  CONSTRAINT markets_cancellation_cutoff_check CHECK (
    cancellation_cutoff_minutes BETWEEN 0 AND 1440
  ),
  CONSTRAINT markets_no_show_policy_check CHECK (
    no_show_policy IN ('track_only', 'progressive', 'manual', 'disabled')
  )
);

COMMENT ON TABLE public.markets IS
  'Country-level Paporla market configuration. Detection only suggests a market; users confirm it.';
COMMENT ON COLUMN public.markets.currency_minor_units IS
  'ISO currency fraction digits used for formatting; never assume every currency has 2 decimals.';
COMMENT ON COLUMN public.markets.default_timezone IS
  'IANA fallback timezone. Operational times use the locality/shop timezone snapshot.';
COMMENT ON COLUMN public.markets.no_show_policy IS
  'Market-level enforcement policy. Chile pilot starts as track_only.';

-- ---------------------------------------------------------------------------
-- First-level administrative areas: region/province/department/state.
-- ---------------------------------------------------------------------------
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL,
  code text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT regions_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT regions_market_code_key UNIQUE (market_id, code),
  CONSTRAINT regions_market_slug_key UNIQUE (market_id, slug),
  -- Supports the composite FK from localities and enforces market consistency.
  CONSTRAINT regions_id_market_key UNIQUE (id, market_id),
  CONSTRAINT regions_code_not_blank CHECK (length(btrim(code)) BETWEEN 1 AND 32),
  CONSTRAINT regions_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT regions_name_not_blank CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT regions_sort_order_check CHECK (sort_order >= 0)
);

COMMENT ON TABLE public.regions IS
  'First-level administrative areas. UI label is configured per market.';

-- ---------------------------------------------------------------------------
-- Generic operational localities: commune/municipality/city/locality.
-- ---------------------------------------------------------------------------
CREATE TABLE public.localities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL,
  region_id uuid NOT NULL,
  code text,
  slug text NOT NULL,
  name text NOT NULL,
  timezone text NOT NULL,
  center_geog extensions.geography(Point, 4326),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT localities_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT localities_region_market_fkey
    FOREIGN KEY (region_id, market_id)
    REFERENCES public.regions(id, market_id)
    ON DELETE RESTRICT,
  CONSTRAINT localities_market_region_slug_key UNIQUE (market_id, region_id, slug),
  CONSTRAINT localities_id_market_key UNIQUE (id, market_id),
  CONSTRAINT localities_code_not_blank CHECK (code IS NULL OR length(btrim(code)) BETWEEN 1 AND 32),
  CONSTRAINT localities_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT localities_name_not_blank CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT localities_timezone_not_blank CHECK (length(btrim(timezone)) > 0),
  CONSTRAINT localities_sort_order_check CHECK (sort_order >= 0)
);

COMMENT ON TABLE public.localities IS
  'Generic local unit shown as comuna, municipio, ciudad or localidad according to the market.';
COMMENT ON COLUMN public.localities.timezone IS
  'IANA timezone used for shop schedules, pickup windows and notification timing.';

-- ---------------------------------------------------------------------------
-- Minimal indexes aligned with expected catalogue and admin queries.
-- ---------------------------------------------------------------------------
CREATE INDEX markets_status_idx
  ON public.markets (status, name)
  WHERE status IN ('pilot', 'active');

CREATE INDEX regions_market_active_idx
  ON public.regions (market_id, sort_order, name)
  WHERE is_active = true;

CREATE INDEX localities_market_region_active_idx
  ON public.localities (market_id, region_id, sort_order, name)
  WHERE is_active = true;

CREATE UNIQUE INDEX localities_market_region_code_key
  ON public.localities (market_id, region_id, code)
  WHERE code IS NOT NULL;

CREATE INDEX localities_center_geog_gist_idx
  ON public.localities USING gist (center_geog)
  WHERE center_geog IS NOT NULL;

-- RLS is enabled immediately. Policies/grants are added later in dedicated,
-- testable migrations. Until then, client roles receive no data access.
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;

COMMIT;
