-- ========================================================
-- PAPORLA - EJECUCION COMPLETA
-- ========================================================
-- Este archivo ejecuta todos los scripts en orden.
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ========================================================

\ir 01_tables.sql
\ir 02_indexes.sql
\ir 03_views.sql
\ir 04_functions_helpers.sql
\ir 05_triggers.sql
\ir 06_rpc_functions.sql
\ir 07_rls_policies.sql
\ir 08_sync_and_permissions.sql
