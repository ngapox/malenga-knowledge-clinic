// src/app/api/historical-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1m'; // Default to 1 month

  if (!symbol) {
    return new NextResponse('Missing stock symbol parameter', { status: 400 });
  }

  const today = new Date();
  let startDate = new Date();

  switch (range) {
    case '1m':
      startDate.setMonth(today.getMonth() - 1);
      break;
    case '3m':
      startDate.setMonth(today.getMonth() - 3);
      break;
    case '6m':
      startDate.setMonth(today.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(today.getMonth() - 1);
  }

  const { data, error } = await supabaseAdmin
    .from('dse_quotes')
    .select('as_of_date, close')
    .eq('symbol', symbol)
    .gte('as_of_date', startDate.toISOString().slice(0, 10))
    .order('as_of_date', { ascending: true });

  if (error) {
    console.error('Error fetching historical data:', error);
    return new NextResponse('Error fetching historical data', { status: 500 });
  }

  return NextResponse.json(data);
}