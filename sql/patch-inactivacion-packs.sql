-- ============================================
-- PATCH: Auto-inactivaciÃƒÆ’Ã‚Â³n de packs + expiraciÃƒÆ’Ã‚Â³n
-- ============================================

-- 1. MEJORAR expire_reservations: tambiÃƒÆ’Ã‚Â©n desactivar packs vencidos
DROP FUNCTION IF EXISTS expire_reservations CASCADE;
CREATE OR REPLACE FUNCTION expire_reservations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count int;
  deactivated_count int;
BEGIN
  -- 1. Marcar reservas vencidas como no_show
  UPDATE reservations
  SET status = 'no_show'
  WHERE status IN ('confirmed', 'pending')
    AND pickup_date IS NOT NULL
    AND pickup_end_time IS NOT NULL
    AND (pickup_date || ' ' || pickup_end_time)::timestamp < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- 2. Desactivar packs cuya fecha de expiraciÃƒÆ’Ã‚Â³n ya pasÃƒÆ’Ã‚Â³
  UPDATE packs
  SET is_active = false
  WHERE is_active = true
    AND ends_at IS NOT NULL
    AND ends_at < NOW();

  GET DIAGNOSTICS deactivated_count = ROW_COUNT;

  -- 3. Desactivar packs sin stock
  UPDATE packs
  SET is_active = false
  WHERE is_active = true
    AND remaining_stock <= 0;

  RETURN expired_count;
END;
$$;

-- 2. MEJORAR update_pack_stock: desactivar pack si se queda sin stock
DROP FUNCTION IF EXISTS update_pack_stock CASCADE;
CREATE OR REPLACE FUNCTION update_pack_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'cancelled' OR NEW.status = 'no_show' THEN
    -- Devolver stock
    UPDATE packs 
    SET remaining_stock = remaining_stock + NEW.quantity,
        -- Reactivar si habÃƒÆ’Ã‚Â­a llegado a 0
        is_active = CASE 
          WHEN (SELECT remaining_stock FROM packs WHERE id = NEW.pack_id) <= 0 
          THEN true 
          ELSE is_active 
        END
    WHERE id = NEW.pack_id;
  ELSIF TG_OP = 'INSERT' THEN
    -- Restar stock
    UPDATE packs 
    SET remaining_stock = remaining_stock - NEW.quantity,
        -- Si llegÃƒÆ’Ã‚Â³ a 0, desactivar
        is_active = CASE 
          WHEN (remaining_stock - NEW.quantity) <= 0 THEN false 
          ELSE is_active 
        END
    WHERE id = NEW.pack_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_pack_stock_trigger ON reservations;
CREATE TRIGGER update_pack_stock_trigger
AFTER INSERT OR UPDATE OF status ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_pack_stock();

-- 3. EJECUTAR AHORA para arreglar datos actuales
SELECT expire_reservations();
