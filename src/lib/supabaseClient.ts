// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// This file is used for client-side Supabase access.
// Ensure environment variables are available in the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

// --- 👇 CORRECTED CONFIGURATION IS HERE 👇 ---
// persistSession is now true by default, which is what we want.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);