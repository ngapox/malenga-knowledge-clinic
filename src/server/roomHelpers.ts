// src/server/roomHelpers.ts
// NOTE: Only import this from Node runtime files (API routes that declare runtime='nodejs')
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function addMemberToRoom(roomId: string, userId: string) {
  const { error } = await supabaseAdmin.from('room_members').insert({
    room_id: roomId,
    user_id: userId,
  });
  if (error) throw error;
  return true;
}

export async function getRoomById(roomId: string) {
  const { data, error } = await supabaseAdmin.from('rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw error;
  return data;
}
