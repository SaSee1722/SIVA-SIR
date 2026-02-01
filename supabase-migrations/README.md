# Database Migration Guide

## Adding Security Columns to SIVA-SIR Database

This migration adds the necessary security columns to enable:

- ✅ Student approval workflow
- ✅ Device binding security
- ✅ Manual attendance tracking with staff attribution

## Migration File

`add_security_columns.sql`

## What This Migration Does

### 1. **Profiles Table** (Student/Staff accounts)

Adds:

- `is_approved` (BOOLEAN) - Whether student account is approved by staff
- `device_id` (TEXT) - Unique device identifier for security

### 2. **Attendance Records Table**

Adds:

- `status` (TEXT) - 'present' or 'on_duty' for manual marking
- `marked_by` (TEXT) - Staff ID who manually marked attendance

### 3. **Data Updates**

- Sets all existing students to `is_approved = true` (legacy accounts)
- Sets all existing staff to `is_approved = true`

### 4. **Performance Indexes**

- Index on `is_approved` for faster pending student queries
- Index on `device_id` for faster device binding checks
- Index on `marked_by` for tracking manual attendance

## How to Run This Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of `add_security_columns.sql`
5. Paste into the SQL editor
6. Click **Run** button
7. Verify success message appears

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or run the migration directly
psql $DATABASE_URL -f supabase-migrations/add_security_columns.sql
```

### Option 3: Manual Execution via psql

```bash
# Connect to your database
psql "postgresql://[user]:[password]@[host]:[port]/[database]"

# Run the migration
\i /Users/apple/Desktop/SIVASIR/supabase-migrations/add_security_columns.sql
```

## Verification

After running the migration, verify the columns were added:

```sql
-- Check profiles table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('is_approved', 'device_id');

-- Check attendance_records table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND column_name IN ('status', 'marked_by');

-- Check existing students are approved
SELECT COUNT(*) as approved_students 
FROM profiles 
WHERE role = 'student' AND is_approved = true;
```

## Expected Results

After migration:

- ✅ All existing students (Sakthe, Sai the, SABEE) will be auto-approved
- ✅ New students will require staff approval
- ✅ Device binding will work for security
- ✅ Manual attendance marking will track which staff member marked it
- ✅ No more "column does not exist" errors

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove columns from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS is_approved;
ALTER TABLE profiles DROP COLUMN IF EXISTS device_id;

-- Remove columns from attendance_records
ALTER TABLE attendance_records DROP COLUMN IF EXISTS status;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS marked_by;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_is_approved;
DROP INDEX IF EXISTS idx_profiles_device_id;
DROP INDEX IF EXISTS idx_attendance_marked_by;
```

## Support

If you encounter any issues:

1. Check Supabase logs for error messages
2. Verify you have the correct database permissions
3. Ensure you're connected to the correct database

## Next Steps After Migration

1. **Reload your app** - The app will now use the new columns
2. **Test student approval** - Create a new student account and approve it
3. **Test device binding** - Students will be asked to bind their device on first login
4. **Test manual attendance** - Use the "Manual Mark (Emergency)" feature
5. **Verify security** - Ensure students can't mark attendance from different devices

---

**Migration Created**: 2026-01-31  
**App Version**: SIVA-SIR v1.0  
**Database**: Supabase PostgreSQL
