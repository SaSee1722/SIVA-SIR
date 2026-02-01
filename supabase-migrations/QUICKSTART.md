# 🚀 Quick Start: Database Migration

## ⚡ Fastest Method (Recommended)

### Using Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to: <https://app.supabase.com>
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query" button

3. **Run the Migration**

   ```sql
   -- Copy and paste this entire block:
   
   -- Add security columns to profiles
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_id TEXT;
   
   -- Add tracking columns to attendance_records
   ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS status TEXT;
   ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS marked_by TEXT;
   
   -- Approve all existing students (legacy accounts)
   UPDATE profiles SET is_approved = true WHERE role = 'student' AND is_approved IS NULL;
   UPDATE profiles SET is_approved = true WHERE role = 'staff' AND is_approved IS NULL;
   
   -- Add indexes for performance
   CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved) WHERE role = 'student';
   CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id) WHERE device_id IS NOT NULL;
   CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance_records(marked_by) WHERE marked_by IS NOT NULL;
   ```

4. **Click "Run"** (or press Cmd/Ctrl + Enter)

5. **Verify Success**
   - You should see "Success. No rows returned"
   - This is normal and means it worked!

---

## ✅ Verification

Run this to confirm columns were added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('is_approved', 'device_id');
```

Expected result: 2 rows showing the new columns

---

## 🎯 What This Enables

After running this migration:

| Feature | Before | After |
|---------|--------|-------|
| **Student Approval** | ❌ Not working | ✅ Staff can approve students |
| **Device Binding** | ❌ Errors | ✅ Secure device binding |
| **Manual Attendance** | ❌ Column errors | ✅ Track who marked attendance |
| **Legacy Students** | ⚠️ Show as pending | ✅ Auto-approved |

---

## 📱 After Migration

1. **Reload your app** (shake device → Reload)
2. **Check Student Approvals** - Sakthe, Sai the, SABEE should not appear as pending
3. **Test Manual Attendance** - Should work without errors
4. **Create new student** - Will require approval

---

## 🆘 Troubleshooting

### "Permission denied"

- Make sure you're logged into the correct Supabase project
- Check you have admin/owner role

### "Column already exists"

- This is fine! The migration uses `IF NOT EXISTS`
- It means columns were already added

### "Relation does not exist"

- Check table names are correct: `profiles` and `attendance_records`
- Verify you're in the correct database

---

## 📞 Need Help?

Full documentation: `supabase-migrations/README.md`

Interactive script: `./supabase-migrations/run-migration.sh`
