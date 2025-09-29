'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

export default function JoinByTokenPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'joining' | 'done' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processJoin = async (session: Session | null) => {
      if (!session) {
        // If there's no session, redirect to the auth page.
        // Pass the current join URL as the 'next' parameter so we can come back.
        const next = `/join/${encodeURIComponent(token)}`;
        router.replace(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }

      // If we have a session, proceed with joining the room.
      setStatus('joining');
      const { error: rpcError } = await supabase.rpc('redeem_invite', { invite_token: token });

      if (rpcError) {
        setError(rpcError.message);
        setStatus('error');
        return;
      }

      setStatus('done');
      // Success! Redirect to the chat page.
      router.replace('/chat');
    };

    // Check the session as soon as the component mounts.
    supabase.auth.getSession().then(({ data: { session } }) => {
      processJoin(session);
    });
  }, [router, token]);

  return (
    <main className="mx-auto max-w-md p-6">
      {status === 'checking' && <div>Checking session…</div>}
      {status === 'joining' && <div>Joining room…</div>}
      {status === 'done' && <div>Success! Redirecting to chat…</div>}
      {status === 'error' && <div className="text-red-600">Could not join: {error}</div>}
    </main>
  );
}