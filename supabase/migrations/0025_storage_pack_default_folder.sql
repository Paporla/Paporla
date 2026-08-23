-- 0025_storage_pack_default_folder.sql
--
-- Problema que corrige
--   0024 anadio shops.default_pack_image_path y la UI la sube a la carpeta
--   shop-images/<shopId>/pack-default/. Pero las politicas de Storage de 0013
--   solo aceptan las carpetas 'logo' y 'cover':
--
--     AND (storage.foldername(name))[2] IN ('logo', 'cover')
--
--   Resultado: la subida se rechaza y el comercio no puede guardar la foto.
--
-- Que hace
--   Vuelve a crear las dos politicas afectadas (INSERT y UPDATE) anadiendo
--   'pack-default' a la lista de carpetas permitidas. El resto de condiciones
--   se mantiene intacto: sigue exigiendo ser dueno del comercio (o admin) y que
--   el comercio no este suspendido, cerrado ni borrado.
--
--   La politica de DELETE no filtra por carpeta, asi que no necesita cambios.
--   La de SELECT es publica para el bucket entero, tampoco cambia.
--
-- Nota
--   Postgres no permite ALTER POLICY sobre el WITH CHECK, hay que soltar y
--   recrear. Se hace dentro de una transaccion para que no quede ninguna
--   ventana sin politica activa.
--
-- Idempotente: se puede ejecutar mas de una vez sin romper nada.

BEGIN;

-- ---------------------------------------------------------------------------
-- INSERT: subir una foto nueva
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS storage_shop_image_insert_owner ON storage.objects;

CREATE POLICY storage_shop_image_insert_owner ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND (storage.foldername(name))[2] IN ('logo', 'cover', 'pack-default')
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (
          s.owner_id = auth.uid()
          OR app_private.is_current_admin()
        )
        AND s.status NOT IN ('suspended', 'closed')
        AND s.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- UPDATE: reemplazar una foto ya existente (upsert)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS storage_shop_image_update_owner ON storage.objects;

CREATE POLICY storage_shop_image_update_owner ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'shop-images'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
    )
  )
  WITH CHECK (
    bucket_id = 'shop-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND (storage.foldername(name))[2] IN ('logo', 'cover', 'pack-default')
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
        AND s.status NOT IN ('suspended', 'closed')
        AND s.deleted_at IS NULL
    )
  );

COMMIT;
