'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (user?.id) {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        if (mounted) setIsAdmin(Boolean(data?.is_admin));
      }
    }
    hydrate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setEmail(u?.email ?? null);
      if (u?.id) {
        supabase.from('profiles').select('is_admin').eq('id', u.id).maybeSingle().then(({ data }) => {
          if (mounted) setIsAdmin(Boolean(data?.is_admin));
        });
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-3">
        <Link href="/" className="font-semibold">Malenga</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/chat" className="hover:underline">Chat</Link>
          <Link href="/calculators/bond" className="hover:underline">Calculator</Link>
          {isAdmin && <Link href="/admin" className="hover:underline">Admin</Link>}
          {email ? (
            <>
              <Link href="/profile" className="hover:underline">Profile</Link>
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
