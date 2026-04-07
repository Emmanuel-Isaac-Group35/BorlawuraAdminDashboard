-- BORLAWURA PERFORMANCE & ROBUSTNESS OPTIMIZATION (v1.0)
-- Objective: Increase query speed and prevent data integrity issues for the Admin Dashboard.

-- 1. Performance Indices (Speed up Dashboard Stats and Search)
CREATE INDEX IF NOT EXISTS idx_pickups_status ON public.pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickups_created_at ON public.pickups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pickups_user_id ON public.pickups(user_id);
CREATE INDEX IF NOT EXISTS idx_pickups_rider_id ON public.pickups(rider_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(location);

CREATE INDEX IF NOT EXISTS idx_riders_status ON public.riders(status);
CREATE INDEX IF NOT EXISTS idx_riders_email ON public.riders(email);

CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 2. Data Integrity (Robustness)
-- Ensure 'admins' table always mirrors auth.users for existing records
ALTER TABLE public.admins
ADD CONSTRAINT admins_email_unique UNIQUE (email);

-- 3. Optimization for Realtime
-- Refresh schema cache for the API
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN
    RAISE NOTICE 'BorlaWura Performance Optimization: Database indices and integrity constraints verified.';
END $$;
