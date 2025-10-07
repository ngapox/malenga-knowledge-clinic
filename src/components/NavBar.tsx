// src/components/NavBar.tsx
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import { Button } from "./ui/button";

export default async function NavBar() {
  console.log("--- [NAVBAR] Rendering ---");
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if(user) {
    console.log(`[NAVBAR] User session FOUND. User ID: ${user.id}`);
  } else {
    console.log("[NAVBAR] User session NOT FOUND.");
  }

  // --- 👇 NEW: Fetch the user's profile to check for admin status 👇 ---
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (profile) {
      isAdmin = profile.is_admin;
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between p-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          Malenga
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          {user ? (
            <>
              {/* --- 👇 NEW: Conditionally render the Admin link 👇 --- */}
              {isAdmin && (
                <Link href="/admin" className="font-bold text-primary transition-colors hover:text-primary/80">
                  Admin
                </Link>
              )}
              <Link href="/watchlist" className="text-muted-foreground transition-colors hover:text-primary">
                Watchlist
              </Link>
              <Link href="/calculators/bond" className="text-muted-foreground transition-colors hover:text-primary">
                Bond Calculator
              </Link>
              <Link href="/chat" className="text-muted-foreground transition-colors hover:text-primary">
                Chat
              </Link>
              <Link href="/profile" className="text-muted-foreground transition-colors hover:text-primary">
                Profile
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/auth">
              <Button size="sm">Login</Button>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}