-- Step 1: Drop the old, incorrect foreign key that points to auth.users
-- We use a DO block to avoid an error if the constraint doesn't exist.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'room_members_user_id_fkey'
        AND    conrelid = 'public.room_members'::regclass
    ) THEN
        ALTER TABLE public.room_members DROP CONSTRAINT room_members_user_id_fkey;
    END IF;
END;
$$;


-- Step 2: Add the new, correct foreign key that points directly to public.profiles
ALTER TABLE public.room_members
ADD CONSTRAINT room_members_user_id_fkey FOREIGN KEY (user_id)
REFERENCES public.profiles(id) ON DELETE CASCADE;