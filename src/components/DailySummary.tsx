// src/components/DailySummary.tsx
"use client";

export default function DailySummary({ summary }: { summary: any }) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 w-full text-gray-800">
      <h2 className="text-2xl font-bold mb-4">DSE Daily Summary</h2>
      <p className="text-gray-600 mb-4">Date: {summary.date}</p>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Market Snapshot</h3>
        <p>{summary.market_snapshot}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-green-600">Top Gainers</h3>
          <ul>
            {summary.gainers.map((g: any, index: number) => (
              <li key={index} className="flex justify-between">
                <a href={`/stock/${g.symbol}`} className="text-blue-600 hover:underline">{g.symbol}</a>
                <span className="text-green-500">+{g.percentageChange.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-600">Top Losers</h3>
          <ul>
            {summary.losers.map((l: any, index: number) => (
              <li key={index} className="flex justify-between">
                <a href={`/stock/${l.symbol}`} className="text-blue-600 hover:underline">{l.symbol}</a>
                <span className="text-red-500">{l.percentageChange.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Bonds</h3>
        <p>Upcoming: {summary.bonds.upcoming}</p>
        <p>Last Result: {summary.bonds.last_result}</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold">Tip of the Day</h3>
        <p>{summary.tip}</p>
      </div>
    </div>
  );
}