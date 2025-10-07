// src/lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr'

// This file is used for client-side Supabase access.
// Ensure environment variables are available in the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

// Use createBrowserClient from @supabase/ssr for client-side instances
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);