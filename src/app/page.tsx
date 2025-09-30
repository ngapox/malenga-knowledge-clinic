// src/app/page.tsx
import DailySummary from '@/components/DailySummary';

async function getDailySummary() {
  try {
    // Use a relative path for the API call
    const res = await fetch('/api/daily-summary', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to fetch daily summary');
    }
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function Home() {
  const summary = await getDailySummary();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        {summary ? <DailySummary summary={summary} /> : <p>Loading summary...</p>}
      </div>
    </main>
  );
}