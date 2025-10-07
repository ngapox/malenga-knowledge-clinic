// src/app/dashboard/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ChevronRight, Megaphone } from "lucide-react";
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
};

async function getDashboardData() {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const profilePromise = supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const articlesPromise = supabase.from('articles').select('id, title').not('published_at', 'is', null).order('published_at', { ascending: false }).limit(3);
  
  // --- 👇 FETCH OPPORTUNITIES DATA 👇 ---
  const opportunitiesPromise = supabase.from('opportunities').select('id, title, opportunity_type, action_date').order('created_at', { ascending: false }).limit(3);

  // Await all promises together for better performance
  const [{ data: profile }, { data: articles }, { data: opportunities }] = await Promise.all([
    profilePromise,
    articlesPromise,
    opportunitiesPromise
  ]);
  
  // Placeholder for future data
  const watchlistItems: any[] = [];

  return {
    userName: profile?.full_name,
    articles: (articles as Article[]) || [],
    opportunities: (opportunities as Opportunity[]) || [],
    watchlistItems,
  };
}

export default async function DashboardPage() {
  const { userName, articles, opportunities } = await getDashboardData();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
          <CardHeader><CardTitle>Watchlist Snapshot</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Your tracked stocks and funds at a glance.</p>
            <Link href="/watchlist"><Button variant="link" className="px-0 mt-2">View Watchlist <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
          </CardContent>
        </Card>
        
        {/* --- 👇 UPDATE THIS CARD TO DISPLAY REAL DATA 👇 --- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone /> New Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {opportunities.length > 0 ? (
              <ul className="space-y-3">
                {opportunities.map(op => (
                  <li key={op.id} className="flex flex-col">
                    <span className="font-semibold">{op.title}</span>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="bg-secondary px-2 py-0.5 rounded-md">{op.opportunity_type}</span>
                      {op.action_date && <span>Action by: {formatDate(op.action_date)}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No new opportunities posted today. Check back soon!</p>
            )}
          </CardContent>
        </Card>
        {/* --- 👆 END OF UPDATE 👆 --- */}

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