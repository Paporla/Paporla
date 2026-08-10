'use client'

interface Filters {
  minPrice: number
  maxPrice: number
  showAvailableOnly: boolean
  city: string
  location: { lat: number; lng: number } | null
  radiusKm: number
}

interface Props {
  filters: Filters
  onRemove: (key: string) => void
}

export default function ActiveFilterChips({ filters, onRemove }: Props) {
  const chips: Array<{ show: boolean; label: string; key: string }> = [
    { show: filters.minPrice > 0, label: `Desde $${(filters.minPrice / 100).toFixed(2)}`, key: 'minPrice' },
    { show: filters.maxPrice < 100000, label: `Hasta $${(filters.maxPrice / 100).toFixed(2)}`, key: 'maxPrice' },
    { show: !!filters.city, label: filters.city, key: 'city' },
    { show: !!filters.location, label: `Cerca de mi (${filters.radiusKm} km)`, key: 'location' },
    { show: filters.showAvailableOnly, label: 'Solo disponibles', key: 'showAvailableOnly' },
  ]

  const visible = chips.filter((c) => c.show)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((chip) => (
        <span
          key={chip.key}
          className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1"
        >
          {chip.label}
          <button onClick={() => onRemove(chip.key)} className="hover:text-red-500">
            &times;
          </button>
        </span>
      ))}
    </div>
  )
}
