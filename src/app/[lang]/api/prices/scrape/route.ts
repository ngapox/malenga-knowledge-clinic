// --- File: src/app/api/prices/scrape/route.ts ---
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DSE_HOMEPAGE_URL = 'https://dse.co.tz/';

async function fetchAndParsePdf(pdfUrl: string) {
  try {
    // Use a relative path for the API call
    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://malenga-knowledge-clinic.vercel.app/' : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/parse-pdf?url=${encodeURIComponent(pdfUrl)}`);
    if (!response.ok) {
      throw new Error(`Failed to parse PDF. Status: ${response.status}`);
    }
    const { text } = await response.json();
    return text;
  } catch (error) {
    console.error('Error fetching or parsing PDF:', error);
    return null;
  }
}

export async function GET() {
  try {
    const homePageResponse = await fetch(DSE_HOMEPAGE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!homePageResponse.ok) throw new Error(`Failed to fetch DSE homepage: ${homePageResponse.statusText}`);
    
    const html = await homePageResponse.text();
    const $ = cheerio.load(html);

    const reportLink = $('a[href$=".pdf"][href*="Market-Report"]').first().attr('href');

    let prices: { symbol: string; close: number }[] = [];
    
   
    // Adjust to get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const as_of_date = yesterday.toISOString().slice(0, 10);


    if (reportLink) {
      const reportUrl = new URL(reportLink, DSE_HOMEPAGE_URL).href;
      const pdfText = await fetchAndParsePdf(reportUrl);

      if (pdfText) {
        const lines = pdfText.split('\n');
        let dataSectionStarted = false;

        for (const line of lines) {
          if (line.trim().toUpperCase().includes('EQUITY MARKET')) {
            dataSectionStarted = true;
            continue;
          }
          if (!dataSectionStarted) continue;
          if (line.trim().toUpperCase().includes('MARKET STATISTICS')) {
            break;
          }

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
      }
    } else {
      $('table.table-market tbody tr, table tbody tr').each((i, row) => {
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
    }

    if (prices.length > 0) {
      const recordsToUpsert = prices.map(p => ({
        symbol: p.symbol,
        as_of_date,
        close: p.close,
      }));
      await supabaseAdmin.from('dse_quotes').upsert(recordsToUpsert);
    }

    return NextResponse.json({ ok: true, scraped: prices.length, source: reportLink ? 'PDF' : 'Table', date: as_of_date });

  } catch (e: any) {
    console.error('Error in scraper:', e.message, e.stack);
    return new NextResponse(e?.message || 'Server error in scraper', { status: 500 });
  }
}