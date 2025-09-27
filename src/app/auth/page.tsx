'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/chat';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.push(next);
    });
    return () => subscription.unsubscribe();
  }, [router, next]);

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth${next ? `?next=${encodeURIComponent(next)}` : ''}`
      : undefined;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Welcome to Malenga</h1>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google']}
        redirectTo={redirectTo}
      />
    </main>
  );
}
