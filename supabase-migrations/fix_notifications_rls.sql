-- Migration: Fix Notification RLS Policies
-- Created: 2026-02-03
-- Purpose: Ensure staff can insert notifications for students

-- Drop existing insert policies
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can insert notifications" ON public.notifications;

-- Explicitly allow any authenticated user to insert notifications
-- This is needed so staff can notify students and vice versa
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure users can see their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Ensure users can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable RLS just in case it was missed
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
