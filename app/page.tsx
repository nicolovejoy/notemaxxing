'use client'

import { FolderOpen, Keyboard, Brain, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Card, CardBody } from '@/components/ui'

export default function Home() {
  const features = [
    {
      icon: FolderOpen,
      title: 'Your Backpack',
      description: 'Organize your notes with custom folders and colors',
      color: 'text-brand-navy',
    },
    {
      icon: Keyboard,
      title: 'Typemaxxing',
      description: 'Practice typing with your own notes',
      color: 'text-orange-500',
    },
    {
      icon: Brain,
      title: 'Quizzmaxxing',
      description: 'Create custom quizzes to test your knowledge',
      color: 'text-pink-500',
    },
  ]

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Out of Service Banner */}
      <div className="bg-red-600 text-white text-center py-3 px-4 font-semibold tracking-wide">
        [ OUT OF SERVICE ] — notemaxxing.net is no longer active
      </div>

      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 opacity-60">
              <Logo size={36} />
              <h1 className="text-xl font-bold text-brand-navy tracking-tight">notemaxxing.net</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-navy/5 to-brand-cream py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center opacity-60">
          <h2 className="text-4xl font-bold text-brand-charcoal mb-4">
            Your Second Brain, Perfected
          </h2>
          <p className="text-xl text-text-tertiary mb-8 max-w-2xl mx-auto">
            Organize your thoughts, enhance your writing, and master your knowledge with AI-powered
            note-taking
          </p>
        </div>
      </section>

      {/* Features Grid (disabled) */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-brand-charcoal mb-8 text-center opacity-60">
            Everything You Need to Stay Organized
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} aria-disabled className="cursor-not-allowed">
                  <Card className="h-full opacity-50 grayscale">
                    <CardBody>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 bg-brand-cream rounded-lg ${feature.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{feature.title}</h4>
                          <p className="text-text-tertiary text-sm">{feature.description}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-text-muted" />
                      </div>
                    </CardBody>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-tertiary">
          <p>This site is no longer in service.</p>
          <p className="mt-2">© 2024 Notemaxxing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
