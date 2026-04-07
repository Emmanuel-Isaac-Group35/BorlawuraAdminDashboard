-- Add avatar_url column to all identity tables to support profile pictures
-- Run this in your Supabase SQL Editor

-- 1. Update Users Table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Update Riders Table
ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Update Admins Table
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify the changes
COMMENT ON COLUMN public.users.avatar_url IS 'Public URL for the user profile picture';
COMMENT ON COLUMN public.riders.avatar_url IS 'Public URL for the rider profile picture';
COMMENT ON COLUMN public.admins.avatar_url IS 'Public URL for the administrator profile picture';
