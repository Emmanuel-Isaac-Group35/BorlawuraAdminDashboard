-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to start fresh
-- Drop existing tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.pickups CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.sms_logs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.riders CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Admins Table
CREATE TABLE public.admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT, -- Removed strict CHECK to support 'Admin', 'super_admin', 'manager', 'dispatcher', 'support'
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Riders Table
CREATE TABLE public.riders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    vehicle_type TEXT,
    vehicle_number TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'offline', 'busy')),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_earnings NUMERIC(10, 2) DEFAULT 0.00,
    total_pickups INTEGER DEFAULT 0,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. Users Table (End Customers)
CREATE TABLE public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    address TEXT,
    location TEXT,
    subscription_type TEXT DEFAULT 'pay-as-you-go',
    registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'flagged')),
    balance NUMERIC(10, 2) DEFAULT 0.00,
    role TEXT DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Pickups Table (Required for Dashboard Stats)
CREATE TABLE public.pickups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    pickup_time TIMESTAMP WITH TIME ZONE,
    location JSONB,
    address TEXT,
    waste_type TEXT,
    waste_size TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Payments Table (Active)
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    pickup_id UUID REFERENCES public.pickups(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 6. SMS Logs Table (New)
CREATE TABLE public.sms_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient TEXT,
    sender_name TEXT,
    message TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'failed', 'scheduled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 7. Feedback Table
CREATE TABLE public.feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('rider', 'service', 'app')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 8. Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    action TEXT,
    target_type TEXT,
    target_id TEXT,
    ip_address TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access for development
CREATE POLICY "Enable all for admins" ON public.admins FOR ALL USING (true);
CREATE POLICY "Enable all for riders" ON public.riders FOR ALL USING (true);
CREATE POLICY "Enable all for users" ON public.users FOR ALL USING (true);
CREATE POLICY "Enable all for pickups" ON public.pickups FOR ALL USING (true);
CREATE POLICY "Enable all for payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Enable all for sms_logs" ON public.sms_logs FOR ALL USING (true);
CREATE POLICY "Enable all for feedback" ON public.feedback FOR ALL USING (true);
CREATE POLICY "Enable all for audit_logs" ON public.audit_logs FOR ALL USING (true);
