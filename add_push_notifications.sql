-- Add target_audience field to notifications table so admin can broadcast to specific groups
-- Run this in your Supabase SQL editor

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'admin' CHECK (target_audience IN ('admin', 'all_users', 'all_riders', 'all')),
  ADD COLUMN IF NOT EXISTS sent_by TEXT,
  ADD COLUMN IF NOT EXISTS sent_by_name TEXT;

-- Index for fast audience filtering on the mobile side
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
