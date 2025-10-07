// src/app/dashboard/page.tsx (Corrected Version)
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ChevronRight } from "lucide-react";
import Link from "next/link";

// Define a type for our articles for better type safety
type Article = {
  id: string;
  title: string | null;
};

// We will build this out with more personalized data in the next steps.
async function getDashboardData() {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // --- FIX 1: Corrected the select query syntax ---
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title') // Was ('id', 'title'), now ('id, title')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(3);

  // --- FIX 2: Added explicit types for the empty arrays ---
  const opportunities: any[] = [];
  const watchlistItems: any[] = [];

  return {
    userName: profile?.full_name,
    articles: (articles as Article[]) || [], // Cast to our new Article type
    opportunities,
    watchlistItems,
  };
}

export default async function DashboardPage() {
  const { userName, articles } = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {userName?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Here's your financial snapshot for today.</p>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Learning Path Card (Placeholder) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Learning Path</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Your next recommended article is ready for you. Keep up the great work!</p>
            <Button variant="link" className="px-0 mt-2">Continue Learning <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </CardContent>
        </Card>

        {/* Watchlist Summary Card (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Watchlist Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Your tracked stocks and funds at a glance.</p>
             <Link href="/watchlist">
                <Button variant="link" className="px-0 mt-2">View Watchlist <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </CardContent>
        </Card>

        {/* Opportunities Card (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>New Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No new opportunities posted today. Check back soon!</p>
          </CardContent>
        </Card>

        {/* Latest Articles Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Newspaper /> Latest Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
                {/* --- FIX 3: Added a check for article.title --- */}
                {articles.map(article => (
                    <li key={article.id}>
                        <Link href={`/article/${article.id}`} className="hover:underline text-primary">
                        {article.title || 'Untitled Article'}
                        </Link>
                    </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}