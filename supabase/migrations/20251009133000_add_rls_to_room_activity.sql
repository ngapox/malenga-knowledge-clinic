-- Enable Row Level Security on the room_activity table
ALTER TABLE public.room_activity ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows any logged-in user to read the data
CREATE POLICY "Authenticated users can view room activity."
ON public.room_activity
FOR SELECT
USING (auth.role() = 'authenticated');