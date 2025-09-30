// src/app/page.tsx
import DailySummary from '@/components/DailySummary';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

// We move the data fetching logic directly into the server component
async function getDailySummary() {
  const supabaseAdmin = createSupabaseAdmin();

  // Find the most recent date in the database
  const { data: mostRecentDateData, error: dateError } = await supabaseAdmin
    .from('dse_quotes')
    .select('as_of_date')
    .order('as_of_date', { ascending: false })
    .limit(1)
    .single();

  if (dateError || !mostRecentDateData) {
    console.error('Could not find most recent date:', dateError);
    // Return a default structure if no data is found
    return {
      date: new Date().toISOString().slice(0, 10),
      market_snapshot: 'No market data available yet. Please check back later.',
      gainers: [],
      losers: [],
      bonds: { upcoming: 'T-Bond auctions are announced periodically.', last_result: 'N/A' },
      tip: 'Invest consistently; time in the market beats timing the market.',
    };
  }

  const todayStr = mostRecentDateData.as_of_date;
  const today = new Date(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Fetch prices for the most recent and previous day
  const { data: todayPrices, error: todayError } = await supabaseAdmin
    .from('dse_quotes')
    .select('symbol, close')
    .eq('as_of_date', todayStr);

  const { data: yesterdayPrices, error: yesterdayError } = await supabaseAdmin
    .from('dse_quotes')
    .select('symbol, close')
    .eq('as_of_date', yesterdayStr);

  if (todayError || yesterdayError) {
    console.error('Data fetching error:', todayError || yesterdayError);
    // Handle cases where data might be missing for a day
  }

  const priceChanges = (todayPrices || []).map(todayPrice => {
    const yesterdayPrice = (yesterdayPrices || []).find(p => p.symbol === todayPrice.symbol);
    if (yesterdayPrice) {
      const change = todayPrice.close - yesterdayPrice.close;
      const percentageChange = (change / yesterdayPrice.close) * 100;
      return { ...todayPrice, change, percentageChange };
    }
    return { ...todayPrice, change: 0, percentageChange: 0 };
  });

  const gainers = priceChanges.filter(p => p.change > 0).sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 3);
  const losers = priceChanges.filter(p => p.change < 0).sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 3);

  return {
    date: todayStr,
    market_snapshot: `DSE market data for ${todayStr}. ${todayPrices?.length || 0} stocks updated.`,
    gainers,
    losers,
    bonds: {
      upcoming: '15-year T-Bond auction next week',
      last_result: 'Prev auction oversubscribed (demo)',
    },
    tip: 'Invest consistently; time in the market beats timing the market.',
  };
}

export default async function Home() {
  const summary = await getDailySummary();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <DailySummary summary={summary} />
      </div>
    </main>
  );
}