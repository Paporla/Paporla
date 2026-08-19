-- ============================================================================
-- PAPORLA — 0007_legal_trust_audit.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Creates versioned legal acceptance, no-show records, verified reviews and
-- append-only security/business audit records.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Country/market-specific legal documents.
-- ---------------------------------------------------------------------------
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL,
  document_type text NOT NULL,
  language text NOT NULL,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  content_url text NOT NULL,
  content_sha256 text NOT NULL,
  effective_at timestamptz NOT NULL,
  published_at timestamptz,
  retired_at timestamptz,
  supersedes_document_id uuid,
  is_required boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT legal_documents_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT legal_documents_supersedes_fkey
    FOREIGN KEY (supersedes_document_id)
    REFERENCES public.legal_documents(id)
    ON DELETE SET NULL,
  CONSTRAINT legal_documents_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT legal_documents_market_type_language_version_key
    UNIQUE (market_id, document_type, language, version),
  CONSTRAINT legal_documents_type_check CHECK (
    document_type IN (
      'terms', 'privacy', 'cookies', 'refund_policy',
      'pickup_policy', 'merchant_terms', 'food_safety'
    )
  ),
  CONSTRAINT legal_documents_language_format CHECK (
    language ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$'
  ),
  CONSTRAINT legal_documents_version_check CHECK (
    length(btrim(version)) BETWEEN 1 AND 40
  ),
  CONSTRAINT legal_documents_status_check CHECK (
    status IN ('draft', 'published', 'retired')
  ),
  CONSTRAINT legal_documents_content_url_check CHECK (content_url ~ '^https://'),
  CONSTRAINT legal_documents_sha256_check CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT legal_documents_publication_check CHECK (
    (status = 'draft' AND published_at IS NULL AND retired_at IS NULL)
    OR (status = 'published' AND published_at IS NOT NULL AND retired_at IS NULL)
    OR (status = 'retired' AND published_at IS NOT NULL AND retired_at IS NOT NULL)
  )
);

COMMENT ON TABLE public.legal_documents IS
  'Versioned market-specific legal documents. Content is hosted at a stable HTTPS URL and integrity-hashed.';

CREATE UNIQUE INDEX legal_documents_one_published_key
  ON public.legal_documents (market_id, document_type, language)
  WHERE status = 'published';

CREATE INDEX legal_documents_market_effective_idx
  ON public.legal_documents (market_id, status, effective_at DESC);

CREATE TABLE public.legal_acceptances (
  user_id uuid NOT NULL,
  legal_document_id uuid NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  app_platform text NOT NULL,
  app_version text,
  acceptance_context text NOT NULL,

  CONSTRAINT legal_acceptances_pkey PRIMARY KEY (user_id, legal_document_id),
  CONSTRAINT legal_acceptances_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT legal_acceptances_document_fkey
    FOREIGN KEY (legal_document_id) REFERENCES public.legal_documents(id) ON DELETE RESTRICT,
  CONSTRAINT legal_acceptances_platform_check CHECK (
    app_platform IN ('web', 'ios', 'android')
  ),
  CONSTRAINT legal_acceptances_app_version_check CHECK (
    app_version IS NULL OR length(app_version) BETWEEN 1 AND 40
  ),
  CONSTRAINT legal_acceptances_context_check CHECK (
    acceptance_context IN ('signup', 'login_gate', 'checkout', 'merchant_onboarding', 'settings')
  )
);

COMMENT ON TABLE public.legal_acceptances IS
  'Immutable proof that a user accepted one exact version; no IP address is stored by default.';

CREATE INDEX legal_acceptances_user_date_idx
  ON public.legal_acceptances (user_id, accepted_at DESC);

