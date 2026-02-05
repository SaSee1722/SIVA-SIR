-- ============================================
-- MASTER NOTIFICATION TRIGGER CLEANUP
-- ============================================
-- This script removes ALL potential duplicate triggers 
-- and sets up exactly ONE master trigger for push notifications.
-- Run this in your Supabase SQL Editor.
-- ============================================

-- 1. DROP ALL PREVIOUS TRIGGERS (Cleanup phase)
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
DROP TRIGGER IF EXISTS on_notification_added ON public.notifications;
DROP TRIGGER IF EXISTS tr_push_notification ON public.notifications;
DROP TRIGGER IF EXISTS tr_notify_push ON public.notifications;
DROP TRIGGER IF EXISTS notify_push_trigger ON public.notifications;

-- 2. RE-CREATE THE SHARED FUNCTION
-- Note: Replace the URL or Key if you have changed your project settings,
-- though these match your current ultimate_push_fix metadata.
CREATE OR REPLACE FUNCTION public.push_notification_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- We use pg_net (net.http_post) to call the Edge Function
  -- This is the most reliable way to trigger push from DB.
  PERFORM
    net.http_post(
      url := 'https://hmrssezhhznmvfflgefc.supabase.co/functions/v1/push-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcnNzZXpoaHpubXZmZmxnZWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNjk3NCwiZXhwIjoyMDg0NDEyOTc0fQ.T2_gpXHZnqNwi7LXowCYxPvFQlYt3dGiCFckzUq_7Yk'
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE THE SINGLE MASTER TRIGGER
CREATE TRIGGER on_notification_created
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.push_notification_webhook();

-- 4. FINAL PERMISSIONS
GRANT ALL ON public.notifications TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- IMPORTANT:
-- Go to your Supabase Dashboard -> Database -> Webhooks.
-- DELETE any UI-based webhooks pointing to 
-- "push-notifications" to avoid a second call.
-- ============================================
