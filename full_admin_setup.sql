-- BorneoWura Administrative Overlord Script v6
-- This script grants absolute control, fixes schema issues, and ensures ALL management tables and columns exist.

-- 1. Ensure Dependencies
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Repair Table Constraints
DO $$
BEGIN
    -- Drop old foreign key if it's blocking rider creation
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.riders'::regclass) THEN
        ALTER TABLE public.riders DROP CONSTRAINT profiles_id_fkey;
    END IF;
    
    -- Drop any other constraints that might link riders to users as a required FK
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'riders_id_fkey' AND conrelid = 'public.riders'::regclass) THEN
        ALTER TABLE public.riders DROP CONSTRAINT riders_id_fkey;
    END IF;
END $$;

-- 3. Create Core Tables
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'dispatcher', status TEXT DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE, avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.riders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL, phone_number TEXT, email TEXT,
    vehicle_type TEXT DEFAULT 'Motorbike', vehicle_number TEXT,
    status TEXT DEFAULT 'active', rating NUMERIC(3, 2) DEFAULT 5.00,
    total_earnings NUMERIC(10, 2) DEFAULT 0.00, total_pickups INTEGER DEFAULT 0,
    zone TEXT, address TEXT, avatar_url TEXT,
    latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL, phone_number TEXT, email TEXT,
    address TEXT, location TEXT, status TEXT DEFAULT 'active',
    balance NUMERIC(10, 2) DEFAULT 0.00, role TEXT DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.pickups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'requested', pickup_time TIMESTAMP WITH TIME ZONE,
    location JSONB, address TEXT, waste_type TEXT, waste_size TEXT, details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. AGGRESSIVE Column Alignment (CRITICAL for Profile Updates)
DO $$
BEGIN
    -- ADMINS Reparations
    ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'dispatcher';
    ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

    -- RIDERS Reparations
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS phone_number TEXT;
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'Motorbike';
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS zone TEXT;
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS address TEXT;

    -- USERS Reparations
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0.00;
END $$;

-- 5. Universal Administrative Permissions
DO $$
DECLARE
    table_name TEXT;
    tables_list TEXT[] := ARRAY['users', 'riders', 'pickups', 'admins', 'audit_logs', 'notifications', 'payments', 'feedback'];
BEGIN
    FOREACH table_name IN ARRAY tables_list LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Admin full control on %I" ON public.%I', table_name, table_name);
            EXECUTE format('CREATE POLICY "Admin full control on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', table_name, table_name);
        END IF;
    END LOOP;
END $$;

-- 6. Universal Realtime Activation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = row.tablename
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', row.tablename);
        END IF;
    END LOOP;
END $$;

-- 7. Force Schema Cache Sync (CRITICAL for new columns to show up in API)
NOTIFY pgrst, 'reload schema';
