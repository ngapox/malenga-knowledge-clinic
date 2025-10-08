'use client';

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "@/lib/supabaseClient";
import LogoutButton from "./LogoutButton";
import { Button } from "./ui/button";
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import LanguageSwitcher from "./LanguageSwitcher";

export default function NavBar() {
  const { t } = useTranslation('common');
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', currentUser.id)
              .single();
            if (profile) setIsAdmin(profile.is_admin);
        }
        setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
            supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single().then(({data}) => {
                if(data) setIsAdmin(data.is_admin);
            });
        } else {
            setIsAdmin(false);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between p-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          Malenga
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="font-bold text-primary transition-colors hover:text-primary/80">
                  {t('nav_admin')}
                </Link>
              )}
              <Link href="/watchlist" className="text-muted-foreground transition-colors hover:text-primary">
                {t('nav_watchlist')}
              </Link>
              <Link href="/calculators/bond" className="text-muted-foreground transition-colors hover:text-primary">
                {t('nav_bond_calculator')}
              </Link>
              <Link href="/chat" className="text-muted-foreground transition-colors hover:text-primary">
                {t('nav_chat')}
              </Link>
              <Link href="/profile" className="text-muted-foreground transition-colors hover:text-primary">
                {t('nav_profile')}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/auth">
              <Button size="sm">Login</Button>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}