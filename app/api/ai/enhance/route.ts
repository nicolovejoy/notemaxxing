import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'

// Simple in-memory rate limiting (upgrade to Redis later)
const rateLimits = new Map<string, number>()

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `${userId}:${new Date().toDateString()}`
  const current = rateLimits.get(key) || 0

  if (current >= 50) return false // 50 requests per day

  rateLimits.set(key, current + 1)
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Check if AI is enabled
    if (process.env.ENABLE_AI !== 'true') {
      return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 })
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    // Get authenticated client
    const { client: supabase, user, error } = await getAuthenticatedSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // Check rate limit
    const hasCapacity = await checkRateLimit(user.id)
    if (!hasCapacity) {
      return NextResponse.json(
        { error: 'Daily AI limit reached. Try again tomorrow!' },
        { status: 429 }
      )
    }

    // Get content from request
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
      system: `You are a helpful writing assistant. The text you receive may contain HTML formatting tags (like <p>, <strong>, <em>, <ul>, <li>, <h1>, <h2>, <h3>, etc.).

IMPORTANT RULES:
1. PRESERVE ALL HTML TAGS AND STRUCTURE - do not remove or change any HTML tags
2. Only improve the text content between the tags
3. Maintain all formatting (bold, italic, lists, headings, paragraphs)
4. Fix grammar, spelling, punctuation, and clarity issues
5. Keep the same tone and style
6. Return ONLY the improved HTML without any explanations or meta-commentary
7. Do not add new HTML tags unless fixing broken HTML structure
8. Preserve all class attributes and other HTML attributes`,
      temperature: 0.3,
      max_tokens: Math.min(content.length * 3, 4000), // Claude has higher token limits
    })

    const enhanced = response.content[0].type === 'text' ? response.content[0].text : null

    if (!enhanced) {
      return NextResponse.json({ error: 'Failed to enhance text' }, { status: 500 })
    }

    return NextResponse.json({ enhanced })
  } catch (error) {
    console.error('AI enhancement error:', error)

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 503 })
    }

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
