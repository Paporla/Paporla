'use client';

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f1a] to-[#020205]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-10 w-48 bg-gray-800 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-800 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-800 rounded-xl" />
            ))}
          </div>
          <div className="h-8 w-48 bg-gray-800 rounded mb-4" />
          <div className="h-32 bg-gray-800 rounded-xl mb-4" />
        </div>
      </div>
    </div>
  );
}