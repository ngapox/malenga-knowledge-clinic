// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log(`--- [MIDDLEWARE] Request received for: ${req.nextUrl.pathname} ---`);
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

  console.log('[MIDDLEWARE] Checking for user session...');
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    console.log(`[MIDDLEWARE] User session FOUND. User ID: ${user.id}`);
    if (req.nextUrl.pathname !== '/auth/complete-profile') {
      console.log('[MIDDLEWARE] Checking user profile...');
      const { data: profile } = await supabase.from('profiles').select('full_name, phone_e164').eq('id', user.id).single();
      if (!profile || !profile.full_name || !profile.phone_e164) {
        console.log('[MIDDLEWARE] Profile incomplete. Redirecting to /auth/complete-profile.');
        return NextResponse.redirect(new URL('/auth/complete-profile', req.url));
      }
      console.log('[MIDDLEWARE] Profile is complete.');
    }
  } else {
    console.log('[MIDDLEWARE] User session NOT FOUND.');
  }

  console.log(`--- [MIDDLEWARE] Finished for: ${req.nextUrl.pathname} ---`);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth|api|$).*)',
  ],
};