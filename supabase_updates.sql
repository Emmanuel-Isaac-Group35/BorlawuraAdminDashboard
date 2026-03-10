-- Add latitude and longitude columns to riders table for live tracking
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Update existing riders with some default locations (optional, for existing data validaty)
UPDATE public.riders SET latitude = 5.6037, longitude = -0.1870 WHERE latitude IS NULL;
