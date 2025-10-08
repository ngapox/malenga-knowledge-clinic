CREATE OR REPLACE FUNCTION get_user_rooms()
RETURNS TABLE (
  id uuid,
  name text,
  is_public boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.is_public
  FROM
    public.rooms r
  WHERE
    r.is_public = TRUE
  OR
    (r.is_public = FALSE AND EXISTS (
      SELECT 1
      FROM public.room_members rm
      WHERE rm.room_id = r.id AND rm.user_id = auth.uid()
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;