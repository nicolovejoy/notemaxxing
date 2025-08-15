import React from 'react'
import { LucideIcon } from 'lucide-react'

interface EntityCardProps {
  title: string
  subtitle?: string
  color?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  onClick?: () => void
  onTitleClick?: () => void
  children?: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  isHeader?: boolean
}

export function EntityCard({
  title,
  subtitle,
  color,
  icon: Icon,
  actions,
  onClick,
  onTitleClick,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  isHeader = false,
}: EntityCardProps) {
  const baseClasses = isHeader
    ? `${color || 'bg-gray-200'} text-white rounded-t-lg p-4 h-32 relative overflow-hidden group`
    : 'bg-white rounded-lg shadow-sm border border-gray-200'

  const content = (
    <>
      {isHeader ? (
        <div className={`${baseClasses} ${headerClassName}`}>
          <h3
            className={`text-2xl font-bold ${onTitleClick ? 'cursor-pointer hover:underline' : ''}`}
            onClick={onTitleClick}
          >
            {title}
          </h3>
          {subtitle && <p className="text-sm opacity-90 mt-1">{subtitle}</p>}
          {actions && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {actions}
            </div>
          )}
          {Icon && (
            <div className="absolute bottom-4 right-4">
              <Icon className="h-16 w-16 text-white/30" />
            </div>
          )}
        </div>
      ) : (
        <div className={`${baseClasses} ${className}`}>
          <div className={`p-4 ${contentClassName}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {Icon && <Icon className="h-5 w-5 text-gray-600 mr-2" />}
                <div>
                  <h4 className="font-semibold text-gray-900">{title}</h4>
                  {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
                </div>
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            {children && <div className="mt-4">{children}</div>}
          </div>
        </div>
      )}
    </>
  )

  if (onClick && !isHeader) {
    return (
      <div onClick={onClick} className="cursor-pointer">
        {content}
      </div>
    )
  }

  return content
}
