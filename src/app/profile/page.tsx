'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react'; // Import the Award icon

// Define types for our data
type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_e164: string | null;
  sms_opt_in: boolean;
};

type Badge = {
  badges: {
    id: string;
    name: string | null;
    description: string | null;
    icon_name: string | null;
  } | null;
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]); // State for badges
  const [msg, setMsg] = useState<string | null>(null);

  const loadData = useCallback(async (uid: string) => {
    const profilePromise = supabase.from('profiles').select('id, full_name, avatar_url, phone_e164, sms_opt_in').eq('id', uid).single();
    const badgesPromise = supabase.from('user_badges').select(`badges(id, name, description, icon_name)`).eq('user_id', uid);

    const [{ data: profileData }, { data: badgeData }] = await Promise.all([profilePromise, badgesPromise]);

    if (profileData) setP(profileData as Profile);
    if (badgeData) setBadges(badgeData as any);

    setLoading(false);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        await loadData(uid);
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [loadData]);

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
    setMsg(error ? error.message : 'Profile saved successfully.');
  };

  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (!userId) return <div className="p-6 text-center">Please <a className="underline text-primary" href="/auth">sign in</a> to view your profile.</div>;

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Your Profile</h1>

      <Card>
        <CardHeader><CardTitle>Profile Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Display name</label>
            <Input
              className="mt-1"
              value={p?.full_name ?? ''}
              onChange={(e) => setP(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone (e.g. +2557XXXXXXXX)</label>
            <Input
              className="mt-1"
              value={p?.phone_e164 ?? ''}
              onChange={(e) => setP(prev => prev ? { ...prev, phone_e164: e.target.value } : prev)}
              placeholder="+2557XXXXXXXX"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(p?.sms_opt_in)}
              onChange={(e) => setP(prev => prev ? { ...prev, sms_opt_in: e.target.checked } : prev)}
            />
            <span className="text-sm">Send me SMS alerts for my watchlist and other updates.</span>
          </label>
          <div>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            {msg && <p className="text-sm text-muted-foreground mt-2">{msg}</p>}
          </div>
        </CardContent>
      </Card>

      {/* --- 👇 NEW: Badges Section 👇 --- */}
      <Card>
        <CardHeader><CardTitle>My Badges</CardTitle></CardHeader>
        <CardContent>
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {badges.map(badge => (
                badge.badges && (
                  <div key={badge.badges.id} className="flex flex-col items-center text-center p-4 border rounded-lg bg-secondary/50">
                    <Award className="w-12 h-12 text-primary mb-2" />
                    <p className="font-bold">{badge.badges.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.badges.description}</p>
                  </div>
                )
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">You haven't earned any badges yet. Complete a learning path to get started!</p>
          )}
        </CardContent>
      </Card>
      {/* --- 👆 End of Badges Section 👆 --- */}
    </main>
  );
}