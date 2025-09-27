'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function JoinByTokenPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [status, setStatus] = useState<'checking'|'joining'|'done'|'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // require sign-in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // bounce to auth then back here
        const next = `/join/${encodeURIComponent(token)}`;
        router.replace(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }

      setStatus('joining');
      const { data, error } = await supabase.rpc('redeem_invite', { invite_token: token });

      if (error) {
        setError(error.message);
        setStatus('error');
        return;
      }

      setStatus('done');
      // Go to chat (you'll now see the private room in the list)
      router.replace('/chat');
    })();
  }, [router, token]);

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
