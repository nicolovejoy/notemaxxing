'use client'

import Link from 'next/link'
import { FolderOpen, Keyboard, Brain, ArrowRight, LogIn } from 'lucide-react'
import { UserMenu } from '@/components/user-menu'
import { BuildTimestamp } from '@/components/build-timestamp'
import { Logo } from '@/components/logo'
import { Card, CardBody } from '@/components/ui'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { useFoldersView } from '@/lib/query/hooks'
import { useAuth } from '@/lib/hooks/useAuth'
import { StatsBar } from '@/components/common/StatsBar'

export default function Home() {
  const { user } = useAuth()

  // Only fetch folders if user is authenticated
  const { data: foldersView } = useFoldersView({
    enabled: !!user,
  })

  const folders = foldersView?.folders || []

  const features = [
    {
      icon: FolderOpen,
      title: 'Your Backpack',
      description: 'Organize your notes with custom folders and colors',
      href: '/backpack',
      color: 'text-brand-navy',
    },
    {
      icon: Keyboard,
      title: 'Typemaxxing',
      description: 'Practice typing with your own notes',
      href: '/typemaxxing',
      color: 'text-orange-500',
    },
    {
      icon: Brain,
      title: 'Quizzmaxxing',
      description: 'Create custom quizzes to test your knowledge',
      href: '/quizzing',
      color: 'text-pink-500',
    },
  ]

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <div className="relative group">
                <h1 className="text-xl font-bold text-brand-navy tracking-tight">
                  notemaxxing.net
                </h1>
                <BuildTimestamp />
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-navy/5 to-brand-cream py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-brand-charcoal mb-4">
            Your Second Brain, Perfected
          </h2>
          <p className="text-xl text-text-tertiary mb-8 max-w-2xl mx-auto">
            Organize your thoughts, enhance your writing, and master your knowledge with AI-powered
            note-taking
          </p>
          {!user && (
            <div className="flex justify-center">
              <Link href="/auth/login">
                <LoadingButton size="lg" icon={LogIn} variant="primary">
                  Sign In / Get Started
                </LoadingButton>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section - Only show for authenticated users */}
      {user && foldersView && (
        <StatsBar
          folders={foldersView.stats?.total_folders || 0}
          notebooks={foldersView.stats?.total_notebooks || 0}
          notes={foldersView.stats?.total_notes || 0}
        />
      )}

      {/* Features Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-brand-charcoal mb-8 text-center">
            Everything You Need to Stay Organized
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              const isBackpack = feature.href === '/backpack'
              return (
                <Link key={feature.title} href={feature.href}>
                  <Card hover className="h-full">
                    <CardBody>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 bg-brand-cream rounded-lg ${feature.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{feature.title}</h4>
                          <p className="text-text-tertiary text-sm">{feature.description}</p>
                          {isBackpack && user && folders.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {folders.slice(0, 3).map((folder) => (
                                <Link
                                  key={folder.id}
                                  href={`/folders/${folder.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2 text-sm text-text-secondary hover:text-brand-navy transition-colors"
                                >
                                  <div className={`w-2 h-2 rounded-full ${folder.color}`} />
                                  {folder.name}
                                </Link>
                              ))}
                              {folders.length > 3 && (
                                <p className="text-xs text-text-muted pl-4">
                                  +{folders.length - 3} more
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-5 w-5 text-text-muted" />
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-tertiary">
          <p>Built with Next.js, TypeScript, and Tailwind CSS</p>
          <p className="mt-2">© 2024 Notemaxxing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
