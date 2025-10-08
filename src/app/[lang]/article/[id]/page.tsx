'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

// Define types for our data
type Article = {
  title: string;
  content: string;
  published_at: string;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
  user_id: string;
};

export default function ArticlePage({ params }: { params: { id: string } }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const loadData = useCallback(async () => {
    // Fetch user session first
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    
    if (session?.user) {
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
      setIsAdmin(profile?.is_admin ?? false);
    }

    // Fetch article and comments in parallel
    const articlePromise = supabase.from('articles').select('title, content, published_at').eq('id', params.id).not('published_at', 'is', null).single();
    const commentsPromise = supabase.from('article_comments').select(`id, content, created_at, user_id, profiles(full_name)`).eq('article_id', params.id).order('created_at', { ascending: true });
    
    const [{ data: articleData, error: articleError }, { data: commentsData }] = await Promise.all([articlePromise, commentsPromise]);

    if (articleError) {
      setError('Article not found.');
    } else {
      setArticle(articleData);
      setComments((commentsData as any) || []);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadData();

    async function updateProgress() {
      fetch('/api/learning/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: params.id }),
      });
    }
    updateProgress();
  }, [params.id, loadData]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    setIsPosting(true);
    const { error } = await supabase.from('article_comments').insert({
      article_id: params.id,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      alert(error.message);
    } else {
      setNewComment('');
      await loadData(); // Reload comments
    }
    setIsPosting(false);
  };
  
  const handleDeleteComment = async (commentId: string) => {
    if(!confirm('Are you sure you want to delete this comment?')) return;
    const { error } = await supabase.from('article_comments').delete().eq('id', commentId);
    if(error) alert(error.message);
    else await loadData();
  }

  if (loading) return <main className="mx-auto max-w-3xl py-8 px-4 text-center">Loading article...</main>;
  if (error || !article) return <main className="mx-auto max-w-3xl py-8 px-4 text-center">{error || 'Could not load article.'}</main>;

  return (
    <main className="mx-auto max-w-3xl py-8 px-4 space-y-12">
      <article>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{article.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Published on {new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </article>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b pb-2">Comments ({comments.length})</h2>
        {user ? (
          <div className="space-y-2">
            <Textarea 
              placeholder="Share your thoughts or ask a question..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <Button onClick={handlePostComment} disabled={isPosting}>
              {isPosting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">Please <a href="/auth" className="underline text-primary">sign in</a> to post a comment.</p>
        )}
        
        <div className="space-y-4">
          {comments.map(comment => (
            <Card key={comment.id}>
              <CardHeader className="flex flex-row justify-between items-start p-4">
                <div>
                  <p className="font-semibold">{comment.profiles?.full_name || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
                {(user?.id === comment.user_id || isAdmin) && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(comment.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p>{comment.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}