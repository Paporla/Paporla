-- ========================================================
-- PAPORLA — PostGIS: búsqueda geoespacial por cercanía
-- Ejecutar en Supabase SQL Editor
-- Requisito: extensión PostGIS instalada en Supabase
-- ========================================================

-- 1. Activar PostGIS (si no está activado)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Añadir columna geográfica a shops (si no existe)
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS geog geography(Point, 4326);

-- 3. Actualizar geog cuando cambian lat/lng
CREATE OR REPLACE FUNCTION public.update_shop_geog()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shop_geog ON public.shops;
CREATE TRIGGER trigger_update_shop_geog
  BEFORE INSERT OR UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shop_geog();

-- 4. Actualizar geog en shops existentes
UPDATE public.shops
SET geog = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geog IS NULL;

-- 5. Índice espacial para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_shops_geog ON public.shops USING GIST (geog);

-- 6. Función RPC: buscar packs cercanos
DROP FUNCTION IF EXISTS public.search_packs_nearby(double precision, double precision, integer, integer);

CREATE OR REPLACE FUNCTION public.search_packs_nearby(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 10000,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  shop_id UUID,
  title TEXT,
  description TEXT,
  price_cents INTEGER,
  original_price_cents INTEGER,
  discount_percentage INTEGER,
  remaining_stock INTEGER,
  total_stock INTEGER,
  pickup_date DATE,
  pickup_start_time TIME,
  pickup_end_time TIME,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN,
  shop_name TEXT,
  shop_address TEXT,
  shop_city TEXT,
  shop_rating DOUBLE PRECISION,
  shop_verified BOOLEAN,
  shop_latitude DOUBLE PRECISION,
  shop_longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_origin geography;
BEGIN
  v_origin = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    p.id,
    p.shop_id,
    p.title,
    p.description,
    p.price_cents,
    p.original_price_cents,
    p.discount_percentage,
    p.remaining_stock,
    p.total_stock,
    p.pickup_date,
    p.pickup_start_time,
    p.pickup_end_time,
    p.image_url,
    p.created_at,
    p.is_active,
    s.name AS shop_name,
    s.address AS shop_address,
    s.city AS shop_city,
    s.rating AS shop_rating,
    s.verified AS shop_verified,
    s.latitude AS shop_latitude,
    s.longitude AS shop_longitude,
    ST_Distance(s.geog, v_origin) AS distance_meters
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id
  WHERE p.is_active = true
    AND p.deleted_at IS NULL
    AND p.remaining_stock > 0
    AND p.ends_at > NOW()
    AND s.deleted_at IS NULL
    AND s.banned = false
    AND s.geog IS NOT NULL
    AND ST_DWithin(s.geog, v_origin, p_radius_meters)
  ORDER BY s.geog <-> v_origin
  LIMIT p_limit;
END;
$$;
