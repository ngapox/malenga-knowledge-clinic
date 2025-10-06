// src/components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "./ui/button";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/"); // Redirect to homepage after logout
    router.refresh(); // Refresh the page to update the navbar
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      Logout
    </Button>
  );
}