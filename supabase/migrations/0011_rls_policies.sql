-- ============================================================================
-- PAPORLA — 0011_rls_policies.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Read-oriented RLS. Mutations use SECURITY DEFINER RPCs with exact grants.
-- ============================================================================

BEGIN;

-- Markets and locations visible to catalogue/onboarding.
CREATE POLICY markets_public_read ON public.markets
  FOR SELECT TO anon, authenticated
  USING (status IN ('waitlist', 'pilot', 'active'));

CREATE POLICY markets_admin_read ON public.markets
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

CREATE POLICY regions_public_read ON public.regions
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.markets m
      WHERE m.id = regions.market_id
        AND m.status IN ('waitlist', 'pilot', 'active')
    )
  );

CREATE POLICY regions_admin_read ON public.regions
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

CREATE POLICY localities_public_read ON public.localities
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.markets m
      WHERE m.id = localities.market_id
        AND m.status IN ('waitlist', 'pilot', 'active')
    )
  );

CREATE POLICY localities_admin_read ON public.localities
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

-- Profiles: self or admin only. Commerce-facing customer information will come
-- from a purpose-built view/RPC, not direct profile-table access.
CREATE POLICY user_profiles_read_own ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY user_profiles_admin_read ON public.user_profiles
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

-- Shops: verified public catalogue, owner private dashboard, admin moderation.
CREATE POLICY shops_public_read ON public.shops
  FOR SELECT TO anon, authenticated
  USING (status = 'verified' AND deleted_at IS NULL);

CREATE POLICY shops_owner_read ON public.shops
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY shops_admin_read ON public.shops
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

CREATE POLICY shop_stats_public_read ON public.shop_stats
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_stats.shop_id
        AND s.status = 'verified'
        AND s.deleted_at IS NULL
    )
  );

CREATE POLICY shop_stats_owner_read ON public.shop_stats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_stats.shop_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY shop_stats_admin_read ON public.shop_stats
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

CREATE POLICY shop_hours_public_read ON public.shop_hours
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_hours.shop_id
        AND s.status = 'verified'
        AND s.deleted_at IS NULL
    )
  );

CREATE POLICY shop_hours_owner_read ON public.shop_hours
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_hours.shop_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY shop_hours_admin_read ON public.shop_hours
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

-- Packs: only active catalogue rows are public; owners/admins see lifecycle rows.
CREATE POLICY packs_public_read ON public.packs
  FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    AND remaining_stock > 0
    AND (sales_start_at IS NULL OR sales_start_at <= now())
    AND pickup_start_at > now()
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = packs.shop_id
        AND s.status = 'verified'
        AND s.deleted_at IS NULL
    )
  );

CREATE POLICY packs_owner_read ON public.packs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = packs.shop_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY packs_admin_read ON public.packs
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

-- Reservations: customer owner, owning commerce or admin.
CREATE POLICY reservations_user_read ON public.reservations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY reservations_shop_owner_read ON public.reservations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = reservations.shop_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY reservations_admin_read ON public.reservations
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

-- Payments/refunds are deliberately not granted to client roles directly.
-- Future safe summary views/RPCs expose only necessary fields.

-- Favorites and notification inbox: private to the user.
CREATE POLICY favorites_user_read ON public.favorites
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_user_read ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_admin_read ON public.notifications
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

CREATE POLICY notification_preferences_user_read ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Push tokens intentionally receive no direct client SELECT policy.

-- Legal documents: only published/effective content is public. Admin can inspect
-- drafts and retired versions.
CREATE POLICY legal_documents_public_read ON public.legal_documents
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND effective_at <= now());

CREATE POLICY legal_documents_admin_read ON public.legal_documents
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

CREATE POLICY legal_acceptances_user_read ON public.legal_acceptances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY legal_acceptances_admin_read ON public.legal_acceptances
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

-- Penalties: user can see own status; admin can investigate.
CREATE POLICY user_penalties_user_read ON public.user_penalties
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_penalties_admin_read ON public.user_penalties
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

-- Reviews: published catalogue, own pending/hidden, or admin moderation.
CREATE POLICY reviews_public_read ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (moderation_status = 'published');

CREATE POLICY reviews_user_read ON public.reviews
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY reviews_admin_read ON public.reviews
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

-- Audit is admin-only; other infrastructure tables have no client policies.
CREATE POLICY activity_logs_admin_read ON public.activity_logs
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

CREATE POLICY scheduled_job_runs_admin_read ON public.scheduled_job_runs
  FOR SELECT TO authenticated
  USING (app_private.is_current_admin());

COMMIT;
