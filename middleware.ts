// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Only run auth on all non‐static routes:
export const config = { matcher: ['/', '/((?!_next).*)'] }

export function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const [scheme, credentials] = auth.split(' ')
  if (
    scheme !== 'Basic' ||
    Buffer.from(process.env.AUTH_CREDENTIALS!, 'utf8').toString('base64') !== credentials
  ) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Anniversary"' },
    })
  }
  return NextResponse.next()
}
