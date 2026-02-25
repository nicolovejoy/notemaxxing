import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/firebase-server-helpers'
import { getAdminAuth } from '@/lib/firebase/admin'

const ADMIN_EMAILS = ['nicholas.lovejoy@gmail.com', 'mlovejoy@scu.edu']

export async function GET(request: NextRequest) {
  const { email: callerEmail, error } = await getAuthenticatedUser(request)
  if (error) return error

  if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const targetEmail = request.nextUrl.searchParams.get('email')
  if (!targetEmail) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
  }

  try {
    const userRecord = await getAdminAuth().getUserByEmail(targetEmail)
    return NextResponse.json({ userId: userRecord.uid, email: userRecord.email })
  } catch {
    return NextResponse.json({ error: 'User not found', email: targetEmail }, { status: 404 })
  }
}
