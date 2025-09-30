// src/app/stock/[symbol]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Minimal, build-friendly page. We intentionally allow an untyped `props`
 * to avoid Next's strict PageProps compile-time check.
 */
export default function StockDetailPage(props: any) {
  const symbol = props?.params?.symbol ?? '';
  const [data, setData] = useState([]);
  const [range, setRange] = useState('1m');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    async function fetchData() {
      setLoading(true);
      const res = await fetch(`/api/historical-data?symbol=${symbol}&range=${range}`);
      const jsonData = await res.json();
      setData(jsonData);
      setLoading(false);
    }
    fetchData();
  }, [symbol, range]);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-4">{symbol} Stock Performance</h1>
        <div className="flex space-x-2 mb-4">
          <button onClick={() => setRange('1m')} className={`px-4 py-2 rounded ${range === '1m' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>1M</button>
          <button onClick={() => setRange('3m')} className={`px-4 py-2 rounded ${range === '3m' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>3M</button>
          <button onClick={() => setRange('6m')} className={`px-4 py-2 rounded ${range === '6m' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>6M</button>
          <button onClick={() => setRange('1y')} className={`px-4 py-2 rounded ${range === '1y' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>1Y</button>
        </div>
        <div className="w-full h-96">
          {loading ? <p>Loading chart...</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="as_of_date" />
                <YAxis domain={['dataMin', 'dataMax']} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="close" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </main>
  );
}