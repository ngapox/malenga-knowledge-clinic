// --- File: src/app/api/prices/scrape/route.ts ---
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// CORRECTED: This is the new URL for the DSE market data page.
const DSE_URL = 'https://dse.co.tz/market-data/';

export async function GET() {
  try {
    console.log('Scraper function started...');

    const response = await fetch(DSE_URL, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch DSE page. Status: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // CORRECTED: This is the new selector for the main market data table.
    const rows = $('table#dataTable tbody tr');
    const prices: { symbol: string; close: number }[] = [];
    const as_of_date = new Date().toISOString().slice(0, 10);

    rows.each((index, element) => {
      const tds = $(element).find('td');
      if (tds.length >= 8) { // The new table has more columns
        const symbol = $(tds[0]).text().trim().toUpperCase();
        // CORRECTED: The "Closing Price" is now in the 8th column (index 7).
        const closePriceStr = $(tds[7]).text().trim().replace(/,/g, '');
        const closePrice = Number(closePriceStr);

        if (symbol && !isNaN(closePrice) && closePrice > 0) {
          prices.push({ symbol, close: closePrice });
        }
      }
    });

    if (prices.length === 0) {
      console.log('No prices found on the DSE page. The table structure may have changed.');
      return NextResponse.json({ ok: true, message: 'No prices found, scraper might need an update.' });
    }

    console.log(`Successfully scraped ${prices.length} prices.`);

    const supabaseAdmin = createSupabaseAdmin();
    const recordsToUpsert = prices.map(p => ({
      symbol: p.symbol,
      as_of_date,
      close: p.close,
    }));

    const { error } = await supabaseAdmin.from('dse_quotes').upsert(recordsToUpsert);

    if (error) {
      console.error('Supabase upsert error:', error.message);
      throw new Error(`Failed to save prices to Supabase: ${error.message}`);
    }

    console.log('Scraper function finished successfully.');
    return NextResponse.json({ ok: true, scraped: prices.length, source: 'DSE Website' });

  } catch (e: any) {
    console.error('An error occurred in the scraper:', e.message);
    return new NextResponse(e?.message || 'Server error in scraper', { status: 500 });
  }
}