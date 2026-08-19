-- ============================================================================
-- PAPORLA — 0005_reservations_payments.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Creates idempotent one-unit reservations, authorization/capture payments,
-- provider event deduplication and refunds.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Reservations are immutable in identity/amount and mutate state only through
-- safe RPCs or service jobs. The reservation itself is the 10-minute stock hold.
-- ---------------------------------------------------------------------------
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  user_id uuid,
  shop_id uuid NOT NULL,
  pack_id uuid NOT NULL,
  market_id uuid NOT NULL,
  quantity smallint NOT NULL DEFAULT 1,
  unit_price_minor bigint NOT NULL,
  total_amount_minor bigint NOT NULL,
  currency_code text NOT NULL,
  status text NOT NULL DEFAULT 'payment_pending',
  payment_status text NOT NULL DEFAULT 'created',
  checkout_hold_expires_at timestamptz NOT NULL,
  capture_scheduled_at timestamptz,
  pickup_start_at timestamptz NOT NULL,
  pickup_end_at timestamptz NOT NULL,
  timezone_snapshot text NOT NULL,
  pickup_credential_version smallint,
  pickup_token_hash bytea,
  pickup_code_hash bytea,
  pickup_credential_issued_at timestamptz,
  pickup_credential_used_at timestamptz,
  pack_title_snapshot text NOT NULL,
  shop_name_snapshot text NOT NULL,
  shop_address_snapshot text,
  cancelled_by uuid,
  cancelled_actor_role text,
  cancel_reason text,
  cancelled_at timestamptz,
  confirmed_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  no_show_at timestamptz,
  expired_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reservations_payment_identity_key
    UNIQUE (id, market_id, currency_code, total_amount_minor),
  CONSTRAINT reservations_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT reservations_pack_identity_fkey
    FOREIGN KEY (pack_id, shop_id, market_id, currency_code)
    REFERENCES public.packs(id, shop_id, market_id, currency_code)
    ON DELETE RESTRICT,
  CONSTRAINT reservations_cancelled_by_fkey
    FOREIGN KEY (cancelled_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT reservations_quantity_mvp_check CHECK (quantity = 1),
  CONSTRAINT reservations_amount_check CHECK (
    unit_price_minor > 0
    AND total_amount_minor = unit_price_minor * quantity
  ),
  CONSTRAINT reservations_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT reservations_status_check CHECK (
    status IN (
      'payment_pending', 'confirmed', 'ready_pickup', 'picked_up',
      'completed', 'cancelled', 'no_show', 'expired'
    )
  ),
  CONSTRAINT reservations_payment_status_check CHECK (
    payment_status IN (
      'created', 'pending', 'authorized', 'capture_pending', 'paid',
      'failed', 'voided', 'cancelled', 'refund_pending',
      'refunded', 'partially_refunded'
    )
  ),
  CONSTRAINT reservations_hold_window_check CHECK (
    checkout_hold_expires_at > created_at
    AND checkout_hold_expires_at <= created_at + interval '30 minutes'
  ),
  CONSTRAINT reservations_pickup_window_check CHECK (pickup_end_at > pickup_start_at),
  CONSTRAINT reservations_capture_schedule_check CHECK (
    capture_scheduled_at IS NULL OR capture_scheduled_at <= pickup_start_at
  ),
  CONSTRAINT reservations_timezone_not_blank CHECK (length(btrim(timezone_snapshot)) > 0),
  CONSTRAINT reservations_user_or_anonymized_check CHECK (
    user_id IS NOT NULL OR anonymized_at IS NOT NULL
  ),
  CONSTRAINT reservations_cancel_metadata_check CHECK (
    (
      status = 'cancelled'
      AND cancelled_at IS NOT NULL
      AND cancelled_actor_role IS NOT NULL
      AND cancel_reason IS NOT NULL
      AND length(btrim(cancel_reason)) BETWEEN 3 AND 1000
    )
    OR (
      status <> 'cancelled'
      AND cancelled_at IS NULL
      AND cancelled_by IS NULL
      AND cancelled_actor_role IS NULL
      AND cancel_reason IS NULL
    )
  ),
  CONSTRAINT reservations_cancelled_actor_role_check CHECK (
    cancelled_actor_role IS NULL
    OR cancelled_actor_role IN ('user', 'comercio', 'admin', 'super_admin', 'system')
  ),
  CONSTRAINT reservations_confirmed_timestamp_check CHECK (
    status NOT IN ('confirmed', 'ready_pickup', 'picked_up', 'completed', 'no_show')
    OR confirmed_at IS NOT NULL
  ),
  CONSTRAINT reservations_ready_timestamp_check CHECK (
    status NOT IN ('ready_pickup', 'picked_up', 'completed')
    OR ready_at IS NOT NULL
  ),
  CONSTRAINT reservations_picked_up_timestamp_check CHECK (
    status NOT IN ('picked_up', 'completed') OR picked_up_at IS NOT NULL
  ),
  CONSTRAINT reservations_completed_timestamp_check CHECK (
    status <> 'completed' OR completed_at IS NOT NULL
  ),
  CONSTRAINT reservations_no_show_timestamp_check CHECK (
    status <> 'no_show' OR no_show_at IS NOT NULL
  ),
  CONSTRAINT reservations_expired_timestamp_check CHECK (
    status <> 'expired' OR expired_at IS NOT NULL
  ),
  CONSTRAINT reservations_delivery_requires_paid_check CHECK (
    status NOT IN ('picked_up', 'completed') OR payment_status = 'paid'
  ),
  CONSTRAINT reservations_credential_pair_check CHECK (
    (pickup_token_hash IS NULL AND pickup_code_hash IS NULL)
    OR (
      pickup_token_hash IS NOT NULL
      AND octet_length(pickup_token_hash) = 32
      AND pickup_code_hash IS NOT NULL
      AND octet_length(pickup_code_hash) = 32
      AND pickup_credential_version IS NOT NULL
      AND pickup_credential_issued_at IS NOT NULL
    )
  ),
  CONSTRAINT reservations_credential_usage_check CHECK (
    pickup_credential_used_at IS NULL OR picked_up_at IS NOT NULL
  )
);

