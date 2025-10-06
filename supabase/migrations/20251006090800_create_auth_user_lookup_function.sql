-- Create the resilient function to look up users in auth.users
CREATE OR REPLACE FUNCTION public.get_auth_user_by_phone(p_phone TEXT)
RETURNS TABLE (
    id UUID,
    phone TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER -- Ensures the function has permission to read auth.users
AS $$
  -- Sanitize both the input and the stored data for a reliable match
  SELECT
    u.id,
    u.phone
  FROM
    auth.users AS u
  WHERE
    -- This regex removes all non-digit characters ('\D') globally ('g')
    regexp_replace(u.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
$$;

-- Grant execute permission on the function to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_auth_user_by_phone(TEXT) TO authenticated;
-- Grant execute permission to the service_role (used by your admin client)
GRANT EXECUTE ON FUNCTION public.get_auth_user_by_phone(TEXT) TO service_role;