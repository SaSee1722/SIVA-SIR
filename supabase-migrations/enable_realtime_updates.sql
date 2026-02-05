-- Enable Real-time Updates for All Tables
-- Run this in Supabase SQL Editor to enable real-time subscriptions

-- =====================================================
-- STEP 1: Enable Real-time for Tables (Safe Method)
-- =====================================================

-- Safe method: Try to add, ignore if already exists
DO $$
BEGIN
    -- Enable real-time for profiles table (student approvals, class requests)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
        RAISE NOTICE 'Added profiles to real-time publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'profiles already in real-time publication';
    END;

    -- Enable real-time for files table (file uploads)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE files;
        RAISE NOTICE 'Added files to real-time publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'files already in real-time publication';
    END;

    -- Enable real-time for attendance_sessions table (QR sessions)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE attendance_sessions;
        RAISE NOTICE 'Added attendance_sessions to real-time publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'attendance_sessions already in real-time publication';
    END;

    -- Enable real-time for attendance_records table (attendance marking)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
        RAISE NOTICE 'Added attendance_records to real-time publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'attendance_records already in real-time publication';
    END;

    -- Enable real-time for classes table (class changes)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE classes;
        RAISE NOTICE 'Added classes to real-time publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'classes already in real-time publication';
    END;

    -- Enable real-time for notifications table
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        RAISE NOTICE 'Added notifications to real-time publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'notifications already in real-time publication';
    END;
END $$;

-- =====================================================
-- STEP 2: Verify Real-time is Enabled
-- =====================================================

-- Check which tables have real-time enabled
SELECT 
    schemaname,
    tablename
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
ORDER BY 
    tablename;

-- Expected output should include:
-- - profiles
-- - files
-- - attendance_sessions
-- - attendance_records
-- - classes
-- - notifications

-- =====================================================
-- STEP 3: Verify RLS Policies Allow SELECT
-- =====================================================

-- Check RLS policies for profiles
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM 
    pg_policies
WHERE 
    tablename = 'profiles'
ORDER BY 
    policyname;

-- Check RLS policies for files
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM 
    pg_policies
WHERE 
    tablename = 'files'
ORDER BY 
    policyname;

-- Check RLS policies for attendance_sessions
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM 
    pg_policies
WHERE 
    tablename = 'attendance_sessions'
ORDER BY 
    policyname;

-- Check RLS policies for attendance_records
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM 
    pg_policies
WHERE 
    tablename = 'attendance_records'
ORDER BY 
    policyname;

-- =====================================================
-- STEP 4: Add Missing SELECT Policies (if needed)
-- =====================================================

-- If any table is missing SELECT policies for authenticated users, add them:

-- Profiles SELECT policy (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Allow authenticated users to read profiles'
    ) THEN
        CREATE POLICY "Allow authenticated users to read profiles"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Files SELECT policy (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'files' 
        AND policyname = 'Allow authenticated users to read files'
    ) THEN
        CREATE POLICY "Allow authenticated users to read files"
        ON public.files
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Attendance Sessions SELECT policy (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'attendance_sessions' 
        AND policyname = 'Allow authenticated users to read sessions'
    ) THEN
        CREATE POLICY "Allow authenticated users to read sessions"
        ON public.attendance_sessions
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Attendance Records SELECT policy (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'attendance_records' 
        AND policyname = 'Allow authenticated users to read records'
    ) THEN
        CREATE POLICY "Allow authenticated users to read records"
        ON public.attendance_records
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Classes SELECT policy (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' 
        AND policyname = 'Allow authenticated users to read classes'
    ) THEN
        CREATE POLICY "Allow authenticated users to read classes"
        ON public.classes
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- =====================================================
-- STEP 5: Final Verification
-- =====================================================

-- Verify all tables are in the publication
SELECT 
    'Real-time enabled for: ' || string_agg(tablename, ', ') as status
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
    AND tablename IN (
        'profiles',
        'files',
        'attendance_sessions',
        'attendance_records',
        'classes',
        'notifications'
    );

-- Expected output:
-- "Real-time enabled for: profiles, files, attendance_sessions, attendance_records, classes, notifications"

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Real-time updates enabled successfully!';
    RAISE NOTICE '📊 Tables enabled: profiles, files, attendance_sessions, attendance_records, classes, notifications';
    RAISE NOTICE '🚀 Your app will now receive instant updates for all data changes!';
END $$;
