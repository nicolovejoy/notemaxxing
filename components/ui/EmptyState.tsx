import React from 'react'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && <Icon className="h-12 w-12 text-text-muted mx-auto mb-4" />}
      <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-text-tertiary mb-4">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
