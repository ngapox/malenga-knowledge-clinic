'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';

// Types to match our database schema
type Article = { id: string; title: string | null; };
type Path = { id: string; name: string | null; path_articles: { step_number: number; articles: Article | null }[] };

export default function AdminLearningPathsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<Path[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  
  // Form state for creating a new path
  const [newPathName, setNewPathName] = useState('');
  const [newPathDescription, setNewPathDescription] = useState('');
  const [newPathDifficulty, setNewPathDifficulty] = useState('Beginner');
  
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) { router.push('/'); return; }

    // Fetch all learning paths with their associated articles
    const pathsPromise = supabase
      .from('learning_paths')
      .select(`id, name, path_articles(step_number, articles(id, title))`)
      .order('name');
      
    // Fetch all available articles to add to paths
    const articlesPromise = supabase
      .from('articles')
      .select('id, title')
      .not('published_at', 'is', null)
      .order('title');

    const [{data: pathData}, {data: articleData}] = await Promise.all([pathsPromise, articlesPromise]);

    if (pathData) setPaths(pathData as any);
    if (articleData) setArticles(articleData);
    
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePath = async () => {
    if (!newPathName) { alert('Please enter a name for the path.'); return; }
    setIsSaving(true);
    const { error } = await supabase.from('learning_paths').insert({
      name: newPathName,
      description: newPathDescription,
      difficulty: newPathDifficulty,
    });
    if (error) {
      alert(error.message);
    } else {
      setNewPathName('');
      setNewPathDescription('');
      await loadData(); // Refresh the list
    }
    setIsSaving(false);
  };

  const addArticleToPath = async (pathId: string, articleId: string) => {
    const path = paths.find(p => p.id === pathId);
    if (!path || !articleId) return;

    // Determine the next step number
    const maxStep = Math.max(0, ...path.path_articles.map(pa => pa.step_number));
    const nextStep = maxStep + 1;

    const { error } = await supabase.from('path_articles').insert({
        path_id: pathId,
        article_id: articleId,
        step_number: nextStep,
    });
    
    if (error) alert(error.message)
    else await loadData();
  };

  const removeArticleFromPath = async (pathId: string, articleId: string) => {
    if(!confirm('Are you sure you want to remove this article from the path?')) return;
    const { error } = await supabase.from('path_articles')
        .delete()
        .match({ path_id: pathId, article_id: articleId });

    if(error) alert(error.message)
    else await loadData();
  }

  if (loading) return <div>Loading...</div>;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Learning Paths</h1>
      
      <Card>
        <CardHeader><CardTitle>Create New Path</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Path Name (e.g., Beginner's Guide to Stocks)" value={newPathName} onChange={(e) => setNewPathName(e.target.value)} />
          <Textarea placeholder="Path Description" value={newPathDescription} onChange={(e) => setNewPathDescription(e.target.value)} />
          <Select value={newPathDifficulty} onValueChange={setNewPathDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreatePath} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Path'}</Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Existing Paths</h2>
        {paths.map(path => (
          <Card key={path.id}>
            <CardHeader><CardTitle>{path.name}</CardTitle></CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">Articles in this path (in order):</h3>
              <ul className="space-y-2 mb-4">
                {path.path_articles.sort((a,b) => a.step_number - b.step_number).map(pa => (
                  <li key={pa.articles?.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span>{pa.step_number}. {pa.articles?.title}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeArticleFromPath(path.id, pa.articles!.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
                {path.path_articles.length === 0 && <p className="text-sm text-muted-foreground">No articles added yet.</p>}
              </ul>

              <div className="flex items-center gap-2">
                <Select onValueChange={(articleId) => addArticleToPath(path.id, articleId)}>
                    <SelectTrigger><SelectValue placeholder="Select an article to add..." /></SelectTrigger>
                    <SelectContent>
                        {articles.map(article => (
                            <SelectItem key={article.id} value={article.id}>{article.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button>
                    <PlusCircle className="h-4 w-4 mr-2" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
       <Link href="/admin" className="text-primary hover:underline">&larr; Back to Admin Panel</Link>
    </main>
  );
}