COMMENT ON TABLE public.reservations IS
  'One-unit, idempotent reservation and stock hold. No client INSERT/UPDATE/DELETE grants.';
COMMENT ON COLUMN public.reservations.checkout_hold_expires_at IS
  '10-minute checkout/stock hold deadline, configured from the market at creation.';
COMMENT ON COLUMN public.reservations.capture_scheduled_at IS
  'Manual payment capture target, normally pickup_start_at minus market cancellation cutoff.';
COMMENT ON COLUMN public.reservations.pickup_token_hash IS
  'Hash of opaque QR credential; raw token is produced/recovered only by trusted server logic.';
COMMENT ON COLUMN public.reservations.pickup_code_hash IS
  'Hash of manual alphanumeric fallback code; never exposed in public views.';

CREATE UNIQUE INDEX reservations_user_idempotency_key
  ON public.reservations (user_id, idempotency_key)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX reservations_one_active_user_pack_key
  ON public.reservations (user_id, pack_id)
  WHERE user_id IS NOT NULL
    AND status IN ('payment_pending', 'confirmed', 'ready_pickup');

CREATE UNIQUE INDEX reservations_pickup_token_hash_key
  ON public.reservations (pickup_token_hash)
  WHERE pickup_token_hash IS NOT NULL;

CREATE UNIQUE INDEX reservations_pickup_code_hash_key
  ON public.reservations (pickup_code_hash)
  WHERE pickup_code_hash IS NOT NULL;

