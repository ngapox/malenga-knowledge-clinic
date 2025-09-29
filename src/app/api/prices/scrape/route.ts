// --- File: src/app/api/prices/scrape/route.ts ---
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// The official DSE Market Report URL
const DSE_URL = 'https://dse.co.tz/dse/market-report';

export async function GET() {
  try {
    console.log('Scraper function started...');

    // === 1. Fetch the HTML content of the DSE page ===
    const response = await fetch(DSE_URL, {
      next: { revalidate: 3600 }, // Cache the response for 1 hour to be polite
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch DSE page. Status: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // === 2. Extract the data from the HTML table ===
    // This selector targets the main table body. NOTE: This might change if DSE updates their website.
    const rows = $('table#tbl-listed-securities tbody tr');
    const prices: { symbol: string; close: number }[] = [];
    const as_of_date = new Date().toISOString().slice(0, 10); // Use today's date

    rows.each((index, element) => {
      const tds = $(element).find('td');
      if (tds.length >= 5) { // Ensure the row has enough columns
        const symbol = $(tds[0]).text().trim().toUpperCase();
        const closePriceStr = $(tds[4]).text().trim().replace(/,/g, ''); // Get "Close Price" column and remove commas
        const closePrice = Number(closePriceStr);

        if (symbol && !isNaN(closePrice)) {
          prices.push({ symbol, close: closePrice });
        }
      }
    });

    if (prices.length === 0) {
      console.log('No prices found on the DSE page. The table structure may have changed.');
      return NextResponse.json({ ok: true, message: 'No prices found, scraper might need an update.' });
    }

    console.log(`Successfully scraped ${prices.length} prices.`);

    // === 3. Save the extracted data to your Supabase table ===
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
    return NextResponse.json({ ok: true, scraped: prices.length });

  } catch (e: any) {
    console.error('An error occurred in the scraper:', e.message);
    return new NextResponse(e?.message || 'Server error in scraper', { status: 500 });
  }
}