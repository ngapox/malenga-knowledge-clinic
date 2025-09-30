// src/app/page.tsx
import DailySummary from '@/components/DailySummary';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

async function getDailySummary() {
  console.log('--- Starting getDailySummary ---');
  const supabaseAdmin = createSupabaseAdmin();

  // 1. Find the most recent date available in the database
  const { data: mostRecentDateData, error: dateError } = await supabaseAdmin
    .from('dse_quotes')
    .select('as_of_date')
    .order('as_of_date', { ascending: false })
    .limit(1)
    .single();

  if (dateError || !mostRecentDateData) {
    console.error('🔴 Could not find most recent date:', dateError);
    return {
      date: new Date().toISOString().slice(0, 10),
      market_snapshot: 'No market data available yet. Scraper may need to run first.',
      gainers: [],
      losers: [],
      bonds: { upcoming: 'T-Bond auctions are announced periodically.', last_result: 'N/A' },
      tip: 'Invest consistently; time in the market beats timing the market.',
    };
  }

  const latestDateStr = mostRecentDateData.as_of_date;
  console.log(`🔍 Found most recent date: ${latestDateStr}`);

  // 2. Find the most recent date BEFORE the latest one (the previous trading day)
  const { data: previousDateData, error: prevDateError } = await supabaseAdmin
    .from('dse_quotes')
    .select('as_of_date')
    .lt('as_of_date', latestDateStr) // 'lt' means "less than"
    .order('as_of_date', { ascending: false })
    .limit(1)
    .single();

  if (prevDateError || !previousDateData) {
    console.error('🔴 Could not find previous trading date:', prevDateError);
    // If there's no previous day, we can't calculate changes.
    // We'll still fetch today's data to show something.
    const { data: todayPrices } = await supabaseAdmin.from('dse_quotes').select('symbol, close').eq('as_of_date', latestDateStr);
    return {
      date: latestDateStr,
      market_snapshot: `DSE market data for ${latestDateStr}. ${todayPrices?.length || 0} stocks updated. No previous day data to compare.`,
      gainers: [],
      losers: [],
      bonds: { upcoming: '15-year T-Bond auction next week', last_result: 'Prev auction oversubscribed (demo)' },
      tip: 'Invest consistently; time in the market beats timing the market.',
    };
  }

  const previousDateStr = previousDateData.as_of_date;
  console.log(`📈 Found previous trading day: ${previousDateStr}`);

  // 3. Fetch prices for both the latest and previous trading days
  const { data: todayPrices } = await supabaseAdmin.from('dse_quotes').select('symbol, close').eq('as_of_date', latestDateStr);
  const { data: yesterdayPrices } = await supabaseAdmin.from('dse_quotes').select('symbol, close').eq('as_of_date', previousDateStr);
  
  console.log(`📊 Latest prices (${latestDateStr}):`, todayPrices ? `${todayPrices.length} records found.` : 'No records.');
  console.log(`📈 Previous prices (${previousDateStr}):`, yesterdayPrices ? `${yesterdayPrices.length} records found.` : 'No records.');


  const priceChanges = (todayPrices || []).map(todayPrice => {
    const yesterdayPrice = (yesterdayPrices || []).find(p => p.symbol === todayPrice.symbol);
    if (yesterdayPrice && yesterdayPrice.close > 0) { // Avoid division by zero
      const change = todayPrice.close - yesterdayPrice.close;
      const percentageChange = (change / yesterdayPrice.close) * 100;
      return { ...todayPrice, change, percentageChange };
    }
    return { ...todayPrice, change: 0, percentageChange: 0 };
  });

  const gainers = priceChanges.filter(p => p.change > 0).sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 3);
  const losers = priceChanges.filter(p => p.change < 0).sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 3);

  console.log('🏆 Gainers found:', gainers);
  console.log('📉 Losers found:', losers);
  console.log('--- Finished getDailySummary ---');

  return {
    date: latestDateStr,
    market_snapshot: `DSE market data for ${latestDateStr}. ${todayPrices?.length || 0} stocks updated.`,
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