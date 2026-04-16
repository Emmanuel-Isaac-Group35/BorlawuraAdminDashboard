-- BORLAWURA CMS & MOBILE APPS ENGINE REPAIR SCRIPT
-- This script creates the missing system_settings table and ensures proper data flow.

-- 1. Create the Core Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Enable Broad Realtime (CRITICAL for instant updates on phone)
ALTER TABLE public.system_settings REPLICA IDENTITY FULL;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;

-- 3. Grant Open Access for Mobile Apps (Public can READ, Admins can ALL)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Settings" ON public.system_settings;
CREATE POLICY "Public Read Settings" ON public.system_settings 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access Settings" ON public.system_settings;
CREATE POLICY "Admin Full Access Settings" ON public.system_settings 
FOR ALL USING (true);

-- 4. Initial Seed (If empty)
INSERT INTO public.system_settings (id, settings)
VALUES ('global_config', '{}'), ('cms_config_v3', '{"user": {"headerTitle": "Borla Wura", "headerTagline": "Eco-friendly Pickups", "announcement": {"enabled": false}, "banners": []}}')
ON CONFLICT (id) DO NOTHING;

-- 5. Force API Schema Refresh
NOTIFY pgrst, 'reload schema';
