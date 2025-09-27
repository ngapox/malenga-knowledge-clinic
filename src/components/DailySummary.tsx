'use client';

import { useEffect, useState } from 'react';

type Summary = {
  date: string;
  market_snapshot: string;
  top_notes: string[];
  bonds: { upcoming: string; last_result: string };
  tip: string;
};

export default function DailySummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/daily-summary')
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="mt-8 text-sm text-gray-500">Loading today’s summary…</div>;
  if (err || !data) return <div className="mt-8 text-sm text-red-600">Couldn’t load summary.</div>;

  return (
    <section className="mt-10 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-2 text-xs text-gray-500">Daily summary — {data.date}</div>
      <h3 className="text-lg font-semibold">Market Snapshot</h3>
      <p className="mt-1 text-gray-700">{data.market_snapshot}</p>

      {data.top_notes?.length > 0 && (
        <>
          <h4 className="mt-4 text-sm font-medium">Top notes</h4>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
            {data.top_notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </>
      )}

      <h4 className="mt-4 text-sm font-medium">Bonds</h4>
      <p className="text-sm text-gray-700">
        <span className="font-medium">Upcoming:</span> {data.bonds.upcoming}
        <br />
        <span className="font-medium">Last result:</span> {data.bonds.last_result}
      </p>

      <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
        <span className="font-medium">Tip:</span> {data.tip}
      </div>
    </section>
  );
}
