import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
      <Link
        href="/"
        className="flex items-center flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        title="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1

        // Priority for truncation: earlier items get truncated first
        // Last item (current page) never gets truncated as much
        const minWidth = isLast ? '0' : '0'
        const maxWidth = isLast ? 'none' : '200px'
        const flexShrink = isLast ? '0' : '1'

        return (
          <div key={index} className="flex items-center min-w-0">
            <ChevronRight className="h-3 w-3 text-gray-300 mx-1.5 flex-shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-700 transition-colors truncate"
                style={{
                  minWidth,
                  maxWidth,
                  flexShrink,
                }}
                title={item.label}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`${isLast ? 'text-gray-700 font-medium' : 'text-gray-500'} truncate`}
                style={{
                  minWidth,
                  maxWidth: isLast ? 'none' : maxWidth,
                  flexShrink,
                }}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
