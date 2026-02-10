// Debug endpoint - remove this file in production
// This file should be deleted after debugging is complete
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Debug endpoint disabled',
    timestamp: new Date().toISOString(),
  })
}
