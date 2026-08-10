interface SkeletonProps {
  className?: string
  variant?: 'rect' | 'circle' | 'text'
}

const variants = {
  rect: 'rounded-xl',
  circle: 'rounded-full',
  text: 'rounded-lg',
}

export default function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${variants[variant]} ${className}`} />
}
