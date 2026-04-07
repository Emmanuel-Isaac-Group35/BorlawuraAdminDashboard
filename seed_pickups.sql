-- BorneoWura Data Seeding & Verification Script
-- This script adds sample pickups (orders) to verify the system's fetch capability.

DO $$
DECLARE
    uid UUID;
    rid UUID;
BEGIN
    -- 1. Ensure we have at least one test user
    INSERT INTO public.users (id, full_name, phone_number, location, status)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Customer', '+233240000000', 'Accra Central', 'active')
    ON CONFLICT (id) DO NOTHING;
    
    uid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    -- 2. Ensure we have at least one test rider
    INSERT INTO public.riders (id, full_name, phone_number, vehicle_type, vehicle_number, status)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test Rider', '+233241111111', 'Motorbike', 'GW-123-24', 'active')
    ON CONFLICT (id) DO NOTHING;
    
    rid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    -- 3. Insert Test Pickups
    -- Entry 1: Requested
    INSERT INTO public.pickups (user_id, status, address, waste_type, waste_size, location)
    VALUES (uid, 'requested', '123 Spintex Road, Accra', 'Plastic Waste', 'Standard', '{"lat": 5.6037, "lng": -0.1870}')
    ON CONFLICT DO NOTHING;

    -- Entry 2: Scheduled
    INSERT INTO public.pickups (user_id, rider_id, status, address, waste_type, waste_size, location)
    VALUES (uid, rid, 'scheduled', '45 Osu RE, Accra', 'Organic Waste', 'Large', '{"lat": 5.5560, "lng": -0.1969}')
    ON CONFLICT DO NOTHING;

    -- Entry 3: In Progress
    INSERT INTO public.pickups (user_id, rider_id, status, address, waste_type, waste_size, location)
    VALUES (uid, rid, 'in_progress', '78 East Legon, Accra', 'General Waste', 'Bulk', '{"lat": 5.6337, "lng": -0.1670}')
    ON CONFLICT DO NOTHING;
END $$;

-- 4. Verify Realtime Publication
-- Ensure the pickups table IS in the publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pickups'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pickups;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
