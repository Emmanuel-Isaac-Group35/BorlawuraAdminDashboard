-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Riders Table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.riders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    national_id TEXT,
    tricycle_number TEXT,
    zone TEXT,
    address TEXT,
    status TEXT DEFAULT 'offline' CHECK (status IN ('active', 'offline', 'suspended', 'busy')),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_earnings NUMERIC(10, 2) DEFAULT 0.00,
    total_pickups INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Add Location Columns (Safe to run if table exists)
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 3. Enable RLS
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy (Drop first to avoid errors if it exists)
DROP POLICY IF EXISTS "Enable all for riders" ON public.riders;
CREATE POLICY "Enable all for riders" ON public.riders FOR ALL USING (true);

-- 5. Seed with default data (optional, ensures at least one rider exists nearby)
INSERT INTO public.riders (full_name, phone, zone, address, status, latitude, longitude)
SELECT 'Kwame Mensah', '0244123456', 'Accra Central', 'Circle', 'active', 5.6037, -0.1870
WHERE NOT EXISTS (SELECT 1 FROM public.riders LIMIT 1);
