-- ============================================================================
-- PAPORLA — 0033_fix_admin_dashboard_trend.sql
-- Fase 6.6 (hotfix: /admin/stats y /admin).
--
-- Corrige un bug de SQL de la funcion admin_dashboard_trend (creada en 0032,
-- Fase 6.5): usaba generate_series(fecha, fecha) SIN paso, y esa sobrecarga
-- NO existe en PostgreSQL (solo existen generate_series(int,int[,int]),
-- (bigint,bigint[,bigint]) y (timestamp[,timestamptz], timestamp[,timestamptz],
-- interval)). La funcion fallaba SIEMPRE en runtime con:
--   ERROR: 42883: function generate_series(date, date) does not exist
-- (detectado el 28-ago con el diagnostico de solo lectura del paso 0 de
-- entrega-F66; verificado en PostgreSQL 17 local: el cuerpo original falla y
-- el corregido corre limpio).
--
-- Por eso /admin/stats no podia cargar las series (top 5 comercios, ingresos
-- mensuales, reservas por dia) y el dashboard degradaba en silencio.
--
-- Correccion (lo minimo):
--   * generate_series con EXPLICITO tipo timestamp y paso '1 day' (la
--     sobrecarga (timestamp, timestamp, interval) SI existe).
--   * el join del dia queda `c.day = d.day::date` (el generador ahora emite
--     timestamp, se castea a date para comparar contra el date agregado).
--
-- CREATE OR REPLACE sobre la misma firma: conserva el GRANT existente (se
-- repite el GRANT por seguridad: es idempotente). Sin cambios de esquema.
--
-- Ejecutar en: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- ============================================================================

BEGIN;
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
          ((now() AT TIME ZONE 'America/Santiago')::date - 6)::timestamp,
          ((now() AT TIME ZONE 'America/Santiago')::date)::timestamp,
          '1 day'::interval
        ) AS d(day)
        LEFT JOIN (
          SELECT (created_at AT TIME ZONE 'America/Santiago')::date AS day,
                 count(*) AS n
          FROM public.reservations
          GROUP BY 1
        ) c ON c.day = d.day::date
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

COMMENT ON FUNCTION public.admin_dashboard_trend() IS
  'Panel admin (0032, corregido en 0033, Fase 6.6): series de tendencia del dashboard (reservas por dia 7d, ingresos mensuales picked_up 12m, top 5 comercios). Solo admin (is_admin).';
GRANT EXECUTE ON FUNCTION public.admin_dashboard_trend() TO authenticated;

COMMIT;
