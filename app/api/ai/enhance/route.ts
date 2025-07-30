import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

// Simple in-memory rate limiting (upgrade to Redis later)
const rateLimits = new Map<string, number>();

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `${userId}:${new Date().toDateString()}`;
  const current = rateLimits.get(key) || 0;
  
  if (current >= 50) return false; // 50 requests per day
  
  rateLimits.set(key, current + 1);
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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
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
    const hasCapacity = await checkRateLimit(user.id);
    if (!hasCapacity) {
      return NextResponse.json(
        { error: 'Daily AI limit reached. Try again tomorrow!' },
        { status: 429 }
      );
    }

    // Get content from request
    const { content } = await request.json();
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful writing assistant. Improve the grammar and clarity of the following text while preserving the original meaning, tone, and style. Return only the improved text without any explanations or prefixes.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.3,
      max_tokens: Math.min(content.length * 2, 2000), // Allow for expansion but cap it
    });

    const enhanced = response.choices[0]?.message?.content;

    if (!enhanced) {
      return NextResponse.json(
        { error: 'Failed to enhance text' },
        { status: 500 }
      );
    }

    return NextResponse.json({ enhanced });

  } catch (error) {
    console.error('AI enhancement error:', error);
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}