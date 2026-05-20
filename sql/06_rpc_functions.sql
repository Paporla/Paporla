-- ========================================================
-- PAPORLA - FUNCIONES RPC
-- ========================================================
-- Ejecutar despues de: 05_triggers.sql
-- ========================================================

-- 1. CREAR RESERVA ATOMICA
DROP FUNCTION IF EXISTS public.create_reservation_atomic(uuid, integer, text) CASCADE;
CREATE OR REPLACE FUNCTION public.create_reservation_atomic(
  p_pack_id UUID, p_quantity INTEGER, p_payment_method TEXT DEFAULT 'demo'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pack RECORD; v_reservation_id UUID; v_pickup_code TEXT; v_total_price INTEGER;
BEGIN
  SELECT * INTO v_pack FROM public.packs WHERE id = p_pack_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'El pack no existe.'); END IF;
  IF NOT v_pack.is_active THEN RETURN jsonb_build_object('success', false, 'error', 'Este pack ya no esta activo.'); END IF;
  IF v_pack.ends_at < NOW() THEN RETURN jsonb_build_object('success', false, 'error', 'El horario de recogida ya finalizo.'); END IF;
  IF v_pack.remaining_stock < p_quantity THEN RETURN jsonb_build_object('success', false, 'error', 'No queda stock suficiente. Disponibles: ' || v_pack.remaining_stock); END IF;
  IF EXISTS (SELECT 1 FROM public.reservations WHERE user_id = auth.uid() AND pack_id = p_pack_id AND status IN ('pending', 'confirmed')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya tienes una reserva activa para este pack.');
  END IF;
  v_pickup_code := public.generate_pickup_code();
  v_total_price := v_pack.price_cents * p_quantity;
  INSERT INTO public.reservations (user_id, shop_id, pack_id, quantity, total_price_cents, status, pickup_code, payment_method, payment_status, pickup_date, pickup_start_time, pickup_end_time)
  VALUES (auth.uid(), v_pack.shop_id, p_pack_id, p_quantity, v_total_price, 'confirmed', v_pickup_code, p_payment_method,
    CASE WHEN p_payment_method IN ('demo', 'card', 'mercado_pago') THEN 'paid' ELSE 'pending' END,
    v_pack.pickup_date, v_pack.pickup_start_time, v_pack.pickup_end_time)
  RETURNING id INTO v_reservation_id;
  UPDATE public.packs SET remaining_stock = remaining_stock - p_quantity WHERE id = p_pack_id;
  UPDATE public.shops SET total_packs_sold = total_packs_sold + p_quantity, total_revenue_cents = total_revenue_cents + v_total_price WHERE id = v_pack.shop_id;
  UPDATE public.user_profiles SET total_reservations = total_reservations + 1 WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true, 'reservation_id', v_reservation_id, 'pickup_code', v_pickup_code);
END;
$$;

-- 2. CANCELAR RESERVA
DROP FUNCTION IF EXISTS public.cancel_reservation(uuid, text) CASCADE;
CREATE OR REPLACE FUNCTION public.cancel_reservation(p_reservation_id UUID, p_cancel_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_res RECORD; v_role TEXT; v_hours_before_pickup NUMERIC;
BEGIN
  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada.'); END IF;
  IF v_res.status NOT IN ('pending', 'confirmed') THEN RETURN jsonb_build_object('success', false, 'error', 'La reserva no se puede cancelar.'); END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role = 'user' AND v_res.pickup_date IS NOT NULL AND v_res.pickup_start_time IS NOT NULL THEN
    v_hours_before_pickup := EXTRACT(EPOCH FROM ((v_res.pickup_date + v_res.pickup_start_time) - NOW())) / 3600;
    IF v_hours_before_pickup < 2 THEN RETURN jsonb_build_object('success', false, 'error', 'Solo puedes cancelar hasta 2 horas antes de la recogida.'); END IF;
  END IF;
  UPDATE public.reservations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = auth.uid(), cancel_reason = p_cancel_reason, updated_at = NOW() WHERE id = p_reservation_id;
  UPDATE public.packs SET remaining_stock = remaining_stock + v_res.quantity WHERE id = v_res.pack_id;
  UPDATE public.shops SET total_packs_sold = GREATEST(0, total_packs_sold - v_res.quantity), total_revenue_cents = GREATEST(0, total_revenue_cents - v_res.total_price_cents) WHERE id = v_res.shop_id;
  UPDATE public.user_profiles SET total_cancellations = total_cancellations + 1 WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true, 'message', 'Reserva cancelada exitosamente.');
END;
$$;

-- 3. VALIDAR RECOGIDA
DROP FUNCTION IF EXISTS public.validate_pickup(text) CASCADE;
CREATE OR REPLACE FUNCTION public.validate_pickup(p_pickup_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_res RECORD; v_shop RECORD;
BEGIN
  SELECT r.*, p.title AS pack_title INTO v_res FROM public.reservations r JOIN public.packs p ON p.id = r.pack_id WHERE r.pickup_code = p_pickup_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Codigo de recogida invalido.'); END IF;
  SELECT * INTO v_shop FROM public.shops WHERE id = v_res.shop_id;
  IF v_shop.owner_id != auth.uid() AND public.get_user_role() NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No estas autorizado para validar recogidas en este comercio.');
  END IF;
  IF v_res.status != 'confirmed' THEN RETURN jsonb_build_object('success', false, 'error', 'La reserva no se puede recoger. Estado: ' || v_res.status); END IF;
  IF NOW() < (v_res.pickup_date + v_res.pickup_start_time)::timestamp with time zone - INTERVAL '15 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Todavia no ha comenzado la hora de recogida.');
  END IF;
  IF NOW() > (v_res.pickup_date + v_res.pickup_end_time)::timestamp with time zone + INTERVAL '30 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El horario de recogida ya finalizo.');
  END IF;
  UPDATE public.reservations SET status = 'picked_up', picked_up_at = NOW(), updated_at = NOW() WHERE id = v_res.id;
  UPDATE public.shops SET active_packs_count = GREATEST(0, active_packs_count - 1) WHERE id = v_res.shop_id;
  UPDATE public.user_profiles SET total_pickups = total_pickups + 1 WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true, 'message', 'Codigo validado. Entrega el pack al cliente.', 'pack_title', v_res.pack_title, 'quantity', v_res.quantity);
