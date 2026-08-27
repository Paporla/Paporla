-- ============================================================================
-- PAPORLA — 0032_admin_packs_reservations_rpc.sql
-- Fase 6.5 (panel admin: packs, reservas y gráficos sobre RPCs canónicas).
--
-- El esquema (0012) NO concede SELECT directo sobre `packs` ni
-- `reservations` a ningún rol cliente: las lecturas de esas tablas pasan
-- SIEMPRE por RPCs SECURITY DEFINER (mismo patrón que 0027). Las páginas
-- /admin/packs y /admin/reservations — y los tres gráficos del dashboard —
-- las leían con .from() directo y fallaban en runtime:
--   * packs:        "permission denied for table packs"
--   * reservations: "Could not find a relationship between
--                   'reservations' and 'shops' in the schema cache"
--                   (no existe FK directa reservations→shops en el esquema:
--                   la cadena es reservations→packs→shops; además la tabla
--                   ya trae las snapshots *_snapshot que evitan el join).
--
--   1. list_admin_packs()         — packs con el nombre del comercio (join).
--   2. list_admin_reservations()  — reservas con el usuario, y comercio/pack
--                                   vía las columnas *_snapshot de la tabla
--                                   (0005: no depende de joins ni de FKs).
--   3. admin_dashboard_trend()    — jsonb con las tres series que pedían los
--                                   gráficos: reservas por día (últimos 7,
--                                   zona America/Santiago), ingresos por mes
--                                   (reservas picked_up, últimos 12 meses,
--                                   comisión provisional 10%) y top 5
--                                   comercios por reservas.
--
-- Las tres: SECURITY DEFINER + is_admin (solo admin), STABLE, y el cliente
-- las usa vía GRANT EXECUTE TO authenticated (la función valida el rol).
-- SIN cambios de esquema: tablas existentes.
--
-- Ejecutar en: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. list_admin_packs — reemplaza el .from('packs') directo de
--    /admin/packs (que el esquema deniega: no hay GRANT SELECT a ningún
--    rol cliente sobre packs).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_admin_packs(
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  pack_id uuid,
  shop_id uuid,
  shop_name text,
  title text,
  description text,
  category text,
  price_minor bigint,
  original_price_minor bigint,
  currency_code text,
  total_stock integer,
  remaining_stock integer,
  status text,
  pickup_start_at timestamptz,
  pickup_end_at timestamptz,
  timezone_snapshot text,
  image_path text,
  created_at timestamptz,
  updated_at timestamptz
)
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
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ADMIN_PACKS_PAGE_ARGUMENTS';
  END IF;

  RETURN QUERY
  SELECT p.id, p.shop_id, s.name, p.title, p.description, p.category,
         p.price_minor, p.original_price_minor, p.currency_code,
         p.total_stock, p.remaining_stock, p.status,
         p.pickup_start_at, p.pickup_end_at, p.timezone_snapshot,
         p.image_path, p.created_at, p.updated_at
  FROM public.packs p
  LEFT JOIN public.shops s ON s.id = p.shop_id
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_admin_packs(integer) IS
  'Panel admin (0032, Fase 6.5): lista canónica de packs con nombre del comercio. Solo admin (is_admin); p_limit 1..500.';
