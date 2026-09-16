import { createClient } from '@/lib/supabase/server'
import { requestCache } from '@/lib/utils/requestCache'

export type PublicPackRow = Record<string, unknown>

/**
 * Carga el pack para la página de detalle.
 *
 * Usa get_pack_public (migración 0029) en vez de search_available_packs:
 * la búsqueda del catálogo solo expone packs RESERVABLES (stock > 0 y
 * ventana futura), así que un pack agotado — o con la ventana ya pasada —
 * no aparecía y la página daba 404. get_pack_public devuelve el pack por su
 * id aunque esté agotado: la página entonces muestra el estado real (botón
 * "Agotado" / "Recogida finalizada") en vez de un 404.
 *
 * Sigue dando 404 cuando de verdad no existe: id inválido, mercado
 * waitlist/cerrado, pack no activo o comercio no verificado/eliminado.
 *
 * A-09: antes esta consulta se hacía TRES veces por visita —una en el
 * generateMetadata del layout, otra en el de la página y otra al renderizar
 * el cuerpo— porque cada sitio llamaba por su cuenta. Esta es la ruta más
 * caliente de la app (la que el sitemap entrega a los buscadores), así que
 * triplicar el trabajo de la base ahí era el peor sitio posible. Ahora los
 * tres comparten una única consulta por petición.
 *
 * Devuelve también el cliente de Supabase porque los tres sitios lo usan
 * para construir la URL pública de la imagen (getPublicUrl no es red: es
 * armar una URL, así que compartirlo no cuesta nada).
 */
export const loadPublicPack = requestCache(
  async (id: string): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; row: PublicPackRow | null }> => {
    const supabase = await createClient()
    // p_pack_id es el nombre EXACTO del parámetro en la base (0029): PostgREST
    // localiza la función por nombre de parámetro (los tests lo fijan).
    const { data, error } = await supabase.rpc('get_pack_public', { p_pack_id: id })

    if (error) return { supabase, row: null }

    // La página asumía array; el layout aceptaba también un objeto suelto
    // (Array.isArray). Se normaliza a array para servir a los dos.
    const rows = (Array.isArray(data) ? data : data ? [data] : []) as PublicPackRow[]

    // La página era estricta (buscaba por pack_id); el layout cogía la
    // primera fila sin mirar el id. Se respetan las dos: si la fila trae
    // pack_id se casa con el pedido y, si no lo trae, se usa la única fila
    // que devuelve una consulta por id. Con datos vacíos sigue siendo null
    // (y por tanto 404 en la página), que es lo que ya se probaba.
    const row = rows.find((item) => item.pack_id === id) ?? rows[0] ?? null

    return { supabase, row }
  },
)
