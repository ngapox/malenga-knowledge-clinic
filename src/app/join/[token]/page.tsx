'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function JoinByTokenPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'joining' | 'done' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // require sign-in
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
      if (!session) {
        // bounce to auth then back here
        const next = `/join/${encodeURIComponent(token)}`;
        router.replace(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }

      setStatus('joining');
      const { data, error: rpcError } = await supabase.rpc('redeem_invite', { invite_token: token });

      if (rpcError) {
        setError(rpcError.message);
        setStatus('error');
        return;
      }

      setStatus('done');
      // Go to chat (you'll now see the private room in the list)
      router.replace('/chat');
    })();
  }, [router, token]);

  // Handle the case where the user comes back from the auth page
  const redirectedFrom = searchParams.get('next');
  if (!userId && redirectedFrom) {
     return <div className="p-6">Please sign in to join the room.</div>;
  }
  
  return (
    <main className="mx-auto max-w-md p-6">
      {status === 'checking' && <div>Checking session…</div>}
      {status === 'joining' && <div>Joining room…</div>}
      {status === 'done' && <div>Success! Redirecting to chat…</div>}
      {status === 'error' && (
        <div className="text-red-600">
          Could not join: {error}
        </div>
      )}
    </main>
  );
}