-- ============================================
-- FIX DOUBLE NOTIFICATIONS
-- ============================================
-- This script cleans up any potentially duplicate triggers
-- that might be causing notifications to be sent twice.
-- ============================================

-- 1. Drop ALL possible trigger names for notifications (to be safe)
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
DROP TRIGGER IF EXISTS on_notification_added ON public.notifications;
DROP TRIGGER IF EXISTS tr_push_notification ON public.notifications;
DROP TRIGGER IF EXISTS tr_notify_push ON public.notifications;

-- 2. Re-create the master trigger function with better logging or check
CREATE OR REPLACE FUNCTION public.push_notification_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- We use net.http_post to call the Supabase Edge Function
  -- The Edge Function then calls the Expo Push API
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

-- 3. Create the SINGLE trigger
CREATE TRIGGER on_notification_created
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.push_notification_webhook();

-- ============================================
-- NOTE TO USER:
-- If you still get double notifications, please check 
-- "Database -> Webhooks" in your Supabase Dashboard UI.
-- Ensure there isn't a manual webhook configured there
-- that points to the same "push-notifications" edge function.
-- ============================================
