-- This policy allows users to see the members of rooms they are also a member of.
CREATE POLICY "Allow members to see other members"
ON public.room_members FOR SELECT
USING (
  room_id IN (
    SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
  )
);