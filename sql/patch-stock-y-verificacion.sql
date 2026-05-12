-- ============================================
-- PATCH 2: Stock check + verificación comercio
-- ============================================

-- 1. MEJORAR trigger de stock: verificar stock ANTES de insertar
DROP FUNCTION IF EXISTS update_pack_stock CASCADE;
CREATE OR REPLACE FUNCTION update_pack_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Verificar stock disponible antes de insertar
    SELECT remaining_stock INTO current_stock FROM packs WHERE id = NEW.pack_id;
    
    IF current_stock IS NULL THEN
      RAISE EXCEPTION 'El pack no existe';
    END IF;
    
    IF current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', current_stock, NEW.quantity;
    END IF;
    
    -- Restar stock (el AFTER INSERT ya no es necesario,
    -- usamos BEFORE INSERT para restar y crear la reserva en una transacción)
    UPDATE packs 
    SET remaining_stock = remaining_stock - NEW.quantity,
        is_active = CASE 
          WHEN (remaining_stock - NEW.quantity) <= 0 THEN false 
          ELSE is_active 
        END
    WHERE id = NEW.pack_id;
    
  ELSIF TG_OP = 'UPDATE' AND (NEW.status = 'cancelled' OR NEW.status = 'no_show') AND OLD.status NOT IN ('cancelled', 'no_show') THEN
    -- Devolver stock solo si no estaba ya cancelado/no_show
    UPDATE packs 
    SET remaining_stock = remaining_stock + NEW.quantity,
        is_active = CASE 
          WHEN (remaining_stock + NEW.quantity) > 0 THEN true 
          ELSE is_active 
        END
    WHERE id = NEW.pack_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_pack_stock_trigger ON reservations;
-- Cambiamos a BEFORE INSERT para verificar stock antes de insertar
CREATE TRIGGER update_pack_stock_trigger
BEFORE INSERT OR UPDATE OF status ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_pack_stock();


-- 2. NO permitir crear packs activos si el comercio no está verificado
DROP FUNCTION IF EXISTS check_shop_verified CASCADE;
CREATE OR REPLACE FUNCTION check_shop_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  shop_verified boolean;
BEGIN
  -- Solo verificar si intentan activar un pack
  IF NEW.is_active = true THEN
    SELECT verified INTO shop_verified FROM shops WHERE id = NEW.shop_id;
    
    IF shop_verified IS NULL THEN
      RAISE EXCEPTION 'La tienda no existe';
    END IF;
    
    IF shop_verified = false OR shop_verified IS NULL THEN
      RAISE EXCEPTION 'No puedes publicar packs hasta que tu comercio esté verificado. Contacta al administrador.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_shop_verified_trigger ON packs;
CREATE TRIGGER check_shop_verified_trigger
BEFORE INSERT OR UPDATE OF is_active ON packs
FOR EACH ROW
EXECUTE FUNCTION check_shop_verified();
