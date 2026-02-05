# Notification System Testing Guide

## 🎯 Objective
Test the notification system to ensure:
- ✅ Only ONE push notification is sent per event
- ✅ No duplicate notifications
- ✅ Notifications work when app is in background
- ✅ No in-app alerts when app is in foreground

---

## 📋 Pre-Testing Checklist

### 1. Verify Database Setup
Run the verification script first:

```sql
-- In Supabase SQL Editor, run:
-- File: supabase-migrations/verify_triggers.sql
```

**Expected Results:**
- ✅ Exactly **1 trigger** on notifications table
- ✅ Trigger name: `on_notification_created`
- ✅ Function exists: `push_notification_webhook`

### 2. Check Webhooks
- Go to: **Supabase Dashboard** → **Database** → **Webhooks**
- **Expected:** "No hooks created yet" (CONFIRMED ✅)

### 3. Verify Edge Function
- Go to: **Supabase Dashboard** → **Edge Functions**
- Check: `push-notifications` function is deployed
- Status: Should be **Active**

---

## 🧪 Testing Scenarios

### Test 1: Single Notification Test (Basic)

**Setup:**
1. Have TWO devices ready (or one device + one emulator)
2. Login as **Staff** on Device A
3. Login as **Student** on Device B

**Steps:**
1. **Staff (Device A):** Approve a student's class request
2. **Student (Device B):** Should receive **EXACTLY ONE** notification

**Expected Behavior:**
- ✅ Student receives 1 push notification
- ✅ Notification shows app icon
- ✅ Title: "Class Request Approved" (or similar)
- ❌ NO duplicate notifications

**How to Verify:**
- Check notification tray on Device B
- Count: Should see **1 notification only**

---

### Test 2: Foreground vs Background Behavior

**Setup:**
1. Student logged in on Device B

**Test 2A: App in Background**
1. **Student:** Close app or switch to another app
2. **Staff:** Send a notification (e.g., approve class request)
3. **Expected:** Student sees system push notification with sound/vibration

**Test 2B: App in Foreground (Active)**
1. **Student:** Keep app open and active
2. **Staff:** Send a notification
3. **Expected:** 
   - ✅ System push notification appears
   - ❌ NO in-app banner/alert (silenced by `notificationService.ts`)

---

### Test 3: Multiple Notifications Test

**Setup:**
1. Staff creates a new attendance session for a class with 5+ students

**Steps:**
1. **Staff:** Create QR code session
2. **All Students:** Should receive session notification

**Expected Behavior:**
- ✅ Each student receives **EXACTLY 1** notification
- ✅ All notifications sent within 1-2 seconds
- ❌ NO duplicate notifications for any student

**How to Verify:**
- Ask multiple students to check their notification count
- Each should have **1 notification only**

---

### Test 4: Direct Database Insert Test

**Setup:**
1. Get a test user ID from your database
2. Have that user logged in on a device

**Steps:**
1. In **Supabase SQL Editor**, run:

```sql
-- Replace 'YOUR_USER_ID' with actual user ID
INSERT INTO public.notifications (user_id, title, message, type, is_read)
VALUES (
    'YOUR_USER_ID',
    'Database Test Notification',
    'Testing direct database insert trigger',
    'general',
    false
);
```

2. Check device for notification

**Expected Behavior:**
- ✅ User receives **EXACTLY 1** push notification
- ✅ Notification appears within 2-3 seconds
- ❌ NO duplicate notifications

**Cleanup:**
```sql
DELETE FROM public.notifications WHERE title = 'Database Test Notification';
```

---

## 🔍 Debugging Failed Tests

### Issue: No Notification Received

**Check:**
1. **Device Permissions:**
   - Settings → App → Notifications → Enabled?
   
2. **Push Token Registered:**
   ```sql
   SELECT id, name, push_token 
   FROM profiles 
   WHERE id = 'YOUR_USER_ID';
   ```
   - `push_token` should NOT be null

3. **Edge Function Logs:**
   - Supabase Dashboard → Edge Functions → `push-notifications` → Logs
   - Check for errors

4. **Trigger Execution:**
   ```sql
   -- Check if trigger exists
   SELECT * FROM information_schema.triggers 
   WHERE event_object_table = 'notifications';
   ```

---

### Issue: Duplicate Notifications

**Check:**
1. **Multiple Triggers:**
   ```sql
   SELECT COUNT(*) FROM information_schema.triggers 
   WHERE event_object_table = 'notifications';
   ```
   - Should return **1** only

2. **Webhooks:**
   - Dashboard → Database → Webhooks
   - Should be **empty** (no webhooks)

3. **Multiple Inserts:**
   - Check your app code for duplicate `sendNotification()` calls

---

## 📊 Test Results Template

Use this template to document your test results:

```
## Test Results - [Date]

### Test 1: Single Notification
- ✅ / ❌ Received exactly 1 notification
- ✅ / ❌ App icon visible
- Notes: ___________

### Test 2A: Background Behavior
- ✅ / ❌ System notification appeared
- ✅ / ❌ Sound/vibration worked
- Notes: ___________

### Test 2B: Foreground Behavior
- ✅ / ❌ System notification appeared
- ✅ / ❌ No in-app banner
- Notes: ___________

### Test 3: Multiple Recipients
- ✅ / ❌ All students received notification
- ✅ / ❌ No duplicates
- Notes: ___________

### Test 4: Database Insert
- ✅ / ❌ Notification received
- ✅ / ❌ No duplicates
- Notes: ___________

### Overall Status: PASS / FAIL
```

---

## 🚀 Quick Test Command

For a quick verification, run this in Supabase SQL Editor:

```sql
-- Quick verification of notification setup
SELECT 
    (SELECT COUNT(*) FROM information_schema.triggers 
     WHERE event_object_table = 'notifications') as trigger_count,
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_name = 'push_notification_webhook') as function_count;
```

**Expected Result:**
```
trigger_count: 1
function_count: 1
```

---

## 📝 Notes

- **Expo Push Token:** Valid for ~30 days, may need re-registration
- **Network Delays:** Notifications may take 1-3 seconds to arrive
- **iOS vs Android:** Behavior may differ slightly (both should work)
- **Production vs Development:** Test in both environments

---

## ✅ Success Criteria

Your notification system is working correctly if:

1. ✅ **Zero duplicates** in all test scenarios
2. ✅ **Consistent delivery** across all devices
3. ✅ **Proper foreground/background** behavior
4. ✅ **App icon visible** on notifications
5. ✅ **Fast delivery** (within 3 seconds)

---

## 🆘 Need Help?

If tests fail:
1. Re-run `verify_triggers.sql`
2. Check Edge Function logs
3. Verify device permissions
4. Check user's `push_token` in database
5. Review `notificationService.ts` configuration
