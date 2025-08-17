import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/logo'
import { BuildTimestamp } from '@/components/build-timestamp'
import { UserMenu } from '@/components/user-menu'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

interface PageHeaderProps {
  backUrl?: string
  rightContent?: React.ReactNode
  className?: string
  breadcrumbs?: BreadcrumbItem[]
}

export function PageHeader({
  backUrl = '/',
  rightContent,
  className = '',
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <header className={`bg-white border-b border-gray-200 sticky top-0 z-10 ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {!breadcrumbs && (
              <Link href={backUrl} className="p-2 rounded-md hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-800" />
              </Link>
            )}
            <Link
              href="/"
              className="flex items-center gap-3 ml-4 hover:opacity-80 transition-opacity"
            >
              <Logo size={36} />
              <div className="relative group">
                <h1 className="text-xl font-semibold italic">Notemaxxing</h1>
                <BuildTimestamp />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {rightContent}
            <UserMenu />
          </div>
        </div>
        {breadcrumbs && (
          <div className="border-t border-gray-100 py-2">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}
      </div>
    </header>
  )
}
