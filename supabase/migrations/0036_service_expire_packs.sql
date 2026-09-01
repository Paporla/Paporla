-- ============================================================================
-- PAPORLA — 0036_service_expire_packs.sql
-- Cierre del ciclo de vida de los packs: los que ya pasaron su ventana de
-- retiro dejan de figurar como 'active'/'paused'/'sold_out' y pasan a
-- 'expired'.
--
-- Sin esto, el catálogo público ya los ocultaba (filtra por ventana), pero el
-- panel del comercio los seguía mostrando como «Publicado / Disponible»
-- porque pinta la etiqueta según packs.status y nada lo actualizaba nunca.
--
-- Mismo patrón que las service_* de 0009 (service_mark_no_shows y compañía):
--   - SECURITY DEFINER + require_service_role(): solo la ejecuta el cron con
--     la service key, nunca un usuario.
--   - FOR UPDATE SKIP LOCKED + re-chequeo de estado en el UPDATE: dos
--     ejecuciones simultáneas no se pisan.
--   - Evento 'pack.expired' con dedupe_key: el outbox no duplica avisos.
--
-- El check de 0004 permite la transición: 'expired' exige published_at NOT
-- NULL y los tres estados de origen lo tienen. Los 'draft' nunca publicados
-- se quedan como están (no pueden ser 'expired' por ese mismo check y no
-- estorban: viven en el historial del panel).
--
-- EJECUCIÓN: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- NUNCA en producción. Idempotente (CREATE OR REPLACE).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.service_expire_packs(p_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_pack record;
  v_count integer := 0;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_limit NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_BATCH_LIMIT';
  END IF;

  FOR v_pack IN
    SELECT p.id, p.market_id
    FROM public.packs p
    WHERE p.status IN ('active', 'paused', 'sold_out')
      AND p.pickup_end_at < now()
    ORDER BY p.pickup_end_at, p.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.packs
    SET status = 'expired', updated_at = now()
    WHERE id = v_pack.id AND status IN ('active', 'paused', 'sold_out');

    IF FOUND THEN
      PERFORM app_private.enqueue_event(
        'pack.expired', 'pack', v_pack.id, v_pack.market_id,
        'pack:' || v_pack.id || ':expired',
        jsonb_build_object('pack_id', v_pack.id), now()
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$;

COMMENT ON FUNCTION public.service_expire_packs(integer) IS
  'Cron: marca como expired los packs active/paused/sold_out cuya ventana de retiro ya termino y emite pack.expired. Solo service_role.';

-- Los DEFAULT PRIVILEGES de 0012 ya niegan EXECUTE a anon/authenticated en
-- funciones nuevas; se repite en explícito por claridad. El GRANT a
-- service_role SÍ es imprescindible: el de 0012 solo cubrió las funciones
-- que existían entonces.
REVOKE EXECUTE ON FUNCTION public.service_expire_packs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_expire_packs(integer) TO service_role;

COMMIT;
