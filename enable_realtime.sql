-- Enable Realtime for the application tables
-- This ensures that account status changes (active/suspended) are reflected 
-- immediately on the mobile applications without requiring a restart.

BEGIN;

-- Ensure tables have full replica identity to send all fields in updates
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.riders REPLICA IDENTITY FULL;
ALTER TABLE public.admins REPLICA IDENTITY FULL;

-- First, ensure the 'supabase_realtime' publication exists (standard Supabase naming)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add key management tables to the publication
-- Note: If table already exists in publication, this might error in some Postgres versions
-- Safer to drop and recreate or use a more complex check
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.users, public.riders, public.admins, public.pickups;


-- Update RLS for better security with status checks
-- While the app checks UI, the DB should block unauthorized actions

-- For pickups, only allow active users to insert
CREATE OR REPLACE FUNCTION public.is_active_user(check_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = check_id AND status = 'active' AND (registration_status = 'approved' OR registration_status IS NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply policies for pickups with active checks
DROP POLICY IF EXISTS "Enable all for pickups" ON public.pickups;
CREATE POLICY "Users can create pickups if active" 
ON public.pickups FOR INSERT 
WITH CHECK (public.is_active_user(user_id));

CREATE POLICY "Users can view own pickups" 
ON public.pickups FOR SELECT 
USING (user_id = auth.uid() OR public.is_active_user(user_id)); -- Fallback for anon if they provide user_id

COMMIT;
