// src/components/DailySummary.tsx
"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function DailySummary({ summary }: { summary: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle>DSE Daily Summary ({summary.date})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Market Snapshot</h3>
            <p className="text-muted-foreground">{summary.market_snapshot}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-green-600">Top Gainers</h3>
              {summary.gainers.length > 0 ? (
                <ul>
                  {summary.gainers.map((g: any, index: number) => (
                    <li key={index} className="flex justify-between items-center py-1">
                      <Link href={`/stock/${g.symbol}`} className="font-medium text-primary hover:underline">{g.symbol}</Link>
                      <span className="text-green-500 font-semibold">+{g.percentageChange.toFixed(2)}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No gainers today.</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-600">Top Losers</h3>
              {summary.losers.length > 0 ? (
                <ul>
                  {summary.losers.map((l: any, index: number) => (
                    <li key={index} className="flex justify-between items-center py-1">
                      <Link href={`/stock/${l.symbol}`} className="font-medium text-primary hover:underline">{l.symbol}</Link>
                      <span className="text-red-500 font-semibold">{l.percentageChange.toFixed(2)}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No losers today.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
            <div>
              <h3 className="text-lg font-semibold">Bonds</h3>
              <p className="text-sm text-muted-foreground">Upcoming: {summary.bonds.upcoming}</p>
              <p className="text-sm text-muted-foreground">Last Result: {summary.bonds.last_result}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Tip of the Day</h3>
              <p className="text-sm italic text-muted-foreground">"{summary.tip}"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}