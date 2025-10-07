-- supabase/migrations/20251007123000_create_opportunities_table.sql

CREATE TABLE public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    opportunity_type TEXT NOT NULL, -- e.g., 'BOND', 'IPO', 'REAL_ESTATE', 'FUND'
    action_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all opportunities
CREATE POLICY "Public can view all opportunities."
    ON public.opportunities FOR SELECT
    USING (true);

-- Policy: Allow admins to do anything
CREATE POLICY "Admins can manage all opportunities."
    ON public.opportunities FOR ALL
    USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
    );