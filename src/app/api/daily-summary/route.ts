// src/app/api/daily-summary/route.ts
import { NextResponse } from 'next/server';
// import pdfParse from 'pdf-parse';

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  // TODO: later we’ll replace these placeholders with real DSE/BOT data
  const summary = {
    date: today,
    market_snapshot: 'DSE overall flat; example data for now.',
    top_notes: ['CRDB slightly up', 'TBL light volume'], // demo
    bonds: {
      upcoming: '15-year T-Bond auction next week',
      last_result: 'Prev auction oversubscribed (demo)',
    },
    tip: 'Invest consistently; time in the market beats timing the market.',
  };

  return NextResponse.json(summary);
}
