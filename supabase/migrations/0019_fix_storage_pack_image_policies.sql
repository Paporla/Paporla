CREATE OR REPLACE FUNCTION app_private.can_write_pack_image(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'app_private', 'public'
AS $fn$
DECLARE
  v_parts text[];
  v_shop uuid;
  v_pack uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_parts := storage.foldername(p_object_name);
  IF cardinality(v_parts) < 2 THEN
    RETURN false;
  END IF;

  BEGIN
    v_shop := v_parts[1]::uuid;
    v_pack := v_parts[2]::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.packs p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE s.id = v_shop
      AND p.id = v_pack
      AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
      AND p.status <> 'archived'
      AND s.status NOT IN ('suspended', 'closed')
      AND s.deleted_at IS NULL
  );
END;
$fn$;

REVOKE ALL ON FUNCTION app_private.can_write_pack_image(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.can_write_pack_image(text) TO authenticated;

DROP POLICY IF EXISTS storage_pack_image_insert_owner ON storage.objects;
DROP POLICY IF EXISTS storage_pack_image_update_owner ON storage.objects;
DROP POLICY IF EXISTS storage_pack_image_delete_owner ON storage.objects;

CREATE POLICY storage_pack_image_insert_owner
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pack-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND app_private.can_write_pack_image(name)
  );

CREATE POLICY storage_pack_image_update_owner
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pack-images'
    AND app_private.can_write_pack_image(name)
  )
  WITH CHECK (
    bucket_id = 'pack-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND app_private.can_write_pack_image(name)
  );

CREATE POLICY storage_pack_image_delete_owner
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pack-images'
    AND app_private.can_write_pack_image(name)
  );