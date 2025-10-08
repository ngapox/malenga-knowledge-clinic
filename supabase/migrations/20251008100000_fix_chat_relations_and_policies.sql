-- First, clean up any old policies that might be causing conflicts.
DROP POLICY IF EXISTS "Allow members to see other members" ON public.room_members;
DROP POLICY IF EXISTS "Allow members to post messages in their rooms" ON public.messages;

-- If the foreign key doesn't exist, add it. This links a room member to their profile.
-- This will fix the "Could not find a relationship" error.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'room_members_user_id_fkey'
        AND    conrelid = 'public.room_members'::regclass
    ) THEN
        ALTER TABLE public.room_members
        ADD CONSTRAINT room_members_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- New, corrected policy for reading room members.
-- A user can see other members if they are also a member of that same room.
CREATE POLICY "Members can view other members of the same room."
ON public.room_members FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.room_members AS member_check
    WHERE member_check.room_id = room_members.room_id AND member_check.user_id = auth.uid()
  )
);

-- New, corrected policy for inserting messages.
-- A user can insert a message if they are a member of the room.
CREATE POLICY "Members can insert messages in their rooms."
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE room_members.room_id = messages.room_id AND room_members.user_id = auth.uid()
  )
);