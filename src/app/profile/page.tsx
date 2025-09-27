'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [fullName, setFullName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // wait for session
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // load profile
  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      setFullName(data?.full_name ?? '');
      setLoadingProfile(false);
    })();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: fullName }); // insert or update
    setSaving(false);
    setMsg(error ? error.message : 'Saved!');
  };

  if (loadingAuth) return <div className="p-6">Checking session…</div>;
  if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a> to edit your profile.</div>;
  if (loadingProfile) return <div className="p-6">Loading profile…</div>;

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      <div className="mt-6 rounded-2xl border bg-white p-4">
        <label className="text-sm text-gray-600">Display name</label>
        <input
          className="mt-1 w-full rounded-lg border p-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g., Neema M."
        />
        <button
          onClick={save}
          disabled={saving}
          className="mt-3 rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && <div className="mt-2 text-sm text-gray-600">{msg}</div>}
      </div>
    </main>
  );
}
