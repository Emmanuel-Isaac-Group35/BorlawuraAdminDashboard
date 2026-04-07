-- BorneoWura Database: Rider Fleet Standardization
-- This script fixes inconsistencies in the riders table columns to match modern React logic.

-- 1. Ensure columns exist before using them
DO $$
BEGIN
    -- Add columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'phone') THEN
        ALTER TABLE public.riders ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'zone') THEN
        ALTER TABLE public.riders ADD COLUMN zone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'address') THEN
        ALTER TABLE public.riders ADD COLUMN address TEXT;
    END IF;
END $$;

-- 2. Add Location Columns (Safely)
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 3. Standardize RLS
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for riders" ON public.riders;
CREATE POLICY "Enable all for riders" ON public.riders FOR ALL USING (true);

-- 4. Seed with default data (Ensures at least one rider exists for testing)
-- Corrected column usage to ensure "insertion" works with existing table.
INSERT INTO public.riders (full_name, phone, zone, address, status, latitude, longitude)
SELECT 'Kwame Mensah', '0244123456', 'Accra Central', 'Circle', 'active', 5.6037, -0.1870
WHERE NOT EXISTS (SELECT 1 FROM public.riders LIMIT 1);

-- 5. Broadcast Schema Refresh
NOTIFY pgrst, 'reload schema';
