CREATE TABLE public.article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow everyone to read all comments
CREATE POLICY "Public can view all comments."
    ON public.article_comments FOR SELECT
    USING (true);

-- Policy: Allow authenticated users to insert their own comments
CREATE POLICY "Authenticated users can create comments."
    ON public.article_comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments."
    ON public.article_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Allow admins to delete any comment
CREATE POLICY "Admins can delete any comments."
    ON public.article_comments FOR DELETE
    USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);