CREATE INDEX reservations_user_created_idx
  ON public.reservations (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX reservations_shop_status_pickup_idx
  ON public.reservations (shop_id, status, pickup_start_at, id);

CREATE INDEX reservations_checkout_hold_expiry_idx
  ON public.reservations (checkout_hold_expires_at, id)
  WHERE status = 'payment_pending';

CREATE INDEX reservations_capture_due_idx
  ON public.reservations (capture_scheduled_at, id)
  WHERE payment_status = 'authorized' AND status = 'confirmed';

CREATE INDEX reservations_no_show_due_idx
  ON public.reservations (pickup_end_at, id)
  WHERE status IN ('confirmed', 'ready_pickup');

-- ---------------------------------------------------------------------------
-- Payment attempts. A reservation can have failed attempts, but only one live
-- attempt may exist at a time.
-- ---------------------------------------------------------------------------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  market_id uuid NOT NULL,
  provider text NOT NULL,
  provider_payment_id text,
  idempotency_key uuid NOT NULL,
  amount_minor bigint NOT NULL,
  currency_code text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  capture_mode text NOT NULL,
  supports_manual_capture_snapshot boolean NOT NULL DEFAULT false,
  failure_code text,
  provider_created_at timestamptz,
  authorized_at timestamptz,
  authorization_expires_at timestamptz,
  capture_scheduled_at timestamptz,
  captured_at timestamptz,
  failed_at timestamptz,
  voided_at timestamptz,
  refund_pending_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_identity_provider_currency_key
    UNIQUE (id, provider, currency_code),
  CONSTRAINT payments_reservation_identity_fkey
    FOREIGN KEY (reservation_id, market_id, currency_code, amount_minor)
    REFERENCES public.reservations(id, market_id, currency_code, total_amount_minor)
    ON DELETE RESTRICT,
  CONSTRAINT payments_provider_id_key UNIQUE (provider, provider_payment_id),
  CONSTRAINT payments_provider_idempotency_key UNIQUE (provider, idempotency_key),
  CONSTRAINT payments_provider_check CHECK (length(btrim(provider)) BETWEEN 2 AND 50),
  CONSTRAINT payments_provider_payment_id_check CHECK (
    provider_payment_id IS NULL OR length(provider_payment_id) BETWEEN 1 AND 255
  ),
  CONSTRAINT payments_amount_check CHECK (amount_minor > 0),
  CONSTRAINT payments_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT payments_status_check CHECK (
    status IN (
      'created', 'pending', 'authorized', 'capture_pending', 'paid',
      'failed', 'voided', 'cancelled', 'refund_pending',
      'refunded', 'partially_refunded'
    )
  ),
  CONSTRAINT payments_capture_mode_check CHECK (capture_mode IN ('manual', 'automatic')),
  CONSTRAINT payments_manual_capture_capability_check CHECK (
    capture_mode <> 'manual' OR supports_manual_capture_snapshot = true
  ),
  CONSTRAINT payments_authorization_window_check CHECK (
    authorization_expires_at IS NULL
    OR authorized_at IS NULL
    OR authorization_expires_at > authorized_at
  ),
  CONSTRAINT payments_capture_schedule_check CHECK (
    capture_scheduled_at IS NULL
    OR authorization_expires_at IS NULL
    OR capture_scheduled_at < authorization_expires_at
  ),
  CONSTRAINT payments_authorized_timestamp_check CHECK (
    status <> 'authorized'
    OR (
      authorized_at IS NOT NULL
      AND (
        capture_mode = 'automatic'
        OR (authorization_expires_at IS NOT NULL AND capture_scheduled_at IS NOT NULL)
      )
    )
  ),
  CONSTRAINT payments_paid_timestamp_check CHECK (
    status <> 'paid' OR captured_at IS NOT NULL
  ),
  CONSTRAINT payments_failed_timestamp_check CHECK (
    status <> 'failed' OR failed_at IS NOT NULL
  ),
  CONSTRAINT payments_voided_timestamp_check CHECK (
    status NOT IN ('voided', 'cancelled') OR voided_at IS NOT NULL
  ),
  CONSTRAINT payments_refunded_timestamp_check CHECK (
    status NOT IN ('refunded', 'partially_refunded') OR refunded_at IS NOT NULL
  )
);

COMMENT ON TABLE public.payments IS
  'Provider-neutral payment attempts. Authorization and capture are separate when supported.';
COMMENT ON COLUMN public.payments.authorization_expires_at IS
  'Provider/card-network capture deadline (capture_before equivalent), never assumed globally.';

CREATE UNIQUE INDEX payments_one_live_attempt_per_reservation_key
  ON public.payments (reservation_id)
  WHERE status IN ('created', 'pending', 'authorized', 'capture_pending', 'paid');

