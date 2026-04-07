-- BorlaWura Notification Infrastructure v1
-- Ensures persistent alerts work as expected.

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'system',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable Real-Time
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DROP PUBLICATION IF EXISTS supabase_realtime_notifications;
CREATE PUBLICATION supabase_realtime_notifications FOR TABLE public.notifications;

-- Seed initial system signal
INSERT INTO public.notifications (type, title, message, priority)
VALUES ('system', 'BorlaWura Protocol Active', 'Administrative dashboard synchronized with mobile notification layers.', 'low');
