// --- File: src/app/api/prices/scrape/route.ts (Final PDF Version) ---
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import pdf from 'pdf-parse';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DSE_HOMEPAGE_URL = 'https://dse.co.tz/';

export async function GET() {
  try {
    // === Part 1: Find the Link to the Latest Report PDF ===
    console.log('Fetching DSE homepage to find the latest report link...');
    const homePageResponse = await fetch(DSE_HOMEPAGE_URL);
    if (!homePageResponse.ok) throw new Error('Failed to fetch DSE homepage.');
    
    const html = await homePageResponse.text();
    const $ = cheerio.load(html);

    // Find the first "View" link inside the "Daily Market Reports" section
    const reportPath = $('div#daily-reports a.btn').first().attr('href');
    if (!reportPath) throw new Error('Could not find the link to the daily report PDF.');

    const reportUrl = new URL(reportPath, DSE_HOMEPAGE_URL).href;
    console.log(`Found latest report URL: ${reportUrl}`);

    // === Part 2: Download and Parse the PDF Report ===
    console.log('Downloading PDF report...');
    const pdfResponse = await fetch(reportUrl);
    if (!pdfResponse.ok) throw new Error(`Failed to download the report PDF from ${reportUrl}`);

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    const pdfData = await pdf(pdfBuffer);
    const pdfText = pdfData.text;
    
    console.log('Successfully parsed PDF text.');

    // === Part 3: Extract Prices from the PDF Text and Save to DB ===
    const prices: { symbol: string; close: number }[] = [];
    const as_of_date = new Date().toISOString().slice(0, 10);
    
    // Split the PDF text into lines to process it
    const lines = pdfText.split('\n');
    let dataSectionStarted = false;

    for (const line of lines) {
      // The data starts after the "EQUITY MARKET" header in the PDF
      if (line.trim().toUpperCase().includes('EQUITY MARKET')) {
        dataSectionStarted = true;
        continue;
      }
      if (!dataSectionStarted) continue;
      
      // Stop processing if we hit the end of the relevant section
      if (line.trim().toUpperCase().includes('MARKET STATISTICS')) break;

      // Regex to find lines with stock data (e.g., "CRDB 1,230 1,230 ...")
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
        return NextResponse.json({ ok: true, message: 'Could not extract any prices from the PDF.' });
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