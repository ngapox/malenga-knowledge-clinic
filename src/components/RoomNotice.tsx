'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RoomNotice({ roomId }: { roomId?: string }) {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!roomId) return;

    supabase
      .from('room_settings')
      .select('notice')
      .eq('room_id', roomId)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setNotice(data?.notice ?? null);
      });

    return () => {
      mounted = false;
    };
  }, [roomId]);

  if (!notice) return null;

  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      📌 {notice}
    </div>
  );
}
