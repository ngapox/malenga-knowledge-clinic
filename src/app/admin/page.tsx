// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

// ... (keep all the existing type definitions and functions like makeToken, etc.)
type Room = {
  id: string;
  name: string;
  is_public: boolean;
  room_settings?: {
    room_id: string;
    notice: string | null;
    admins_only_post: boolean;
    slow_mode_seconds: number;
  } | null;
  room_invites?: { token: string; created_at: string; expires_at: string | null }[];
};

type Member = {
  user_id: string;
  joined_at: string;
  profiles?: { full_name: string | null } | null;
};

function makeToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}


export default function AdminPage() {
  // ... (keep all the existing state declarations and useEffect hooks)
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [linkByRoom, setLinkByRoom] = useState<Record<string, string>>({});
  const [membersByRoom, setMembersByRoom] = useState<Record<string, Member[]>>({});
  const [openMembers, setOpenMembers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', uid).maybeSingle();
        setIsAdmin(Boolean(data?.is_admin));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select(
          `
          id, name, is_public,
          room_settings ( room_id, notice, admins_only_post, slow_mode_seconds ),
          room_invites ( token, created_at, expires_at )
        `
        )
        .order('name');
      if (!error && data) setRooms(data as unknown as Room[]);
      setLoading(false);
    })();
  }, []);

  const saveSettings = async (r: Room, patch: Partial<NonNullable<Room['room_settings']>>) => {
    const current = r.room_settings ?? {
      room_id: r.id,
      notice: null,
      admins_only_post: false,
      slow_mode_seconds: 0,
    };
    const payload = { ...current, ...patch, room_id: r.id };
    await supabase.from('room_settings').upsert(payload);
    setRooms((prev) => (prev.map((x) => (x.id === r.id ? { ...x, room_settings: payload } : x))));
  };

  const togglePublic = async (r: Room, value: boolean) => {
    await supabase.from('rooms').update({ is_public: value }).eq('id', r.id);
    setRooms((prev) => (prev.map((x) => (x.id === r.id ? { ...x, is_public: value } : x))));
  };

  const createRoom = async () => {
    if (!newRoomName.trim() || !userId) return;
    const { data, error } = await supabase
      .from('rooms')
      .insert({ name: newRoomName.trim(), is_public: false, created_by: userId })
      .select(
        `
        id, name, is_public,
        room_settings ( room_id, notice, admins_only_post, slow_mode_seconds ),
        room_invites ( token, created_at, expires_at )
        `
      )
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setRooms((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    setNewRoomName('');
  };

  const deleteRoom = async (r: Room) => {
    if (!confirm(`Delete room "${r.name}"? This removes its messages too.`)) return;
    await supabase.from('rooms').delete().eq('id', r.id);
    setRooms((prev) => prev.filter((x) => x.id !== r.id));
  };

  const createInvite = async (r: Room, daysValid = 0) => {
    const token = makeToken();
    const expires_at = daysValid > 0 ? new Date(Date.now() + daysValid * 24 * 3600 * 1000).toISOString() : null;

    const { error } = await supabase.from('room_invites').insert({
      room_id: r.id,
      token,
      expires_at,
    });
    if (error) {
      alert(error.message);
      return;
    }

    const link = typeof window !== 'undefined' ? `${window.location.origin}/join/${token}` : '';
    setLinkByRoom((prev) => ({ ...prev, [r.id]: link }));
  };

  const loadMembers = async (roomId: string) => {
    const { data, error } = await supabase
      .from('room_members')
      .select('user_id, joined_at, profiles(full_name)')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (!error && data) {
      const members: Member[] = data.map((m: any) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
      }));
      setMembersByRoom((prev) => ({ ...prev, [roomId]: members }));
    }
  };

  const removeMember = async (roomId: string, userIdToKick: string) => {
    if (!confirm('Remove this member from the room?')) return;
    const { error } = await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', userIdToKick);
    if (!error) {
      setMembersByRoom((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter((m) => m.user_id !== userIdToKick),
      }));
    } else {
      alert(error.message);
    }
  };

  if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a>.</div>;
  if (!isAdmin) return <div className="p-6">Not authorized. Admins only.</div>;
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {/* --- 👇 UPDATE THIS SECTION 👇 --- */}
      <div className="rounded-2xl border bg-white p-4 flex flex-col space-y-2">
        <Link href="/admin/articles" className="font-semibold text-primary hover:underline">
          → Manage Articles
        </Link>
        <Link href="/admin/opportunities" className="font-semibold text-primary hover:underline">
          → Manage Opportunities
        </Link>
        <Link href="/admin/learning-paths" className="font-semibold text-primary hover:underline">
          → Manage Learning Paths
        </Link>
        <Link href="/admin/prices" className="font-semibold text-primary hover:underline">
          → Upload DSE Prices
        </Link>
      </div>
      {/* --- 👆 END OF UPDATE 👆 --- */}


      <section className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold">Create Room</h2>
        {/* ... (the rest of the component remains the same) */}
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-lg border p-2"
            placeholder="Room name (e.g., Private Deals TZ)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <button onClick={createRoom} className="rounded-lg bg-black px-4 py-2 text-white">
            Create (private)
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold">Rooms</h2>

        <div className="mt-4 space-y-4">
          {rooms.map((r) => {
            const s = r.room_settings ?? {
              room_id: r.id,
              notice: '',
              admins_only_post: false,
              slow_mode_seconds: 0,
            };
            const lastInvite = r.room_invites?.[0];
            const hintLink =
              linkByRoom[r.id] ||
              (lastInvite && typeof window !== 'undefined' ? `${window.location.origin}/join/${lastInvite.token}` : '');

            const isOpen = !!openMembers[r.id];
            const members = membersByRoom[r.id];

            return (
              <div key={r.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-medium">{r.name}</div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm">
                      <input
                        type="checkbox"
                        className="mr-1 align-middle"
                        checked={r.is_public}
                        onChange={(e) => togglePublic(r, e.target.checked)}
                      />
                      Public
                    </label>
                    <button onClick={() => deleteRoom(r)} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-gray-600">Pinned notice</label>
                    <textarea
                      className="mt-1 h-24 w-full rounded-lg border p-2"
                      value={s.notice ?? ''}
                      onChange={(e) => saveSettings(r, { notice: e.target.value })}
                      placeholder="Community rules, tips, links…"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm text-gray-600">Posting controls</label>
                    <label className="text-sm">
                      <input
                        type="checkbox"
                        className="mr-1 align-middle"
                        checked={s.admins_only_post}
                        onChange={(e) => saveSettings(r, { admins_only_post: e.target.checked })}
                      />
                      Only admins can post
                    </label>

                    <label className="text-sm">
                      Slow-mode (seconds):{' '}
                      <input
                        type="number"
                        className="ml-1 w-24 rounded-lg border p-1"
                        min={0}
                        value={s.slow_mode_seconds}
                        onChange={(e) => saveSettings(r, { slow_mode_seconds: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <div className="text-xs text-gray-500">0 = off. Admins bypass slow-mode.</div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => createInvite(r, 0)} className="rounded-lg bg-black px-3 py-1 text-white">
                      Create invite link
                    </button>
                    <input
                      className="w-full rounded-lg border p-2"
                      readOnly
                      placeholder="Invite link will appear here"
                      value={hintLink}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Share this link. After sign-in, users are added to this room.
                  </div>
                </div>

                <div className="mt-4 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Members</div>
                    <button
                      onClick={async () => {
                        setOpenMembers((prev) => ({ ...prev, [r.id]: !isOpen }));
                        if (!isOpen && !members) await loadMembers(r.id);
                      }}
                      className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      {isOpen ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 space-y-2">
                      {(members ?? []).length === 0 && <div className="text-sm text-gray-500">No members yet.</div>}
                      {(members ?? []).map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                          <div className="text-sm">
                            {m.profiles?.full_name || '(no name)'} <span className="text-gray-500">— {m.user_id.slice(0, 8)}</span>
                          </div>
                          <button
                            onClick={() => removeMember(r.id, m.user_id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}