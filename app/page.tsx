'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  FolderOpen,
  Sparkles,
  BookOpen,
  Keyboard,
  Brain,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { UserMenu } from '@/components/user-menu'
import { BuildTimestamp } from '@/components/build-timestamp'
import { Logo } from '@/components/logo'
import { Card, CardBody } from '@/components/ui'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { useFoldersView, useViewActions } from '@/lib/store/view-store'

export default function Home() {
  const foldersView = useFoldersView()
  const { loadFoldersView } = useViewActions()

  // Load folders view on mount for stats
  useEffect(() => {
    loadFoldersView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const features = [
    {
      icon: FolderOpen,
      title: 'Dynamic Folders',
      description: 'Organize your notes with custom folders and colors',
      href: '/folders',
      color: 'text-blue-500',
    },
    {
      icon: BookOpen,
      title: 'Smart Notebooks',
      description: 'Create notebooks within folders for better organization',
      href: '/folders',
      color: 'text-green-500',
    },
    {
      icon: Sparkles,
      title: 'AI Enhancement',
      description: 'Improve your writing with Claude AI assistance',
      href: '/folders',
      color: 'text-purple-500',
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
      title: 'Quizzing',
      description: 'Create custom quizzes to test your knowledge',
      href: '/quizzing',
      color: 'text-pink-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <div className="relative group">
                <h1 className="text-xl font-semibold italic">Notemaxxing</h1>
                <BuildTimestamp />
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Second Brain, Perfected</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Organize your thoughts, enhance your writing, and master your knowledge with AI-powered
            note-taking
          </p>
          <Link href="/folders">
            <LoadingButton size="lg" icon={Plus} variant="primary">
              Get Started
            </LoadingButton>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      {foldersView && (
        <section className="py-8 bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {foldersView.stats.total_folders}
                </p>
                <p className="text-sm text-gray-600">Folders</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {foldersView.stats.total_notebooks}
                </p>
                <p className="text-sm text-gray-600">Notebooks</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{foldersView.stats.total_notes}</p>
                <p className="text-sm text-gray-600">Notes</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {foldersView.stats.total_archived}
                </p>
                <p className="text-sm text-gray-600">Archived</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Everything You Need to Stay Organized
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Link key={feature.title} href={feature.href}>
                  <Card hover className="h-full">
                    <CardBody>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 bg-gray-50 rounded-lg ${feature.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{feature.title}</h4>
                          <p className="text-gray-600 text-sm">{feature.description}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Quick Actions</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/folders">
              <LoadingButton variant="primary" icon={FolderOpen}>
                Browse Folders
              </LoadingButton>
            </Link>
            <Link href="/typemaxxing">
              <LoadingButton variant="secondary" icon={Keyboard}>
                Practice Typing
              </LoadingButton>
            </Link>
            <Link href="/quizzing">
              <LoadingButton variant="secondary" icon={Brain}>
                Take a Quiz
              </LoadingButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>Built with Next.js, TypeScript, and Tailwind CSS</p>
          <p className="mt-2">© 2024 Notemaxxing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
