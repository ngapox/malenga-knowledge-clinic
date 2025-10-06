'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_e164: string | null;
  sms_opt_in: boolean;
};

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (off) return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }

      const { data } = await supabase.from('profiles')
        .select('id, full_name, avatar_url, phone_e164, sms_opt_in')
        .eq('id', uid)
        .maybeSingle();
      if (data) setP(data as Profile);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { off = true; subscription.unsubscribe(); };
  }, []);

  const save = async () => {
    if (!userId || !p) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      phone_e164: p.phone_e164,
      sms_opt_in: p.sms_opt_in,
    });
    setSaving(false);
    setMsg(error ? error.message : 'Saved.');
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a>.</div>;

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <label className="block">
          <div className="text-sm text-gray-600">Display name</div>
          <input
            className="mt-1 w-full rounded border p-2"
            value={p?.full_name ?? ''}
            onChange={(e) => setP(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
          />
        </label>

        <label className="block">
          <div className="text-sm text-gray-600">Phone (E.164, e.g. +2557XXXXXXXX)</div>
          <input
            className="mt-1 w-full rounded border p-2"
            value={p?.phone_e164 ?? ''}
            onChange={(e) => setP(prev => prev ? { ...prev, phone_e164: e.target.value } : prev)}
            placeholder="+2557XXXXXXXX"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(p?.sms_opt_in)}
            onChange={(e) => setP(prev => prev ? { ...prev, sms_opt_in: e.target.checked } : prev)}
          />
          <span className="text-sm">Send me price **SMS** alerts</span>
        </label>

        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {msg && <div className="text-sm text-gray-600">{msg}</div>}
        <p className="text-xs text-gray-500">
          We’ll send SMS from your registered sender name via Beem. Standard SMS costs apply to your account.
        </p>
      </div>
    </main>
  );
}
