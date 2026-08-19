-- ============================================================================
-- PAPORLA — 0006_notifications_devices.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Creates favorites, in-app notifications, private device tokens and preferences.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Favorite shops. Composite PK prevents duplicates without a redundant UUID.
-- ---------------------------------------------------------------------------
CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT favorites_pkey PRIMARY KEY (user_id, shop_id),
  CONSTRAINT favorites_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT favorites_shop_fkey
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE RESTRICT
);

CREATE INDEX favorites_shop_created_idx
  ON public.favorites (shop_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- In-app notification inbox. Delivery to push/email is handled asynchronously.
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  reservation_id uuid,
  shop_id uuid,
  pack_id uuid,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT notifications_reservation_fkey
    FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL,
  CONSTRAINT notifications_shop_fkey
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE SET NULL,
  CONSTRAINT notifications_pack_fkey
    FOREIGN KEY (pack_id) REFERENCES public.packs(id) ON DELETE SET NULL,
  CONSTRAINT notifications_category_check CHECK (
    category IN (
      'account_security', 'reservation', 'pickup', 'payment',
      'shop_operations', 'nearby_packs', 'favorites', 'marketing', 'system'
    )
  ),
  CONSTRAINT notifications_type_check CHECK (length(btrim(type)) BETWEEN 2 AND 80),
  CONSTRAINT notifications_title_check CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  CONSTRAINT notifications_body_check CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  CONSTRAINT notifications_data_object_check CHECK (jsonb_typeof(data) = 'object'),
  CONSTRAINT notifications_expiry_check CHECK (
    expires_at IS NULL OR expires_at > created_at
  )
);

COMMENT ON TABLE public.notifications IS
  'Private in-app inbox. Clients read their rows and use a dedicated RPC to mark read.';
COMMENT ON COLUMN public.notifications.data IS
  'Small allowlisted navigation payload; never store secrets or arbitrary provider payloads.';

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX notifications_expiry_idx
  ON public.notifications (expires_at, id)
  WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Private device/push token registry. Tokens are never selected directly by
-- client roles. Registration/revocation happens through safe RPCs.
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  push_provider text NOT NULL,
  push_token text NOT NULL,
  push_token_hash bytea NOT NULL,
  app_version text,
  locale text NOT NULL,
  market_id uuid,
  device_label text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_devices_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_devices_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT user_devices_push_token_hash_key UNIQUE (push_token_hash),
  CONSTRAINT user_devices_platform_check CHECK (
    platform IN ('ios', 'android', 'web')
  ),
  CONSTRAINT user_devices_push_provider_check CHECK (
    push_provider IN ('expo', 'apns', 'fcm', 'web_push')
  ),
  CONSTRAINT user_devices_push_token_check CHECK (
    length(push_token) BETWEEN 16 AND 4096
    AND octet_length(push_token_hash) = 32
  ),
  CONSTRAINT user_devices_app_version_check CHECK (
    app_version IS NULL OR length(app_version) BETWEEN 1 AND 40
  ),
  CONSTRAINT user_devices_locale_format CHECK (
    locale ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$'
  ),
  CONSTRAINT user_devices_device_label_check CHECK (
    device_label IS NULL OR length(device_label) <= 120
  )
);

COMMENT ON TABLE public.user_devices IS
  'Private push token registry. No direct client SELECT; tokens are service-only.';

CREATE INDEX user_devices_user_active_idx
  ON public.user_devices (user_id, last_seen_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX user_devices_market_active_idx
  ON public.user_devices (market_id, platform)
  WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- Per-user communication preferences. Security/transactional requirements are
-- enforced by server policy so marketing choices never disable critical alerts.
-- ---------------------------------------------------------------------------
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL,
  category text NOT NULL,
  channel text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id, category, channel),
  CONSTRAINT notification_preferences_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT notification_preferences_category_check CHECK (
    category IN (
      'account_security', 'reservation', 'pickup', 'payment',
      'shop_operations', 'nearby_packs', 'favorites', 'marketing', 'system'
    )
  ),
  CONSTRAINT notification_preferences_channel_check CHECK (
    channel IN ('in_app', 'push', 'email')
  )
);

COMMENT ON TABLE public.notification_preferences IS
  'User communication choices. Required security/payment/pickup categories cannot be disabled.';

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

COMMIT;
