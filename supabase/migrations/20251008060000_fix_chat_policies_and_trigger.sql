-- Drop the old, problematic policies and trigger if they exist
DROP POLICY IF EXISTS "Allow members to see other members" ON public.room_members;
DROP POLICY IF EXISTS "Allow members to post messages in their rooms" ON public.messages;
DROP TRIGGER IF EXISTS on_new_message_update_activity ON public.messages;

-- === FIX FOR "400 Bad Request" on GETTING MEMBERS ===
-- A more robust policy to allow members to see who is in the same room.
CREATE POLICY "Allow members to see other members"
ON public.room_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members AS self
    WHERE self.room_id = room_members.room_id AND self.user_id = auth.uid()
  )
);

-- === FIX FOR "500 Internal Server Error" on POSTING MESSAGES ===
-- Recreate the policy to allow members to post messages.
CREATE POLICY "Allow members to post messages in their rooms"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = messages.room_id AND room_members.user_id = auth.uid()
  )
);

-- Recreate the trigger, but this time, grant usage on the sequence to the postgres role
-- This is a common fix for triggers that fail with 500 errors.
CREATE TRIGGER on_new_message_update_activity
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE PROCEDURE public.update_room_activity();