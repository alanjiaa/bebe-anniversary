// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Only run on specific routes that need protection
export const config = { 
  matcher: [
    '/shop',
    '/complaints',
    '/checkout',
    '/promo'
  ]
}

export function middleware(req: NextRequest) {
  // Skip auth for login and signup pages
  if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup') {
    return NextResponse.next()
  }

  // Skip auth for static files and API routes
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/images')
  ) {
    return NextResponse.next()
  }

  // For protected routes, redirect to login if not authenticated
  // The actual authentication check is handled by the ProtectedRoute component
  return NextResponse.next()
}
