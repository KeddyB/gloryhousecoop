import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from './utils/supabase/server'

export async function middleware(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createClient(request, response)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is NOT signed in and the current path is NOT /auth/login or /auth/register
  // redirect the user to /auth/login
  if (
    !user && 
    !request.nextUrl.pathname.startsWith('/auth/login') && 
    !request.nextUrl.pathname.startsWith('/auth/register') && 
    !request.nextUrl.pathname.startsWith('/_next') && 
    !request.nextUrl.pathname.startsWith('/api')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }
  
  // If user IS signed in and tries to go to /auth/login, redirect to / (dashboard)
  if (user && request.nextUrl.pathname.startsWith('/auth/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
