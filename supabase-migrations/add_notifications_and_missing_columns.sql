-- Migration: Add notifications table and missing columns for file recipients and push tokens
-- Created: 2026-02-02
-- Purpose: Enable system notifications and correct file recipient tracking
-- ============================================
-- 1. Update profiles table
-- ============================================
-- Add push_token column if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;
-- ============================================
-- 2. Update files table
-- ============================================
-- Add recipient_id and recipient_name columns
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE
SET NULL,
    ADD COLUMN IF NOT EXISTS recipient_name TEXT;
-- Create index for faster recipient queries
CREATE INDEX IF NOT EXISTS idx_files_recipient ON public.files(recipient_id);
-- ============================================
-- 3. Create notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    -- 'session_created', 'absent', 'general', etc.
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create index for faster user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read)
WHERE is_read = false;
-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR
SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR
UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
-- For now, allow authenticated users to insert (so students can notify staff)
-- In a more secure setup, this would be restricted or done via Edge Functions/Triggers
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR
INSERT TO authenticated WITH CHECK (true);
-- ============================================
-- 4. Enable Realtime for notifications
-- ============================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'notifications'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.notifications;
END IF;
END $$;