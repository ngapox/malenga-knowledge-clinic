import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export default async function JoinByTokenPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If the user is not logged in, redirect them to the auth page.
  // We'll tell the auth page to send them back here after they sign in.
  if (!session) {
    const next = `/join/${encodeURIComponent(token)}`;
    return redirect(`/auth?redirectedFrom=${encodeURIComponent(next)}`);
  }

  // If the user IS logged in, try to redeem the invite.
  const { error } = await supabase.rpc('redeem_invite', { invite_token: token });

  if (error) {
    // If there's an error (e.g., invalid token), show an error message.
    // We'll redirect to the chat page with an error query param.
    return redirect(`/chat?error=${encodeURIComponent(error.message)}`);
  }

  // If successful, redirect the user to the chat page.
  // They will now see the new private room in their list.
  return redirect('/chat');
}