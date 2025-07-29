# React Hooks Error #185 - Implementation Roadmap

## Executive Summary

We're fixing a critical React hooks error caused by conditional hook usage in `StoreProvider`. The solution moves all authentication checks to Next.js middleware, ensuring hooks are always called in the same order.

## Problem

- `StoreProvider` conditionally initializes the store based on auth state
- This violates React's rules of hooks
- Causes production error #185

## Solution: Server-Side Auth with Middleware

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Middleware    │────▶│  Public Routes   │────▶│  No Store Init  │
│  (Auth Check)   │     │  (Unprotected)   │     │  Static Content │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         │
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Redirect to     │◀────│ Protected Routes │────▶│ Store Always    │
│ /auth/login     │     │  (Auth Required) │     │ Initializes     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Route Classification

#### Unprotected Routes (No Auth Required)

- `/` - Homepage with marketing content
- `/auth/login` - Login page
- `/auth/signup` - Signup page (if exists)
- `/auth/callback` - Auth callback handler
- API routes, static assets, images

**When unauthenticated, these routes:**

- Display normally without any store data
- Show marketing content, login/signup forms
- No folders, notebooks, or notes visible
- May show "Sign In" or "Get Started" CTAs

#### Protected Routes (Auth Required)

- `/folders` - Folder management
- `/notebooks/*` - All notebook pages
- `/quizzing` - Quiz functionality
- `/typemaxxing` - Typing practice

**When unauthenticated, these routes:**

- Immediately redirect to `/auth/login`
- Never render or initialize store
- Preserve intended destination for post-login redirect

## Implementation Steps

### Step 1: Update StoreProvider

Remove all auth logic and conditionals.

```tsx
// lib/store/StoreProvider.tsx
'use client'

import { useEffect } from 'react'
import { useInitializeStore } from './hooks'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initializeStore = useInitializeStore()

  useEffect(() => {
    // Always initialize - middleware ensures only auth'd users reach here
    initializeStore().catch((error) => {
      console.error('Store initialization failed:', error)
    })
  }, [initializeStore])

  return <>{children}</>
}
```

### Step 2: Update Middleware

Enhance protection logic with specific routes.

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedPaths = ['/folders', '/notebooks', '/quizzing', '/typemaxxing']

export async function middleware(request: NextRequest) {
  // Skip if Supabase not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  // ... existing Supabase client setup ...

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // Redirect unauthenticated users from protected routes
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    // Preserve intended destination
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### Step 3: Add Store Initialization Guards

Prevent duplicate initializations and handle edge cases.

```typescript
// lib/store/useStore.ts (partial)
initializeStore: async () => {
  const state = get()

  // Prevent duplicate initialization
  if (state.initialized || state.syncState.status === 'loading') {
    return
  }

  set({
    syncState: { status: 'loading', error: null },
    initialized: false,
  })

  try {
    // Fetch all data...
    set({
      initialized: true,
      syncState: { status: 'idle', error: null },
    })
  } catch (error) {
    set({
      syncState: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
```

### Step 4: Handle Missing Supabase Client

Gracefully handle cases where Supabase isn't configured.

```typescript
// lib/supabase/client.ts
export function createClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not configured')
    return null
  }
  // ... existing implementation
}

// lib/store/supabase-helpers.ts (example)
export async function fetchFolders() {
  const supabase = createClient()
  if (!supabase) {
    return [] // Return empty data for development
  }
  // ... existing implementation
}
```

### Step 5: Update Homepage for Unauthenticated Users

Ensure the homepage works without store data.

```tsx
// app/page.tsx (conceptual)
export default function HomePage() {
  // Use server component to check auth
  const user = await getUser() // Server-side check

  if (!user) {
    return <MarketingHomepage /> // No store hooks used
  }

  return <AuthenticatedHomepage /> // Can use store hooks
}
```

## Testing Checklist

### 1. Unauthenticated User Flows

- [ ] Visit `/` → See marketing homepage
- [ ] Visit `/folders` → Redirect to `/auth/login?redirectTo=/folders`
- [ ] Visit `/notebooks/123` → Redirect to `/auth/login?redirectTo=/notebooks/123`
- [ ] Visit `/auth/login` → See login form
- [ ] No console errors about hooks

### 2. Authenticated User Flows

- [ ] Visit `/` → See personalized homepage
- [ ] Visit `/folders` → See folders list, store initializes
- [ ] Visit `/auth/login` → Redirect to `/`
- [ ] Refresh any protected page → Store re-initializes
- [ ] Store data loads correctly

### 3. Edge Cases

- [ ] Missing Supabase env vars → App doesn't crash
- [ ] Network failure during init → Error handled gracefully
- [ ] Rapid navigation → No duplicate initializations
- [ ] Login with redirectTo param → Redirects to intended page

## Success Criteria

1. **No Hooks Errors**: React hooks error #185 is resolved
2. **Clean Auth Flow**: Clear separation between public/protected routes
3. **Graceful Degradation**: App works even without Supabase configured
4. **User Experience**: No flash of wrong content, smooth redirects

## Post-Implementation

After fixing the immediate issue:

1. **Monitor**: Check error tracking for any new issues
2. **Optimize**: Consider route-specific data loading
3. **Enhance**: Add loading skeletons for better UX
4. **Document**: Update CLAUDE.md with new auth pattern

## Timeline

1. **Immediate** (5 mins): Update StoreProvider
2. **Quick** (10 mins): Update middleware with protected routes
3. **Careful** (15 mins): Add initialization guards and error handling
4. **Thorough** (20 mins): Test all flows
5. **Complete** (5 mins): Update documentation

Total estimated time: ~1 hour

Let's start with Step 1!
