import type { Metadata } from 'next'
import { headers } from 'next/headers'
import ShopDetailClient from './ShopDetailClient'
import { notFound } from 'next/navigation'
// A-09: cargador compartido con el layout (una sola consulta por visita).
import { loadPublicShop } from './loadPublicShop'
import { seo } from '@/lib/seo'
import { jsonLdToScriptContent } from '@/lib/utils/json-ld'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Estrecha la respuesta de get_public_shop (0014): a veces llega la fila
 * suelta y a veces un envoltorio `{ shop: ... }` (ver loadPublicShop).
 */
function filaDe(data: unknown): Record<string, unknown> | null {
  return data && typeof data === 'object' && 'shop' in (data as object)
    ? (data as { shop: Record<string, unknown> }).shop
    : (data as Record<string, unknown> | null)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await loadPublicShop(id)
  const row = filaDe(data)

  if (!row) {
    return { title: 'Comercio no encontrado', description: 'Este comercio no está disponible.' }
  }

  const name = String(row.name ?? 'Comercio')
  const description = String(row.description ?? '').slice(0, 160) || `Descubre los packs de ${name} en Paporla.`

  return seo(`/shops/${id}`, {
    title: `${name} | Paporla`,
    description,
  })
}

export default async function ShopDetailPage({ params }: Props) {
  const { id } = await params
  const data = await loadPublicShop(id)
  if (!data) notFound()

  // SEO-1: JSON-LD LocalBusiness para que Google entienda que es un negocio
  // físico (dirección, comuna, teléfono, geo). Mismo patrón que el Product de
  // /packs/[id]: nonce + jsonLdToScriptContent (escapa '</script>', f8.5 S3).
  const row = filaDe(data) ?? {}
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paporla.com'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: String(row.name ?? 'Comercio'),
    description: String(row.description ?? '') || `Packs sorpresa de ${String(row.name ?? 'este comercio')} en Paporla`,
    telephone: row.phone ? String(row.phone) : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: row.address ? String(row.address) : undefined,
      addressLocality: row.locality_name ? String(row.locality_name) : undefined,
      addressCountry: 'CL',
    },
    geo:
      row.latitude != null && row.longitude != null
        ? {
            '@type': 'GeoCoordinates',
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
          }
        : undefined,
    url: `${siteUrl}/shops/${id}`,
  }

  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? ''

  return (
    <>
      {/* jsonLdToScriptContent: escapa '</script>' que JSON.stringify deja en crudo (f8.5, S3) */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptContent(jsonLd) }}
      />
      <ShopDetailClient shopId={id} initialShop={data as Record<string, unknown>} />
    </>
  )
}
