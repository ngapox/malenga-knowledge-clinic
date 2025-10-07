import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StockChart } from "@/components/StockChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Briefcase, BarChart2 } from "lucide-react";

async function getStockData(symbol: string) {
    const supabase = createSupabaseServerClient();

    // Fetch company profile and latest quote in parallel
    const profilePromise = supabase.from('company_profiles').select('*').eq('symbol', symbol).single();
    const latestQuotePromise = supabase.from('dse_quotes').select('close, as_of_date').eq('symbol', symbol).order('as_of_date', { ascending: false }).limit(1).single();
    
    // Fetch 52-week range data
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const rangePromise = supabase.from('dse_quotes').select('close').eq('symbol', symbol).gte('as_of_date', oneYearAgo.toISOString().split('T')[0]);

    const [{data: profile}, {data: latestQuote}, {data: rangeData}] = await Promise.all([profilePromise, latestQuotePromise, rangePromise]);

    if (!profile) {
        // If there's no profile, we can decide if we still want to show the page or not.
        // For now, let's say a profile is required.
        return notFound();
    }
    
    // Calculate 52-week high and low
    let high52w = null;
    let low52w = null;
    if (rangeData && rangeData.length > 0) {
        const prices = rangeData.map(r => r.close);
        high52w = Math.max(...prices);
        low52w = Math.min(...prices);
    }
    
    return {
        profile,
        latestQuote,
        metrics: {
            high52w,
            low52w,
        }
    };
}

export default async function StockDetailPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const { profile, latestQuote, metrics } = await getStockData(symbol);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold">{profile.company_name}</h1>
                <Badge variant="secondary" className="text-lg">{profile.symbol}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> <span>{profile.sector}</span></div>
                {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                        <ExternalLink className="w-4 h-4" /> <span>Website</span>
                    </a>
                )}
            </div>
        </div>
        <div className="text-right">
            <p className="text-4xl font-bold">TZS {latestQuote?.close.toLocaleString() ?? 'N/A'}</p>
            <p className="text-sm text-muted-foreground">As of {latestQuote ? new Date(latestQuote.as_of_date).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      {/* Key Metrics Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader><CardTitle className="text-base font-normal text-muted-foreground">52-Week High</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{metrics.high52w ? metrics.high52w.toLocaleString() : 'N/A'}</p></CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle className="text-base font-normal text-muted-foreground">52-Week Low</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{metrics.low52w ? metrics.low52w.toLocaleString() : 'N/A'}</p></CardContent>
        </Card>
        {/* Add more metric cards here later, e.g., Market Cap, P/E Ratio */}
      </div>

      {/* About Section */}
      <Card>
        <CardHeader><CardTitle>About {profile.company_name}</CardTitle></CardHeader>
        <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">{profile.description}</p>
        </CardContent>
      </Card>
      
      {/* Chart Section */}
      <StockChart symbol={symbol} />
    </div>
  );
}