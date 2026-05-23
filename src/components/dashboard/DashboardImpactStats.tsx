import Card from '@/components/ui/Card'
import { Package, DollarSign, Leaf } from 'lucide-react'

interface DashboardImpactStatsProps {
  totalPacks: number
  totalSaved: number
  co2Avoided: number
}

export default function DashboardImpactStats({ totalPacks, totalSaved, co2Avoided }: DashboardImpactStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <Card glass className="p-4 text-center">
        <Package className="w-6 h-6 text-primary mx-auto mb-2" />
        <div className="text-2xl font-bold dark:text-white text-gray-900">{totalPacks}</div>
        <div className="text-xs dark:text-gray-400 text-gray-600">Packs rescatados</div>
      </Card>
      <Card glass className="p-4 text-center">
        <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
        <div className="text-2xl font-bold dark:text-white text-gray-900">${totalSaved.toFixed(0)}</div>
        <div className="text-xs dark:text-gray-400 text-gray-600">Ahorrado</div>
      </Card>
      <Card glass className="p-4 text-center">
        <Leaf className="w-6 h-6 text-green-400 mx-auto mb-2" />
        <div className="text-2xl font-bold dark:text-white text-gray-900">{co2Avoided}kg</div>
        <div className="text-xs dark:text-gray-400 text-gray-600">CO2 evitado</div>
      </Card>
    </div>
  )
}
