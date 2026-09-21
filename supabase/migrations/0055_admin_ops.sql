-- ============================================================================
-- 0055 - ADMIN-2 + ADMIN-3: herramientas operativas del panel admin.
--
-- 1) admin_set_pack_status: el interruptor que faltaba. Pausa o reactiva un
--    pack SIEMPRE con motivo (3-1000, como admin_review_shop), copiando las
--    reglas del comercio (set_pack_paused, 0009:1628) y dejando rastro en
--    activity_logs (patron de admin_set_account_status, 0009:2344).
--    El admin NO relaja candados de cara al cliente: reactivar exige lo mismo
--    que al comercio (stock >= 1, ventana de recogida no empezada, comercio
--    verificado y no borrado). La diferencia es que no necesita ser dueno.
-- 2) admin_business_snapshot: numeros de negocio del Overview (ADMIN-3):
--    ventas cobradas, "packs salvados" (retiradas + completadas), tasa de
--    cancelacion (canceladas + no show), packs activos/pausados. Sobre
--    TODAS las reservas (agregado en SQL), no sobre el listado de a 500.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_set_pack_status — interruptor de packs con auditoria.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_pack_status(
  p_pack_id uuid,
  p_action text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_role text := app_private.user_role(v_user_id);
  v_pack public.packs%ROWTYPE;
  v_new_status text;
  v_severity text;
BEGIN
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  IF p_pack_id IS NULL OR p_action NOT IN ('pause', 'activate') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ADMIN_PACK_STATUS_ARGUMENTS';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'REASON_REQUIRED';
  END IF;

  SELECT p.* INTO v_pack
  FROM public.packs p
  WHERE p.id = p_pack_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PACK_NOT_FOUND';
  END IF;

  IF p_action = 'pause' THEN
    -- Solo se pausa un pack ACTIVO (mismo guard que el comercio, 0009:1648).
    IF v_pack.status <> 'active' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACK_NOT_ACTIVE';
    END IF;
    v_new_status := 'paused';
    v_severity := 'warning';
  ELSE
    -- Reactivar exige lo mismo que al comercio (0009:1655): estado paused,
    -- stock >= 1, ventana no empezada y comercio verificado y vivo.
    -- (packs_active_stock_check de 0004 ya exigia stock > 0 para 'active'.)
    IF v_pack.status <> 'paused'
       OR v_pack.remaining_stock < 1
       OR v_pack.pickup_start_at <= now()
       OR NOT EXISTS (
         SELECT 1 FROM public.shops s
         WHERE s.id = v_pack.shop_id AND s.status = 'verified' AND s.deleted_at IS NULL
       ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACK_NOT_RESUMABLE';
    END IF;
    v_new_status := 'active';
    v_severity := 'info';
  END IF;

  UPDATE public.packs
  SET status = v_new_status, updated_by = v_user_id, updated_at = now()
  WHERE id = p_pack_id;

  INSERT INTO public.activity_logs (
    actor_user_id, actor_role, action, target_type, target_id, severity, market_id, metadata
  )
  VALUES (
    v_user_id, v_role, 'admin.pack_status_changed', 'pack', p_pack_id, v_severity,
    v_pack.market_id,
    jsonb_build_object(
      'action', p_action,
      'reason', btrim(p_reason),
      'from_status', v_pack.status,
      'to_status', v_new_status,
      'pack_title', v_pack.title,
      'shop_id', v_pack.shop_id
    )
  );

  RETURN jsonb_build_object(
    'success', true, 'pack_id', p_pack_id, 'from_status', v_pack.status, 'status', v_new_status
  );
END;
$$;

COMMENT ON FUNCTION public.admin_set_pack_status(uuid, text, text) IS
  'Panel admin (0055, ADMIN-2): pausa/activa un pack siempre con motivo y deja rastro en activity_logs. Reglas de negocio identicas a set_pack_paused (0009); solo admin/super_admin.';

-- ---------------------------------------------------------------------------
-- 2. admin_business_snapshot — numeros de negocio para el Overview (ADMIN-3).
--    payment_status 'paid' = cobrado (el flujo actual marca paid al reservar);
--    reembolsados NO cuentan como venta neta. Unidades salvadas = retiradas
--    + completadas (el lema de la casa). Tasa de cancelacion incluye no_show.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_business_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  IF NOT app_private.is_admin(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'paid_count', COUNT(*) FILTER (WHERE r.payment_status = 'paid'),
      'revenue_minor', COALESCE(SUM(r.total_amount_minor) FILTER (WHERE r.payment_status = 'paid'), 0),
      'units_saved', COUNT(*) FILTER (WHERE r.status IN ('picked_up', 'completed')),
      'cancelled_count', COUNT(*) FILTER (WHERE r.status = 'cancelled'),
      'no_show_count', COUNT(*) FILTER (WHERE r.status = 'no_show'),
      'total_count', COUNT(*),
      'cancel_rate', COALESCE(
        ROUND(100.0 * COUNT(*) FILTER (WHERE r.status IN ('cancelled', 'no_show')) / NULLIF(COUNT(*), 0), 1),
        0),
      'packs_active', (SELECT COUNT(*) FROM public.packs p WHERE p.status = 'active'),
      'packs_paused', (SELECT COUNT(*) FROM public.packs p WHERE p.status = 'paused'),
      'currency', (
        SELECT r2.currency_code FROM public.reservations r2
        GROUP BY r2.currency_code ORDER BY COUNT(*) DESC LIMIT 1
      )
    )
    FROM public.reservations r
  );
END;
$$;

COMMENT ON FUNCTION public.admin_business_snapshot() IS
  'Panel admin (0055, ADMIN-3): ventas cobradas, packs salvados, tasa de cancelacion y packs activos/pausados. Solo admin (is_admin).';

-- Permisos al estilo 0041: fuera PUBLIC, dentro authenticated (la funcion
-- vuelve a exigir admin por dentro).
REVOKE EXECUTE ON FUNCTION public.admin_set_pack_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_pack_status(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_business_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_business_snapshot() TO authenticated;
