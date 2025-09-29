// --- File: src/app/join/[token]/page.tsx ---
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function JoinByTokenPage({ params }: { params: { token: string } }) {
  const { token } = params;
  
  // CORRECTED: Provide all three required arguments
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If the user is not logged in, redirect them to the auth page.
  if (!session) {
    const next = `/join/${encodeURIComponent(token)}`;
    return redirect(`/auth?redirectedFrom=${encodeURIComponent(next)}`);
  }

  // If the user IS logged in, try to redeem the invite.
  const { error } = await supabase.rpc('redeem_invite', { invite_token: token });

  if (error) {
    // If there's an error (e.g., invalid token), show it on the chat page.
    return redirect(`/chat?error=${encodeURIComponent(error.message)}`);
  }

  // If successful, redirect to the chat page.
  return redirect('/chat');
}