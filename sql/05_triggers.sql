-- ========================================================
-- PAPORLA - TRIGGERS
-- ========================================================
-- Ejecutar despues de: 04_functions_helpers.sql
-- ========================================================

-- Trigger: Calcular ends_at, descuento y status del pack
DROP FUNCTION IF EXISTS public.calculate_pack_ends_at() CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_pack_ends_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.ends_at := (NEW.pickup_date + NEW.pickup_end_time)::timestamp with time zone;
  IF NEW.original_price_cents IS NOT NULL AND NEW.original_price_cents > 0 THEN
    NEW.discount_percentage := ROUND((1.0 - (NEW.price_cents::numeric / NEW.original_price_cents::numeric)) * 100);
  ELSE
    NEW.discount_percentage := 0;
  END IF;
  IF NEW.remaining_stock <= 0 THEN NEW.status := 'sold_out';
  ELSE NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pack_before_save ON public.packs;
CREATE TRIGGER trigger_pack_before_save
  BEFORE INSERT OR UPDATE ON public.packs
  FOR EACH ROW EXECUTE FUNCTION public.calculate_pack_ends_at();

-- Triggers: updated_at automatico
DROP TRIGGER IF EXISTS trigger_packs_updated_at ON public.packs;
CREATE TRIGGER trigger_packs_updated_at
  BEFORE UPDATE ON public.packs FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_reservations_updated_at ON public.reservations;
CREATE TRIGGER trigger_reservations_updated_at
  BEFORE UPDATE ON public.reservations FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_shops_updated_at ON public.shops;
CREATE TRIGGER trigger_shops_updated_at
  BEFORE UPDATE ON public.shops FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Creacion automatica de perfil para nuevos usuarios
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Sincronizar email_confirmed
DROP FUNCTION IF EXISTS public.sync_email_confirmed() CASCADE;
CREATE OR REPLACE FUNCTION public.sync_email_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.user_profiles SET email_confirmed = true, updated_at = NOW() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_email_confirmed
  AFTER UPDATE ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_confirmed();
