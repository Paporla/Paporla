-- ============================================================================
-- PAPORLA — 0013_storage.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Creates public image buckets with owner/shop-scoped write policies.
-- ============================================================================

BEGIN;

-- Server-side bucket restrictions cannot be bypassed by calling Storage directly.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('shop-images', 'shop-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('pack-images', 'pack-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Read access for published/public image URLs and Storage API downloads.
CREATE POLICY storage_public_images_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('avatars', 'shop-images', 'pack-images'));

-- ---------------------------------------------------------------------------
-- Avatars: avatars/<auth.uid()>/<uuid>.<ext>
-- ---------------------------------------------------------------------------
CREATE POLICY storage_avatar_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND cardinality(storage.foldername(name)) >= 1
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_avatar_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_avatar_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Shop images: shop-images/<shopId>/logo|cover/<uuid>.<ext>
-- ---------------------------------------------------------------------------
CREATE POLICY storage_shop_image_insert_owner ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND (storage.foldername(name))[2] IN ('logo', 'cover')
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
    AND (storage.foldername(name))[2] IN ('logo', 'cover')
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
        AND s.status NOT IN ('suspended', 'closed')
        AND s.deleted_at IS NULL
    )
  );

CREATE POLICY storage_shop_image_delete_owner ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-images'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Pack images: pack-images/<shopId>/<packId>/<uuid>.<ext>
-- ---------------------------------------------------------------------------
CREATE POLICY storage_pack_image_insert_owner ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pack-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND EXISTS (
      SELECT 1
      FROM public.packs p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.id::text = (storage.foldername(name))[1]
        AND p.id::text = (storage.foldername(name))[2]
        AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
        AND p.status <> 'archived'
        AND s.status NOT IN ('suspended', 'closed')
    )
  );

CREATE POLICY storage_pack_image_update_owner ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pack-images'
    AND EXISTS (
      SELECT 1
      FROM public.packs p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.id::text = (storage.foldername(name))[1]
        AND p.id::text = (storage.foldername(name))[2]
        AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
    )
  )
  WITH CHECK (
    bucket_id = 'pack-images'
    AND cardinality(storage.foldername(name)) >= 2
    AND EXISTS (
      SELECT 1
      FROM public.packs p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.id::text = (storage.foldername(name))[1]
        AND p.id::text = (storage.foldername(name))[2]
        AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
        AND p.status <> 'archived'
        AND s.status NOT IN ('suspended', 'closed')
    )
  );

CREATE POLICY storage_pack_image_delete_owner ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pack-images'
    AND EXISTS (
      SELECT 1
      FROM public.packs p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.id::text = (storage.foldername(name))[1]
        AND p.id::text = (storage.foldername(name))[2]
        AND (s.owner_id = auth.uid() OR app_private.is_current_admin())
    )
  );

COMMIT;
