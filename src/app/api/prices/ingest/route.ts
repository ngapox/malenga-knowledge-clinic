import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    const body = await req.json();
    const as_of_date = body?.as_of_date;
    const rows: { symbol: string; close: number }[] = body?.rows || [];
    if (!as_of_date || !Array.isArray(rows) || rows.length === 0) {
      return new NextResponse('Bad payload', { status: 400 });
    }

    const chunk = 500;
    for (let i = 0; i < rows.length; i += chunk) {
      const batch = rows.slice(i, i + chunk).map((r) => ({
        symbol: r.symbol.toUpperCase(),
        as_of_date,
        close: r.close,
      }));
      const { error } = await supabaseAdmin.from('dse_quotes').upsert(batch);
      if (error) return new NextResponse(error.message, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Server error', { status: 500 });
  }
}