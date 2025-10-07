CREATE TABLE public.room_activity (
    room_id UUID PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    recent_message_count INT
);

-- Function to update the room activity table
CREATE OR REPLACE FUNCTION public.update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.room_activity (room_id, last_message_at, recent_message_count)
    VALUES (NEW.room_id, NEW.created_at, 1)
    ON CONFLICT (room_id)
    DO UPDATE SET
        last_message_at = NEW.created_at,
        recent_message_count = room_activity.recent_message_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new message is inserted
CREATE TRIGGER on_new_message_update_activity
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE PROCEDURE public.update_room_activity();

-- Optional: Function to periodically reset the count (e.g., daily)
-- This keeps the "hot" list fresh. You can schedule this with a cron job.
CREATE OR REPLACE FUNCTION public.reset_daily_activity()
RETURNS void AS $$
BEGIN
    UPDATE public.room_activity SET recent_message_count = 0;
END;
$$ LANGUAGE plpgsql;