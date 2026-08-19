-- ============================================================================
-- PAPORLA — 0004_packs.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Creates international, auditable, stock-safe surprise packs.
-- ============================================================================

BEGIN;

CREATE TABLE public.packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  market_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  allergen_notice text,
  handling_notice text,
  price_minor bigint NOT NULL,
  original_price_minor bigint,
  currency_code text NOT NULL,
  total_stock integer NOT NULL,
  remaining_stock integer NOT NULL,
  sales_start_at timestamptz,
  pickup_start_at timestamptz NOT NULL,
  pickup_end_at timestamptz NOT NULL,
  timezone_snapshot text NOT NULL,
  image_path text,
  image_gallery text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT packs_identity_snapshot_key
    UNIQUE (id, shop_id, market_id, currency_code),
  CONSTRAINT packs_shop_market_fkey
    FOREIGN KEY (shop_id, market_id)
    REFERENCES public.shops(id, market_id)
    ON DELETE RESTRICT,
  CONSTRAINT packs_market_currency_fkey
    FOREIGN KEY (market_id, currency_code)
    REFERENCES public.markets(id, currency_code)
    ON DELETE RESTRICT,
  CONSTRAINT packs_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT packs_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT packs_title_check CHECK (length(btrim(title)) BETWEEN 3 AND 200),
  CONSTRAINT packs_description_check CHECK (
    description IS NULL OR length(description) <= 5000
  ),
  CONSTRAINT packs_category_check CHECK (length(btrim(category)) BETWEEN 2 AND 80),
  CONSTRAINT packs_tags_count_check CHECK (cardinality(tags) <= 20),
  CONSTRAINT packs_allergen_notice_check CHECK (
    allergen_notice IS NULL OR length(allergen_notice) <= 2000
  ),
  CONSTRAINT packs_handling_notice_check CHECK (
    handling_notice IS NULL OR length(handling_notice) <= 2000
  ),
  CONSTRAINT packs_price_check CHECK (price_minor > 0),
  CONSTRAINT packs_original_price_check CHECK (
    original_price_minor IS NULL OR original_price_minor >= price_minor
  ),
  CONSTRAINT packs_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT packs_stock_check CHECK (
    total_stock >= 0
    AND remaining_stock >= 0
    AND remaining_stock <= total_stock
  ),
  CONSTRAINT packs_pickup_window_check CHECK (pickup_end_at > pickup_start_at),
  CONSTRAINT packs_sales_window_check CHECK (
    sales_start_at IS NULL OR sales_start_at < pickup_end_at
  ),
  CONSTRAINT packs_timezone_not_blank CHECK (length(btrim(timezone_snapshot)) > 0),
  CONSTRAINT packs_image_path_check CHECK (
    image_path IS NULL OR image_path !~ '^(?:https?:)?//'
  ),
  CONSTRAINT packs_status_check CHECK (
    status IN ('draft', 'active', 'paused', 'sold_out', 'expired', 'archived')
  ),
  CONSTRAINT packs_publication_check CHECK (
    (status = 'draft' AND published_at IS NULL)
    OR status = 'archived'
    OR (status IN ('active', 'paused', 'sold_out', 'expired') AND published_at IS NOT NULL)
  ),
  CONSTRAINT packs_sold_out_check CHECK (
    status <> 'sold_out' OR remaining_stock = 0
  ),
  CONSTRAINT packs_active_stock_check CHECK (
    status <> 'active' OR remaining_stock > 0
  ),
  CONSTRAINT packs_archived_state_check CHECK (
    (status = 'archived' AND archived_at IS NOT NULL)
    OR (status <> 'archived' AND archived_at IS NULL)
  ),
  CONSTRAINT packs_publish_requirements_check CHECK (
    status IN ('draft', 'archived')
    OR (
      length(btrim(title)) >= 3
      AND length(btrim(category)) >= 2
      AND allergen_notice IS NOT NULL
      AND image_path IS NOT NULL
    )
  )
);

COMMENT ON TABLE public.packs IS
  'Surprise food packs. Clients never modify stock/status directly; safe RPCs own all state changes.';
COMMENT ON COLUMN public.packs.price_minor IS
  'Price in the smallest configured currency unit for currency_code.';
COMMENT ON COLUMN public.packs.timezone_snapshot IS
  'Shop IANA timezone captured when the pack is scheduled.';
COMMENT ON COLUMN public.packs.allergen_notice IS
  'Required before publication; may state that exact surprise contents/allergens vary.';

-- Commerce dashboard: own packs by state and pickup window.
CREATE INDEX packs_shop_status_pickup_idx
  ON public.packs (shop_id, status, pickup_start_at DESC)
  WHERE status <> 'archived';

-- Public/mobile catalogue candidate set. Verification/locality filters come
-- from the joined shop in the safe view/RPC.
CREATE INDEX packs_market_active_pickup_idx
  ON public.packs (market_id, pickup_start_at, pickup_end_at, shop_id)
  WHERE status = 'active' AND remaining_stock > 0;

-- Expiration and housekeeping batches.
CREATE INDEX packs_expiration_idx
  ON public.packs (pickup_end_at, id)
  WHERE status IN ('active', 'paused', 'sold_out');

-- Fuzzy catalogue search. Extension objects live in the extensions schema.
CREATE INDEX packs_title_trgm_idx
  ON public.packs USING gin (title extensions.gin_trgm_ops);

CREATE INDEX packs_description_trgm_idx
  ON public.packs USING gin (description extensions.gin_trgm_ops)
  WHERE description IS NOT NULL;

CREATE INDEX packs_tags_gin_idx
  ON public.packs USING gin (tags);

ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;

COMMIT;
