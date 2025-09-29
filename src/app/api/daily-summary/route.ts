// src/app/api/daily-summary/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseAdmin = createSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: prices, error } = await supabaseAdmin
    .from('dse_quotes')
    .select('symbol, close')
    .eq('as_of_date', today);

  if (error) {
    console.error('Error fetching prices from Supabase:', error);
    return new NextResponse('Error fetching prices', { status: 500 });
  }

  // TODO: Replace with more sophisticated logic
  const topNotes = prices && prices.length > 0
    ? prices.slice(0, 2).map(p => `${p.symbol} closed at ${p.close}`)
    : ['No prices available for today'];

  const summary = {
    date: today,
    market_snapshot: prices && prices.length > 0
      ? `DSE market data for ${today}. ${prices.length} stocks updated.`
      : 'No market data available for today.',
    top_notes: topNotes,
    bonds: {
      upcoming: '15-year T-Bond auction next week',
      last_result: 'Prev auction oversubscribed (demo)',
    },
    tip: 'Invest consistently; time in the market beats timing the market.',
  };

  return NextResponse.json(summary);
}