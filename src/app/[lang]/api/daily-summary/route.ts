// src/app/api/daily-summary/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function getMarketStatus() {
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

// --- 👇 THIS IS THE FULLY CORRECTED AND ROBUST FUNCTION 👇 ---
export async function GET() {
    try {
        const marketStatus = getMarketStatus();

        // Use .maybeSingle() which does not error on 0 rows
        const { data: latestDateData, error: latestDateError } = await supabaseAdmin
            .from('dse_quotes')
            .select('as_of_date')
            .order('as_of_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        // If there's an error or no data, return a default empty summary
        if (latestDateError || !latestDateData) {
            console.warn("No data in dse_quotes table. Returning default summary.");
            const defaultSummary = {
                date: new Date().toISOString().slice(0, 10),
                narrative: "No market data is available yet. Please upload price data in the admin panel.",
                marketStatus: marketStatus,
                tickerData: [],
                gainers: [],
                losers: [],
            };
            return NextResponse.json(defaultSummary);
        }

        const latestDate = latestDateData.as_of_date;

        const { data: previousDateData } = await supabaseAdmin
            .from('dse_quotes')
            .select('as_of_date')
            .lt('as_of_date', latestDate)
            .order('as_of_date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        const previousDate = previousDateData?.as_of_date;

        const datesToFetch = [latestDate];
        if (previousDate) datesToFetch.push(previousDate);

        const { data: quotesData, error: quotesError } = await supabaseAdmin
            .from('dse_quotes')
            .select('symbol, close, as_of_date')
            .in('as_of_date', datesToFetch);

        if (quotesError) throw quotesError;

        const latestPrices = quotesData?.filter(d => d.as_of_date === latestDate) || [];
        const previousPrices = quotesData?.filter(d => d.as_of_date === previousDate) || [];

        const priceChanges = latestPrices.map(latestPrice => {
            const previousPrice = previousPrices.find(p => p.symbol === latestPrice.symbol);
            if (previousPrice && previousPrice.close > 0) {
                const change = latestPrice.close - previousPrice.close;
                const percentageChange = (change / previousPrice.close) * 100;
                return { ...latestPrice, change, percentageChange };
            }
            return { ...latestPrice, change: 0, percentageChange: 0 };
        });

        const gainers = priceChanges.filter(p => p.change > 0).sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 3);
        const losers = priceChanges.filter(p => p.change < 0).sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 3);
        
        const dateString = new Date(latestDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        let narrative = `Here is the summary for the last trading day, ${dateString}. We tracked updates for ${latestPrices.length} companies. `;
        if (gainers.length > 0 && gainers.length >= losers.length) {
            narrative += `It was a positive session, led by gains in stocks like ${gainers[0].symbol}. `;
        } else if (losers.length > 0) {
            narrative += `The market saw a slight downturn, with stocks like ${losers[0].symbol} pulling back. `;
        } else {
            narrative += "The market remained relatively stable. ";
        }

        const popularTickers = ['CRDB', 'NMB', 'TBL', 'VODA', 'TPCC'];
        const tickerData = priceChanges.filter(p => popularTickers.includes(p.symbol));

        const summary = {
            date: latestDate,
            narrative: narrative,
            marketStatus: marketStatus,
            tickerData: tickerData,
            gainers,
            losers,
        };

        return NextResponse.json(summary);

    } catch (error: any) {
        console.error("[API CRASH] A critical error occurred in /api/daily-summary:", error);
        return new NextResponse(JSON.stringify({ error: "Failed to generate daily summary.", details: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}