import Link from 'next/link';
import DailySummary from '@/components/DailySummary';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold">Malenga Knowledge Clinic</h1>
      <p className="mt-2 text-gray-600">
        Learn investing in the Tanzanian context: bonds, DSE stocks, UTT, and more.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/auth" className="rounded-xl border p-4 hover:bg-white">
          <h2 className="font-semibold">Sign in / Create account →</h2>
          <p className="text-sm text-gray-600">Save favorites, chat, and more.</p>
        </Link>

        <Link href="/chat" className="rounded-xl border p-4 hover:bg-white">
          <h2 className="font-semibold">Public Chatrooms →</h2>
          <p className="text-sm text-gray-600">Discuss bonds, stocks, UTT, opportunities.</p>
        </Link>

        <Link href="/calculators/bond" className="rounded-xl border p-4 hover:bg-white sm:col-span-2">
          <h2 className="font-semibold">Bond Return Calculator →</h2>
          <p className="text-sm text-gray-600">Coupons, current yield, and YTM (TZ).</p>
        </Link>
      </div>

      <DailySummary />
    </main>
  );
}
