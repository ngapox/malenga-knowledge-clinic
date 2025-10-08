-- Drop the old, more restrictive policies on the messages table
DROP POLICY IF EXISTS "Members can insert messages." ON public.messages;
DROP POLICY IF EXISTS "Members can view messages." ON public.messages;

-- Create a new, more permissive policy for VIEWING messages.
-- A user can see messages if the room is public OR if they are a member.
CREATE POLICY "Users can view messages in public or member rooms."
ON public.messages FOR SELECT
USING (
  (SELECT is_public FROM public.rooms WHERE id = messages.room_id) = TRUE
  OR
  is_member_of(messages.room_id, auth.uid())
);

-- Create a new, more permissive policy for POSTING messages.
-- A user can post a message if the room is public OR if they are a member.
CREATE POLICY "Users can post messages in public or member rooms."
ON public.messages FOR INSERT
WITH CHECK (
  (SELECT is_public FROM public.rooms WHERE id = messages.room_id) = TRUE
  OR
  is_member_of(messages.room_id, auth.uid())
);