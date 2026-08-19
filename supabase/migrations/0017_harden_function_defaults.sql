-- ============================================================================
-- PAPORLA — 0017_harden_function_defaults.sql
-- Corrective hardening after remote pgTAP validation.
-- Later-created catalogue RPCs inherited PostgreSQL's PUBLIC EXECUTE default.
-- Exact anon/authenticated/service_role grants remain intact.
-- ============================================================================

BEGIN;

-- Extension functions live in `extensions` and are intentionally unaffected.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC;

-- Ensure future functions owned by postgres do not regain PUBLIC EXECUTE.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;
