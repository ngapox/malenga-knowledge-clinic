// --- File: src/app/api/prices/scrape/route.ts ---
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { PDFExtract } from 'pdf.js-extract';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { GlobalWorkerOptions } from 'pdfjs-dist';

export const dynamic = 'force-dynamic';

const DSE_HOMEPAGE_URL = 'https://dse.co.tz/';

// Log worker configuration
console.log('Setting up PDF.js worker...');
GlobalWorkerOptions.workerSrc = '';
console.log('PDF.js workerSrc set to:', GlobalWorkerOptions.workerSrc);

export async function GET() {
  try {
    // === Part 1: Find the Link to the Latest Report PDF ===
    console.log('Step 1: Fetching DSE homepage to find the latest report link...');
    const homePageResponse = await fetch(DSE_HOMEPAGE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    console.log('Step 1.1: Homepage fetch status:', homePageResponse.status, homePageResponse.statusText);
    if (!homePageResponse.ok) throw new Error(`Failed to fetch DSE homepage: ${homePageResponse.statusText}`);
    
    const html = await homePageResponse.text();
    console.log('Step 1.2: Homepage HTML length:', html.length);

    console.log('Step 1.3: Loading HTML into Cheerio...');
    const $ = cheerio.load(html);

    const potentialLinks: string[] = [];
    console.log('Step 1.4: Searching for report links...');
    $('section:contains("Market Report"), div:contains("Daily"), .report-link a, a[href*=".pdf"], a:contains("report")').each((i, el) => {
      const href = $(el).attr('href');
      if (typeof href === 'string' && (href.includes('.pdf') || href.toLowerCase().includes('report'))) {
        potentialLinks.push(href);
      }
    });

    console.log('Step 1.5: Potential report links found:', potentialLinks);
    console.log('Step 1.6: Sample HTML snippet:', $('section, div').filter(':contains("Market Report"), :contains("Daily")').first().html()?.slice(0, 200) || 'No matching sections');

    let reportPath: string | undefined;
    if (potentialLinks.length > 0) {
      reportPath = potentialLinks.find(link => link.includes('.pdf')) || potentialLinks[0];
      console.log('Step 1.7: Selected report URL:', reportPath);
    } else {
      console.log('Step 1.7: No report links found, proceeding to table scraping...');
    }

    let prices: { symbol: string; close: number }[] = [];
    const as_of_date = new Date().toISOString().slice(0, 10);
    console.log('Step 1.8: Current date for DB:', as_of_date);

    if (reportPath) {
      // === Part 2: Download and Parse the PDF Report ===
      const reportUrl = new URL(reportPath, DSE_HOMEPAGE_URL).href;
      console.log('Step 2.1: Downloading PDF from:', reportUrl);
      const pdfResponse = await fetch(reportUrl);
      console.log('Step 2.2: PDF fetch status:', pdfResponse.status, pdfResponse.statusText);
      if (!pdfResponse.ok) throw new Error(`Failed to download the report PDF from ${reportUrl}`);

      console.log('Step 2.3: Fetching PDF buffer...');
      const pdfBuffer = await pdfResponse.arrayBuffer();
      console.log('Step 2.4: PDF buffer length:', pdfBuffer.byteLength);

      console.log('Step 2.5: Initializing PDFExtract...');
      const pdfExtractor = new PDFExtract();
      console.log('Step 2.6: Extracting PDF content...');
      const data = await pdfExtractor.extractBuffer(Buffer.from(pdfBuffer));
      console.log('Step 2.7: PDF extraction completed, pages:', data.pages.length);

      const pdfText = data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n');
      console.log('Step 2.8: Extracted PDF text length:', pdfText.length);
      console.log('Step 2.9: Sample PDF text:', pdfText.slice(0, 200));

      // === Part 3: Extract Prices from PDF ===
      console.log('Step 3.1: Parsing PDF text for prices...');
      const lines = pdfText.split('\n');
      let dataSectionStarted = false;

      for (const line of lines) {
        if (line.trim().toUpperCase().includes('EQUITY MARKET')) {
          dataSectionStarted = true;
          console.log('Step 3.2: Found EQUITY MARKET section');
          continue;
        }
        if (!dataSectionStarted) continue;
        if (line.trim().toUpperCase().includes('MARKET STATISTICS')) {
          console.log('Step 3.3: Reached MARKET STATISTICS, stopping parsing');
          break;
        }

        const match = line.trim().match(/^([A-Z]+)\s+([\d,]+)/);
        if (match) {
          const symbol = match[1];
          const closePriceStr = match[2].replace(/,/g, '');
          const closePrice = Number(closePriceStr);

          if (symbol && !isNaN(closePrice) && closePrice > 0) {
            prices.push({ symbol, close: closePrice });
            console.log(`Step 3.4: Extracted price - Symbol: ${symbol}, Close: ${closePrice}`);
          }
        }
      }
    } else {
      // === Fallback: Scrape Real-Time Market Data Table ===
      console.log('Step 4.1: No PDF link found, scraping market data table...');
      
      $('table tbody tr').each((i, row) => {
        const cols = $(row).find('td');
        if (cols.length >= 3) {
          const symbol = $(cols[0]).text().trim();
          const ltpText = $(cols[1]).text().trim().replace(/,/g, '');
          const ltp = Number(ltpText);

          if (symbol && !isNaN(ltp) && ltp > 0 && /^[A-Z]+$/.test(symbol)) {
            prices.push({ symbol, close: ltp });
            console.log(`Step 4.2: Extracted table price - Symbol: ${symbol}, Close: ${ltp}`);
          }
        }
      });

      if (prices.length === 0) {
        console.log('Step 4.3: Sample table rows:', $('table tbody tr').map((i, el) => $(el).html()).get().slice(0, 3));
      }
    }

    console.log('Step 5.1: Total prices extracted:', prices.length);
    if (prices.length === 0) {
      console.log('Step 5.2: No prices extracted, returning early');
      return NextResponse.json({ ok: true, message: 'Could not extract any prices from the page or PDF.' });
    }

    // === Part 4: Save to Supabase ===
    console.log('Step 6.1: Initializing Supabase admin client...');
    const supabaseAdmin = createSupabaseAdmin();
    console.log('Step 6.2: Preparing records for upsert:', prices.length);
    const recordsToUpsert = prices.map(p => ({
      symbol: p.symbol,
      as_of_date,
      close: p.close,
    }));

    console.log('Step 6.3: Upserting records to dse_quotes table...');
    const { error } = await supabaseAdmin.from('dse_quotes').upsert(recordsToUpsert);
    if (error) {
      console.log('Step 6.4: Supabase upsert error:', error.message);
      throw new Error(`Failed to save prices to Supabase: ${error.message}`);
    }

    console.log('Step 6.5: Scraper function finished successfully.');
    return NextResponse.json({ ok: true, scraped: prices.length, source: DSE_HOMEPAGE_URL, date: as_of_date });

  } catch (e: any) {
    console.error('Step 7.1: Error in scraper:', e.message, e.stack);
    return new NextResponse(e?.message || 'Server error in scraper', { status: 500 });
  }
}