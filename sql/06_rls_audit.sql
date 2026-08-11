-- ========================================================
-- RLS AUDIT — Asegura que TODAS las tablas públicas tengan RLS activado
-- Ejecutar en Supabase SQL Editor
-- ========================================================

-- Habilitar RLS en cualquier tabla pública que aún no lo tenga
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND rowsecurity = true
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    RAISE NOTICE 'RLS habilitado en: public.%', t.tablename;
  END LOOP;
END;
$$;

-- Crear políticas por defecto (deny-all) para tablas sin políticas
DO $$
DECLARE
  t record;
  policy_count integer;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t.tablename;

    IF policy_count = 0 THEN
      -- Tabla sin políticas: crear política restrictiva (solo service_role)
      EXECUTE format(
        'CREATE POLICY IF NOT EXISTS "Restrict access" ON public.%I AS RESTRICTIVE FOR ALL TO public USING (false)',
        t.tablename
      );
      RAISE NOTICE 'Política restrictiva creada en: public.%', t.tablename;
    END IF;
  END LOOP;
END;
$$;
