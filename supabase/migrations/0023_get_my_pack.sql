-- 0023_get_my_pack.sql
--
-- Desbloquea la edición de packs.
--
-- PROBLEMA
-- La página /business/packs/[id] leía el comercio y el pack con .from('shops')
-- y .from('packs'). Los Runtime Logs de Vercel devolvían:
--
--   { code: '42501', message: 'permission denied for table shops' }
--
-- No es RLS ni un fallo de columnas: es el modelo de permisos del proyecto.
-- La 0012 hace REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated
-- y solo concede SELECT a 11 tablas. shops y packs NO están entre ellas, a
-- propósito: en este proyecto el cliente no lee tablas, lee funciones
-- SECURITY DEFINER. Por eso list_my_packs (RPC) funciona y .from('shops') no.
--
-- POR QUÉ NO SE USA EL hint DE POSTGRES
-- PostgREST sugiere "GRANT SELECT ON public.shops TO authenticated". Se descarta:
-- abriría la tabla entera a cualquier usuario autenticado para desbloquear una
-- sola página, y dejaría el modelo de seguridad del proyecto a medias.
--
-- POR QUÉ NO BASTA list_my_packs
-- Devuelve 12 columnas (pack_id, title, status, price_minor, currency_code,
-- total_stock, remaining_stock, pickup_start_at, pickup_end_at, image_path,
-- created_at, updated_at), pensadas para pintar el listado. El formulario de
-- edición hace packToFormData(pack) sobre la fila COMPLETA, así que con esas 12
-- se abriría con description, category, tags, allergen_notice, handling_notice,
-- original_price_minor y sales_start_at vacíos, y al guardar los borraría.
--
-- SOLUCIÓN
-- Una función de lectura de una sola fila, con el mismo patrón que get_my_shop()
-- (0014): SECURITY DEFINER, search_path fijado, comprobación de propiedad dentro
-- del cuerpo y GRANT EXECUTE solo a authenticated.
--
-- SEGURIDAD
--   - Solo devuelve el pack si s.owner_id = auth.uid(): un comercio no puede
--     leer packs de otro aunque adivine el uuid.
--   - Exige que el perfil esté activo y no borrado, igual que get_my_shop().
--   - Exige que el comercio no esté borrado (s.deleted_at IS NULL).
--   - Devuelve NULL si no hay coincidencia. La página trata NULL como notFound().
--   - No filtra por p.archived_at: el dueño debe poder abrir un pack archivado
--     para consultarlo o duplicarlo. Quién puede EDITAR qué estado lo decide la
--     UI y, en la escritura, las RPC de mutación, que son las dueñas del cambio.
--   - No filtra por s.status: un comercio en pending_review o suspended sigue
--     pudiendo ver sus propios packs. Publicar sí exige verified, pero eso lo
--     valida publish_pack, no esta lectura.
--
-- Esta migración solo AÑADE una función. No altera tablas, ni políticas, ni
-- permisos existentes. Es reversible con el DROP del final del archivo.

CREATE OR REPLACE FUNCTION public.get_my_pack(p_pack_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT to_jsonb(p)
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id
  JOIN public.user_profiles up ON up.id = auth.uid()
    AND up.account_status = 'active'
    AND up.deleted_at IS NULL
  WHERE p.id = p_pack_id
    AND s.owner_id = auth.uid()
    AND s.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_my_pack(uuid) IS
  'Devuelve la fila completa de un pack propio como jsonb, o NULL si no existe '
  'o no pertenece al usuario. Necesaria para el formulario de edición, que '
  'requiere todas las columnas; list_my_packs solo devuelve las 12 del listado.';

-- Permisos: el patrón de 0012. Nadie por defecto, EXECUTE solo a authenticated.
REVOKE EXECUTE ON FUNCTION public.get_my_pack(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_pack(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_pack(uuid) TO authenticated;

-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_my_pack(uuid);
