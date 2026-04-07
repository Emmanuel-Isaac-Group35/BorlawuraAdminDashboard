-- Add sent_by column to SMS Logs to track which admin sent the broadcast
-- Run this in your Supabase SQL Editor

ALTER TABLE public.sms_logs 
ADD COLUMN IF NOT EXISTS sent_by TEXT DEFAULT 'System';

COMMENT ON COLUMN public.sms_logs.sent_by IS 'The name of the administrator who initiated this SMS broadcast';
