import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function Card({ children, className = '', onClick, hover = true }: CardProps) {
  const baseClasses = 'bg-surface rounded-lg border border-border'
  const hoverClasses = hover ? 'hover:shadow-lg transition-shadow' : ''
  const clickableClasses = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`p-4 border-b border-border ${className}`}>{children}</div>
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`p-4 ${className}`}>{children}</div>
}
