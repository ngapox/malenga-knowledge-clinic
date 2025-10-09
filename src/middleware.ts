import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Define your languages and default language
const supportedLngs = ['en', 'sw'];
const fallbackLng = 'en';
const cookieName = 'i18next';

export async function middleware(req: NextRequest) {
  // --- Language Detection Logic ---
  let lng: string | undefined = req.cookies.get(cookieName)?.value;
  if (!lng || !supportedLngs.includes(lng)) {
    lng = fallbackLng;
  }

  const { pathname } = req.nextUrl;

  // Redirect if the language is missing from the URL
  const pathnameIsMissingLocale = supportedLngs.every(
    (loc) => !pathname.startsWith(`/${loc}/`) && pathname !== `/${loc}`
  );

  if (pathnameIsMissingLocale) {
    // e.g., incoming request is /dashboard, redirect to /en/dashboard
    return NextResponse.redirect(
      new URL(`/${lng}${pathname.startsWith('/') ? '' : '/'}${pathname}`, req.url)
    );
  }
  // --- End of Language Logic ---


  // --- The rest of your existing Supabase middleware logic ---
  let res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
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

  // --- 👇 THIS IS THE CORRECTED REDIRECT LOGIC 👇 ---
  if (user && (pathname === `/${lng}` || pathname === `/${lng}/`)) {
      return NextResponse.redirect(new URL(`/${lng}/dashboard`, req.url));
  }
  // --- 👆 END OF CORRECTION 👆 ---
  
  if (user && !pathname.includes('/auth/complete-profile')) {
    const { data: profile } = await supabase.from('profiles').select('full_name, phone_e164').eq('id', user.id).single();
    if (!profile || !profile.full_name || !profile.phone_e164) {
      return NextResponse.redirect(new URL(`/${lng}/auth/complete-profile`, req.url));
    }
  }

  return res;
}

export const config = {
  // Matcher ignoring `_next/` and static files
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js).*)',
  ],
};