import { getDb } from '@/lib/db'
import { loadDelivery } from '@/lib/handlers/respond'
import { QuizForm } from './quiz-form'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The link is the credential. Keep it out of search indexes and referrers. */
export const metadata = {
  title: 'Notemaxxing',
  robots: { index: false, follow: false },
}

// Single-theme by design — matches the cream+navy daily email this page is
// clicked from. Fixed hex, not the app's OS-reactive theme tokens.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F8F8F0] px-4 py-12">
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </main>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.08em] text-[#4A6E91] mb-6">{children}</div>
  )
}

/**
 * Every auth failure renders the same page. A forged token, an expired one, and
 * one naming a deleted delivery must be indistinguishable — the difference is
 * only useful to someone probing.
 */
function DeadLink() {
  return (
    <Shell>
      <Kicker>Notemaxxing</Kicker>
      <h1 className="font-[family-name:var(--font-montserrat)] text-2xl text-[#1F2933]">
        This link doesn&rsquo;t work anymore.
      </h1>
      <p className="mt-3 leading-relaxed text-[#374151]">
        Daily links expire after a week. Tomorrow&rsquo;s question will be in your inbox.
      </p>
    </Shell>
  )
}

export default async function AnswerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const secret = process.env.LEARN_TOKEN_SECRET
  if (!secret) return <DeadLink />

  const result = await loadDelivery(getDb(), { token, secret, now: new Date() })
  if (!result.ok) return <DeadLink />

  if (result.kind === 'adventure') {
    return (
      <Shell>
        <Kicker>A situation</Kicker>
        <h1 className="font-[family-name:var(--font-montserrat)] text-2xl text-[#1F2933]">
          {result.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[#1F2933]">{result.openingScenario}</p>
        <p className="mt-8 pt-6 border-t border-[#E5E7EB] text-sm text-[#4A6E91]">
          Live cases aren&rsquo;t switched on yet — this one&rsquo;s waiting on the chat build.
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <Kicker>One question</Kicker>
      <p className="text-xl leading-relaxed text-[#1F2933] mb-8">{result.prompt}</p>
      <QuizForm token={token} options={result.options} initialReveal={result.reveal} />
    </Shell>
  )
}
