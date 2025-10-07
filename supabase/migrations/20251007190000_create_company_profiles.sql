CREATE TABLE public.company_profiles (
    symbol TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    sector TEXT,
    website TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- The foreign key constraint has been removed from this file.

-- Enable Row Level Security
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Policies (publicly viewable, admin-managed)
CREATE POLICY "Public can view company profiles." 
ON public.company_profiles FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage company profiles." 
ON public.company_profiles FOR ALL 
USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);