-- ---------------------------------------------------------------------------
-- No-show/abuse penalty records. Chile pilot remains track_only: records can be
-- created for analytics without blocking reservations until policy activation.
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id uuid NOT NULL,
  reason text NOT NULL,
  enforcement_status text NOT NULL DEFAULT 'recorded',
  source_reservation_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid,
  revoked_by uuid,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_penalties_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT user_penalties_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT user_penalties_reservation_fkey
    FOREIGN KEY (source_reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL,
  CONSTRAINT user_penalties_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT user_penalties_revoked_by_fkey
    FOREIGN KEY (revoked_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT user_penalties_reason_check CHECK (
    reason IN ('no_show', 'fraud', 'abuse', 'chargeback', 'manual_review')
  ),
  CONSTRAINT user_penalties_enforcement_check CHECK (
    enforcement_status IN ('recorded', 'warning', 'blocked', 'revoked', 'expired')
  ),
  CONSTRAINT user_penalties_expiry_check CHECK (
    expires_at IS NULL OR expires_at > starts_at
  ),
  CONSTRAINT user_penalties_revocation_check CHECK (
    (enforcement_status = 'revoked' AND revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
    OR enforcement_status <> 'revoked'
  )
);

COMMENT ON TABLE public.user_penalties IS
  'Server/admin records. Market policy decides whether recorded events enforce a block.';

CREATE INDEX user_penalties_user_active_idx
  ON public.user_penalties (user_id, starts_at DESC, expires_at)
  WHERE enforcement_status IN ('warning', 'blocked');

CREATE INDEX user_penalties_expiry_idx
  ON public.user_penalties (expires_at, id)
  WHERE enforcement_status = 'blocked' AND expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Verified post-completion reviews. The table can exist before the feature is
-- enabled; no client policy/RPC is granted until product activation.
-- ---------------------------------------------------------------------------
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  user_id uuid,
  shop_id uuid NOT NULL,
  market_id uuid NOT NULL,
  rating smallint NOT NULL,
  comment text,
  moderation_status text NOT NULL DEFAULT 'pending',
  moderation_reason text,
  moderated_by uuid,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reviews_reservation_key UNIQUE (reservation_id),
  CONSTRAINT reviews_reservation_fkey
    FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE RESTRICT,
  CONSTRAINT reviews_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT reviews_shop_market_fkey
    FOREIGN KEY (shop_id, market_id) REFERENCES public.shops(id, market_id) ON DELETE RESTRICT,
  CONSTRAINT reviews_moderated_by_fkey
    FOREIGN KEY (moderated_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_comment_check CHECK (comment IS NULL OR length(comment) <= 3000),
  CONSTRAINT reviews_moderation_status_check CHECK (
    moderation_status IN ('published', 'pending', 'hidden', 'rejected')
  ),
  CONSTRAINT reviews_moderation_metadata_check CHECK (
    moderation_status IN ('published', 'pending')
    OR (moderated_at IS NOT NULL AND moderation_reason IS NOT NULL)
  )
);

COMMENT ON TABLE public.reviews IS
  'One verified review per completed reservation. Shop aggregates are server-derived.';

CREATE INDEX reviews_shop_published_idx
  ON public.reviews (shop_id, created_at DESC)
  WHERE moderation_status = 'published';

-- ---------------------------------------------------------------------------
-- Append-only audit records. Metadata must be allowlisted/sanitized by the
-- function inserting it. Client roles receive no INSERT/UPDATE/DELETE grant.
-- ---------------------------------------------------------------------------
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_role text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  severity text NOT NULL DEFAULT 'info',
  request_id uuid,
  market_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT activity_logs_actor_fkey
    FOREIGN KEY (actor_user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT activity_logs_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT activity_logs_actor_role_check CHECK (
    actor_role IS NULL OR actor_role IN ('anon', 'user', 'comercio', 'admin', 'super_admin', 'system')
  ),
  CONSTRAINT activity_logs_action_check CHECK (length(btrim(action)) BETWEEN 2 AND 120),
  CONSTRAINT activity_logs_target_type_check CHECK (length(btrim(target_type)) BETWEEN 2 AND 80),
  CONSTRAINT activity_logs_severity_check CHECK (
    severity IN ('info', 'warning', 'error', 'critical')
  ),
  CONSTRAINT activity_logs_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.activity_logs IS
  'Append-only audit trail. Metadata must never contain passwords, payment tokens or raw secrets.';

CREATE INDEX activity_logs_occurred_idx
  ON public.activity_logs (occurred_at DESC);

CREATE INDEX activity_logs_actor_occurred_idx
  ON public.activity_logs (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX activity_logs_target_occurred_idx
  ON public.activity_logs (target_type, target_id, occurred_at DESC);

CREATE INDEX activity_logs_market_severity_idx
  ON public.activity_logs (market_id, severity, occurred_at DESC)
  WHERE severity IN ('warning', 'error', 'critical');

CREATE INDEX activity_logs_metadata_gin_idx
  ON public.activity_logs USING gin (metadata jsonb_path_ops);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

COMMIT;
