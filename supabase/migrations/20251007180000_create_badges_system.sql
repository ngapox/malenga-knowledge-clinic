-- Table to define the available badges
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT, -- e.g., 'award', 'book-open', 'trending-up' from lucide-react
    learning_path_id UUID UNIQUE REFERENCES public.learning_paths(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to link users to the badges they have earned
CREATE TABLE public.user_badges (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- Enable Row Level Security
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policies for badges (publicly viewable, admin-managed)
CREATE POLICY "Public can view all badges." ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges." ON public.badges FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);

-- Policies for user_badges (users can view their own, admins can view all)
CREATE POLICY "Users can view their own badges." ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all user badges." ON public.user_badges FOR SELECT USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);