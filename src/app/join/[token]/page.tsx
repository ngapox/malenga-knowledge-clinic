'use client'; // This directive must be at the top

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { type NextPage } from 'next'; // Import Next.js type

// This is now a pure client component that receives a simple string prop.
function JoinClientComponent({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'joining' | 'done' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processJoin = async (session: Session | null) => {
      if (!session) {
        // Redirect to auth, then come back here
        const next = `/join/${encodeURIComponent(token)}`;
        router.replace(`/auth?redirectedFrom=${encodeURIComponent(next)}`);
        return;
      }

      setStatus('joining');
      const { error: rpcError } = await supabase.rpc('redeem_invite', { invite_token: token });

      if (rpcError) {
        setError(rpcError.message);
        setStatus('error');
        return;
      }

      setStatus('done');
      // Success, go to chat
      router.replace('/chat');
    };

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

// Explicitly type the page component using NextPage
interface JoinPageProps {
  params: { token: string };
}

const JoinByTokenPage: NextPage<JoinPageProps> = ({ params }) => {
  return <JoinClientComponent token={params.token} />;
};

export default JoinByTokenPage;