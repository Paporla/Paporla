-- ============================================================================
-- PAPORLA — 0003_identity_shops.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Creates application profiles, one-shop-per-owner MVP and opening hours.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Application profile linked 1:1 to Supabase Auth.
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'user',
  account_status text NOT NULL DEFAULT 'active',
  email text,
  display_name text,
  phone_e164 text,
  avatar_path text,
  market_id uuid,
  locality_id uuid,
  locale text NOT NULL DEFAULT 'es',
  onboarding_completed_at timestamptz,
  email_confirmed_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT user_profiles_auth_user_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_profiles_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT user_profiles_locality_market_fkey
    FOREIGN KEY (locality_id, market_id)
    REFERENCES public.localities(id, market_id)
    ON DELETE RESTRICT,
  CONSTRAINT user_profiles_role_check CHECK (
    role IN ('user', 'comercio', 'admin', 'super_admin')
  ),
  CONSTRAINT user_profiles_account_status_check CHECK (
    account_status IN ('active', 'suspended', 'deleted')
  ),
  CONSTRAINT user_profiles_email_basic_check CHECK (
    email IS NULL OR position('@' IN email) > 1
  ),
  CONSTRAINT user_profiles_display_name_check CHECK (
    display_name IS NULL OR length(btrim(display_name)) BETWEEN 2 AND 120
  ),
  CONSTRAINT user_profiles_phone_e164_check CHECK (
    phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  CONSTRAINT user_profiles_avatar_path_check CHECK (
    avatar_path IS NULL OR avatar_path !~ '^(?:https?:)?//'
  ),
  CONSTRAINT user_profiles_locale_format CHECK (
    locale ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$'
  ),
  CONSTRAINT user_profiles_locality_requires_market CHECK (
    locality_id IS NULL OR market_id IS NOT NULL
  ),
  CONSTRAINT user_profiles_deleted_state_check CHECK (
    (account_status = 'deleted' AND deleted_at IS NOT NULL)
    OR (account_status <> 'deleted' AND deleted_at IS NULL)
  )
);

COMMENT ON TABLE public.user_profiles IS
  'Minimal application profile. Created by Auth trigger; clients never insert profiles or modify role/status.';
COMMENT ON COLUMN public.user_profiles.avatar_path IS
  'Storage path, not a full external URL.';

