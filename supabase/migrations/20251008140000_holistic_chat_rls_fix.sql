-- First, drop all old policies to ensure a clean slate.
DROP POLICY IF EXISTS "Members can insert messages in their rooms." ON public.messages;
DROP POLICY IF EXISTS "Members can view other members of the same room." ON public.room_members;
DROP POLICY IF EXISTS "Admins can manage rooms." ON public.rooms;
DROP POLICY IF EXISTS "Users can view rooms." ON public.rooms;
DROP POLICY IF EXISTS "Admins can create invites." ON public.room_invites;
DROP POLICY IF EXISTS "Admins can manage invites." ON public.room_invites; -- Drop old problematic one
DROP POLICY IF EXISTS "Admins can view invites." ON public.room_invites; -- Drop new one if it exists
DROP POLICY IF EXISTS "Admins can delete invites." ON public.room_invites; -- Drop new one if it exists
DROP POLICY IF EXISTS "Members can insert messages." ON public.messages;
DROP POLICY IF EXISTS "Members can view messages." ON public.messages;
DROP POLICY IF EXISTS "Members can view other members." ON public.room_members;
DROP FUNCTION IF EXISTS is_member_of(uuid, uuid);

-- Re-create the helper function for checking room membership.
CREATE OR REPLACE FUNCTION is_member_of(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
$$;
GRANT EXECUTE ON FUNCTION is_member_of(UUID, UUID) TO authenticated;

-- === POLICIES FOR 'rooms' TABLE ===
CREATE POLICY "Admins can manage rooms." ON public.rooms FOR ALL
USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);
CREATE POLICY "Users can view rooms." ON public.rooms FOR SELECT
USING (auth.role() = 'authenticated');

-- === POLICIES FOR 'room_invites' TABLE ===
CREATE POLICY "Admins can create invites." ON public.room_invites FOR INSERT
WITH CHECK ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);

-- --- V THIS IS THE CORRECTED PART V ---
-- Split into two separate policies
CREATE POLICY "Admins can view invites." ON public.room_invites FOR SELECT
USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);
CREATE POLICY "Admins can delete invites." ON public.room_invites FOR DELETE
USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE);
-- --- ^ END OF CORRECTION ^ ---

-- === POLICIES FOR 'messages' TABLE ===
CREATE POLICY "Members can insert messages." ON public.messages FOR INSERT
WITH CHECK (is_member_of(room_id, auth.uid()));
CREATE POLICY "Members can view messages." ON public.messages FOR SELECT
USING (is_member_of(room_id, auth.uid()));

-- === POLICIES FOR 'room_members' TABLE ===
CREATE POLICY "Members can view other members." ON public.room_members FOR SELECT
USING (is_member_of(room_id, auth.uid()));