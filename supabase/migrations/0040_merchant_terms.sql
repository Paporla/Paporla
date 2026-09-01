-- ============================================================================
-- PAPORLA — 0040_merchant_terms.sql
-- Términos y Condiciones para Comercios (Bloque D, paso d):
--   1. Publica el documento merchant_terms v2026-09-01 para el mercado Chile
--      sobre la infraestructura de legal_documents ya existente (0007).
--   2. accept_legal_document: si el perfil del usuario no tiene market_id
--      (los dueños de comercio no lo fijan en el alta), usa el mercado del
--      comercio del que es dueño. Sin esto, ningún comercio podría aceptar.
--   3. submit_own_shop_for_review: exige la aceptación de los merchant_terms
--      publicados del mercado del comercio ANTES de enviar a revisión
--      (error MERCHANT_TERMS_NOT_ACCEPTED). El requisito es condicional:
--      solo aplica si existe un merchant_terms publicado para ese mercado,
--      así el orden de despliegue nunca deja a nadie bloqueado.
--
-- El contenido del documento vive en /legal/terminos-comercios (página web)
-- y su fuente versionada es docs/legal/terminos-comercios-v1.md en el repo.
-- content_sha256 = hash SHA-256 de ese archivo fuente.
--
-- EJECUCIÓN: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- NUNCA en producción. Idempotente.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Documento merchant_terms para Chile, publicado y vigente desde ya.
--    UNIQUE (market_id, document_type, language, version) hace esto
--    idempotente; el índice parcial "one published" garantiza que nunca
--    habrá dos versiones publicadas a la vez.
-- ---------------------------------------------------------------------------
INSERT INTO public.legal_documents (
  market_id, document_type, language, version, status,
  content_url, content_sha256, effective_at, published_at, is_required
)
VALUES (
  '10000000-0000-4000-8000-000000000001'::uuid,  -- Chile
  'merchant_terms',
  'es',
  '2026-09-01',
  'published',
  'https://paporla.com/legal/terminos-comercios',
  '24915b35047ca7fa673b9fd271e23ee465c3423b8278f438f31d075c1d339a24',
  now(),
  now(),
  true
)
ON CONFLICT (market_id, document_type, language, version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. accept_legal_document: el mercado del usuario puede venir del perfil o,
--    si el perfil no lo tiene (caso real de los dueños de comercio), del
--    comercio que posee. Misma firma → CREATE OR REPLACE, sin re-GRANT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_legal_document(
  p_legal_document_id uuid,
  p_app_platform text,
  p_app_version text,
  p_acceptance_context text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_user_market_id uuid;
  v_document_market_id uuid;
BEGIN
  SELECT market_id INTO v_user_market_id FROM public.user_profiles WHERE id = v_user_id;

  -- Perfil sin mercado: los comercios no eligen mercado en su perfil, pero su
  -- tienda sí lo tiene. Se usa como respaldo para no dejarles sin poder
  -- aceptar los documentos de su propio mercado.
  IF v_user_market_id IS NULL THEN
    SELECT s.market_id INTO v_user_market_id
    FROM public.shops s
    WHERE s.owner_id = v_user_id
    LIMIT 1;
  END IF;

  SELECT market_id INTO v_document_market_id
  FROM public.legal_documents
  WHERE id = p_legal_document_id
    AND status = 'published'
    AND effective_at <= now();

  IF NOT FOUND OR v_user_market_id IS DISTINCT FROM v_document_market_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LEGAL_DOCUMENT_NOT_APPLICABLE';
  END IF;

  INSERT INTO public.legal_acceptances (
    user_id, legal_document_id, app_platform, app_version, acceptance_context
  )
  VALUES (
    v_user_id, p_legal_document_id, p_app_platform,
    NULLIF(btrim(p_app_version), ''), p_acceptance_context
  )
  ON CONFLICT (user_id, legal_document_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'legal_document_id', p_legal_document_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. submit_own_shop_for_review: además de los campos obligatorios (0038),
--    exige la aceptación de los merchant_terms vigentes del mercado del
--    comercio, si los hay. Misma firma → CREATE OR REPLACE, sin re-GRANT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_own_shop_for_review(p_shop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_shop public.shops%ROWTYPE;
BEGIN
  SELECT * INTO v_shop FROM public.shops
  WHERE id = p_shop_id AND owner_id = v_user_id FOR UPDATE;

  IF NOT FOUND OR v_shop.status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_NOT_SUBMITTABLE';
  END IF;

  IF v_shop.locality_id IS NULL OR v_shop.name IS NULL
     OR v_shop.category IS NULL OR v_shop.phone_e164 IS NULL
     OR v_shop.address_line1 IS NULL OR v_shop.latitude IS NULL
     OR v_shop.longitude IS NULL OR v_shop.logo_path IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_PROFILE_INCOMPLETE';
  END IF;

  IF v_shop.tax_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_TAX_ID_REQUIRED';
  END IF;

  IF v_shop.sanitary_resolution IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_SANITARY_RESOLUTION_REQUIRED';
  END IF;

  -- Términos para comercios: si el mercado tiene un merchant_terms publicado
  -- y vigente, el dueño debe haber aceptado ESA versión. Condicional a que
  -- exista para que un mercado sin documento no bloquee el piloto.
  IF EXISTS (
    SELECT 1 FROM public.legal_documents ld
    WHERE ld.market_id = v_shop.market_id
      AND ld.document_type = 'merchant_terms'
      AND ld.status = 'published'
      AND ld.effective_at <= now()
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.legal_acceptances la
    JOIN public.legal_documents ld ON ld.id = la.legal_document_id
    WHERE la.user_id = v_user_id
      AND ld.market_id = v_shop.market_id
      AND ld.document_type = 'merchant_terms'
      AND ld.status = 'published'
      AND ld.effective_at <= now()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'MERCHANT_TERMS_NOT_ACCEPTED';
  END IF;

  UPDATE public.shops
  SET status = 'pending_review', status_reason = NULL,
      reviewed_by = NULL, reviewed_at = NULL, updated_at = now()
  WHERE id = p_shop_id;

  PERFORM app_private.enqueue_event(
    'shop.submitted_for_review', 'shop', p_shop_id, v_shop.market_id,
    'shop:' || p_shop_id || ':review_submission:' || txid_current()::text,
    jsonb_build_object('shop_id', p_shop_id), now()
  );

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id, 'status', 'pending_review');
END;
$$;

COMMIT;
