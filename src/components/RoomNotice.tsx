'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RoomNotice({ roomId }: { roomId?: string | null }) {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!roomId) { setNotice(null); return; }
      const { data, error } = await supabase
        .from('room_settings')
        .select('notice')
        .eq('room_id', roomId)
        .maybeSingle();
      if (!cancelled) setNotice(error ? null : data?.notice ?? null);
    })();
    return () => { cancelled = true; };
  }, [roomId]);

  if (!notice) return null;
  return (
    <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      {notice}
    </div>
  );
}
