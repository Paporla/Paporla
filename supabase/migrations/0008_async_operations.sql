-- ============================================================================
-- PAPORLA — 0008_async_operations.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Creates transactional outbox, scheduler observability and privacy-preserving
-- database rate-limit state.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Transactional outbox. Business RPCs insert events in the same transaction as
-- state changes; workers deliver email/push without delaying the user request.
-- ---------------------------------------------------------------------------
CREATE TABLE public.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  market_id uuid,
  dedupe_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts smallint NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT outbox_events_dedupe_key UNIQUE (dedupe_key),
  CONSTRAINT outbox_events_market_fkey
    FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE RESTRICT,
  CONSTRAINT outbox_events_event_type_check CHECK (
    length(btrim(event_type)) BETWEEN 2 AND 120
  ),
  CONSTRAINT outbox_events_aggregate_type_check CHECK (
    length(btrim(aggregate_type)) BETWEEN 2 AND 80
  ),
  CONSTRAINT outbox_events_dedupe_key_check CHECK (
    length(btrim(dedupe_key)) BETWEEN 8 AND 255
  ),
  CONSTRAINT outbox_events_payload_object_check CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT outbox_events_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')
  ),
  CONSTRAINT outbox_events_attempts_check CHECK (attempts BETWEEN 0 AND 100),
  CONSTRAINT outbox_events_lock_check CHECK (
    (status = 'processing' AND locked_at IS NOT NULL AND locked_by IS NOT NULL)
    OR status <> 'processing'
  ),
  CONSTRAINT outbox_events_processed_check CHECK (
    status <> 'completed' OR processed_at IS NOT NULL
  )
);

COMMENT ON TABLE public.outbox_events IS
  'Transactional, idempotent email/push/job queue. Payloads are allowlisted and contain no secrets.';

CREATE INDEX outbox_events_ready_idx
  ON public.outbox_events (available_at, created_at, id)
  WHERE status IN ('pending', 'failed');

CREATE INDEX outbox_events_processing_timeout_idx
  ON public.outbox_events (locked_at, id)
  WHERE status = 'processing';

CREATE INDEX outbox_events_aggregate_idx
  ON public.outbox_events (aggregate_type, aggregate_id, created_at DESC)
  WHERE aggregate_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- External scheduler run ledger. cron-job.org invokes authenticated Vercel POST
-- endpoints; run_key prevents duplicate execution for one scheduling window.
-- ---------------------------------------------------------------------------
CREATE TABLE public.scheduled_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  run_key text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  started_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  processed_count integer NOT NULL DEFAULT 0,
  succeeded_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scheduled_job_runs_run_key UNIQUE (run_key),
  CONSTRAINT scheduled_job_runs_job_name_check CHECK (
    job_name IN (
      'expire_payment_holds', 'capture_authorized_payments',
      'open_pickup_windows', 'send_pickup_reminders',
      'mark_no_shows', 'complete_picked_up_reservations',
      'process_outbox', 'cleanup_rate_limits',
      'cleanup_expired_penalties', 'archive_old_records'
    )
  ),
  CONSTRAINT scheduled_job_runs_run_key_check CHECK (
    length(btrim(run_key)) BETWEEN 8 AND 255
  ),
  CONSTRAINT scheduled_job_runs_status_check CHECK (
    status IN ('processing', 'completed', 'partial', 'failed', 'skipped')
  ),
  CONSTRAINT scheduled_job_runs_counts_check CHECK (
    processed_count >= 0
    AND succeeded_count >= 0
    AND failed_count >= 0
    AND succeeded_count + failed_count <= processed_count
  ),
  CONSTRAINT scheduled_job_runs_finished_check CHECK (
    status = 'processing' OR finished_at IS NOT NULL
  )
);

COMMENT ON TABLE public.scheduled_job_runs IS
  'Heartbeat/audit ledger for external cron executions; contains no secret headers or personal data.';

CREATE INDEX scheduled_job_runs_job_date_idx
  ON public.scheduled_job_runs (job_name, scheduled_for DESC);

CREATE INDEX scheduled_job_runs_stale_idx
  ON public.scheduled_job_runs (heartbeat_at, id)
  WHERE status = 'processing';

CREATE INDEX scheduled_job_runs_failed_idx
  ON public.scheduled_job_runs (started_at DESC)
  WHERE status IN ('partial', 'failed');

-- ---------------------------------------------------------------------------
-- Internal rate-limit counters. Raw IP/email/device identifiers are hashed by
-- trusted server code before insertion. Atomic increment RPC is added later.
-- ---------------------------------------------------------------------------
CREATE TABLE public.rate_limits (
  key_hash bytea PRIMARY KEY,
  scope text NOT NULL,
  action text NOT NULL,
  identifier_hash bytea NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rate_limits_key_hash_check CHECK (octet_length(key_hash) = 32),
  CONSTRAINT rate_limits_identifier_hash_check CHECK (octet_length(identifier_hash) = 32),
  CONSTRAINT rate_limits_scope_check CHECK (
    scope IN ('ip', 'user', 'device', 'shop', 'global')
  ),
  CONSTRAINT rate_limits_action_check CHECK (
    length(btrim(action)) BETWEEN 2 AND 80
  ),
  CONSTRAINT rate_limits_count_check CHECK (request_count >= 1),
  CONSTRAINT rate_limits_window_check CHECK (window_end > window_start),
  CONSTRAINT rate_limits_block_check CHECK (
    blocked_until IS NULL OR blocked_until > window_start
  )
);

COMMENT ON TABLE public.rate_limits IS
  'Server-only counters with hashed identifiers. Updated atomically by one safe internal function.';

CREATE INDEX rate_limits_expiry_idx
  ON public.rate_limits (window_end, key_hash);

CREATE INDEX rate_limits_blocked_idx
  ON public.rate_limits (blocked_until, key_hash)
  WHERE blocked_until IS NOT NULL;

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

COMMIT;
