-- This policy allows a user to send a message in a room if they are a member of that room.
CREATE POLICY "Allow members to post messages in their rooms"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = messages.room_id AND room_members.user_id = auth.uid()
  )
);