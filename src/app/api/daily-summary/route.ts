// src/app/api/daily-summary/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

async function getMarketData() {
  const supabaseAdmin = createSupabaseAdmin();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const { data: todayPrices, error: todayError } = await supabaseAdmin
    .from('dse_quotes')
    .select('symbol, close')
    .eq('as_of_date', todayStr);

  if (todayError) {
    console.error('Error fetching today\'s prices:', todayError);
    return { todayPrices: [], yesterdayPrices: [] };
  }

  const { data: yesterdayPrices, error: yesterdayError } = await supabaseAdmin
    .from('dse_quotes')
    .select('symbol, close')
    .eq('as_of_date', yesterdayStr);

  if (yesterdayError) {
    console.error('Error fetching yesterday\'s prices:', yesterdayError);
    return { todayPrices: todayPrices || [], yesterdayPrices: [] };
  }

  return { todayPrices: todayPrices || [], yesterdayPrices: yesterdayPrices || [] };
}

export async function GET() {
  const { todayPrices, yesterdayPrices } = await getMarketData();

  const priceChanges = todayPrices.map(todayPrice => {
    const yesterdayPrice = yesterdayPrices.find(p => p.symbol === todayPrice.symbol);
    if (yesterdayPrice) {
      const change = todayPrice.close - yesterdayPrice.close;
      const percentageChange = (change / yesterdayPrice.close) * 100;
      return { ...todayPrice, change, percentageChange };
    }
    return { ...todayPrice, change: 0, percentageChange: 0 };
  });

  const gainers = priceChanges.filter(p => p.change > 0).sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 3);
  const losers = priceChanges.filter(p => p.change < 0).sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 3);

  const summary = {
    date: new Date().toISOString().slice(0, 10),
    market_snapshot: `DSE market data for today. ${todayPrices.length} stocks updated.`,
    gainers,
    losers,
    bonds: {
      upcoming: '15-year T-Bond auction next week',
      last_result: 'Prev auction oversubscribed (demo)',
    },
    tip: 'Invest consistently; time in the market beats timing the market.',
  };

  return NextResponse.json(summary);
}