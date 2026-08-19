-- ============================================================================
-- PAPORLA — 0010_triggers.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Defensive invariants, Auth synchronization, PostGIS derivation and audit.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Generic updated_at helper.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Supabase Auth -> application profile. User metadata can request only the two
-- public signup roles; admin roles are never accepted from signup metadata.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_requested_role text;
  v_display_name text;
  v_phone text;
  v_locale text;
BEGIN
  v_requested_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('user', 'comercio')
      THEN NEW.raw_user_meta_data->>'role'
    ELSE 'user'
  END;

  v_display_name := NULLIF(left(btrim(COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  )), 120), '');
  IF v_display_name IS NOT NULL AND length(v_display_name) < 2 THEN
    v_display_name := NULL;
  END IF;

  v_phone := NULLIF(btrim(NEW.raw_user_meta_data->>'phone'), '');
  IF v_phone IS NOT NULL AND v_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    v_phone := NULL;
  END IF;

  v_locale := COALESCE(NULLIF(NEW.raw_user_meta_data->>'locale', ''), 'es');
  IF v_locale !~ '^[a-z]{2,3}(?:-[A-Z]{2})?$' THEN
    v_locale := 'es';
  END IF;

  INSERT INTO public.user_profiles (
    id, role, account_status, email, display_name, phone_e164,
    locale, email_confirmed_at
  )
  VALUES (
    NEW.id, v_requested_role, 'active', NEW.email,
    v_display_name, v_phone, v_locale, NEW.email_confirmed_at
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.sync_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Marks this transaction as a trusted Auth synchronization for the profile
  -- privilege guard below. Data API clients cannot invoke this trigger directly.
  PERFORM set_config('paporla.internal_profile_sync', '1', true);

  UPDATE public.user_profiles
  SET
    email = NEW.email,
    email_confirmed_at = NEW.email_confirmed_at,
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION app_private.handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email
    OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at
  )
  EXECUTE FUNCTION app_private.sync_auth_user_profile();

-- ---------------------------------------------------------------------------
-- Defense in depth for privileged profile fields. Normal client profile updates
-- happen through update_own_profile and never touch these columns.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.guard_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_internal_sync boolean := COALESCE(
    current_setting('paporla.internal_profile_sync', true), '0'
  ) = '1';
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PROFILE_IDENTITY_IMMUTABLE';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    v_actor_role := app_private.user_role(v_actor_id);
    IF COALESCE(auth.role(), '') <> 'service_role'
       AND v_actor_role NOT IN ('admin', 'super_admin') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PROFILE_PRIVILEGED_FIELD_DENIED';
    END IF;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
     OR NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at THEN
    IF NOT v_internal_sync AND COALESCE(auth.role(), '') <> 'service_role' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PROFILE_AUTH_FIELD_DENIED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_guard_privileged_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_profile_privileged_fields();

-- ---------------------------------------------------------------------------
-- PostGIS shop location derivation. Only latitude/longitude are client inputs;
-- geog is always server-derived.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.sync_shop_geog()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, extensions
AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    NEW.geog := NULL;
  ELSE
    NEW.geog := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326
    )::extensions.geography;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER shops_sync_geog
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION app_private.sync_shop_geog();

