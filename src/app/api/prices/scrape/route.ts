// --- File: src/app/api/prices/scrape/route.ts ---
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { PDFExtract } from 'pdf.js-extract';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { GlobalWorkerOptions } from 'pdfjs-dist'; // Import PDF.js directly

export const dynamic = 'force-dynamic';

const DSE_HOMEPAGE_URL = 'https://dse.co.tz/';

// Disable worker for server-side PDF parsing
GlobalWorkerOptions.workerSrc = ''; // Empty string to disable Web Worker

export async function GET() {
  try {
    // === Part 1: Find the Link to the Latest Report PDF ===
    console.log('Fetching DSE homepage to find the latest report link...');
    const homePageResponse = await fetch(DSE_HOMEPAGE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!homePageResponse.ok) throw new Error('Failed to fetch DSE homepage.');

    const html = await homePageResponse.text();
    const $ = cheerio.load(html);

    // Explicitly type potentialLinks as string[]
    const potentialLinks: string[] = [];

    // Updated selector for market reports/PDFs
    $('section:contains("Market Report"), div:contains("Daily"), .report-link a, a[href*=".pdf"], a:contains("report")').each((i, el) => {
      const href = $(el).attr('href');
      if (typeof href === 'string' && (href.includes('.pdf') || href.toLowerCase().includes('report'))) {
        potentialLinks.push(href);
      }
    });

    // Log potential links for debugging
    console.log('Potential report links found:', potentialLinks);

    let reportPath: string | undefined;
    if (potentialLinks.length > 0) {
      reportPath = potentialLinks.find(link => link.includes('.pdf')) || potentialLinks[0];
      console.log(`Using report URL: ${reportPath}`);
    }

    let prices: { symbol: string; close: number }[] = [];
    const as_of_date = new Date().toISOString().slice(0, 10);

    if (reportPath) {
      // === Part 2: Download and Parse the PDF Report ===
      const reportUrl = new URL(reportPath, DSE_HOMEPAGE_URL).href;
      console.log('Downloading PDF report...');
      const pdfResponse = await fetch(reportUrl);
      if (!pdfResponse.ok) throw new Error(`Failed to download the report PDF from ${reportUrl}`);

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfExtractor = new PDFExtract();
      const data = await pdfExtractor.extractBuffer(Buffer.from(pdfBuffer));

      const pdfText = data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n');
      console.log('Successfully parsed PDF text.');

      // === Part 3: Extract Prices from PDF ===
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
    } else {
      // === Fallback: Scrape Real-Time Market Data Table ===
      console.log('No PDF link found. Falling back to scraping market data table...');

      $('table tbody tr').each((i, row) => {
        const cols = $(row).find('td');
        if (cols.length >= 3) {
          const symbol = $(cols[0]).text().trim();
          const ltpText = $(cols[1]).text().trim().replace(/,/g, '');
          const ltp = Number(ltpText);

          if (symbol && !isNaN(ltp) && ltp > 0 && /^[A-Z]+$/.test(symbol)) {
            prices.push({ symbol, close: ltp });
          }
        }
      });

      if (prices.length === 0) {
        console.log('Sample table rows:', $('table tbody tr').map((i, el) => $(el).html()).get().slice(0, 3));
      }
    }

    if (prices.length === 0) {
      return NextResponse.json({ ok: true, message: 'Could not extract any prices from the page or PDF.' });
    }

    console.log(`Successfully extracted ${prices.length} prices.`);

    // === Part 4: Save to Supabase ===
    const supabaseAdmin = createSupabaseAdmin();
    const recordsToUpsert = prices.map(p => ({
      symbol: p.symbol,
      as_of_date,
      close: p.close,
    }));

    const { error } = await supabaseAdmin.from('dse_quotes').upsert(recordsToUpsert);
    if (error) throw new Error(`Failed to save prices to Supabase: ${error.message}`);

    console.log('Scraper function finished successfully.');
    return NextResponse.json({ ok: true, scraped: prices.length, source: DSE_HOMEPAGE_URL, date: as_of_date });

  } catch (e: any) {
    console.error('An error occurred in the scraper:', e.message);
    return new NextResponse(e?.message || 'Server error in scraper', { status: 500 });
  }
}