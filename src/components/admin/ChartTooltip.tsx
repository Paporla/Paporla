'use client'

interface ChartTooltipPayload {
  color?: string
  name?: string
  value?: number
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ChartTooltipPayload[]
  label?: string
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="dark:bg-black/80 bg-white/90 backdrop-blur-xl dark:border-white/10 border-gray-200 rounded-xl p-3 shadow-2xl">
        <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}
