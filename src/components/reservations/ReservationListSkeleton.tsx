import Skeleton from '@/components/ui/Skeleton'

export default function ReservationListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}
