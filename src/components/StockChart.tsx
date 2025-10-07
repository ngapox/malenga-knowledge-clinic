'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type HistoricalData = {
  as_of_date: string;
  close: number;
};

export function StockChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<HistoricalData[]>([]);
  const [range, setRange] = useState('1m');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/historical-data?symbol=${symbol}&range=${range}`);
        if (res.ok) {
          const jsonData = await res.json();
          setData(jsonData);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Failed to fetch historical data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [symbol, range]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Performance</CardTitle>
        <div className="flex space-x-2 pt-2">
          <Button onClick={() => setRange('1m')} variant={range === '1m' ? 'default' : 'outline'} size="sm">1M</Button>
          <Button onClick={() => setRange('3m')} variant={range === '3m' ? 'default' : 'outline'} size="sm">3M</Button>
          <Button onClick={() => setRange('6m')} variant={range === '6m' ? 'default' : 'outline'} size="sm">6M</Button>
          <Button onClick={() => setRange('1y')} variant={range === '1y' ? 'default' : 'outline'} size="sm">1Y</Button>
        </div>
      </CardHeader>
      <CardContent className="w-full h-96 pr-6">
        {loading ? (
          <div className="flex items-center justify-center h-full"><p>Loading chart...</p></div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="as_of_date" tick={{ fontSize: 12 }} />
              <YAxis domain={['dataMin', 'dataMax']} tick={{ fontSize: 12 }} tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip formatter={(value: number) => [value.toLocaleString(), "Price"]} />
              <Legend />
              <Line type="monotone" dataKey="close" name="Closing Price" stroke="hsl(var(--primary))" dot={false} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full"><p>No historical data available for this range.</p></div>
        )}
      </CardContent>
    </Card>
  );
}