-- ========================================================
-- PAPORLA - FUNCIONES AUXILIARES
-- ========================================================
-- Ejecutar despues de: 03_views.sql
-- ========================================================

-- Rol de usuario activo
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.user_profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Generacion de codigo de recogida
DROP FUNCTION IF EXISTS public.generate_pickup_code() CASCADE;
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  part1 TEXT := ''; part2 TEXT := ''; i INTEGER;
BEGIN
  FOR i IN 1..3 LOOP
    part1 := part1 || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    part2 := part2 || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN 'P4P-' || part1 || '-' || part2;
END;
$$;

-- Funcion para updated_at automatico
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
