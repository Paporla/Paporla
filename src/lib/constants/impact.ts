/**
 * Estimación de impacto ambiental por pack rescatado.
 *
 * ⚠️ ATENCIÓN: es una ESTIMACIÓN, no una medición. Ningún pack se pesa ni se
 * mide hoy en Paporla. Si algún día se pesan de verdad, este archivo es el
 * único sitio que hay que cambiar.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO: antes había DOS cifras distintas viviendo a la
 * vez en la misma aplicación — 1,2 kg/pack en el panel del usuario y 2,5
 * kg/pack en la portada (auditoría externa A-23). Cuando una app se contradice,
 * al menos una de las dos cifras está mintiendo. Ahora hay una sola.
 *
 * DE DÓNDE SALE EL 2,5: es el orden de magnitud que usa públicamente el sector
 * del rescate alimentario para una bolsa de comida rescatada (~1 kg de alimento
 * ≈ 2,5 kg de CO₂e evitados, contando producción, transporte y descomposición
 * en vertedero). Se conserva el 2,5 porque es la cifra que ya era pública en
 * la portada: reducir una afirmación pública es fácil, inflarla no.
 *
 * REVISAR: si consigues una fuente chilena concreta (SEREMI de Medio Ambiente,
 * o el peso real medio de tus packs), cámbiala AQUÍ y en ningún otro sitio.
 */
export const CO2E_KG_PER_PACK = 2.5

/**
 * Calcula los kilos de CO₂e evitados para una cantidad de packs.
 * Única forma de obtener la cifra: así ninguna pantalla puede inventar la suya.
 */
export function co2eKgForPacks(packs: number): number {
  if (!Number.isFinite(packs) || packs <= 0) return 0
  return Math.round(packs * CO2E_KG_PER_PACK)
}