END;
$$;

-- 4. EXPIRACION AUTOMATICA
DROP FUNCTION IF EXISTS public.expire_reservations() CASCADE;
CREATE OR REPLACE FUNCTION public.expire_reservations()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_expired_res_count INTEGER := 0; v_expired_packs_count INTEGER := 0; v_sold_out_count INTEGER := 0;
BEGIN
  UPDATE public.reservations SET status = 'no_show', updated_at = NOW()
  WHERE status = 'confirmed' AND (pickup_date + pickup_end_time)::timestamp with time zone < NOW();
  GET DIAGNOSTICS v_expired_res_count = ROW_COUNT;
  UPDATE public.packs SET is_active = false, status = 'expired', updated_at = NOW()
  WHERE is_active = true AND ends_at < NOW();
  GET DIAGNOSTICS v_expired_packs_count = ROW_COUNT;
  UPDATE public.packs SET is_active = false, status = 'sold_out', updated_at = NOW()
  WHERE is_active = true AND remaining_stock <= 0;
  GET DIAGNOSTICS v_sold_out_count = ROW_COUNT;
  UPDATE public.user_profiles SET total_no_shows = total_no_shows + 1
  WHERE id IN (SELECT user_id FROM public.reservations WHERE status = 'no_show' AND updated_at >= NOW() - INTERVAL '1 minute');
  RETURN jsonb_build_object('success', true, 'expired_reservations', v_expired_res_count, 'expired_packs', v_expired_packs_count, 'sold_out_packs', v_sold_out_count);
END;
$$;

-- 5. LIMPIEZA DE RESERVAS PENDIENTES
DROP FUNCTION IF EXISTS public.cleanup_pending_reservations(integer) CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_pending_reservations(p_minutes_ago INTEGER DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_cleaned_count INTEGER := 0;
BEGIN
  DELETE FROM public.reservations WHERE status = 'pending' AND created_at < NOW() - (p_minutes_ago || ' minutes')::interval;
  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'cleaned_count', v_cleaned_count);
END;
$$;

-- 6. ACTUALIZAR RATING DEL COMERCIO
DROP FUNCTION IF EXISTS public.update_shop_rating(uuid, double precision) CASCADE;
CREATE OR REPLACE FUNCTION public.update_shop_rating(p_shop_id UUID, p_new_rating DOUBLE PRECISION)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_shop RECORD; v_new_total_ratings INTEGER; v_new_avg_rating DOUBLE PRECISION;
BEGIN
  SELECT * INTO v_shop FROM public.shops WHERE id = p_shop_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Comercio no encontrado.'); END IF;
  IF p_new_rating < 1 OR p_new_rating > 5 THEN RETURN jsonb_build_object('success', false, 'error', 'La calificacion debe ser entre 1 y 5.'); END IF;
  v_new_total_ratings := v_shop.total_ratings + 1;
  v_new_avg_rating := ((v_shop.rating * v_shop.total_ratings) + p_new_rating) / v_new_total_ratings;
  UPDATE public.shops SET rating = ROUND(v_new_avg_rating, 1), total_ratings = v_new_total_ratings, updated_at = NOW() WHERE id = p_shop_id;
  RETURN jsonb_build_object('success', true, 'new_rating', v_new_avg_rating, 'total_ratings', v_new_total_ratings);
END;
$$;

-- 7. ELIMINAR USUARIO (ADMIN)
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_caller_role TEXT; v_user_email TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos.'); END IF;
  SELECT email INTO v_user_email FROM public.user_profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado.'); END IF;
  DELETE FROM public.activity_logs WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.favorites WHERE user_id = p_user_id;
  DELETE FROM public.reservations WHERE user_id = p_user_id;
  DELETE FROM public.shops WHERE owner_id = p_user_id;
  DELETE FROM public.user_profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'Usuario ' || v_user_email || ' eliminado completamente.');
END;
$$;

-- 8. ELIMINAR COMERCIO (ADMIN)
DROP FUNCTION IF EXISTS public.admin_delete_shop(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_delete_shop(p_shop_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_caller_role TEXT; v_shop_name TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos.'); END IF;
  SELECT name INTO v_shop_name FROM public.shops WHERE id = p_shop_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Comercio no encontrado.'); END IF;
  DELETE FROM public.activity_logs WHERE metadata->>'shop_id' = p_shop_id::text;
  DELETE FROM public.notifications WHERE reservation_id IN (SELECT id FROM public.reservations WHERE shop_id = p_shop_id);
  DELETE FROM public.favorites WHERE shop_id = p_shop_id;
  DELETE FROM public.reservations WHERE shop_id = p_shop_id;
  DELETE FROM public.packs WHERE shop_id = p_shop_id;
  DELETE FROM public.shops WHERE id = p_shop_id;
  RETURN jsonb_build_object('success', true, 'message', 'Comercio "' || v_shop_name || '" eliminado completamente.');
END;
$$;
