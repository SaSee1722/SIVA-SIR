# Notification System - Quick Reference

## 🎯 Files Created

1. **`verify_triggers.sql`** - Check for duplicates
2. **`cleanup_duplicate_triggers.sql`** - Emergency cleanup
3. **`final_notification_cleanup.sql`** - Main migration (already existed)
4. **`notification-testing-guide.md`** - Testing guide

---

## ⚡ Quick Workflow

### 1️⃣ Verify Current State
```bash
# Open Supabase SQL Editor
# Copy and run: supabase-migrations/verify_triggers.sql
```

**Look for:** 
- Query 3 result: `total_triggers = 1` ✅ or `> 1` ⚠️

---

### 2️⃣ Cleanup (if needed)
```bash
# If verify showed duplicates:
# Run: supabase-migrations/cleanup_duplicate_triggers.sql
```

---

### 3️⃣ Apply Main Migration
```bash
# Run: supabase-migrations/final_notification_cleanup.sql
```

---

### 4️⃣ Verify Success
```bash
# Run verify_triggers.sql again
# Should show: total_triggers = 1
```

---

### 5️⃣ Test Notifications

**Quick Test:**
```sql
-- Replace YOUR_USER_ID with actual user ID
INSERT INTO public.notifications (user_id, title, message, type, is_read)
VALUES (
    'YOUR_USER_ID',
    'Test Notification',
    'Testing the notification system',
    'general',
    false
);
```

**Expected:** Device receives **EXACTLY 1** notification

**Cleanup:**
```sql
DELETE FROM public.notifications WHERE title = 'Test Notification';
```

---

## 🔍 Troubleshooting

### No notification received?
1. Check push token: `SELECT push_token FROM profiles WHERE id = 'USER_ID'`
2. Check Edge Function logs in Supabase Dashboard
3. Verify device notification permissions

### Duplicate notifications?
1. Run `verify_triggers.sql` - should show only 1 trigger
2. Check Webhooks (should be empty) ✅
3. Check app code for duplicate `sendNotification()` calls

---

## ✅ Success Checklist

- [ ] `verify_triggers.sql` shows exactly 1 trigger
- [ ] No webhooks in Supabase Dashboard
- [ ] Test notification received on device
- [ ] No duplicate notifications
- [ ] App icon visible on notification
- [ ] Foreground behavior: system notification only (no in-app alert)
- [ ] Background behavior: system notification with sound

---

## 📚 Full Documentation

See: `docs/notification-testing-guide.md` for complete testing scenarios

---

## 🆘 Support

If issues persist:
1. Check `notificationService.ts` configuration
2. Verify Edge Function `push-notifications` is deployed
3. Review Supabase Edge Function logs
4. Test with multiple devices/users
