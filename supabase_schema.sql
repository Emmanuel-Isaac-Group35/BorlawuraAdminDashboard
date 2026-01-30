-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.pickups;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.riders;
DROP TABLE IF EXISTS public.admins;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.sms_logs;
DROP TABLE IF EXISTS public.feedback;
DROP TABLE IF EXISTS public.audit_logs;

-- 1. Admins Table
CREATE TABLE public.admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('Super Admin', 'Operations Admin', 'Finance Admin', 'Support Admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Riders Table
CREATE TABLE public.riders (
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

-- 3. Users Table (End Customers)
CREATE TABLE public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    location TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'flagged', 'suspended', 'pending')),
    subscription_type TEXT CHECK (subscription_type IN ('subscription', 'pay-as-you-go')),
    total_spent NUMERIC(10, 2) DEFAULT 0.00,
    total_pickups INTEGER DEFAULT 0,
    registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('approved', 'pending', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Pickups Table (Required for Dashboard Stats)
CREATE TABLE public.pickups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in-progress', 'completed', 'cancelled')),
    pickup_time TIMESTAMP WITH TIME ZONE,
    location TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Payments Table (Removed as per request)
-- CREATE TABLE public.payments (
--     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
--     user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
--     pickup_id UUID REFERENCES public.pickups(id) ON DELETE SET NULL,
--     amount NUMERIC(10, 2) NOT NULL,
--     status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed')),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
-- );

-- 6. SMS Logs Table (New)
CREATE TABLE public.sms_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_group TEXT CHECK (recipient_group IN ('riders', 'users', 'both')),
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'scheduled', 'failed')),
    recipient_count INTEGER DEFAULT 0,
    schedule_date TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 7. Feedback Table
CREATE TABLE public.feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('rider', 'service', 'app')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 8. Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_name TEXT,
    user_role TEXT,
    action TEXT,
    target TEXT,
    target_type TEXT,
    ip_address TEXT,
    device TEXT,
    status TEXT CHECK (status IN ('Success', 'Failed')),
    details TEXT,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access for development
CREATE POLICY "Enable all for admins" ON public.admins FOR ALL USING (true);
CREATE POLICY "Enable all for riders" ON public.riders FOR ALL USING (true);
CREATE POLICY "Enable all for users" ON public.users FOR ALL USING (true);
CREATE POLICY "Enable all for pickups" ON public.pickups FOR ALL USING (true);
-- CREATE POLICY "Enable all for payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Enable all for sms_logs" ON public.sms_logs FOR ALL USING (true);
CREATE POLICY "Enable all for feedback" ON public.feedback FOR ALL USING (true);
CREATE POLICY "Enable all for audit_logs" ON public.audit_logs FOR ALL USING (true);
