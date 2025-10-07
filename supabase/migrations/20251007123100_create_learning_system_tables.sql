-- supabase/migrations/20251007123100_create_learning_system_tables.sql

-- Table to define learning paths
CREATE TABLE public.learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT, -- e.g., 'Beginner', 'Intermediate'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table to link articles to paths in a specific order
CREATE TABLE public.path_articles (
    path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    PRIMARY KEY (path_id, article_id)
);

-- Table to track user progress
CREATE TABLE public.user_progress (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    completed_step INT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, path_id)
);


-- Enable RLS for all three tables
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policies for learning_paths (read-only for users, full control for admins)
CREATE POLICY "Users can view learning paths." ON public.learning_paths FOR SELECT USING (true);
CREATE POLICY "Admins can manage learning paths." ON public.learning_paths FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);

-- Policies for path_articles (read-only for users, full control for admins)
CREATE POLICY "Users can view path articles." ON public.path_articles FOR SELECT USING (true);
CREATE POLICY "Admins can manage path articles." ON public.path_articles FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);

-- Policies for user_progress (users can manage their own progress, admins can view all)
CREATE POLICY "Users can manage their own progress." ON public.user_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all user progress." ON public.user_progress FOR SELECT USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);