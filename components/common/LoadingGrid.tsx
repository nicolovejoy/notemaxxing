import { Skeleton } from '@/components/ui/Skeleton'

interface LoadingGridProps {
  count?: number
  className?: string
}

export function LoadingGrid({ count = 6, className = '' }: LoadingGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}
