'use client'

/**
 * Selector de mercado del perfil de usuario.
 *
 * Por qué existe: `create_payment_reservation` (0009:285) solo deja reservar
 * packs del mercado guardado en el perfil (`user_profiles.market_id`). El
 * registro (trigger de 0010) deja ese campo en NULL y NINGÚN flujo lo
 * llenaba: cualquier usuario recibía MARKET_MISMATCH en su primera reserva.
 * Este es el control que faltaba (la intención ya estaba documentada en
 * 0015_seed_markets.sql: "development from Spain selects Chile manually").
 *
 * Solo se listan mercados en estado pilot/active: un mercado en waitlist
 * todavía no tiene packs que reservar, y ofrecerlo crearía falsas
 * expectativas. Cuando un mercado entre en piloto aparecerá aquí sin tocar
 * código.
 *
 * La lectura usa la tabla `markets` (RLS 0011: markets_public_read; GRANT
 * SELECT en 0012) y el guardado va por `update_own_profile` (0009:1164),
 * que valida el mercado antes de escribir.
 */
import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface MarketRow {
  id: string
  name: string
  country_code: string
  currency_code: string
}

interface MarketSelectProps {
  /** Mercado actual del perfil (null = aún no ha elegido). */
  value: string | null
  /** Notifica la elección; quien guarda es la página que lo incrusta. */
  onSelect: (marketId: string) => void
  disabled?: boolean
}

export default function MarketSelect({ value, onSelect, disabled = false }: MarketSelectProps) {
  const supabase = supabaseBrowser()

  const {
    data: markets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['markets', 'selectable'],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('markets')
        .select('id, name, country_code, currency_code')
        .in('status', ['pilot', 'active'])
        .order('name')
      if (fetchError) throw new Error('No se pudieron cargar los mercados disponibles. Inténtalo de nuevo.')
      return (data ?? []) as MarketRow[]
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <Card glass className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold dark:text-white text-gray-900">Tu mercado</h2>
          <p className="text-xs dark:text-gray-500 text-gray-500">El país donde buscas y recoges packs.</p>
        </div>
      </div>

      {!value && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs dark:text-amber-300 text-amber-700">
          Aún no has elegido tu mercado. Sin mercado no puedes reservar packs.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm dark:text-gray-400 text-gray-600">Cargando mercados disponibles…</p>
      ) : error ? (
        <div className="space-y-2">
          <p className="text-sm text-red-500">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div>
          <select
            aria-label="Tu mercado"
            value={value ?? ''}
            disabled={disabled || (markets ?? []).length === 0}
            onChange={(event) => {
              const next = event.target.value
              if (next && next !== value) onSelect(next)
            }}
            className="w-full rounded-xl border dark:border-gray-700 border-gray-300 dark:bg-gray-900 bg-white px-4 py-3 text-sm dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {!value && (
              <option value="" disabled>
                Elige tu mercado
              </option>
            )}
            {(markets ?? []).map((market) => (
              <option key={market.id} value={market.id}>
                {market.name} ({market.country_code}) — {market.currency_code}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs dark:text-gray-500 text-gray-500">
            El cambio se guarda al instante y aplica a tus próximas reservas.
          </p>
        </div>
      )}
    </Card>
  )
}
