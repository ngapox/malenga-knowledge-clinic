import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ChevronRight, Megaphone, FileText, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

// Define types for our data for better type safety
type Article = {
  id: string;
  title: string | null;
};

type Opportunity = {
  id: string;
  title: string | null;
  opportunity_type: string;
  action_date: string | null;
  pdf_url: string | null;
};

type WatchlistItem = {
  symbol: string;
  latest_price: number | null;
  change: number | null;
};

async function getDashboardData() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect('/auth'); }

  const profilePromise = supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const articlesPromise = supabase.from('articles').select('id, title').not('published_at', 'is', null).order('published_at', { ascending: false }).limit(3);
  const opportunitiesPromise = supabase.from('opportunities').select('id, title, opportunity_type, action_date, pdf_url').order('created_at', { ascending: false }).limit(3);
  const watchlistPromise = supabase.from('watchlist_items').select('symbol').eq('user_id', user.id).limit(5);

  const [
    { data: profile },
    { data: articles },
    { data: opportunities },
    { data: userWatchlist }
  ] = await Promise.all([
    profilePromise,
    articlesPromise,
    opportunitiesPromise,
    watchlistPromise
  ]);

  let watchlistItems: WatchlistItem[] = [];

  if (userWatchlist && userWatchlist.length > 0) {
    const symbols = userWatchlist.map(item => item.symbol);
    const { data: quotes } = await supabase
      .from('dse_quotes')
      .select('symbol, close, as_of_date')
      .in('symbol', symbols)
      .order('as_of_date', { ascending: false });

    const latestPrices: { [key: string]: number } = {};
    if (quotes) {
        for (const quote of quotes) {
            if (!latestPrices[quote.symbol]) {
                latestPrices[quote.symbol] = quote.close;
            }
        }
    }
    
    watchlistItems = symbols.map(symbol => ({
      symbol,
      latest_price: latestPrices[symbol] || null,
      change: null,
    }));
  }

  return {
    userName: profile?.full_name,
    articles: (articles as Article[]) || [],
    opportunities: (opportunities as Opportunity[]) || [],
    watchlistItems,
  };
}

export default async function DashboardPage() {
  const { userName, articles, opportunities, watchlistItems } = await getDashboardData();
  
  // --- 👇 THIS IS THE CORRECTED, COMPLETE FUNCTION 👇 ---
  const formatDate = (dateString: string | null): string => {
    if (!dateString) {
      return '';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  // --- 👆 END OF CORRECTION 👆 ---

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold">Welcome back, {userName?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Here's your financial snapshot for today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Your Learning Path</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Your next recommended article is ready for you. Keep up the great work!</p>
                <Button variant="link" className="px-0 mt-2">Continue Learning <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Watchlist Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {watchlistItems.length > 0 ? (
              <ul className="space-y-2">
                {watchlistItems.map(item => (
                  <li key={item.symbol} className="flex justify-between items-center">
                    <Link href={`/stock/${item.symbol}`} className="font-bold hover:underline">{item.symbol}</Link>
                    <span className="font-mono">{item.latest_price ? `TZS ${item.latest_price.toLocaleString()}` : 'N/A'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">You haven't added any items to your watchlist yet.</p>
            )}
            <Link href="/watchlist">
              <Button variant="link" className="px-0 mt-2">
                View Full Watchlist <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone /> New Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {opportunities.length > 0 ? (
              <ul className="space-y-3">
                {opportunities.map(op => (
                  <li key={op.id} className="flex flex-col border-b last:border-b-0 pb-3 last:pb-0">
                    <span className="font-semibold">{op.title}</span>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                      <span className="bg-secondary px-2 py-0.5 rounded-md">{op.opportunity_type}</span>
                      {op.action_date && <span>Action by: {formatDate(op.action_date)}</span>}
                    </div>
                    {op.pdf_url && (
                      <a href={op.pdf_url} target="_blank" rel="noopener noreferrer" className="mt-2">
                        <Button variant="outline" size="sm" className="w-full">
                          <FileText className="w-4 h-4 mr-2" />
                          View Document
                        </Button>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No new opportunities posted today. Check back soon!</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Newspaper /> Latest Articles</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {articles.map(article => (
                <li key={article.id}><Link href={`/article/${article.id}`} className="hover:underline text-primary">{article.title || 'Untitled Article'}</Link></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}