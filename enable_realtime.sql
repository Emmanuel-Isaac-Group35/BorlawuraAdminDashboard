<<<<<<< HEAD
-- BorneoWura Realtime & Database Synchronization Script
-- This script enables live data synchronization and ensures table consistency.

-- 1. Ensure columns exist in the riders table (safely)
DO $$
BEGIN
    -- Add phone column if phone_number doesn't exist (handle naming inconsistencies)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'phone') THEN
        ALTER TABLE public.riders ADD COLUMN phone TEXT;
    END IF;

    -- Add zone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'zone') THEN
        ALTER TABLE public.riders ADD COLUMN zone TEXT;
    END IF;

    -- Add address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'address') THEN
        ALTER TABLE public.riders ADD COLUMN address TEXT;
    END IF;
END $$;

-- 2. Create the realtime publication if it doesn't already exist
DO $$ 
BEGIN
=======
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
>>>>>>> 2a01413fc21621ea9ae6a977f6747fa97659b41c
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

<<<<<<< HEAD
-- 3. Add all core tables to the realtime system (safely)
-- This avoids the "already member" error by checking existence first.
DO $$
DECLARE
    table_to_add TEXT;
    -- Adding all relevant tables to help the system respond to ANY entry
    tables_list TEXT[] := ARRAY['users', 'riders', 'pickups', 'audit_logs', 'sms_logs', 'feedback', 'admins', 'notifications', 'payments'];
BEGIN
    FOREACH table_to_add IN ARRAY tables_list LOOP
        -- Only check public tables
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_to_add) THEN
            -- Only add if not already in the publication
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_to_add
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_to_add);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 4. Ensure "orders" table or view exists for frontend compatibility
-- If it doesn't exist, we link it to "pickups" so the dashboard logic remains unified.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        CREATE VIEW public.orders AS SELECT * FROM public.pickups;
        
        -- Note: If you want to enable Realtime for this view, rename pickups to orders instead.
        -- ALTER TABLE public.pickups RENAME TO orders;
    END IF;
END $$;

-- 5. Final Signal: Force schema cache refresh
NOTIFY pgrst, 'reload schema';
=======
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
>>>>>>> 2a01413fc21621ea9ae6a977f6747fa97659b41c
