-- ============================================================================
-- PAPORLA — 0001_extensions.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- PostgreSQL 17 / Supabase
-- ============================================================================

BEGIN;

-- Keep third-party extension objects outside the exposed public schema.
CREATE SCHEMA IF NOT EXISTS extensions;

-- Internal helpers, trigger functions and implementation details live here.
-- This schema must never be exposed through the Supabase Data API.
CREATE SCHEMA IF NOT EXISTS app_private;

COMMENT ON SCHEMA app_private IS
  'Paporla internal database helpers. Not exposed to client roles or Data API.';

-- Required extensions for UUID/crypto helpers, fuzzy search and geolocation.
-- pg_cron is intentionally omitted: the MVP uses cron-job.org via authenticated
-- Vercel POST endpoints. pg_stat_statements is managed by the platform.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Schema hardening.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA extensions FROM PUBLIC;

-- Client roles need to resolve PostGIS/pg_trgm objects used by safe public
-- views/RPCs, but they receive no right to create objects in this schema.
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA app_private TO service_role;

-- Secure defaults for all later migrations created by this migration owner.
-- Every client-facing grant must be added explicitly in 0012_permissions.sql.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA app_private
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_private
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;
