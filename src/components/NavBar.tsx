'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      setEmail(user?.email ?? null);
    });

    // keep in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; // back to home after sign-out
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-3">
        <Link href="/" className="font-semibold">Malenga</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/chat" className="hover:underline">Chat</Link>
          <Link href="/calculators/bond" className="hover:underline">Calculator</Link>

          {email ? (
            <>
              <span className="hidden sm:inline text-gray-500">{email}</span>
              <button onClick={signOut} className="rounded-lg border px-3 py-1 hover:bg-gray-50">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth" className="rounded-lg border px-3 py-1 hover:bg-gray-50">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
