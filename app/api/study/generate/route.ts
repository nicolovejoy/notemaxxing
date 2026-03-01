import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'
import type {
  StudyGenerateRequest,
  TypingResponse,
  QuizResponse,
  StudyQuizQuestion,
} from '@/lib/types/study'

// Rate limiting — 20 study sessions per user per day
const rateLimits = new Map<string, number>()

function checkRateLimit(userId: string): boolean {
  const key = `${userId}:${new Date().toDateString()}`
  const current = rateLimits.get(key) || 0
  if (current >= 20) return false
  rateLimits.set(key, current + 1)
  return true
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    // Guards
    if (process.env.ENABLE_AI !== 'true') {
      return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    const { uid, error } = await getAuthenticatedUser(request)
    if (error) return error

    if (!checkRateLimit(uid)) {
      return NextResponse.json(
        { error: 'Daily study limit reached (20 sessions). Try again tomorrow!' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as StudyGenerateRequest
    const { mode, notebookId, topic } = body

    if (mode !== 'typing' && mode !== 'quiz') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    // Must provide exactly one source
    if ((!notebookId && !topic) || (notebookId && topic)) {
      return NextResponse.json(
        { error: 'Provide either notebookId or topic, not both' },
        { status: 400 }
      )
    }

    let sourceContent: string

    if (notebookId) {
      // Fetch notebook and verify access
      const db = getAdminDb()
      const notebookDoc = await db.collection('notebooks').doc(notebookId).get()
      if (!notebookDoc.exists) {
        return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
      }

      const notebook = notebookDoc.data()!
      const isOwner = notebook.owner_id === uid

      if (!isOwner) {
        // Check folder permission fallback
        if (!notebook.folder_id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        const permSnap = await db
          .collection('permissions')
          .where('user_id', '==', uid)
          .where('resource_id', '==', notebook.folder_id)
          .where('resource_type', '==', 'folder')
          .get()
        if (permSnap.empty) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }

      // Fetch notes
      const notesSnap = await db
        .collection('notes')
        .where('notebook_id', '==', notebookId)
        .limit(20)
        .get()

      if (notesSnap.empty) {
        return NextResponse.json(
          { error: 'This notebook has no notes to study from' },
          { status: 400 }
        )
      }

      sourceContent = notesSnap.docs
        .map((doc) => {
          const data = doc.data()
          const title = (data.title as string) || 'Untitled'
          const content = stripHtml((data.content as string) || '').slice(0, 2000)
          return `Title: ${title}\nContent: ${content}`
        })
        .join('\n\n---\n\n')
    } else {
      sourceContent = `Topic: ${topic}`
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    if (mode === 'typing') {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        system:
          'You are a typing practice text generator. Create coherent, flowing text that incorporates vocabulary and concepts from the provided material. Return ONLY the practice text without any explanations or meta-commentary.',
        messages: [
          {
            role: 'user',
            content: `Generate a coherent practice passage of approximately 100 words based on the following material. The text should use vocabulary and concepts from the material, be grammatically correct, flow naturally, and be suitable for typing practice (plain text only, no special formatting).\n\n${sourceContent}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : null
      if (!text) {
        return NextResponse.json({ error: 'Failed to generate text' }, { status: 500 })
      }

      // Trim to ~100 words
      const words = text.split(/\s+/)
      const trimmed = words.slice(0, 100).join(' ')

      const result: TypingResponse = {
        text: trimmed,
        wordCount: trimmed.split(/\s+/).length,
      }
      return NextResponse.json(result)
    } else {
      // Quiz mode
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        system:
          'You are a quiz generator. Generate multiple-choice questions based on the provided material. Return ONLY valid JSON, no markdown fences or extra text.',
        messages: [
          {
            role: 'user',
            content: `Generate exactly 5 multiple-choice questions based on the following material. Each question should have 4 options with exactly one correct answer.\n\nReturn JSON in this exact format:\n{"questions":[{"question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}\n\nMaterial:\n${sourceContent}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : null
      if (!rawText) {
        return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
      }

      let parsed: { questions: StudyQuizQuestion[] }
      try {
        parsed = JSON.parse(rawText)
      } catch {
        // Try extracting JSON from markdown fences
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1])
        } else {
          console.error('Failed to parse quiz JSON:', rawText.slice(0, 200))
          return NextResponse.json({ error: 'Failed to parse quiz response' }, { status: 500 })
        }
      }

      // Validate structure
      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        return NextResponse.json({ error: 'Invalid quiz format' }, { status: 500 })
      }

      const result: QuizResponse = {
        questions: parsed.questions.map((q) => ({
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation || '',
        })),
      }
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Study generation error:', error)

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 503 })
    }

    return NextResponse.json({ error: 'Failed to generate study content' }, { status: 500 })
  }
}
