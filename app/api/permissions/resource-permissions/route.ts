import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function POST(request: Request) {
  const { error } = await getAuthenticatedUser(request)
  if (error) return error

  const { resourceIds, resourceType } = await request.json()

  if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
    return NextResponse.json({ error: 'Invalid resource IDs' }, { status: 400 })
  }

  const db = getAdminDb()
  let query = db.collection('permissions').where('resource_id', 'in', resourceIds)
  if (resourceType) {
    query = query.where('resource_type', '==', resourceType)
  }

  const snap = await query.get()
  const permissions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  return NextResponse.json({ permissions })
}
