/**
 * Utilidad de eventos GA4 para Paporla.
 * Todos los eventos usan gtag() que es inyectado por @next/third-parties/google.
 *
 * Eventos del funnel de conversión:
 *   view_pack_list → view_pack_detail → click_reserve → begin_checkout → purchase → pickup_completed
 */

type GtagValue = string | number | boolean | null | undefined | Record<string, GtagValue>[]

type GtagEvent = {
  event: string
  [key: string]: GtagValue
}

declare global {
  interface Window {
    gtag?: (command: string, event: string, params: GtagEvent) => void
  }
}

function sendEvent(event: GtagEvent): void {
  if (typeof window === 'undefined') return
  if (!window.gtag) {
    // En desarrollo, loguear para debug
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('[Analytics]', event.event, event)
    }
    return
  }
  window.gtag('event', event.event, event)
}

// ─── Helpers de dinero ───────────────────────────────────────

/**
 * Dígitos decimales por moneda para pasar de unidades menores (como se guardan
 * en la base) a la unidad mayor (la que entiende GA4). CLP no usa decimales;
 * el resto de monedas LATAM habituales usan dos.
 */
const CURRENCY_FRACTION_DIGITS: Record<string, number> = { CLP: 0 }

function minorToMajor(amountMinor: number, currencyCode: string): number {
  const digits = CURRENCY_FRACTION_DIGITS[currencyCode] ?? 2
  return amountMinor / 10 ** digits
}

// ─── Funnel de conversión ────────────────────────────────────

/** Usuario entra a la página de listado de packs */
export function trackViewPackList(packCount: number): void {
  sendEvent({
    event: 'view_pack_list',
    pack_count: packCount,
  })
}

/** Usuario entra a la página de detalle de un pack */
export function trackViewPackDetail(packId: string, packTitle: string, shopName: string): void {
  sendEvent({
    event: 'view_pack_detail',
    pack_id: packId,
    pack_title: packTitle,
    shop_name: shopName,
  })
}

/** Usuario hace clic en "Reservar" (abre el modal de pre-confirmación). */
export function trackClickReserve(packId: string, packTitle: string, amountMinor: number, currencyCode: string): void {
  sendEvent({
    event: 'click_reserve',
    pack_id: packId,
    pack_title: packTitle,
    currency: currencyCode,
    value: minorToMajor(amountMinor, currencyCode),
  })
}

/** Usuario abre el modal de pre-confirmación (begin_checkout en GA4). */
export function trackBeginCheckout(
  packId: string,
  packTitle: string,
  amountMinor: number,
  currencyCode: string,
  shopName: string,
): void {
  const value = minorToMajor(amountMinor, currencyCode)
  sendEvent({
    event: 'begin_checkout',
    currency: currencyCode,
    value,
    items: [
      {
        item_id: packId,
        item_name: packTitle,
        price: value,
        item_brand: shopName,
        quantity: 1,
      },
    ],
  })
}

/** Reserva confirmada exitosamente (purchase en GA4). */
export function trackPurchase(
  reservationId: string,
  packId: string,
  packTitle: string,
  amountMinor: number,
  currencyCode: string,
  shopName: string,
): void {
  const value = minorToMajor(amountMinor, currencyCode)
  sendEvent({
    event: 'purchase',
    transaction_id: reservationId,
    currency: currencyCode,
    value,
    items: [
      {
        item_id: packId,
        item_name: packTitle,
        price: value,
        item_brand: shopName,
        quantity: 1,
      },
    ],
  })
}

/** Pack recogido (pickup_completed) — se llama desde el negocio cuando validan código */
export function trackPickupCompleted(reservationId: string, packTitle: string, shopName: string): void {
  sendEvent({
    event: 'pickup_completed',
    reservation_id: reservationId,
    pack_title: packTitle,
    shop_name: shopName,
  })
}

/** Usuario aplica un filtro de búsqueda */
export function trackSearch(searchTerm: string): void {
  sendEvent({
    event: 'search',
    search_term: searchTerm,
  })
}

/** Usuario activa geolocalización */
export function trackUseLocation(city: string | null): void {
  sendEvent({
    event: 'use_location',
    city: city ?? 'unknown',
  })
}
