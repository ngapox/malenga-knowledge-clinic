-- First, drop all existing policies on the relevant tables to start fresh.
DROP POLICY IF EXISTS "Allow members to see other members" ON public.room_members;
DROP POLICY IF EXISTS "Members can view other members of the same room." ON public.room_members;
DROP POLICY IF EXISTS "Allow members to post messages in their rooms" ON public.messages;
DROP POLICY IF EXISTS "Members can insert messages in their rooms." ON public.messages;

-- Create a helper function to check if a user is a member of a room.
-- Using a function like this is a robust way to prevent policy recursion.
CREATE OR REPLACE FUNCTION is_member_of(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
$$;

-- Grant execute permission on the function to authenticated users.
GRANT EXECUTE ON FUNCTION is_member_of(UUID, UUID) TO authenticated;

-- New, stable policy for reading room members.
-- It allows a user to see the list of members for any room they are also a member of.
CREATE POLICY "Members can view other members of the same room."
ON public.room_members FOR SELECT
USING ( is_member_of(room_id, auth.uid()) );

-- New, stable policy for inserting messages.
-- It allows a user to send a message in a room they are a member of.
CREATE POLICY "Members can insert messages in their rooms."
ON public.messages FOR INSERT
WITH CHECK ( is_member_of(room_id, auth.uid()) );