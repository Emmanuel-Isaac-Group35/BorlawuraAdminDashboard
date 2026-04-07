-- BorneoWura System Cleanse Script
-- This script safely removes all dummy/test data to prepare the system for production.

-- 1. Clear High-Volume Data Tables
TRUNCATE TABLE public.audit_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.notifications RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.payments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.feedback RESTART IDENTITY CASCADE;

-- 2. Clear Operational Data (Orders/Requests)
TRUNCATE TABLE public.pickups RESTART IDENTITY CASCADE;

-- 3. Clear Users and Riders (Personnel & Customers)
-- We use DELETE for these if they have complex dependencies, but TRUNCATE CASCADE is safe here.
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.riders RESTART IDENTITY CASCADE;

-- 4. Keep Admin Accounts (DO NOT TRUNCATE ADMINS)
-- We only remove test admins if needed, but usually, we keep the ones already created.
-- DELETE FROM public.admins WHERE email LIKE '%@example.com' OR email LIKE '%test%';

-- 5. Force Schema Refresh
NOTIFY pgrst, 'reload schema';
