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
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NavBar() {
  const { t } = useTranslation('common');
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // A reusable component for navigation links to avoid repetition
  const navLinks = (
    <>
      {isAdmin && (
        <Link href="/admin" className="block py-2" onClick={() => setIsMobileMenuOpen(false)}>
          {t('nav_admin')}
        </Link>
      )}
      <Link href="/watchlist" className="block py-2" onClick={() => setIsMobileMenuOpen(false)}>
        {t('nav_watchlist')}
      </Link>
      <Link href="/calculators/bond" className="block py-2" onClick={() => setIsMobileMenuOpen(false)}>
        {t('nav_bond_calculator')}
      </Link>
      <Link href="/chat" className="block py-2" onClick={() => setIsMobileMenuOpen(false)}>
        {t('nav_chat')}
      </Link>
      <Link href="/profile" className="block py-2" onClick={() => setIsMobileMenuOpen(false)}>
        {t('nav_profile')}
      </Link>
      <div onClick={() => setIsMobileMenuOpen(false)}>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between p-4">
        <Link href="/" className="text-2xl font-bold text-primary" onClick={() => setIsMobileMenuOpen(false)}>
          Malenga
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
            <div className="flex items-center gap-4">{navLinks}</div>
          ) : (
            <Link href="/auth">
              <Button size="sm">Login</Button>
            </Link>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {/* Mobile Menu Button & Controls */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
          >
            <div className="flex flex-col items-start gap-2 p-4 pt-0 text-sm font-medium border-t">
              {loading ? (
                <div className="h-8 w-24 animate-pulse rounded-md bg-muted"></div>
              ) : user ? (
                navLinks
              ) : (
                <Link href="/auth" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">Login</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}