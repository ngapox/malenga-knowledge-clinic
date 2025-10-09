// src/app/api/alerts/check/route.ts
export const runtime = 'nodejs'; // IMPORTANT: Node runtime so @supabase/supabase-js works

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Example: read watchlist items (server-only action)
    const { data: items, error: wlErr } = await supabaseAdmin
      .from('watchlist_items')
      .select('id, user_id, symbol, alert_above, alert_below');

    if (wlErr) throw wlErr;

    // (Do whatever you need with items — this is a sample response)
    return NextResponse.json({ ok: true, count: items?.length ?? 0 });
  } catch (err: any) {
    console.error('alerts.check error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}
