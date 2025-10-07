// src/app/api/quotes/latest/route.ts
export const runtime = 'edge'; // optional — edge is default for app routes without node runtime

import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Missing SUPABASE env vars for Edge REST usage');
}

export async function GET(req: Request) {
  try {
    // Example: fetch recent quotes for provided symbols via Supabase REST
    const url = new URL(`${SUPABASE_URL}/rest/v1/dse_quotes`);
    // filter by query param ?symbols=A,B,C  (optional)
    const symbolsParam = new URL(req.url).searchParams.get('symbols');
    if (symbolsParam) {
      // Supabase REST supports in filters via ?symbol=in.(A,B)
      url.searchParams.set('select', 'symbol,as_of_date,close');
      url.searchParams.set('symbol', `in.(${symbolsParam})`);
    } else {
      url.searchParams.set('select', 'symbol,as_of_date,close');
      url.searchParams.set('order', 'as_of_date.desc');
      url.searchParams.set('limit', '100');
    }

    const resp = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
      // Edge runtime supports fetch
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new NextResponse(`Supabase REST error: ${resp.status} ${text}`, { status: 502 });
    }

    const data = await resp.json();
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error('Edge REST route error', e);
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown' }, { status: 500 });
  }
}