CREATE UNIQUE INDEX user_profiles_email_lower_key
  ON public.user_profiles (lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX user_profiles_market_locality_idx
  ON public.user_profiles (market_id, locality_id)
  WHERE account_status = 'active';

CREATE INDEX user_profiles_admin_role_idx
  ON public.user_profiles (role, created_at DESC)
  WHERE role IN ('admin', 'super_admin');

-- ---------------------------------------------------------------------------
-- One physical shop per commerce account for the MVP.
-- ---------------------------------------------------------------------------
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  market_id uuid NOT NULL,
  locality_id uuid,
  name text NOT NULL,
  description text,
  category text,
  phone_e164 text,
  website_url text,
  instagram_handle text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  geog extensions.geography(Point, 4326),
  timezone text NOT NULL,
  logo_path text,
  cover_path text,
  status text NOT NULL DEFAULT 'draft',
  status_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT shops_owner_key UNIQUE (owner_id),
  CONSTRAINT shops_id_market_key UNIQUE (id, market_id),
  CONSTRAINT shops_owner_fkey
    FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT shops_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT shops_locality_market_fkey
    FOREIGN KEY (locality_id, market_id)
    REFERENCES public.localities(id, market_id)
    ON DELETE RESTRICT,
  CONSTRAINT shops_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT shops_name_check CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT shops_description_check CHECK (
    description IS NULL OR length(description) <= 4000
  ),
  CONSTRAINT shops_phone_e164_check CHECK (
    phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  CONSTRAINT shops_website_url_check CHECK (
    website_url IS NULL OR website_url ~ '^https://'
  ),
  CONSTRAINT shops_instagram_handle_check CHECK (
    instagram_handle IS NULL OR instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'
  ),
  CONSTRAINT shops_coordinates_pair_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  ),
  CONSTRAINT shops_latitude_check CHECK (
    latitude IS NULL OR latitude BETWEEN -90 AND 90
  ),
  CONSTRAINT shops_longitude_check CHECK (
    longitude IS NULL OR longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT shops_timezone_not_blank CHECK (length(btrim(timezone)) > 0),
  CONSTRAINT shops_logo_path_check CHECK (
    logo_path IS NULL OR logo_path !~ '^(?:https?:)?//'
  ),
  CONSTRAINT shops_cover_path_check CHECK (
    cover_path IS NULL OR cover_path !~ '^(?:https?:)?//'
  ),
  CONSTRAINT shops_status_check CHECK (
    status IN ('draft', 'pending_review', 'verified', 'rejected', 'suspended', 'closed')
  ),
  CONSTRAINT shops_review_metadata_check CHECK (
    (status IN ('verified', 'rejected', 'suspended') AND reviewed_at IS NOT NULL)
    OR status IN ('draft', 'pending_review', 'closed')
  ),
  CONSTRAINT shops_deleted_state_check CHECK (
    (status = 'closed' AND deleted_at IS NOT NULL)
    OR (status <> 'closed' AND deleted_at IS NULL)
  )
);

COMMENT ON TABLE public.shops IS
  'Commerce profile. Owner edits only allowed profile fields; status/review fields are administrative.';
COMMENT ON COLUMN public.shops.geog IS
  'Derived from latitude/longitude by a later trigger; used for PostGIS proximity search.';

CREATE INDEX shops_market_locality_status_idx
  ON public.shops (market_id, locality_id, status, name)
  WHERE deleted_at IS NULL;

CREATE INDEX shops_verified_market_idx
  ON public.shops (market_id, locality_id, name)
  WHERE status = 'verified' AND deleted_at IS NULL;

CREATE INDEX shops_geog_gist_idx
  ON public.shops USING gist (geog)
  WHERE geog IS NOT NULL AND status = 'verified' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Server-maintained shop aggregates. Keeping them outside shops prevents
-- commerce owners from directly editing ratings/revenue/counters.
-- ---------------------------------------------------------------------------
CREATE TABLE public.shop_stats (
  shop_id uuid PRIMARY KEY,
  rating_sum bigint NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  total_packs_sold bigint NOT NULL DEFAULT 0,
  total_revenue_minor bigint NOT NULL DEFAULT 0,
  active_packs_count integer NOT NULL DEFAULT 0,
  completed_reservations_count bigint NOT NULL DEFAULT 0,
  cancelled_by_shop_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shop_stats_shop_fkey
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE RESTRICT,
  CONSTRAINT shop_stats_nonnegative_check CHECK (
    rating_sum >= 0
    AND rating_count >= 0
    AND total_packs_sold >= 0
    AND total_revenue_minor >= 0
    AND active_packs_count >= 0
    AND completed_reservations_count >= 0
    AND cancelled_by_shop_count >= 0
  )
);

COMMENT ON TABLE public.shop_stats IS
  'Server-maintained and periodically reconciled shop aggregates; no client writes.';

-- ---------------------------------------------------------------------------
-- Weekly opening hours. sequence supports split shifts.
-- ---------------------------------------------------------------------------
CREATE TABLE public.shop_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  weekday smallint NOT NULL,
  sequence smallint NOT NULL DEFAULT 1,
  opens_at time,
  closes_at time,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shop_hours_shop_fkey
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  CONSTRAINT shop_hours_shop_weekday_sequence_key
    UNIQUE (shop_id, weekday, sequence),
  CONSTRAINT shop_hours_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT shop_hours_sequence_check CHECK (sequence BETWEEN 1 AND 3),
  CONSTRAINT shop_hours_times_check CHECK (
    (is_closed = true AND opens_at IS NULL AND closes_at IS NULL)
    OR (
      is_closed = false
      AND opens_at IS NOT NULL
      AND closes_at IS NOT NULL
      AND closes_at > opens_at
    )
  )
);

COMMENT ON TABLE public.shop_hours IS
  'Weekly local shop hours. weekday 0=Monday, 6=Sunday. Up to three non-overnight shifts per day in MVP.';

CREATE INDEX shop_hours_shop_weekday_idx
  ON public.shop_hours (shop_id, weekday, sequence);

-- RLS is enabled now; policies/grants arrive in dedicated migrations.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_hours ENABLE ROW LEVEL SECURITY;

COMMIT;
