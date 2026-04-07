-- BORLAWURA SUPPORT MODULE UPGRADE
-- Adding robust support tracking for both Users and Riders.

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID, -- References users(id) OR riders(id)
    creator_type TEXT NOT NULL CHECK (creator_type IN ('user', 'rider', 'admin')),
    subject TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES public.admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add rider_id to feedback table for complaints about specific riders
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for support tickets" ON public.support_tickets FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
