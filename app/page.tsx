import { Logo } from '@/components/logo'

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-6">
      <main className="text-center">
        <div className="flex justify-center mb-6">
          <Logo size={48} />
        </div>
        <h1 className="text-3xl font-heading font-bold text-brand-navy mb-3">Notemaxxing</h1>
        <p className="text-brand-slate max-w-md">Something new is being built here.</p>
      </main>
    </div>
  )
}
