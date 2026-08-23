-- 0026_can_write_shop_image_pack_default.sql
--
-- Corrige 0025 y restaura el diseno de 0020.
--
-- Contexto:
--   0013 creo las politicas de shop-images con un EXISTS en linea contra
--   public.shops. 0020 las reescribio para delegar la comprobacion en
--   app_private.can_write_shop_image(text), una funcion SECURITY DEFINER.
--   Ese cambio NO era cosmetico: 0012_permissions.sql nunca concede SELECT
--   sobre public.shops al rol authenticated (las tablas de negocio solo se
--   tocan por RPC). Una politica que lee shops directamente se evalua con los
--   permisos de quien sube el fichero, asi que falla con
--   "permission denied for table shops" antes siquiera de comprobar la regla.
--   La funcion SECURITY DEFINER se ejecuta con los permisos de su propietario
--   y es la que puede mirar la tabla.
--
--   0025 anadio la carpeta 'pack-default' pero reescribio las politicas con el
--   EXISTS en linea de 0013, deshaciendo sin querer el arreglo de 0020. De ahi
--   el "permission denied for table shops" al subir la foto por defecto.
--
-- Esta migracion:
--   1. Actualiza la funcion para admitir tambien la carpeta 'pack-default'.
--   2. Devuelve las tres politicas a la forma de 0020 (delegando en la funcion).
--
-- Es idempotente y se puede reaplicar sin efectos colaterales.

BEGIN;

-- 1. La funcion recupera su papel de unico sitio donde vive la regla, ahora
--    con la carpeta de la foto por defecto de packs incluida.
CREATE OR REPLACE FUNCTION app_private.can_write_shop_image(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'app_private', 'public'
AS $fn$
DECLARE
  v_parts text[];
  v_shop uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_parts := storage.foldername(p_object_name);
  IF cardinality(v_parts) < 2 THEN
    RETURN false;
  END IF;

  -- 'pack-default' es la foto de respaldo que el comercio configura una vez en
  -- su perfil y que heredan los packs que no suben imagen propia.
  IF v_parts[2] NOT IN ('logo', 'cover', 'pack-default') THEN
    RETURN false;
  END IF;

  BEGIN
    v_shop := v_parts[1]::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.shops s
    WHERE s.id = v_shop
      AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
      AND s.status NOT IN ('suspended', 'closed')
      AND s.deleted_at IS NULL
  );
END;
$fn$;

-- CREATE OR REPLACE conserva los permisos, pero se reafirman por si esta
-- migracion se aplica sobre una base donde la funcion no existiera.
REVOKE ALL ON FUNCTION app_private.can_write_shop_image(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.can_write_shop_image(text) TO authenticated;

-- 2. Politicas de vuelta a la version de 0020: sin EXISTS en linea, delegando
--    en la funcion. Asi el rol authenticated no necesita leer public.shops.
DROP POLICY IF EXISTS storage_shop_image_insert_owner ON storage.objects;
DROP POLICY IF EXISTS storage_shop_image_update_owner ON storage.objects;
DROP POLICY IF EXISTS storage_shop_image_delete_owner ON storage.objects;

CREATE POLICY storage_shop_image_insert_owner
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shop-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND app_private.can_write_shop_image(name)
  );

CREATE POLICY storage_shop_image_update_owner
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'shop-images'
    AND app_private.can_write_shop_image(name)
  )
  WITH CHECK (
    bucket_id = 'shop-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND app_private.can_write_shop_image(name)
  );

CREATE POLICY storage_shop_image_delete_owner
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'shop-images'
    AND app_private.can_write_shop_image(name)
  );

COMMIT;
