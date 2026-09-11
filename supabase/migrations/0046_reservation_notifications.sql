-- ============================================================================
-- 0046 — Notificaciones in-app de eventos de reserva (L-08)
--
-- Hasta hoy la tabla notifications solo recibía escritos del cron
-- pickup-reminders: crear una reserva no avisaba al comercio, confirmar o
-- cancelar no avisaba al cliente. El feed del admin viene de activity_logs
-- (trigger de auditoría), que es otra cosa: por eso "no llegaba nada".
--
-- Dos triggers nuevos, ambos SECURITY DEFINER con search_path fijo (regla
-- pgTAP de 0016) y sin EXECUTE público (convención 0041):
--   1. AFTER INSERT  → avisa al dueño del comercio (shop_operations).
--   2. AFTER UPDATE OF status → avisa al cliente (reservation) y, si es
--      cancelación, también al comercio.
-- La tabla notifications YA está en la publicación realtime (0045): la
-- campana las recibe en vivo sin tocar código del front.
-- Los correos de reserva siguen BLOQUEADOS (empresa + MercadoPago): esto es
-- solo in-app.
-- ============================================================================

CREATE OR REPLACE FUNCTION app_private.notify_reservation_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner uuid;
  v_pack_title text;
BEGIN
  SELECT s.owner_id, p.title
    INTO v_owner, v_pack_title
  FROM public.shops s
  JOIN public.packs p ON p.id = NEW.pack_id
  WHERE s.id = NEW.shop_id;

  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications
    (user_id, category, type, title, body, data, reservation_id, shop_id, pack_id)
  VALUES
    (v_owner, 'shop_operations', 'reservation_created',
     'Nueva reserva recibida',
     format('Reserva de "%s" (%s unidad(es)). Confírmala o cancélala desde Mis Reservas.',
            COALESCE(v_pack_title, 'un pack'), NEW.quantity),
     jsonb_build_object('status', NEW.status, 'payment_status', NEW.payment_status),
     NEW.id, NEW.shop_id, NEW.pack_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.notify_reservation_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner uuid;
  v_pack_title text;
  v_title text;
  v_body text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT p.title INTO v_pack_title FROM public.packs p WHERE p.id = NEW.pack_id;

  v_title := CASE NEW.status
    WHEN 'confirmed'    THEN 'Tu reserva está confirmada'
    WHEN 'ready_pickup' THEN 'Tu reserva está lista para recoger'
    WHEN 'picked_up'    THEN 'Tu pack fue marcado como recogido'
    WHEN 'completed'    THEN 'Reserva completada: gracias por rescatar comida'
    WHEN 'cancelled'    THEN 'Tu reserva fue cancelada'
    WHEN 'no_show'      THEN 'Tu reserva quedó como no retirada'
    WHEN 'expired'      THEN 'Tu reserva expiró sin recogida'
    ELSE NULL
  END;

  v_body := CASE NEW.status
    WHEN 'ready_pickup' THEN format('"%s" ya puede recogerse: lleva tu código de recogida en la ventana indicada.', COALESCE(v_pack_title, 'Tu pack'))
    WHEN 'cancelled'    THEN format('La reserva de "%s" fue cancelada. Si no fuiste tú, escribe a soporte.', COALESCE(v_pack_title, 'tu pack'))
    ELSE format('Mira el estado y los detalles en Mis reservas: "%s".', COALESCE(v_pack_title, 'tu pack'))
  END;

  IF v_title IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications
      (user_id, category, type, title, body, data, reservation_id, shop_id, pack_id)
    VALUES
      (NEW.user_id, 'reservation', 'reservation_' || NEW.status,
       v_title, v_body,
       jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
       NEW.id, NEW.shop_id, NEW.pack_id);
  END IF;

  -- Una cancelación del cliente también es noticia para el comercio.
  IF NEW.status = 'cancelled' THEN
    SELECT s.owner_id INTO v_owner FROM public.shops s WHERE s.id = NEW.shop_id;
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.notifications
        (user_id, category, type, title, body, data, reservation_id, shop_id, pack_id)
      VALUES
        (v_owner, 'shop_operations', 'reservation_cancelled',
         'Reserva cancelada por el cliente',
         format('"%s" quedó cancelada: ese stock vuelve a estar disponible.', COALESCE(v_pack_title, 'Un pack')),
         jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status,
                            'cancel_reason', to_jsonb(NEW)->>'cancel_reason'),
         NEW.id, NEW.shop_id, NEW.pack_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Convención 0041: ninguna función nueva ejecutable por el público.
REVOKE EXECUTE ON FUNCTION app_private.notify_reservation_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.notify_reservation_status_changed() FROM PUBLIC;

DROP TRIGGER IF EXISTS reservations_notify_created ON public.reservations;
CREATE TRIGGER reservations_notify_created
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION app_private.notify_reservation_created();

DROP TRIGGER IF EXISTS reservations_notify_status ON public.reservations;
CREATE TRIGGER reservations_notify_status
  AFTER UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION app_private.notify_reservation_status_changed();