CREATE INDEX payments_reservation_created_idx
  ON public.payments (reservation_id, created_at DESC);

CREATE INDEX payments_capture_due_idx
  ON public.payments (capture_scheduled_at, id)
  WHERE status = 'authorized' AND capture_mode = 'manual';

CREATE INDEX payments_provider_status_idx
  ON public.payments (provider, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Idempotent provider webhook/event inbox.
-- ---------------------------------------------------------------------------
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  payment_id uuid,
  reservation_id uuid,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payload_sha256 text,
  sanitized_payload jsonb,
  attempts smallint NOT NULL DEFAULT 0,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error_code text,

  CONSTRAINT payment_events_provider_event_key UNIQUE (provider, provider_event_id),
  CONSTRAINT payment_events_provider_check CHECK (length(btrim(provider)) BETWEEN 2 AND 50),
  CONSTRAINT payment_events_provider_event_id_check CHECK (
    length(btrim(provider_event_id)) BETWEEN 1 AND 255
  ),
  CONSTRAINT payment_events_event_type_check CHECK (
    length(btrim(event_type)) BETWEEN 1 AND 120
  ),
  CONSTRAINT payment_events_payment_fkey
    FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL,
  CONSTRAINT payment_events_reservation_fkey
    FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL,
  CONSTRAINT payment_events_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')
  ),
  CONSTRAINT payment_events_attempts_check CHECK (attempts BETWEEN 0 AND 100),
  CONSTRAINT payment_events_sha256_check CHECK (
    payload_sha256 IS NULL OR payload_sha256 ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT payment_events_processed_timestamp_check CHECK (
    status <> 'completed' OR processed_at IS NOT NULL
  )
);

COMMENT ON TABLE public.payment_events IS
  'Deduplicated provider event inbox. Raw sensitive provider payloads are not stored by default.';

CREATE INDEX payment_events_pending_idx
  ON public.payment_events (status, received_at, id)
  WHERE status IN ('pending', 'failed');

-- ---------------------------------------------------------------------------
-- Refund attempts and reconciliation.
-- ---------------------------------------------------------------------------
CREATE TABLE public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  provider text NOT NULL,
  provider_refund_id text,
  idempotency_key uuid NOT NULL,
  amount_minor bigint NOT NULL,
  currency_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text NOT NULL,
  requested_by uuid,
  requested_actor_role text NOT NULL,
  provider_created_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payment_refunds_payment_identity_fkey
    FOREIGN KEY (payment_id, provider, currency_code)
    REFERENCES public.payments(id, provider, currency_code)
    ON DELETE RESTRICT,
  CONSTRAINT payment_refunds_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT payment_refunds_provider_id_key UNIQUE (provider, provider_refund_id),
  CONSTRAINT payment_refunds_idempotency_key UNIQUE (provider, idempotency_key),
  CONSTRAINT payment_refunds_provider_check CHECK (length(btrim(provider)) BETWEEN 2 AND 50),
  CONSTRAINT payment_refunds_amount_check CHECK (amount_minor > 0),
  CONSTRAINT payment_refunds_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT payment_refunds_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT payment_refunds_reason_check CHECK (length(btrim(reason)) BETWEEN 3 AND 1000),
  CONSTRAINT payment_refunds_actor_role_check CHECK (
    requested_actor_role IN ('user', 'comercio', 'admin', 'super_admin', 'system')
  ),
  CONSTRAINT payment_refunds_completed_timestamp_check CHECK (
    status <> 'completed' OR completed_at IS NOT NULL
  ),
  CONSTRAINT payment_refunds_failed_timestamp_check CHECK (
    status <> 'failed' OR failed_at IS NOT NULL
  )
);

COMMENT ON TABLE public.payment_refunds IS
  'Idempotent provider refund attempts. Cumulative amount validation occurs in locked server logic.';

CREATE INDEX payment_refunds_payment_created_idx
  ON public.payment_refunds (payment_id, created_at DESC);

CREATE INDEX payment_refunds_pending_idx
  ON public.payment_refunds (status, created_at, id)
  WHERE status IN ('pending', 'processing', 'failed');

-- RLS immediately denies client access until explicit policies/grants exist.
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

COMMIT;
