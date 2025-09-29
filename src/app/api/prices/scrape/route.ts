// --- File: src/app/api/prices/scrape/route.ts (Final API Version) ---
import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// This is the official, hidden API endpoint the DSE website uses to get its data.
const DSE_API_URL = 'https://dse.co.tz/php-files/market-equity-data.php';

export async function GET() {
  try {
    console.log('Scraper function started: Calling DSE internal API...');

    // === Part 1: Fetch the structured JSON data directly ===
    const response = await fetch(DSE_API_URL, {
      headers: {
        // The API requires this header to respond correctly.
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DSE API. Status: ${response.status}`);
    }

    const data = await response.json();
    
    // The API returns an object with a key 'data' which is an array of stocks.
    const stockList = data.data;

    if (!stockList || !Array.isArray(stockList) || stockList.length === 0) {
      throw new Error('No data found in the DSE API response.');
    }
    
    // === Part 2: Process the clean data and save to DB ===
    const prices: { symbol: string; close: number }[] = [];
    const as_of_date = new Date().toISOString().slice(0, 10);

    for (const stock of stockList) {
      const symbol = stock[0]?.trim().toUpperCase();
      // The closing price is the 4th item in the array (index 3).
      const closePriceStr = stock[3]?.trim().replace(/,/g, '');
      const closePrice = Number(closePriceStr);

      if (symbol && !isNaN(closePrice) && closePrice > 0) {
        prices.push({ symbol, close: closePrice });
      }
    }
    
    if (prices.length === 0) {
      return NextResponse.json({ ok: true, message: 'API responded but no valid prices could be extracted.' });
    }

    console.log(`Successfully extracted ${prices.length} prices from the API.`);

    const supabaseAdmin = createSupabaseAdmin();
    const recordsToUpsert = prices.map(p => ({
      symbol: p.symbol,
      as_of_date,
      close: p.close,
    }));

    const { error } = await supabaseAdmin.from('dse_quotes').upsert(recordsToUpsert);
    if (error) throw new Error(`Failed to save prices to Supabase: ${error.message}`);

    console.log('Scraper function finished successfully.');
    return NextResponse.json({ ok: true, scraped: prices.length, source: 'DSE Internal API' });

  } catch (e: any) {
    console.error('An error occurred in the scraper:', e.message);
    return new NextResponse(e?.message || 'Server error in scraper', { status: 500 });
  }
}