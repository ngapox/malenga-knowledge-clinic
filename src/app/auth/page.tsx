'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  const router = useRouter();

  // When the session is set by the magic link, move to /chat
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.push('/chat');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Welcome to Malenga</h1>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={[]}
        // ✅ IMPORTANT: send magic-link back to /auth
        redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined}
      />
    </main>
  );
}
