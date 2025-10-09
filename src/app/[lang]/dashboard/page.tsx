import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ChevronRight, Megaphone, FileText, BookOpen, MessageSquare } from "lucide-react";
import Link from "next/link";

// Define types for our data
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
};

type LearningPath = {
  id: string;
  name: string | null;
  path_articles: { step_number: number, article_id: string }[];
};

type NextArticle = {
  id: string;
  title: string | null;
};

// --- Updated type definition ---
// Based on Supabase query results, 'rooms' is returned as an array (even for one-to-one relationships).
// We update the type to reflect this. Access the name via rooms[0]?.name if needed.
type HotRoom = {
    room_id: string;
    recent_message_count: number;
    rooms: { 
        name: string | null;
    }[]; 
};

async function getDashboardData() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect('/auth'); }

  // --- LOGGING: Announce the start of the data fetching process ---
  console.log("\n--- [getDashboardData] Starting to fetch dashboard data ---");

  const profilePromise = supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const articlesPromise = supabase.from('articles').select('id, title').not('published_at', 'is', null).order('published_at', { ascending: false }).limit(3);
  const opportunitiesPromise = supabase.from('opportunities').select('id, title, opportunity_type, action_date, pdf_url').order('created_at', { ascending: false }).limit(3);
  const watchlistPromise = supabase.from('watchlist_items').select('symbol').eq('user_id', user.id).limit(5);
  const userProgressPromise = supabase.from('user_progress').select('path_id, completed_step').eq('user_id', user.id).single();
  
  // --- LOGGING: Log the exact query being sent for hot rooms ---
  console.log("[getDashboardData] Step 1: Preparing to query 'room_activity' with a join on 'rooms(name)'.");
  const hotRoomsPromise = supabase.from('room_activity').select(`room_id, recent_message_count, rooms(name)`).order('recent_message_count', { ascending: false }).limit(3);

  const [
    { data: profile }, { data: articles }, { data: opportunities }, { data: userWatchlist }, { data: userProgress }, { data: hotRooms, error: hotRoomsError } // Capture the error object
  ] = await Promise.all([
    profilePromise, articlesPromise, opportunitiesPromise, watchlistPromise, userProgressPromise, hotRoomsPromise
  ]);
  
  // --- LOGGING: Log the raw result of the hot rooms query ---
  console.log("[getDashboardData] Step 2: Received response from 'room_activity' query.");
  if (hotRoomsError) {
    console.error("[getDashboardData] ERROR FETCHING HOT ROOMS:", hotRoomsError);
  } else {
    console.log("[getDashboardData] Raw 'hotRooms' data:", JSON.stringify(hotRooms, null, 2));
  }
  
  let currentPath: LearningPath | null = null;
  let nextArticle: NextArticle | null = null;

  if (userProgress) {
    const { data } = await supabase.from('learning_paths').select('id, name, path_articles(step_number, article_id)').eq('id', userProgress.path_id).single();
    currentPath = data as LearningPath;
  } else {
    const { data } = await supabase.from('learning_paths').select('id, name, path_articles(step_number, article_id)').ilike('name', '%Beginner%').limit(1).single();
    currentPath = data as LearningPath;
  }

  if (currentPath) {
    const completedStep = userProgress?.completed_step || 0;
    const nextStep = completedStep + 1;
    const nextPathArticle = currentPath.path_articles.find(p => p.step_number === nextStep);
    if (nextPathArticle) {
      const { data: articleData } = await supabase.from('articles').select('id, title').eq('id', nextPathArticle.article_id).single();
      nextArticle = articleData as NextArticle;
    }
  }

  let watchlistItems: WatchlistItem[] = [];
  if (userWatchlist && userWatchlist.length > 0) {
    const symbols = userWatchlist.map(item => item.symbol);
    const { data: quotes } = await supabase.from('dse_quotes').select('symbol, close, as_of_date').in('symbol', symbols).order('as_of_date', { ascending: false });
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
    }));
  }

  // --- LOGGING: Announce the end of the process ---
  console.log("[getDashboardData] Finished data processing. Returning data to component.");

  return {
    userName: profile?.full_name,
    articles: (articles as Article[]) || [],
    opportunities: (opportunities as Opportunity[]) || [],
    watchlistItems,
    currentPath,
    nextArticle,
    userProgress: userProgress ? { ...userProgress, total_steps: currentPath?.path_articles.length || 0 } : null,
    hotRooms: (hotRooms as any[] as HotRoom[]) || [],
  };
}


export default async function DashboardPage() {
  const { userName, articles, opportunities, watchlistItems, currentPath, nextArticle, userProgress, hotRooms } = await getDashboardData();
  
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

  const progressPercentage = userProgress && userProgress.total_steps > 0
    ? (userProgress.completed_step / userProgress.total_steps) * 100
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {userName?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Here's your financial snapshot for today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen/> Your Learning Path</CardTitle>
            </CardHeader>
            <CardContent>
                {currentPath && nextArticle ? (
                    <div>
                        <p className="text-sm font-semibold text-muted-foreground">{currentPath.name}</p>
                        <p className="mt-2">Your next step is to read:</p>
                        <Link href={`/article/${nextArticle.id}`} className="block my-1">
                            <Button variant="link" className="px-0 h-auto text-lg text-left whitespace-normal">{nextArticle.title}</Button>
                        </Link>
                        {userProgress && (
                            <div className="mt-4">
                                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                    <span>Progress</span>
                                    <span>Step {userProgress.completed_step} of {userProgress.total_steps}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2.5">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-muted-foreground">Your learning journey starts here. We'll recommend articles to get you started soon!</p>
                )}
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
            <CardTitle className="flex items-center gap-2"><MessageSquare /> Hot Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {hotRooms.length > 0 ? (
                <ul className="space-y-2">
                    {hotRooms.map(room => (
                        <li key={room.room_id}>
                            <Link href="/chat" className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                                <span className="font-semibold text-primary"># {room.rooms[0]?.name || 'Unknown Room'}</span>
                                <span className="text-sm font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{room.recent_message_count}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">The community is quiet right now. Why not start a conversation?</p>
            )}
            <Link href="/chat">
              <Button variant="link" className="px-0 mt-2">
                Go to Chat <ChevronRight className="w-4 h-4 ml-1" />
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