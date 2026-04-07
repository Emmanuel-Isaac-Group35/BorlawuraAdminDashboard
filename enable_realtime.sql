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
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

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
