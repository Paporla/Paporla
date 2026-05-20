-- ========================================================
-- PAPORLA - VISTAS
-- ========================================================
-- Ejecutar despues de: 01_tables.sql, 02_indexes.sql
-- ========================================================

CREATE OR REPLACE VIEW public.available_packs AS
SELECT 
  p.*,
  s.name AS shop_name,
  s.address AS shop_address,
  s.city AS shop_city,
  s.rating AS shop_rating,
  s.verified AS shop_verified,
  s.logo_url AS shop_logo_url,
  s.latitude AS shop_latitude,
  s.longitude AS shop_longitude,
  (EXISTS (
    SELECT 1 FROM public.reservations r 
    WHERE r.pack_id = p.id 
    AND r.user_id = auth.uid() 
    AND r.status IN ('pending', 'confirmed')
  )) AS user_already_reserved
FROM public.packs p
JOIN public.shops s ON s.id = p.shop_id
WHERE p.is_active = true 
  AND p.deleted_at IS NULL
  AND p.remaining_stock > 0
  AND p.ends_at > NOW()
  AND s.banned = false
  AND s.deleted_at IS NULL;
