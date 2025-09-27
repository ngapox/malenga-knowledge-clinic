'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Room = { id: string; name: string; is_public: boolean; room_settings?: {
  room_id: string; notice: string | null; admins_only_post: boolean; slow_mode_seconds: number;
} | null };

export default function AdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [newRoomName, setNewRoomName] = useState('');

  // auth + role
  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', uid).maybeSingle();
        setIsAdmin(Boolean(data?.is_admin));
      }
    })();
  }, []);

  // load rooms + settings
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, is_public, room_settings ( room_id, notice, admins_only_post, slow_mode_seconds )')
        .order('name');
      if (!error && data) {
        // Map room_settings from array to object or null
        const rooms: Room[] = data.map((room: any) => ({
          ...room,
          room_settings: Array.isArray(room.room_settings) && room.room_settings.length > 0
            ? room.room_settings[0]
            : null,
        }));
        setRooms(rooms);
      }
      setLoading(false);
    })();
  }, []);

  const saveSettings = async (r: Room, patch: Partial<NonNullable<Room['room_settings']>>) => {
    const current = r.room_settings ?? { room_id: r.id, notice: null, admins_only_post: false, slow_mode_seconds: 0 };
    const payload = { ...current, ...patch, room_id: r.id };
    await supabase.from('room_settings').upsert(payload);
    // refresh one room
    const idx = rooms.findIndex(x => x.id === r.id);
    const copy = [...rooms];
    copy[idx] = { ...r, room_settings: payload };
    setRooms(copy);
  };

  const togglePublic = async (r: Room, value: boolean) => {
    await supabase.from('rooms').update({ is_public: value }).eq('id', r.id);
    setRooms(prev => prev.map(x => x.id === r.id ? { ...x, is_public: value } : x));
  };

  const createRoom = async () => {
    if (!newRoomName.trim() || !userId) return;
    const { data, error } = await supabase.from('rooms')
      .insert({ name: newRoomName.trim(), is_public: true, created_by: userId })
      .select('id, name, is_public, room_settings ( room_id, notice, admins_only_post, slow_mode_seconds )')
      .single();
    if (!error && data) {
      // Map room_settings from array to object or null
      const newRoom: Room = {
        ...data,
        room_settings: Array.isArray(data.room_settings) && data.room_settings.length > 0
          ? data.room_settings[0]
          : null,
      };
      setRooms(prev => [...prev, newRoom].sort((a, b) => a.name.localeCompare(b.name)));
      setNewRoomName('');
    }
  };

  const deleteRoom = async (r: Room) => {
    if (!confirm(`Delete room "${r.name}"? This removes its messages too.`)) return;
    await supabase.from('rooms').delete().eq('id', r.id);
    setRooms(prev => prev.filter(x => x.id !== r.id));
  };

  if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a>.</div>;
  if (!isAdmin) return <div className="p-6">Not authorized. Admins only.</div>;
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {/* Create room */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold">Create Room</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-lg border p-2"
            placeholder="Room name (e.g., ETFs Global, Crypto 101)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <button onClick={createRoom} className="rounded-lg bg-black px-4 py-2 text-white">
            Create
          </button>
        </div>
      </section>

      {/* Manage rooms */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold">Rooms</h2>

        <div className="mt-4 space-y-4">
          {rooms.map((r) => {
            const s = r.room_settings ?? { room_id: r.id, notice: '', admins_only_post: false, slow_mode_seconds: 0 };
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
                    <div className="text-xs text-gray-500">
                      0 = off. Admins bypass slow-mode.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
