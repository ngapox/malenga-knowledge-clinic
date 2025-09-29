// --- File: src/app/api/prices/scrape/route.ts ---
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DSE_HOMEPAGE_URL = 'https://dse.co.tz/';

// This needs to be the absolute URL of your deployed application
const VERCEL_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

export async function GET() {
  try {
    // === Part 1: Find the Link to the Latest Report PDF ===
    console.log('Fetching DSE homepage to find the latest report link...');
    const homePageResponse = await fetch(DSE_HOMEPAGE_URL);
    if (!homePageResponse.ok) throw new Error('Failed to fetch DSE homepage.');
    
    const html = await homePageResponse.text();
    const $ = cheerio.load(html);

    const reportPath = $('div#daily-reports a.btn').first().attr('href');
    if (!reportPath) throw new Error('Could not find the link to the daily report PDF.');

    const reportUrl = new URL(reportPath, DSE_HOMEPAGE_URL).href;
    console.log(`Found latest report URL: ${reportUrl}`);

    // === Part 2: Call our own helper API to parse the PDF ===
    console.log('Calling our internal PDF parsing service...');
    const parseApiUrl = `${VERCEL_URL}/api/parse-pdf?url=${encodeURIComponent(reportUrl)}`;
    const pdfTextResponse = await fetch(parseApiUrl);
    
    if (!pdfTextResponse.ok) {
      const errorText = await pdfTextResponse.text();
      throw new Error(`PDF parsing failed: ${errorText}`);
    }

    const { text: pdfText } = await pdfTextResponse.json();
    console.log('Successfully received parsed PDF text.');
    
    // === Part 3: Extract Prices and Save to DB (same as before) ===
    const prices: { symbol: string; close: number }[] = [];
    const as_of_date = new Date().toISOString().slice(0, 10);
    const lines = pdfText.split('\n');
    let dataSectionStarted = false;

    for (const line of lines) {
      if (line.trim().toUpperCase().includes('EQUITY MARKET')) {
        dataSectionStarted = true;
        continue;
      }
      if (!dataSectionStarted) continue;
      if (line.trim().toUpperCase().includes('MARKET STATISTICS')) break;

      const match = line.trim().match(/^([A-Z]+)\s+([\d,]+)/);
      if (match) {
        const symbol = match[1];
        const closePriceStr = match[2].replace(/,/g, '');
        const closePrice = Number(closePriceStr);

        if (symbol && !isNaN(closePrice) && closePrice > 0) {
          prices.push({ symbol, close: closePrice });
        }
      }
    }
    
    if (prices.length === 0) {
      return NextResponse.json({ ok: true, message: 'Could not extract any prices from the PDF text.' });
    }

    console.log(`Successfully extracted ${prices.length} prices from the PDF.`);

    const supabaseAdmin = createSupabaseAdmin();
    const recordsToUpsert = prices.map(p => ({
      symbol: p.symbol,
      as_of_date,
      close: p.close,
    }));

    const { error } = await supabaseAdmin.from('dse_quotes').upsert(recordsToUpsert);
    if (error) throw new Error(`Failed to save prices to Supabase: ${error.message}`);

    console.log('Scraper function finished successfully.');
    return NextResponse.json({ ok: true, scraped: prices.length, source: reportUrl });

  } catch (e: any) {
    console.error('An error occurred in the scraper:', e.message);
    return new NextResponse(e?.message || 'Server error in scraper', { status: 500 });
  }
}