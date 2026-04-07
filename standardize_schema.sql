-- BorlaWura Database Standardization Script
-- This script ensures all table names are lowercase and consistent with the Admin Dashboard code.

DO $$ 
BEGIN
    -- 1. Standardize Pickups Table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Pickups' AND table_schema = 'public') THEN
        ALTER TABLE public."Pickups" RENAME TO pickups;
        RAISE NOTICE 'Renamed Pickups to pickups';
    END IF;

    -- 2. Standardize Audit Logs Table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Audit_Logs' AND table_schema = 'public') THEN
        ALTER TABLE public."Audit_Logs" RENAME TO audit_logs;
        RAISE NOTICE 'Renamed Audit_Logs to audit_logs';
    END IF;

    -- 3. Ensure foreign key relationships are correctly named for PostgREST
    -- (This ensures that users(full_name) join works correctly)
    -- If the FK is not present, we create it
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pickups_user_id_fkey') THEN
        BEGIN
            ALTER TABLE public.pickups 
            ADD CONSTRAINT pickups_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create foreign key - columns might be missing';
        END;
    END IF;

END $$;
