// src/app/article/[id]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown'; // <-- IMPORT THE NEW LIBRARY

export const dynamic = 'force-dynamic';

async function getArticle(id: string) {
  // ... (getArticle function remains the same)
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('articles')
    .select('title, content, published_at')
    .eq('id', id)
    .not('published_at', 'is', null)
    .single();

  return data;
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const article = await getArticle(params.id);

  if (!article) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl py-8 px-4">
      <article>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{article.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Published on {new Date(article.published_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        
        {/* --- 👇 RENDER THE CONTENT AS MARKDOWN 👇 --- */}
        {/* The 'prose' class from @tailwindcss/typography will automatically style your content */}
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </article>
    </main>
  );
}