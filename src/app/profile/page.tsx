'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Wait for session
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

  // Load profile
  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      setFullName(data?.full_name ?? '');
      setAvatarUrl(data?.avatar_url ?? null);
      setLoadingProfile(false);
    })();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: fullName, avatar_url: avatarUrl });
    setSaving(false);
    setMsg(error ? error.message : 'Saved!');
  };

  const onAvatarChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Use a stable path so re-uploads overwrite cleanly
    const path = `${userId}/avatar.jpg`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setMsg(upErr.message);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = data.publicUrl + `?v=${Date.now()}`; // bust cache
    setAvatarUrl(publicUrl);
  };

  if (loadingAuth) return <div className="p-6">Checking session…</div>;
  if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a> to edit your profile.</div>;
  if (loadingProfile) return <div className="p-6">Loading profile…</div>;

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      <div className="mt-6 grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-[120px_1fr]">
        <div className="flex flex-col items-center justify-start gap-2">
          <div className="h-24 w-24 overflow-hidden rounded-full border bg-gray-100">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">No photo</div>
            )}
          </div>
          <label className="cursor-pointer rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
          </label>
        </div>

        <div>
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
      </div>
    </main>
  );
}
