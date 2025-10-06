// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// This is the correct way to create a Supabase admin client for server-side operations.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      // These options are important for server-side clients
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);