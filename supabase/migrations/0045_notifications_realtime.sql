-- 0045 · Plasmar en el repo la publicación realtime de notifications
--
-- CRÓNICA (2026-09-10): el fundador probó el canal en vivo de la campana
-- (insertar una notificación con el dropdown abierto) y funcionó — resultado
-- A. Pero ninguna migración había añadido la tabla a la publicación
-- `supabase_realtime`: la activación se hizo a mano desde el panel de
-- Supabase en algún momento del pasado. Eso es divergencia diseño/práctica,
-- la misma lección que favorites (0044): lo que solo vive en la base muere
-- en silencio al reconstruirla desde las migraciones (pgTAP efímera, un
-- proyecto nuevo para otro mercado, un restore).
--
-- Esta migración no cambia nada en staging (la tabla ya es miembro); su
-- trabajo es que el repo y la base digan lo mismo, y que cualquier base
-- reconstruida tenga notificaciones en vivo desde el minuto cero.
--
-- Idempotente a prueba de todo: si la publicación no existe (postgres
-- pelado), no hace nada; si la tabla ya es miembro, tampoco.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;