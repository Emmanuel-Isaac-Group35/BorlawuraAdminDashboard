-- Add latitude and longitude columns to riders table for live tracking
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Update existing riders with some default locations (optional, for existing data validaty)
UPDATE public.riders SET latitude = 5.6037, longitude = -0.1870 WHERE latitude IS NULL;

-- Add role column to users table and refresh Supabase cache
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'alert', -- pickup, rider, payment, system, alert
    is_read BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'medium', -- high, medium, low
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for notification access" ON public.notifications FOR ALL USING (true);

-- Function to handle notification sync from audit logs
CREATE OR REPLACE FUNCTION public.sync_audit_to_notifications()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (title, message, type, priority)
    VALUES (
        new.action,
        COALESCE(new.details->>'message', new.action),
        CASE 
            WHEN new.action ILIKE '%pickup%' THEN 'pickup'
            WHEN new.action ILIKE '%rider%' THEN 'rider'
            WHEN new.action ILIKE '%pay%' THEN 'payment'
            WHEN new.action ILIKE '%sms%' THEN 'system'
            ELSE 'alert'
        END,
        CASE 
            WHEN new.action ILIKE '%delete%' OR new.action ILIKE '%fail%' THEN 'high'
            ELSE 'medium'
        END
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync audit logs to notifications automatically
DROP TRIGGER IF EXISTS on_audit_log_created ON public.audit_logs;
CREATE TRIGGER on_audit_log_created
AFTER INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_audit_to_notifications();

NOTIFY pgrst, 'reload schema';