CREATE OR REPLACE FUNCTION app_private.ensure_shop_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.shop_stats (shop_id)
  VALUES (NEW.id)
  ON CONFLICT (shop_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER shops_ensure_stats
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION app_private.ensure_shop_stats();

-- ---------------------------------------------------------------------------
-- Immutable identity/financial fields. Status RPCs may change state/timestamps,
-- but never ownership, amount, currency or original business identity.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.guard_reservation_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.shop_id IS DISTINCT FROM OLD.shop_id
     OR NEW.pack_id IS DISTINCT FROM OLD.pack_id
     OR NEW.market_id IS DISTINCT FROM OLD.market_id
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.unit_price_minor IS DISTINCT FROM OLD.unit_price_minor
     OR NEW.total_amount_minor IS DISTINCT FROM OLD.total_amount_minor
     OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'RESERVATION_IDENTITY_IMMUTABLE';
  END IF;

  -- user_id may only become NULL during a service-role anonymization process.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     AND NOT (
       COALESCE(auth.role(), '') = 'service_role'
       AND OLD.user_id IS NOT NULL
       AND NEW.user_id IS NULL
       AND NEW.anonymized_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'RESERVATION_USER_IMMUTABLE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_guard_immutable_fields
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_reservation_immutable_fields();

CREATE OR REPLACE FUNCTION app_private.guard_payment_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.reservation_id IS DISTINCT FROM OLD.reservation_id
     OR NEW.market_id IS DISTINCT FROM OLD.market_id
     OR NEW.provider IS DISTINCT FROM OLD.provider
     OR NEW.provider_payment_id IS DISTINCT FROM OLD.provider_payment_id
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
     OR NEW.capture_mode IS DISTINCT FROM OLD.capture_mode
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PAYMENT_IDENTITY_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_guard_immutable_fields
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_payment_immutable_fields();

-- ---------------------------------------------------------------------------
-- Append-only evidence tables.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.guard_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'APPEND_ONLY_TABLE';
END;
$$;

CREATE TRIGGER legal_acceptances_append_only
  BEFORE UPDATE OR DELETE ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION app_private.guard_append_only();

CREATE TRIGGER activity_logs_append_only
  BEFORE UPDATE OR DELETE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION app_private.guard_append_only();

-- ---------------------------------------------------------------------------
-- Minimal status-change auditing. Rich request IDs/reasons are inserted by RPCs;
-- triggers ensure state transitions are still visible if internal code changes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.audit_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_action text;
  v_market_id uuid;
BEGIN
  v_actor_role := CASE
    WHEN COALESCE(auth.role(), '') = 'service_role' THEN 'system'
    ELSE app_private.user_role(v_actor_id)
  END;

  IF TG_TABLE_NAME = 'shops' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    v_action := 'shop.status_changed';
    v_market_id := NEW.market_id;
  ELSIF TG_TABLE_NAME = 'packs' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    v_action := 'pack.status_changed';
    v_market_id := NEW.market_id;
  ELSIF TG_TABLE_NAME = 'reservations' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
      RETURN NEW;
    END IF;
    v_action := 'reservation.status_changed';
    v_market_id := NEW.market_id;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.activity_logs (
    actor_user_id, actor_role, action, target_type, target_id,
    severity, market_id, metadata
  )
  VALUES (
    v_actor_id, COALESCE(v_actor_role, 'system'), v_action,
    TG_TABLE_NAME, NEW.id, 'info', v_market_id,
    jsonb_build_object(
      'old_status', to_jsonb(OLD)->>'status',
      'new_status', to_jsonb(NEW)->>'status',
      'old_payment_status', to_jsonb(OLD)->>'payment_status',
      'new_payment_status', to_jsonb(NEW)->>'payment_status'
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER shops_audit_status
  AFTER UPDATE OF status ON public.shops
  FOR EACH ROW EXECUTE FUNCTION app_private.audit_status_change();

CREATE TRIGGER packs_audit_status
  AFTER UPDATE OF status ON public.packs
  FOR EACH ROW EXECUTE FUNCTION app_private.audit_status_change();

CREATE TRIGGER reservations_audit_status
  AFTER UPDATE OF status, payment_status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION app_private.audit_status_change();

-- ---------------------------------------------------------------------------
-- updated_at triggers. Explicit list prevents hidden behavior on evidence tables.
-- ---------------------------------------------------------------------------
CREATE TRIGGER markets_set_updated_at BEFORE UPDATE ON public.markets
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER regions_set_updated_at BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER localities_set_updated_at BEFORE UPDATE ON public.localities
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER user_profiles_set_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER shops_set_updated_at BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER shop_stats_set_updated_at BEFORE UPDATE ON public.shop_stats
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER shop_hours_set_updated_at BEFORE UPDATE ON public.shop_hours
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER packs_set_updated_at BEFORE UPDATE ON public.packs
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER reservations_set_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER payment_refunds_set_updated_at BEFORE UPDATE ON public.payment_refunds
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER user_devices_set_updated_at BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER notification_preferences_set_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER legal_documents_set_updated_at BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER outbox_events_set_updated_at BEFORE UPDATE ON public.outbox_events
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
CREATE TRIGGER rate_limits_set_updated_at BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

COMMIT;
