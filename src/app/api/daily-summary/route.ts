// src/app/api/daily-summary/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// NEW: Function to determine if the DSE is currently open
function getMarketStatus() {
    // DSE hours are 9:30 AM to 2:30 PM EAT (UTC+3), Monday to Friday
    const now = new Date();
    const eatTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    
    const dayOfWeek = eatTime.getDay(); // Sunday = 0, Saturday = 6
    const hour = eatTime.getHours();
    const minute = eatTime.getMinutes();
    
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isTradingHours = (hour > 9 || (hour === 9 && minute >= 30)) && (hour < 14 || (hour === 14 && minute <= 30));

    if (isWeekday && isTradingHours) {
        return { isOpen: true, text: "Market is currently OPEN" };
    }
    return { isOpen: false, text: "Market is currently CLOSED" };
}

// Rewritten function to always get the last two trading days
async function getMarketData() {
    const supabase = supabaseAdmin;

    // 1. Find the most recent date in the database
    const { data: latestDateData, error: latestDateError } = await supabase
        .from('dse_quotes')
        .select('as_of_date')
        .order('as_of_date', { ascending: false })
        .limit(1)
        .single();
    
    if (latestDateError || !latestDateData) return { latestPrices: [], previousPrices: [], latestDate: new Date().toISOString() };
    const latestDate = latestDateData.as_of_date;

    // 2. Find the second most recent date
    const { data: previousDateData, error: previousDateError } = await supabase
        .from('dse_quotes')
        .select('as_of_date')
        .lt('as_of_date', latestDate)
        .order('as_of_date', { ascending: false })
        .limit(1)
        .single();
        
    if (previousDateError || !previousDateData) return { latestPrices: [], previousPrices: [], latestDate };
    const previousDate = previousDateData.as_of_date;

    // 3. Fetch all data for both dates
    const { data, error } = await supabase
        .from('dse_quotes')
        .select('symbol, close, as_of_date')
        .in('as_of_date', [latestDate, previousDate]);

    if (error) return { latestPrices: [], previousPrices: [], latestDate };

    const latestPrices = data.filter(d => d.as_of_date === latestDate);
    const previousPrices = data.filter(d => d.as_of_date === previousDate);
    
    return { latestPrices, previousPrices, latestDate };
}

// Updated narrative generator
function generateNarrative(latestDate: string, latestPrices: any[], gainers: any[], losers: any[]): string {
    const dateString = new Date(latestDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (latestPrices.length === 0) {
        return `No market data is available yet. The last update was on ${dateString}.`;
    }

    let narrative = `Here is the summary for the last trading day, ${dateString}. We tracked updates for ${latestPrices.length} companies. `;

    if (gainers.length > losers.length && gainers.length > 0) {
        narrative += `It was a positive session, led by gains in stocks like ${gainers[0].symbol}. `;
    } else if (losers.length > gainers.length && losers.length > 0) {
        narrative += `The market saw a slight downturn, with stocks like ${losers[0].symbol} pulling back. `;
    } else {
        narrative += "The market remained relatively stable. ";
    }
    
    return narrative;
}

export async function GET() {
    const { latestPrices, previousPrices, latestDate } = await getMarketData();

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
    
    const narrative = generateNarrative(latestDate, latestPrices, gainers, losers);
    const marketStatus = getMarketStatus();

    const summary = {
        date: latestDate, // Use the actual date of the data
        narrative: narrative,
        marketStatus: marketStatus, // Add the open/closed status
        tickerData: priceChanges.filter(p => ['CRDB', 'NMB', 'TBL', 'VODA', 'TPCC'].includes(p.symbol)),
        gainers,
        losers,
    };

    return NextResponse.json(summary);
}