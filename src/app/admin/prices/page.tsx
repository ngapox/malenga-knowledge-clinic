'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPrices() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [date, setDate] = useState<string>('');
  const [csv, setCsv] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (off) return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', uid).maybeSingle();
        setIsAdmin(Boolean(data?.is_admin));
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { off = true; subscription.unsubscribe(); };
  }, []);

  const parseCsv = () => {
    // Accept lines like: TBL,11400  or  TBL;11400
    return csv
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.replace(/;/g, ','))
      .map(l => l.split(',').map(x => x.trim()))
      .filter(parts => parts.length >= 2 && parts[0] && !isNaN(Number(parts[1])))
      .map(parts => ({ symbol: parts[0].toUpperCase(), close: Number(parts[1]) }));
  };

  const upload = async () => {
    setMsg(null);
    if (!isAdmin) { setMsg('Admin only.'); return; }
    if (!date) { setMsg('Please choose a date.'); return; }
    const rows = parseCsv();
    if (rows.length === 0) { setMsg('No valid rows found. Use lines like: TBL,11400'); return; }

    setBusy(true);
    const res = await fetch('/api/prices/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ as_of_date: date, rows }),
    });
    setBusy(false);

    if (!res.ok) {
      const t = await res.text();
      setMsg(`Failed: ${t}`);
      return;
    }
    setMsg(`Uploaded ${rows.length} prices for ${date}.`);
  };

  if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a>.</div>;
  if (!isAdmin) return <div className="p-6">You must be an admin to upload prices.</div>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">DSE Prices Upload</h1>
      <p className="text-sm text-gray-600">
        Paste CSV: <code>SYMBOL,PRICE</code> per line. Example: <code>TBL,11400</code>
      </p>
      <div className="flex gap-3">
        <input type="date" className="rounded border p-2" value={date} onChange={e => setDate(e.target.value)} />
        <button onClick={upload} disabled={busy} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <textarea className="h-64 w-full rounded border p-2 font-mono"
        placeholder="TBL,11400&#10;NMB,6000&#10;CRDB,535"
        value={csv}
        onChange={e => setCsv(e.target.value)}
      />
      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </main>
  );
}
