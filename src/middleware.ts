// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({ request: { headers: new Headers(req.headers) } });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          res = NextResponse.next({ request: { headers: new Headers(req.headers) } });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = req.nextUrl;

  // --- 👇 NEW LOGIC IS HERE 👇 ---
  // If user is logged in and tries to access the root page, redirect to dashboard
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If user is not logged in and tries to access dashboard, redirect to home
  if (!user && pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  // --- 👆 END OF NEW LOGIC 👆 ---


  if (user && pathname !== '/auth/complete-profile') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone_e164')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.full_name || !profile.phone_e164) {
      return NextResponse.redirect(new URL('/auth/complete-profile', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (authentication routes)
     * - api (API routes)
     *
     * We've added '/' to the matcher to ensure the root path is checked.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth|api).*)',
    '/',
  ],
};