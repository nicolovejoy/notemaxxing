'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { marked } from 'marked'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/firebase/api-fetch'
import { getStudyChatContext, clearStudyChatContext } from '@/lib/utils/study-chat-context'
import type { ChatMessage, StudyChatContext } from '@/lib/types/study'

// Configure marked for inline rendering
marked.setOptions({ breaks: true })

function getGreeting(ctx: StudyChatContext): string {
  const sourceName = ctx.source.type === 'notebook' ? ctx.source.notebookName : ctx.source.topic
  if (ctx.mode === 'learn_more') {
    return `Nice work on that quiz about **${sourceName}**! What would you like to explore further? I can help you dive deeper into any of the topics covered.`
  }
  const wrong = ctx.answers.filter((a, i) => a !== ctx.questions[i].correct_index).length
  return `Let's review the **${wrong}** question${wrong !== 1 ? 's' : ''} you missed on the **${sourceName}** quiz. Ask me about any of them, or I can walk through them one by one.`
}

export default function StudyChatPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [ctx, setCtx] = useState<StudyChatContext | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
  }, [user, authLoading, router])

  // Load context from sessionStorage on mount
  useEffect(() => {
    const stored = getStudyChatContext()
    if (!stored) {
      router.push('/quizzing')
      return
    }
    clearStudyChatContext()
    setCtx(stored)
    setMessages([{ role: 'assistant', content: getGreeting(stored) }])
  }, [router])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming || !ctx) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setStreaming(true)
    setError('')

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const sourceName = ctx.source.type === 'notebook' ? ctx.source.notebookName : ctx.source.topic

      // Use raw fetch for SSE streaming (apiFetch sets Content-Type which is fine)
      const res = await apiFetch('/api/study/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: updatedMessages,
          mode: ctx.mode,
          questions: ctx.questions,
          answers: ctx.answers,
          sourceName,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Chat request failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.text,
                  }
                }
                return updated
              })
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      // Remove the empty assistant message on error
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last.role === 'assistant' && !last.content) {
          return prev.slice(0, -1)
        }
        return prev
      })
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, ctx, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (authLoading || !user || !ctx) return null

  const breadcrumbLabel = ctx.mode === 'learn_more' ? 'Learn More' : 'Discuss'

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <PageHeader
        breadcrumbs={[{ label: 'Quizzmaxxing', href: '/quizzing' }, { label: breadcrumbLabel }]}
      />

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-4">
        {/* Messages */}
        <div className="flex-1 space-y-4 pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-brand-navy text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  msg.content ? (
                    <div
                      className="prose prose-sm max-w-none [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                    />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

        {/* Input */}
        <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4">
          <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              rows={1}
              className="flex-1 resize-none text-sm outline-none max-h-32 py-1"
              disabled={streaming}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="p-1.5 text-brand-navy hover:text-brand-navy-light disabled:text-gray-300 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Shift+Enter for new line</p>
        </div>
      </main>
    </div>
  )
}
