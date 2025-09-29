'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type NavItem = { href: string; label: string };

export default function NavBar() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // session
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', uid)
          .maybeSingle()
          .then(({ data }) => setIsAdmin(Boolean(data?.is_admin)));
      } else {
        setIsAdmin(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) setIsAdmin(false);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const baseItems: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/chat', label: 'Chatrooms' },
    { href: '/watchlist', label: 'Watchlist' },      // ← NEW
    { href: '/calculators/bond', label: 'Bond Calc' },
    { href: '/profile', label: 'Profile' },
  ];
  const items = isAdmin ? [...baseItems, { href: '/admin', label: 'Admin' }] : baseItems;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="text-lg font-semibold">
          <Link href="/">Malenga Knowledge Clinic</Link>
        </div>

        <ul className="flex flex-wrap items-center gap-3 text-sm">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`rounded-md px-3 py-1.5 hover:bg-gray-100 ${
                  isActive(it.href) ? 'bg-gray-100 font-medium' : ''
                }`}
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {userId ? (
            <button
              onClick={signOut}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              title="Sign out"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/auth"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
