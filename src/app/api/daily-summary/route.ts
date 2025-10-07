// src/app/api/daily-summary/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function getMarketStatus() {
    // ... (this function is stable, no logs needed here)
    const now = new Date();
    const eatTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    const dayOfWeek = eatTime.getDay();
    const hour = eatTime.getHours();
    const minute = eatTime.getMinutes();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isTradingHours = (hour > 9 || (hour === 9 && minute >= 30)) && (hour < 14 || (hour === 14 && minute <= 30));
    if (isWeekday && isTradingHours) {
        return { isOpen: true, text: "Market is currently OPEN" };
    }
    return { isOpen: false, text: "Market is currently CLOSED" };
}

async function getMarketData() {
    console.log('[API LOG] Entered getMarketData function.');
    const supabase = supabaseAdmin;

    console.log('[API LOG] Step A: Fetching latest date...');
    const { data: latestDateData, error: latestDateError } = await supabase
        .from('dse_quotes')
        .select('as_of_date')
        .order('as_of_date', { ascending: false })
        .limit(1)
        .single();
    
    if (latestDateError) {
        console.error('[API ERROR] Step A failed:', latestDateError);
        throw new Error('Failed to fetch the latest market date.');
    }
    if (!latestDateData) {
        console.warn('[API WARN] No market data found at all.');
        return { latestPrices: [], previousPrices: [], latestDate: new Date().toISOString().slice(0, 10) };
    }
    const latestDate = latestDateData.as_of_date;
    console.log(`[API LOG] Step A successful. Latest date is: ${latestDate}`);

    console.log('[API LOG] Step B: Fetching previous date...');
    const { data: previousDateData, error: previousDateError } = await supabase
        .from('dse_quotes')
        .select('as_of_date')
        .lt('as_of_date', latestDate)
        .order('as_of_date', { ascending: false })
        .limit(1)
        .single();
    
    if (previousDateError) {
        console.error('[API ERROR] Step B failed:', previousDateError);
        // Don't throw, we can continue without a previous date
    }
    const previousDate = previousDateData?.as_of_date;
    console.log(`[API LOG] Step B successful. Previous date is: ${previousDate || 'Not Found'}`);
    
    const datesToFetch = [latestDate];
    if (previousDate) {
        datesToFetch.push(previousDate);
    }
    console.log(`[API LOG] Step C: Fetching quotes for dates: ${datesToFetch.join(', ')}`);
    
    const { data, error } = await supabase
        .from('dse_quotes')
        .select('symbol, close, as_of_date')
        .in('as_of_date', datesToFetch);

    if (error) {
        console.error('[API ERROR] Step C failed:', error);
        throw new Error('Failed to fetch market quotes.');
    }
    console.log(`[API LOG] Step C successful. Fetched ${data?.length || 0} quote records.`);

    const latestPrices = data?.filter(d => d.as_of_date === latestDate) || [];
    const previousPrices = data?.filter(d => d.as_of_date === previousDate) || [];
    
    console.log(`[API LOG] Finished getMarketData. latestPrices: ${latestPrices.length}, previousPrices: ${previousPrices.length}`);
    return { latestPrices, previousPrices, latestDate };
}

function generateNarrative(latestDate: string, latestPrices: any[], gainers: any[], losers: any[]): string {
    // ... (this function is stable, no logs needed here)
    const dateString = new Date(latestDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!latestPrices || latestPrices.length === 0) {
        return `No market data is available for ${dateString}. Please check back later.`;
    }
    let narrative = `Here is the summary for the last trading day, ${dateString}. We tracked updates for ${latestPrices.length} companies. `;
    if (gainers.length > 0 && gainers.length >= losers.length) {
        narrative += `It was a positive session, led by gains in stocks like ${gainers[0].symbol}. `;
    } else if (losers.length > 0) {
        narrative += `The market saw a slight downturn, with stocks like ${losers[0].symbol} pulling back. `;
    } else {
        narrative += "The market remained relatively stable with no major price movements. ";
    }
    return narrative;
}

export async function GET() {
    try {
        console.log('[API LOG] [STEP 1] Daily summary request received.');
        const { latestPrices, previousPrices, latestDate } = await getMarketData();
        console.log('[API LOG] [STEP 2] Market data retrieved successfully.');

        const priceChanges = latestPrices.map(latestPrice => {
            const previousPrice = previousPrices.find(p => p.symbol === latestPrice.symbol);
            if (previousPrice && previousPrice.close > 0) {
                const change = latestPrice.close - previousPrice.close;
                const percentageChange = (change / previousPrice.close) * 100;
                return { ...latestPrice, change, percentageChange };
            }
            return { ...latestPrice, change: 0, percentageChange: 0 };
        });
        console.log(`[API LOG] [STEP 3] Calculated price changes for ${priceChanges.length} items.`);

        const gainers = priceChanges.filter(p => p.change > 0).sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 3);
        const losers = priceChanges.filter(p => p.change < 0).sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 3);
        console.log(`[API LOG] [STEP 4] Identified ${gainers.length} gainers and ${losers.length} losers.`);
        
        const narrative = generateNarrative(latestDate, latestPrices, gainers, losers);
        console.log('[API LOG] [STEP 5] Generated market narrative.');
        
        const marketStatus = getMarketStatus();
        const popularTickers = ['CRDB', 'NMB', 'TBL', 'VODA', 'TPCC'];
        const tickerData = priceChanges.filter(p => popularTickers.includes(p.symbol));
        console.log('[API LOG] [STEP 6] Finalized ticker data and market status.');

        const summary = {
            date: latestDate,
            narrative: narrative,
            marketStatus: marketStatus,
            tickerData: tickerData,
            gainers,
            losers,
        };

        console.log('[API LOG] [STEP 7] Successfully built summary object. Sending response.');
        return NextResponse.json(summary);

    } catch (error: any) {
        console.error("[API CRASH] A critical error occurred in /api/daily-summary:", error);
        return new NextResponse(JSON.stringify({ error: "Failed to generate daily summary.", details: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}