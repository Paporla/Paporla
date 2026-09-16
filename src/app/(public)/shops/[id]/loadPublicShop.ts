import { createClient } from '@/lib/supabase/server'
import { requestCache } from '@/lib/utils/requestCache'

/**
 * Carga el comercio para su ficha pública.
 *
 * Usa la RPC canónica get_public_shop (0014, GRANT anon) en vez del
 * .from('shops') legacy, que el esquema 0012 niega (42501) y que además
 * leía columnas inexistentes (city, logo_url).
 *
 * A-09: igual que en la ficha de pack, esta consulta se hacía TRES veces por
 * visita (metadata del layout, metadata de la página y cuerpo). Ahora es una.
 *
 * La forma de la respuesta la decide la base: a veces llega la fila suelta y
 * a veces un envoltorio con la fila dentro (`{ shop: ... }`) — por eso el tipo
 * es genérico y cada consumidor la estrecha como necesita (el layout mira si
 * tiene la clave `shop`; la página se la pasa entera al cliente).
 */
export const loadPublicShop = requestCache(async (id: string): Promise<Record<string, unknown> | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_shop', { p_shop_id: id })

  if (error || !data) return null

  return data as Record<string, unknown>
})