GRANT EXECUTE ON FUNCTION public.list_admin_packs(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. list_admin_reservations — reemplaza el .from('reservations') directo
--    de /admin/reservations. El nombre del comercio y del pack salen de las
--    snapshots de la propia reserva (0005), así que ni un join rota si el
--    pack o el comercio cambian después.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_admin_reservations(
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  reservation_id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  shop_id uuid,
  shop_name text,
  shop_address text,
  pack_title text,
  total_amount_minor bigint,
  currency_code text,
  status text,
  payment_status text,
  pickup_start_at timestamptz,
  pickup_end_at timestamptz,
  timezone_snapshot text,
  created_at timestamptz,
  updated_at timestamptz
)
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
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ADMIN_RESERVATIONS_PAGE_ARGUMENTS';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id, up.display_name, up.email,
         r.shop_id, r.shop_name_snapshot, r.shop_address_snapshot,
         r.pack_title_snapshot, r.total_amount_minor, r.currency_code,
         r.status, r.payment_status,
         r.pickup_start_at, r.pickup_end_at, r.timezone_snapshot,
         r.created_at, r.updated_at
  FROM public.reservations r
  LEFT JOIN public.user_profiles up ON up.id = r.user_id
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_admin_reservations(integer) IS
  'Panel admin (0032, Fase 6.5): lista canónica de reservas con usuario y snapshots de comercio/pack. Solo admin (is_admin); p_limit 1..500.';
GRANT EXECUTE ON FUNCTION public.list_admin_reservations(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. admin_dashboard_trend — reemplaza los N+1 rotos de RevenueChart,
--    useAdminDashboard y useAdminStats (todos hacían .from('reservations')
--    directo, que el esquema deniega).
--
-- Las divisiones por día/mes se cortan en America/Santiago (mercado del
-- piloto), no en UTC: una recogida de las 22:00 chilenas cae en "hoy".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dashboard_trend()
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
      -- Reservas por día, últimos 7 días (incluye hoy), zona de Santiago.
      'reservations_by_day', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('day', to_char(d.day, 'MM-DD'), 'count', COALESCE(c.n, 0))
          ORDER BY d.day
        )
        FROM generate_series(
          (now() AT TIME ZONE 'America/Santiago')::date - 6,
          (now() AT TIME ZONE 'America/Santiago')::date
        ) AS d(day)
        LEFT JOIN (
          SELECT (created_at AT TIME ZONE 'America/Santiago')::date AS day,
                 count(*) AS n
          FROM public.reservations
          GROUP BY 1
        ) c ON c.day = d.day
      ), '[]'::jsonb),

      -- Ingresos por mes, últimos 12 meses, solo reservas picked_up.
      -- Comisiones: 10% provisional (métrica de display; la comisión real
      -- llega con el módulo de pagos, hoy no existe comisión en el esquema).
      'revenue_by_month', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'month', to_char(m.month, 'YYYY-MM'),
            'revenue_minor', COALESCE(s.total, 0),
            'commissions_minor', COALESCE(s.total, 0) / 10,
            'count', COALESCE(s.n, 0)
          )
          ORDER BY m.month
        )
        FROM generate_series(
          date_trunc('month', now() AT TIME ZONE 'America/Santiago') - interval '11 months',
          date_trunc('month', now() AT TIME ZONE 'America/Santiago'),
          '1 month'::interval
        ) AS m(month)
        LEFT JOIN (
          SELECT date_trunc('month', created_at AT TIME ZONE 'America/Santiago') AS month,
                 sum(total_amount_minor) AS total,
                 count(*) AS n
          FROM public.reservations
          WHERE status = 'picked_up'
          GROUP BY 1
        ) s ON s.month = m.month
      ), '[]'::jsonb),

      -- Top 5 comercios por volumen de reservas (todas las reservas).
      'top_shops', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('shop_id', t.shop_id, 'name', t.name, 'reservations', t.n)
          ORDER BY t.n DESC, t.name
        )
        FROM (
          SELECT r.shop_id,
                 COALESCE(s.name, 'Desconocido') AS name,
                 count(*) AS n
          FROM public.reservations r
          LEFT JOIN public.shops s ON s.id = r.shop_id
          GROUP BY r.shop_id, s.name
          ORDER BY count(*) DESC, COALESCE(s.name, 'Desconocido')
          LIMIT 5
        ) t
      ), '[]'::jsonb),

      -- Moneda dominante (el piloto es un mercado: Chile, CLP).
      'currency_code', COALESCE(
        (SELECT r.currency_code FROM public.reservations r ORDER BY r.created_at DESC LIMIT 1),
        'CLP'
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_dashboard_trend() IS
  'Panel admin (0032, Fase 6.5): series de tendencia del dashboard (reservas por día 7d, ingresos mensuales picked_up 12m, top 5 comercios). Solo admin (is_admin).';
GRANT EXECUTE ON FUNCTION public.admin_dashboard_trend() TO authenticated;

COMMIT;
