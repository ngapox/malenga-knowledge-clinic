'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import RoomNotice from '@/components/RoomNotice';

type Room = { id: string; name: string; is_public: boolean };
type Message = { id: number; room_id: string; user_id: string; content: string; created_at: string };

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Hydrate session and keep in sync
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch admin flag when we have a user
  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data?.is_admin)));
  }, [userId]);

  // Load rooms once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('rooms').select('*').order('name');
      if (!error && data) {
        setRooms(data as Room[]);
        if (!activeRoom && data.length > 0) setActiveRoom(data[0] as Room);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages for active room
  useEffect(() => {
    (async () => {
      if (!activeRoom) return;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });
      if (!error && data) setMessages(data as Message[]);
    })();
  }, [activeRoom]);

  // Realtime subscription for active room
  useEffect(() => {
    if (!activeRoom) return;

    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${activeRoom.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeRoom]);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message with friendly errors
  const handleSend = async () => {
    if (!userId || !activeRoom || !text.trim()) return;
    setSendError(null);

    const { error } = await supabase.from('messages').insert({
      room_id: activeRoom.id,
      user_id: userId,
      content: text.trim(),
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('messages_no_profanity') || msg.includes('check constraint')) {
        setSendError('Message blocked due to language. Please rephrase.');
      } else if (msg.includes('policy') || msg.includes('violates row-level security')) {
        setSendError('You do not have permission to send that message.');
      } else {
        setSendError(error.message);
      }
      return;
    }
    setText('');
  };

  // Admin delete a message
  const deleteMessage = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm('Delete this message?')) return;
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } else {
      alert(error.message);
    }
  };

  if (loadingAuth) return <div className="p-6">Signing you in…</div>;
  if (!userId) return <div className="p-6">Please <a className="underline" href="/auth">sign in</a> to chat.</div>;

  return (
    <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 p-6 md:grid-cols-4">
      {/* Rooms */}
      <aside className="md:col-span-1 rounded-xl border bg-white">
        <div className="border-b p-4 font-semibold">Chatrooms</div>
        <ul>
          {rooms.map((r) => (
            <li
              key={r.id}
              className={`cursor-pointer p-3 hover:bg-gray-50 ${activeRoom?.id === r.id ? 'bg-gray-50' : ''}`}
              onClick={() => setActiveRoom(r)}
            >
              {r.name}
            </li>
          ))}
        </ul>
      </aside>

      {/* Messages */}
      <section className="md:col-span-3 flex flex-col rounded-xl border bg-white">
        <div className="border-b p-4 font-semibold">{activeRoom?.name ?? 'Select a room'}</div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {/* Pinned notice for the active room (dynamic from DB) */}
          <RoomNotice roomId={activeRoom?.id} />

          {messages.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 rounded-lg bg-gray-100 p-3 text-sm">
              <div>
                <div className="text-gray-800">{m.content}</div>
                <div className="text-[11px] text-gray-500">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  className="text-xs text-red-600 hover:underline"
                  title="Delete message"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <input
              className="w-full rounded-lg border p-2"
              placeholder="Type a message…"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (sendError) setSendError(null);
              }}
              onKeyDown={(e) => (e.key === 'Enter' ? handleSend() : null)}
            />
            <button onClick={handleSend} className="rounded-lg bg-black px-4 py-2 text-white">
              Send
            </button>
          </div>
          {sendError && <div className="mt-2 text-sm text-red-600">{sendError}</div>}
        </div>
      </section>
    </main>
  );
}
