// src/app/api/rooms/add-member/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { addMemberToRoom } from '@/server/roomHelpers';

export async function POST(req: Request) {
  const { roomId, userId } = await req.json();
  await addMemberToRoom(roomId, userId);
  return NextResponse.json({ ok: true });
}
