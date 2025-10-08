// src/app/admin/articles/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

type Article = {
  id: string;
  title: string;
  published_at: string | null;
};

export default function AdminArticlesPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!data?.is_admin) {
        router.push('/');
        return;
      }
      setIsAdmin(true);
      setLoading(false);
      loadArticles();
    };
    checkAdmin();
  }, [router]);

  const loadArticles = async () => {
    const { data } = await supabase.from('articles').select('id, title, published_at').order('created_at', { ascending: false });
    if (data) setArticles(data);
  };

  const handleSave = async (publish: boolean) => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      title,
      content,
      author_id: user.id,
      published_at: publish ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from('articles').insert(payload);
    if (error) {
      alert(error.message);
    } else {
      setTitle('');
      setContent('');
      loadArticles();
    }
    setIsSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Articles</h1>
      
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Create New Article</h2>
        <Input placeholder="Article Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Article content... (You can use Markdown!)" value={content} onChange={(e) => setContent(e.target.value)} rows={10} />
        <div className="flex gap-4">
          <Button onClick={() => handleSave(true)} disabled={isSaving}>{isSaving ? 'Publishing...' : 'Publish'}</Button>
          <Button onClick={() => handleSave(false)} disabled={isSaving} variant="secondary">{isSaving ? 'Saving...' : 'Save as Draft'}</Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Existing Articles</h2>
        <ul className="space-y-2">
          {articles.map(article => (
            <li key={article.id} className="flex justify-between items-center p-2 border rounded">
              <span>{article.title}</span>
              <span className={`text-sm ${article.published_at ? 'text-green-500' : 'text-yellow-500'}`}>
                {article.published_at ? 'Published' : 'Draft'}
              </span>
            </li>
          ))}
        </ul>
      </div>
       <Link href="/admin" className="text-primary hover:underline">&larr; Back to Admin Panel</Link>
    </main>
  );
}