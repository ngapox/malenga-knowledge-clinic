'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

// Tell Next this page is dynamic (don’t pre-render)
export const dynamic = 'force-dynamic';

function AuthInner() {
  // OK to use inside Suspense
  const params = useSearchParams();
  const redirectedFrom = params.get('redirectedFrom');

  const redirectTo =
    process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth`
      : undefined;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-2xl font-bold">Sign in / Create account</h1>
      {redirectedFrom && (
        <div className="mb-4 text-sm text-gray-600">
          Please sign in to continue to <b>{redirectedFrom}</b>.
        </div>
      )}

      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google']}
        magicLink
        redirectTo={redirectTo}
      />
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <AuthInner />
    </Suspense>
  );
}
