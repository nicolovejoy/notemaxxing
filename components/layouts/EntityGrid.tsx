import { Skeleton } from '@/components/ui/Skeleton';

interface EntityGridProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  loading?: boolean;
  skeletonCount?: number;
  emptyState?: React.ReactNode;
  className?: string;
  columns?: {
    default?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function EntityGrid<T>({
  items,
  renderItem,
  loading = false,
  skeletonCount = 6,
  emptyState,
  className = '',
  columns = { default: 1, md: 2, lg: 3, xl: 4 }
}: EntityGridProps<T>) {
  const gridClasses = `grid gap-4 ${
    columns.default ? `grid-cols-${columns.default}` : 'grid-cols-1'
  } ${columns.md ? `md:grid-cols-${columns.md}` : ''} ${
    columns.lg ? `lg:grid-cols-${columns.lg}` : ''
  } ${columns.xl ? `xl:grid-cols-${columns.xl}` : ''} ${className}`;

  if (loading) {
    return (
      <div className={gridClasses}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 h-48">
            <Skeleton height={20} className="mb-2" />
            <Skeleton height={16} width="60%" className="mb-4" />
            <Skeleton height={40} />
            <Skeleton height={12} width="40%" className="mt-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={gridClasses}>
      {items.map(renderItem)}
    </div>
  );
}