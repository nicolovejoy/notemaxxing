import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

// Rate limiting for typing practice
const typingRateLimits = new Map<string, number>();

async function checkTypingRateLimit(userId: string): Promise<boolean> {
  const key = `${userId}:${new Date().toDateString()}`;
  const current = typingRateLimits.get(key) || 0;
  
  if (current >= 20) return false; // 20 typing sessions per day
  
  typingRateLimits.set(key, current + 1);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Check if AI is enabled
    if (process.env.ENABLE_AI !== 'true') {
      return NextResponse.json(
        { error: 'AI features are not enabled' },
        { status: 503 }
      );
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    // Get user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const hasCapacity = await checkTypingRateLimit(user.id);
    if (!hasCapacity) {
      return NextResponse.json(
        { error: 'Daily typing practice limit reached (20 sessions). Try again tomorrow!' },
        { status: 429 }
      );
    }

    // Get request data
    const { notes, wordCount = 100 } = await request.json();
    
    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return NextResponse.json(
        { error: 'Notes are required' },
        { status: 400 }
      );
    }

    // Prepare content for AI
    const notesContent = notes.map(note => 
      `Title: ${note.title}\nContent: ${note.content}`
    ).join('\n\n---\n\n');

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: `Based on the following notes, generate a coherent practice text of approximately ${wordCount} words. The text should:
1. Use vocabulary and concepts from the notes
2. Be grammatically correct and flow naturally
3. Be suitable for typing practice (no special formatting, just plain text)
4. Incorporate key terms and ideas from the notes
5. Be interesting and engaging to type

Notes:
${notesContent}

Generate the practice text now (${wordCount} words):`
        }
      ],
      system: 'You are a typing practice text generator. Create coherent, flowing text that incorporates vocabulary and concepts from the provided notes. The text should be suitable for typing practice - clear, grammatically correct, and engaging. Return ONLY the practice text without any explanations or meta-commentary.',
      temperature: 0.7,
      max_tokens: Math.min(wordCount * 2, 1000), // Rough estimate: 1 token ≈ 0.75 words
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : null;

    if (!text) {
      return NextResponse.json(
        { error: 'Failed to generate practice text' },
        { status: 500 }
      );
    }

    // Trim to approximate word count
    const words = text.split(/\s+/);
    const trimmedText = words.slice(0, wordCount).join(' ');

    return NextResponse.json({ 
      text: trimmedText,
      wordCount: trimmedText.split(/\s+/).length,
      tokensUsed: response.usage?.input_tokens || 0
    });

  } catch (error) {
    console.error('Typing text generation error:', error);
    
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API Error details:', {
        status: error.status,
        message: error.message,
        type: error.type
      });
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }
    
    // Log more details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', error);
    }
    
    return NextResponse.json(
      { error: 'Failed to generate practice text. Please try again.' },
      { status: 500 }
    );
  }
}