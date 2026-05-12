-- ============================================
-- 12. TRIGGERS DE ACTIVITY LOGS
-- ============================================

-- Log: Nuevo usuario registrado
CREATE OR REPLACE FUNCTION log_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  INSERT INTO activity_logs (user_id, type, severity, title, description, metadata)
  VALUES (
    NEW.id,
    'user_registered',
    'info',
    'Nuevo usuario registrado',
    'El usuario ' || COALESCE(NEW.email, 'desconocido') || ' se ha registrado en la plataforma.',
    jsonb_build_object('email', NEW.email, 'role', NEW.role)
  );
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_user_profile_created ON user_profiles;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_registration();

-- Log: Nueva reserva creada
CREATE OR REPLACE FUNCTION log_reservation_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  INSERT INTO activity_logs (user_id, type, severity, title, description, metadata)
  VALUES (
    NEW.user_id,
    'pack_reserved',
    'info',
    'Nueva reserva realizada',
    'Se ha realizado una reserva.',
    jsonb_build_object('reservation_id', NEW.id, 'pack_id', NEW.pack_id, 'pickup_code', NEW.pickup_code)
  );
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_reservation_created ON reservations;
CREATE TRIGGER on_reservation_created
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION log_reservation_created();

-- Log: Pack creado
CREATE OR REPLACE FUNCTION log_pack_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  INSERT INTO activity_logs (user_id, type, severity, title, description, metadata)
  VALUES (
    (SELECT owner_id FROM shops WHERE id = NEW.shop_id),
    'pack_created',
    'info',
    'Nuevo pack publicado',
    'Se ha creado el pack: ' || NEW.title,
    jsonb_build_object('pack_id', NEW.id, 'shop_id', NEW.shop_id, 'title', NEW.title)
  );
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_pack_created ON packs;
CREATE TRIGGER on_pack_created
  AFTER INSERT ON packs
  FOR EACH ROW
  EXECUTE FUNCTION log_pack_created();

-- Log: Comercio creado
CREATE OR REPLACE FUNCTION log_shop_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  INSERT INTO activity_logs (user_id, type, severity, title, description, metadata)
  VALUES (
    NEW.owner_id,
    'shop_created',
    'info',
    'Nuevo comercio registrado',
    'Se ha registrado el comercio: ' || NEW.name,
    jsonb_build_object('shop_id', NEW.id, 'name', NEW.name)
  );
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_shop_created ON shops;
CREATE TRIGGER on_shop_created
  AFTER INSERT ON shops
  FOR EACH ROW
  EXECUTE FUNCTION log_shop_created();

-- Log: Cambio de estado en reserva
CREATE OR REPLACE FUNCTION log_reservation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_logs (user_id, type, severity, title, description, metadata)
    VALUES (
      NEW.user_id,
      'reservation_status',
      CASE 
        WHEN NEW.status = 'cancelled' THEN 'warning'
        WHEN NEW.status = 'picked_up' THEN 'success'
        ELSE 'info'
      END,
      'Reserva ' || NEW.status,
      'La reserva ha cambiado a estado: ' || NEW.status,
      jsonb_build_object('reservation_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_reservation_status_update ON reservations;
CREATE TRIGGER on_reservation_status_update
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_reservation_status_change();
