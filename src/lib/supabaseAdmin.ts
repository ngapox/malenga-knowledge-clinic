// --- File: src/lib/supabaseAdmin.ts ---
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// This is a factory function to create a Supabase admin client.
export function createSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        // A dummy cookie object is required, but the service role key bypasses it.
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    }
  );
}