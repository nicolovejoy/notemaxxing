import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    }

    // Try to create client
    const supabase = await createClient()
    const clientCreated = !!supabase

    // Try a simple query
    let queryResult = 'not attempted'
    let errorDetails = null
    
    if (supabase) {
      const { data, error } = await supabase
        .from('folders')
        .select('id')
        .limit(1)
      
      if (error) {
        queryResult = 'failed'
        errorDetails = {
          message: error.message,
          code: error.code,
          details: error.details,
        }
      } else {
        queryResult = 'success'
      }
    }

    return NextResponse.json({
      status: 'debug info',
      env: envCheck,
      client: {
        created: clientCreated,
        queryResult,
        errorDetails,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}