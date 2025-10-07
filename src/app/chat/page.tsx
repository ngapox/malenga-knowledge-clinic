// src/app/chat/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import RoomNotice from '@/components/RoomNotice';
import ReactionBar from '@/components/ReactionBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Hash, Lock, Trash2, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [profiles, setProfiles] = useState<ProfileMap>({});
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

  // Authentication and Room/Message fetching logic (remains the same)
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

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('rooms').select('*').order('name');
      if (!error && data) {
        setRooms(data as Room[]);
        if (!activeRoom && data.length > 0) setActiveRoom(data[0] as Room);
      }
    })();
  }, []);
  
  useEffect(() => {
    if (!activeRoom) { setMembers([]); return; }
    (async () => {
      const { data, error } = await supabase.from('room_members').select('user_id, profiles(full_name)').eq('room_id', activeRoom.id);
      if (!error && data) {
        setMembers((data as any[]).map((row) => ({ user_id: row.user_id, profiles: Array.isArray(row.profiles) ? row.profiles[0] || null : row.profiles ?? null })));
      }
    })();
  }, [activeRoom]);
  
  useEffect(() => {
    if (!activeRoom) return;
    (async () => {
      const { data, error } = await supabase.from('messages').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: true });
      if (!error && data) setMessages(data as Message[]);
      setReactions({});
      setProfiles({});
    })();
  }, [activeRoom]);

  useEffect(() => {
    const ids = Array.from(new Set(messages.map(m => m.user_id)));
    if (ids.length === 0) { setProfiles({}); return; }
    (async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids as string[]);
      if (error || !data) return;
      const map: ProfileMap = {};
      for (const row of data as any[]) {
        map[row.id] = { full_name: row.full_name, avatar_url: row.avatar_url };
      }
      setProfiles(map);
    })();
  }, [messages]);
  
  useEffect(() => {
    const ids = messages.map(m => m.id);
    if (ids.length === 0 || !userId) { setReactions({}); return; }
    (async () => {
      const { data, error } = await supabase.from('message_reactions').select('message_id, user_id, emoji').in('message_id', ids as number[]);
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
  }, [messages.length, userId]);

  useEffect(() => {
    if (!activeRoom) return;
    const channel = supabase.channel(`room-${activeRoom.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${activeRoom.id}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [activeRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sending, Deleting, and Reaction logic (remains the same)
  const handleSend = async () => {
    if (!userId || !activeRoom || !text.trim()) return;
    setSendError(null);
    const { error } = await supabase.from('messages').insert({ room_id: activeRoom.id, user_id: userId, content: text.trim() });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('policy') || msg.includes('violates row-level security')) {
        setSendError('You do not have permission to send messages in this room.');
      } else {
        setSendError(error.message);
      }
      return;
    }
    setText('');
    setMentionOpen(false);
  };

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

  const toggleReaction = async (messageId: number, emoji: string) => {
    if (!userId) return;
    const current = reactions[messageId]?.[emoji]?.me === true;
    if (current) {
      await supabase.from('message_reactions').delete().match({ message_id: messageId, emoji, user_id: userId });
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
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, emoji, user_id: userId });
      setReactions(prev => {
        const msg = { ...(prev[messageId] || {}) };
        const entry = msg[emoji] || { count: 0, me: false };
        msg[emoji] = { count: entry.count + 1, me: true };
        return { ...prev, [messageId]: msg };
      });
    }
  };
  
  // Mentions logic (remains the same)
  const memberOptions = useMemo(() => members.map(m => ({ id: m.user_id, label: m.profiles?.full_name?.trim() || `user-${m.user_id.slice(0, 6)}` })).sort((a, b) => a.label.localeCompare(b.label)), [members]);
  const findAtToken = (value: string, caret: number) => { const uptoCaret = value.slice(0, caret); const lastSpace = Math.max(uptoCaret.lastIndexOf(' '), uptoCaret.lastIndexOf('\n')); const token = uptoCaret.slice(lastSpace + 1); if (token.startsWith('@')) return { token, start: lastSpace + 1 }; return null; };
  const onTextChange: React.ChangeEventHandler<HTMLInputElement> = (e) => { const v = e.target.value; setText(v); setSendError(null); const caret = e.target.selectionStart ?? v.length; const at = findAtToken(v, caret); if (at) { const q = at.token.slice(1).toLowerCase(); setMentionQuery(q); setMentionOpen(true); setMentionIndex(0); } else { setMentionOpen(false); setMentionQuery(''); } };
  const filteredMentions = useMemo(() => { const q = mentionQuery.trim(); if (!mentionOpen) return []; if (!q) return memberOptions.slice(0, 8); return memberOptions.filter(m => m.label.toLowerCase().includes(q)).slice(0, 8); }, [mentionOpen, mentionQuery, memberOptions]);
  const applyMention = (label: string) => { const el = inputRef.current; if (!el) return; const caret = el.selectionStart ?? text.length; const at = findAtToken(text, caret); if (!at) return; const before = text.slice(0, at.start); const after = text.slice(caret); const inserted = `@${label} `; const next = before + inserted + after; setText(next); setMentionOpen(false); const newPos = (before + inserted).length; setTimeout(() => { inputRef.current?.setSelectionRange(newPos, newPos); inputRef.current?.focus(); }, 0); };
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => { if (!mentionOpen || filteredMentions.length === 0) return; if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % filteredMentions.length); } else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + filteredMentions.length) % filteredMentions.length); } else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(filteredMentions[mentionIndex].label); } else if (e.key === 'Escape') { setMentionOpen(false); } };
  const renderWithMentions = (content: string) => content.split(/\s+/).map((w, i) => (w.startsWith('@') && w.length > 1) ? <span key={i} className="text-primary font-semibold">{w}</span> : <span key={i}>{w}</span>).reduce((acc: any[], el, i) => i ? [...acc, ' ', el] : [el], []);

  // Conditional rendering for auth state
  if (loadingAuth) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  if (!userId) return <div className="p-6 text-center">Please <a className="underline text-primary" href="/auth">sign in</a> to join the chat.</div>;

  // New JSX for the redesigned UI
  return (
    <main className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-[calc(100vh-10rem)] gap-6">
      {/* Rooms Sidebar */}
      <aside className="bg-card border rounded-lg flex flex-col">
        <div className="p-4 font-bold border-b text-lg">Chatrooms</div>
        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms.map((r) => (
            <li
              key={r.id}
              className={`flex items-center gap-3 cursor-pointer p-2 rounded-md transition-colors ${activeRoom?.id === r.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/50'}`}
              onClick={() => setActiveRoom(r)}
            >
              {r.is_public ? <Hash className="w-5 h-5 text-muted-foreground" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
              <span>{r.name}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Chat Area */}
      <section className="bg-card border rounded-lg flex flex-col">
        {activeRoom ? (
          <>
            <div className="p-4 font-bold border-b text-lg flex items-center gap-2">
              <span className="text-muted-foreground">#</span>
              <span>{activeRoom.name}</span>
            </div>
            
            <div className="flex-1 space-y-1 overflow-y-auto p-4">
              <RoomNotice roomId={activeRoom.id} />
              <AnimatePresence>
                {messages.map((m) => {
                  const p = profiles[m.user_id] || {};
                  const initials = (p.full_name || 'M').trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();
                  return (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="group flex items-start gap-4 p-2 rounded-md hover:bg-muted/50"
                    >
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm select-none">
                        {p.avatar_url ? <img src={p.avatar_url} alt="avatar" className="h-full w-full object-cover rounded-full" /> : <span>{initials}</span>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm">{p.full_name || 'Member'}</span>
                          <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-foreground/90">{renderWithMentions(m.content)}</div>
                        <ReactionBar reactions={reactions[m.id]} onToggle={(emoji) => toggleReaction(m.id, emoji)} />
                      </div>
                      {isAdmin && (
                        <Button
                          onClick={() => deleteMessage(m.id)}
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            <div className="relative border-t p-4">
              {mentionOpen && filteredMentions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-4 mb-2 w-72 max-h-48 overflow-y-auto bg-popover border rounded-lg shadow-lg p-1"
                >
                  {filteredMentions.map((m, i) => (
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 cursor-pointer px-3 py-2 text-sm rounded-md ${i === mentionIndex ? 'bg-muted' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); applyMention(m.label); }}
                      onMouseEnter={() => setMentionIndex(i)}
                    >
                      <AtSign className="w-4 h-4 text-muted-foreground" />
                      <span>{m.label}</span>
                    </div>
                  ))}
                </motion.div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
                <Input
                  ref={inputRef}
                  className="bg-muted/50"
                  placeholder={`Message #${activeRoom.name}`}
                  value={text}
                  onChange={onTextChange}
                  onKeyDown={onKeyDown}
                  onBlur={() => setTimeout(() => setMentionOpen(false), 150)}
                  onFocus={onTextChange}
                />
                <Button type="submit" size="icon" disabled={!text.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
              </form>
              {sendError && <div className="mt-2 text-sm text-destructive">{sendError}</div>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a room to start chatting</p>
          </div>
        )}
      </section>
    </main>
  );
}