-- ============================================================================
-- 0052: documentos legales del CONSUMIDOR publicados (paso 45).
-- Ejecutar en el editor SQL del panel de Supabase (proyecto de produccion),
-- igual que las migraciones anteriores. Idempotente: reejecutar no duplica.
--
-- Convencion de huella: para documentos publicados en la web (no en la base),
-- content_sha256 cubre tipo+version+url canonica. Cuando el contenido viva en
-- la base, la huella pasara a ser la del contenido mismo.
-- ============================================================================
BEGIN;

INSERT INTO public.legal_documents (
  market_id, document_type, language, version, status,
  content_url, content_sha256, effective_at, published_at, is_required
) VALUES
  ('10000000-0000-4000-8000-000000000001'::uuid,  -- Chile
   'terms', 'es', '2026-09-19', 'published',
   'https://www.paporla.com/legal/terminos',
   '580b6a935419b2f7838bfde6fa96a353de85eecce34c4354fb452ff4d8c74e9b', now(), now(), true),
  ('10000000-0000-4000-8000-000000000001'::uuid,
   'privacy', 'es', '2026-09-19', 'published',
   'https://www.paporla.com/legal/privacidad',
   'c5ff6cff8cca1177c70d443859c4819dfdc879ebf55802d5637dc794fa2a7cbf', now(), now(), true)
ON CONFLICT (market_id, document_type, language, version) DO NOTHING;

COMMIT;
