// src/app/page.tsx
import HomePageClient from "@/components/HomePageClient";
import MarketTicker from "@/components/MarketTicker";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Briefcase, BarChart2, TrendingUp } from "lucide-react";

// This function now fetches only public data
async function getPublicPageData() {
  const supabase = createSupabaseServerClient();
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const summaryRes = await fetch(`${baseUrl}/api/daily-summary`, { cache: 'no-store' });
  const summary = summaryRes.ok ? await summaryRes.json() : {
      narrative: "Could not load market data.",
      marketStatus: { isOpen: false, text: "Market status unknown" },
      tickerData: [],
  };
  
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, published_at')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(3);

  return { summary, articles: articles || [] };
}

export default async function Home() {
  // Note: We no longer fetch userName here.
  const { summary, articles } = await getPublicPageData();

  return (
    <div className="space-y-12">
      {/* HomePageClient now receives null, so it will show the sign-up buttons */}
      <HomePageClient userName={null} />
      
      <MarketTicker data={summary.tickerData} />

      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={`h-3 w-3 rounded-full ${summary.marketStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-sm font-medium text-muted-foreground">{summary.marketStatus.text}</span>
        </div>
        
        <h2 className="text-3xl font-bold mb-2">Today's Market, Explained</h2>
        <p className="max-w-3xl mx-auto text-muted-foreground">
          {summary.narrative}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-center">Discover Your Investment Path</h2>
        <div className="grid gap-6 md:grid-cols-3">
           <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase /> UTT AMIS Funds</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Explore popular local funds for stable income or long-term growth.</p></CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 /> DSE Blue Chips</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Invest in Tanzania's largest and most established companies.</p></CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp /> Government Bonds</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Learn about Treasury bonds, a secure way to earn predictable returns.</p></CardContent>
          </Card>
        </div>
      </div>
      
      {articles && articles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-center">Learn & Connect</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map(article => (
              <Link href={`/article/${article.id}`} key={article.id} className="block hover:scale-[1.02] transition-transform duration-200">
                <Card className="h-full">
                  <CardHeader><CardTitle>{article.title}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Published on {new Date(article.published_at!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}