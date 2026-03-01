import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser } from '@/lib/api/firebase-server-helpers'
import type { ChatMode, StudyQuizQuestion, ChatMessage } from '@/lib/types/study'

// Separate rate limit for chat — 20 messages per user per day
const chatRateLimits = new Map<string, number>()

function checkChatRateLimit(userId: string): boolean {
  const key = `chat:${userId}:${new Date().toDateString()}`
  const current = chatRateLimits.get(key) || 0
  if (current >= 20) return false
  chatRateLimits.set(key, current + 1)
  return true
}

interface ChatRequestBody {
  messages: ChatMessage[]
  mode: ChatMode
  questions: StudyQuizQuestion[]
  answers: (number | null)[]
  sourceName: string
}

function buildSystemPrompt(
  mode: ChatMode,
  questions: StudyQuizQuestion[],
  answers: (number | null)[],
  sourceName: string
): string {
  const base = `You are a helpful study assistant for a student using Notemaxxing. The student just completed a quiz on "${sourceName}". Be concise, encouraging, and educational. Use markdown for formatting when helpful.`

  if (mode === 'learn_more') {
    const qaContext = questions
      .map((q, i) => {
        const userAnswer = answers[i] !== null ? q.options[answers[i]!] : 'skipped'
        const correct = q.options[q.correct_index]
        const isCorrect = answers[i] === q.correct_index
        return `Q: ${q.question}\nUser answered: ${userAnswer} (${isCorrect ? 'correct' : 'incorrect'})\nCorrect: ${correct}\nExplanation: ${q.explanation}`
      })
      .join('\n\n')

    return `${base}\n\nThe student wants to explore and learn more about the topics covered. Here's what was on their quiz:\n\n${qaContext}\n\nHelp them dive deeper into any topic they're curious about. Encourage exploration and make connections between concepts.`
  } else {
    // discuss mode — focus on wrong answers only
    const wrongQA = questions
      .map((q, i) => ({ q, i }))
      .filter(({ i }) => answers[i] !== questions[i].correct_index)
      .map(({ q, i }) => {
        const userAnswer = answers[i] !== null ? q.options[answers[i]!] : 'skipped'
        const correct = q.options[q.correct_index]
        return `Q: ${q.question}\nUser answered: ${userAnswer}\nCorrect: ${correct}\nExplanation: ${q.explanation}`
      })
      .join('\n\n')

    return `${base}\n\nThe student wants to review the questions they got wrong. Here are the ones they missed:\n\n${wrongQA}\n\nHelp them understand why their answers were wrong and why the correct answers are right. Be patient and use examples.`
  }
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.ENABLE_AI !== 'true') {
      return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    const { uid, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (!checkChatRateLimit(uid)) {
      return NextResponse.json(
        { error: 'Daily chat limit reached (20 messages). Try again tomorrow!' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as ChatRequestBody
    const { messages, mode, questions, answers, sourceName } = body

    if (!messages?.length || !mode || !questions?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (mode !== 'learn_more' && mode !== 'discuss') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = buildSystemPrompt(mode, questions, answers, sourceName)

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1000,
      temperature: 0.7,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              controller.enqueue(encoder.encode(chunk))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          console.error('Stream error:', err)
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat error:', error)

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 503 })
    }

    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 })
  }
}
