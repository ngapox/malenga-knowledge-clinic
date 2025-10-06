-- Create the table to store articles
CREATE TABLE public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID REFERENCES public.profiles(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to published articles
CREATE POLICY "Public can view published articles."
    ON public.articles FOR SELECT
    USING (published_at IS NOT NULL AND published_at <= NOW());

-- Policy: Allow admins to do anything
CREATE POLICY "Admins can manage all articles."
    ON public.articles FOR ALL
    USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
    );