'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import RoomNotice from '@/components/RoomNotice';
import ReactionBar from '@/components/ReactionBar';

type Room = { id: string; name: string; is_public: boolean };
type Message = { id: number; room_id: string; user_id: string; content: string; created_at: string };
type ReactionMap = Record<number, Record<string, { count: number; me: boolean }>>;
type Member = { user_id: string; profiles?: { full_name: string | null } | null };
type ProfileMap = Record<string, { full_name?: string | null; avatar_url?: string | null }>;

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [profiles, setProfiles] = useState<ProfileMap>({}); // user_id -> profile

  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ============ Auth ============
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
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data?.is_admin)));
  }, [userId]);

  // ============ Rooms ============
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('rooms').select('*').order('name');
      if (error) {
        console.error('rooms select error:', error.message);   
      }
      if (!error && data) {
        setRooms(data as Room[]);
        if (!activeRoom && data.length > 0) setActiveRoom(data[0] as Room);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load members of active room (for mentions)
  useEffect(() => {
    (async () => {
      if (!activeRoom) { setMembers([]); return; }
      const { data, error } = await supabase
        .from('room_members')
        .select('user_id, profiles(full_name)')
        .eq('room_id', activeRoom.id);
      if (!error && data) {
        setMembers(
          (data as any[]).map((row) => ({
            user_id: row.user_id,
            profiles: Array.isArray(row.profiles)
              ? row.profiles[0] || null
              : row.profiles ?? null,
          }))
        );
      }
    })();
  }, [activeRoom]);

  // ============ Messages & author profiles ============
  useEffect(() => {
    (async () => {
      if (!activeRoom) return;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });
      if (!error && data) setMessages(data as Message[]);
      setReactions({});
      setProfiles({});
    })();
  }, [activeRoom]);

  // Fetch author profiles for the current message list
  useEffect(() => {
    const ids = Array.from(new Set(messages.map(m => m.user_id)));
    if (ids.length === 0) { setProfiles({}); return; }
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids as string[]);
      if (error || !data) return;
      const map: ProfileMap = {};
      for (const row of data as any[]) {
        map[row.id] = { full_name: row.full_name, avatar_url: row.avatar_url };
      }
      setProfiles(map);
    })();
  }, [messages]);

  // Load reactions whenever message count changes (cheap)
  useEffect(() => {
    const ids = messages.map(m => m.id);
    if (ids.length === 0 || !userId) { setReactions({}); return; }
    (async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', ids as number[]);
      if (error || !data) return;
      const map: ReactionMap = {};
      for (const row of data as any[]) {
        map[row.message_id] ||= {};
        map[row.message_id][row.emoji] ||= { count: 0, me: false };
        map[row.message_id][row.emoji].count += 1;
        if (row.user_id === userId) map[row.message_id][row.emoji].me = true;
      }
      setReactions(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, userId]);

  // Realtime new messages
  useEffect(() => {
    if (!activeRoom) return;
    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${activeRoom.id}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [activeRoom]);

  // Scroll down on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============ Sending ============
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
    setMentionOpen(false);
  };

  // ============ Admin delete ============
  const deleteMessage = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm('Delete this message?')) return;
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      setReactions(prev => { const c = { ...prev }; delete c[id]; return c; });
    } else {
      alert(error.message);
    }
  };

  // ============ Reactions ============
  const toggleReaction = async (messageId: number, emoji: string) => {
    if (!userId) return;
    const current = reactions[messageId]?.[emoji]?.me === true;
    if (current) {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('emoji', emoji)
        .eq('user_id', userId);
      if (!error) {
        setReactions(prev => {
          const msg = { ...(prev[messageId] || {}) };
          const entry = msg[emoji];
          if (entry) {
            const nextCount = Math.max(0, entry.count - 1);
            msg[emoji] = { count: nextCount, me: false };
            if (nextCount === 0) delete msg[emoji];
          }
          return { ...prev, [messageId]: msg };
        });
      }
    } else {
      const { error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, emoji, user_id: userId });
      if (!error) {
        setReactions(prev => {
          const msg = { ...(prev[messageId] || {}) };
          const entry = msg[emoji] || { count: 0, me: false };
          msg[emoji] = { count: entry.count + 1, me: true };
          return { ...prev, [messageId]: msg };
        });
      }
    }
  };

  // ============ Mentions ============
  const memberOptions = useMemo(
    () =>
      members
        .map(m => ({
          id: m.user_id,
          label: m.profiles?.full_name?.trim() || `user-${m.user_id.slice(0, 6)}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [members]
  );

  const findAtToken = (value: string, caret: number) => {
    const uptoCaret = value.slice(0, caret);
    const lastSpace = Math.max(uptoCaret.lastIndexOf(' '), uptoCaret.lastIndexOf('\n'));
    const token = uptoCaret.slice(lastSpace + 1);
    if (token.startsWith('@')) return { token, start: lastSpace + 1 };
    return null;
  };

  const onTextChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value;
    setText(v);
    setSendError(null);

    const caret = e.target.selectionStart ?? v.length;
    const at = findAtToken(v, caret);
    if (at) {
      const q = at.token.slice(1).toLowerCase();
      setMentionQuery(q);
      setMentionOpen(true);
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
      setMentionQuery('');
    }
  };

  const filteredMentions = useMemo(() => {
    const q = mentionQuery.trim();
    if (!mentionOpen) return [];
    if (!q) return memberOptions.slice(0, 8);
    return memberOptions.filter(m => m.label.toLowerCase().includes(q)).slice(0, 8);
  }, [mentionOpen, mentionQuery, memberOptions]);

  const applyMention = (label: string) => {
    const el = inputRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? text.length;
    const at = findAtToken(text, caret);
    if (!at) return;
    const before = text.slice(0, at.start);
    const after = text.slice(caret);
    const inserted = `@${label} `;
    const next = before + inserted + after;
    setText(next);
    setMentionOpen(false);
    const newPos = (before + inserted).length;
    setTimeout(() => {
      inputRef.current?.setSelectionRange(newPos, newPos);
      inputRef.current?.focus();
    }, 0);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!mentionOpen || filteredMentions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(i => (i + 1) % filteredMentions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex(i => (i - 1 + filteredMentions.length) % filteredMentions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyMention(filteredMentions[mentionIndex].label);
    } else if (e.key === 'Escape') {
      setMentionOpen(false);
    }
  };

  const renderWithMentions = (content: string) => {
    return content.split(/\s+/).map((w, i) => {
      if (w.startsWith('@') && w.length > 1) {
        return <span key={i} className="text-blue-600">{w}</span>;
      }
      return <span key={i}>{w}</span>;
    }).reduce((acc: any[], el, i) => (i ? [...acc, ' ', el] : [el]), []);
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
              title={r.is_public ? 'Public room' : 'Private room'}
            >
              {r.name} {!r.is_public && <span className="text-xs text-gray-500">(private)</span>}
            </li>
          ))}
        </ul>
      </aside>

      {/* Messages */}
      <section className="md:col-span-3 flex flex-col rounded-xl border bg-white">
        <div className="border-b p-4 font-semibold">{activeRoom?.name ?? 'Select a room'}</div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <RoomNotice roomId={activeRoom?.id} />

          {messages.map((m) => {
            const p = profiles[m.user_id] || {};
            const initials = (p.full_name || 'Member').trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();
            return (
              <div key={m.id} className="rounded-lg bg-gray-100 p-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 overflow-hidden rounded-full border bg-white">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="mb-0.5 text-[12px] font-medium text-gray-700">
                      {p.full_name || 'Member'}{' '}
                      <span className="text-gray-400">· {new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-800">{renderWithMentions(m.content)}</div>

                    <ReactionBar
                      reactions={reactions[m.id]}
                      onToggle={(emoji) => toggleReaction(m.id, emoji)}
                    />
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => deleteMessage(m.id)}
                      className="ml-2 text-xs text-red-600 hover:underline"
                      title="Delete message"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="relative border-t p-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="w-full rounded-lg border p-2"
              placeholder="Type a message… Use @ to mention"
              value={text}
              onChange={onTextChange}
              onKeyDown={onKeyDown}
              onBlur={() => setTimeout(() => setMentionOpen(false), 150)}
              onFocus={(e) => {
                const caret = e.currentTarget.selectionStart ?? e.currentTarget.value.length;
                const at = (() => {
                  const v = e.currentTarget.value;
                  const uptoCaret = v.slice(0, caret);
                  const lastSpace = Math.max(uptoCaret.lastIndexOf(' '), uptoCaret.lastIndexOf('\n'));
                  const token = uptoCaret.slice(lastSpace + 1);
                  return token.startsWith('@');
                })();
                setMentionOpen(Boolean(at));
              }}
            />
            <button onClick={handleSend} className="rounded-lg bg-black px-4 py-2 text-white">
              Send
            </button>
          </div>
          {sendError && <div className="mt-2 text-sm text-red-600">{sendError}</div>}

          {/* Mention dropdown */}
          {mentionOpen && filteredMentions.length > 0 && (
            <div className="absolute left-3 top-[-8.5rem] z-10 max-h-40 w-[22rem] overflow-auto rounded-xl border bg-white shadow">
              {filteredMentions.map((m, i) => (
                <div
                  key={m.id}
                  className={`cursor-pointer px-3 py-2 text-sm ${i === mentionIndex ? 'bg-gray-100' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); applyMention(m.label); }}
                  onMouseEnter={() => setMentionIndex(i)}
                >
                  @{m.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
