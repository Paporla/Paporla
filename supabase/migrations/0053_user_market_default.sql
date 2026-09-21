-- ============================================================================
-- 0053: mercado por defecto para perfiles (paso 45, cierre).
-- Ejecutar en el editor SQL del proyecto vivo (mqdau...). Idempotente.
--
-- Motivo: user_profiles.market_id nace NULL (el trigger de alta no lo recibe
-- en el metadata de signUp) y accept_legal_document exige que el mercado del
-- usuario coincida con el del documento: todo consumidor nuevo recibia
-- LEGAL_DOCUMENT_NOT_APPLICABLE (400). Mientras el piloto sea solo Chile,
-- NULL significa Chile.
-- ============================================================================
BEGIN;

-- 1. Los perfiles sin mercado pasan al mercado Chile (backfill idempotente).
UPDATE public.user_profiles
   SET market_id = '10000000-0000-4000-8000-000000000001'::uuid
 WHERE market_id IS NULL;

-- 2. Insert futuros que omitan la columna nacen en Chile.
ALTER TABLE public.user_profiles
  ALTER COLUMN market_id SET DEFAULT '10000000-0000-4000-8000-000000000001'::uuid;

-- 3. accept_legal_document tolera mercado NULL como mercado por defecto.
--    (Cuando exista multi-mercado real, el onboarding fijara market_id y este
--    COALESCE dejara de aplicarse solo.)
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
  v_user_market_id := COALESCE(v_user_market_id, '10000000-0000-4000-8000-000000000001'::uuid);

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

COMMIT;
